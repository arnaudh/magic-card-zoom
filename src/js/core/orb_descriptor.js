const jsfeat = require('../lib/jsfeat.js');


options = {};
options["blur_size"] = 3;//, 3, 9).step(1);
options["lap_thres"] = 1;//, 1, 100);
options["eigen_thres"] = 1;//, 1, 100);

var DESCR_SIZE_BITS = 256 // hardcoded in jsfeat (trained on that)
var DESCR_SIZE_BYTES = DESCR_SIZE_BITS / 8; // bytes; // inside jsfeat describe()
var DESCR_SIZE_INT32 = DESCR_SIZE_BITS / 32;

var BORDER = 15; // 5 min hardcoded in detect_keypoints(). Although anything strictly below 15 gives some features full of zeros...

let nameRegex = /orb(?:-([a-z0-9]+))*/;
let keypointsRegex = /maxkeypoints([0-9.]+)/;
let cardHeightRegex = /cardheight([0-9.]+)/;

class OrbDescriptor {
    constructor(name) {
        var match = nameRegex.exec(name);
        if (!match) {
            throw `Unknown OrbDescriptor name ${name}`;
        }
        this.name = name;
        this.max_keypoints = 10000;
        for (var i = 0; i < match.length; i++) {
            var keypointsMatch = keypointsRegex.exec(match[i]);
            var cardHeightMatch = cardHeightRegex.exec(match[i]);
            if (keypointsMatch) {
                this.max_keypoints = parseInt(keypointsMatch[1]);
            } else if (cardHeightMatch) {
                this.cardHeight = parseInt(cardHeightMatch[1]);
            }
        }
    }

    describe(imageData, cvDebug = null) {
        if (! imageData.data || ! imageData.width || ! imageData.height) {
            throw 'Expected ImageData object';
        }

        let img_u8 = new jsfeat.matrix_t(imageData.width, imageData.height, jsfeat.U8_t | jsfeat.C1_t);
        // after blur
        let img_u8_smooth = new jsfeat.matrix_t(imageData.width, imageData.height, jsfeat.U8_t | jsfeat.C1_t);
        // we wll limit to max_keypoints strongest points
        let screen_descriptors = new jsfeat.matrix_t(DESCR_SIZE_BYTES, this.max_keypoints, jsfeat.U8_t | jsfeat.C1_t);
        let pattern_descriptors = [];
        let screen_corners = [];
        let pattern_corners = [];
        var i = imageData.width*imageData.height;
        while(--i >= 0) {
            screen_corners[i] = new jsfeat.keypoint_t(0,0,0,0,-1);
        }

        // detect corners

        jsfeat.imgproc.grayscale(imageData.data, imageData.width, imageData.height, img_u8);
        // jsfeat.imgproc.gaussian_blur(img_u8, img_u8_smooth, options.blur_size|0);

        jsfeat.yape06.laplacian_threshold = options.lap_thres|0;
        jsfeat.yape06.min_eigen_value_threshold = options.eigen_thres|0;

        let num_corners = detect_keypoints(img_u8, screen_corners, this.max_keypoints);
        jsfeat.orb.describe(img_u8, screen_corners, num_corners, screen_descriptors);
        
        var keypoints = cornersToKeypoints(screen_corners, num_corners);
        
        var query_u32 = screen_descriptors.buffer.i32; // cast to integer buffer
        var logstr = '';
        for (var i = 0; i < query_u32.length; i++) {
            if (i%8 == 0) {
                logstr += `\n[${i}]`;
            }
            logstr += ` ${query_u32[i]}`;
        }
        // console.log('query_u32', logstr);

        var features = convertBriefDescriptors(query_u32, keypoints.length);

        var description = {
            keypoints: keypoints,
            features: features
        };

        for (var i = 0; i < features.length; i++) {
            if (features[i].every(x => x === 0)) {
                logDescription(description);
                throw `Feature ${i} is full of zeros`;
            }
        }
        
        if (cvDebug) {
            console.log('NOT CV DEBUGGING');
            var original_img = cvDebug.fromImageData(imageData);
            var img_with_points = cvDebug.drawPoints(original_img, keypoints);
            cvDebug.imwrite('points.png', img_with_points);
        }

        return description;
    }
}


function logDescription(description) {
    console.log(`DESCRIPTION: ${description.keypoints.length} keypoints`);
    for (var i = 0; i < description.keypoints.length; i++) {
        console.log(`${description.keypoints[i]} ${description.features[i].join('')}`);
    }
}

function cornersToKeypoints(corners, num_corners) {
    // console.log('corners', corners);
    var keypoints = new Array(num_corners);
    for (var i = 0; i < num_corners; i++) {
        keypoints[i] = [corners[i].x, corners[i].y];
    }
    // console.log('keypoints', keypoints);
    return keypoints;
}

function convertBriefDescriptors(descriptors, nFeatures) {
  let features = new Array(nFeatures);
  for (var f = 0; f < nFeatures; f++) {
    features[f] = Array.from(descriptors.slice(f*DESCR_SIZE_INT32, (f+1)*DESCR_SIZE_INT32));
  }
  return features;
}

// UTILITIES

function detect_keypoints(img, corners, max_allowed) {
    var count = jsfeat.yape06.detect(img, corners, BORDER);

    // sort by score and reduce the count if needed
    if(count > max_allowed) {
        jsfeat.math.qsort(corners, 0, count-1, function(a,b){return (b.score<a.score);});
        count = max_allowed;
    }

    // calculate dominant orientation for each keypoint
    for(var i = 0; i < count; ++i) {
        corners[i].angle = ic_angle(img, corners[i].x, corners[i].y);
    }

    return count;
}

// central difference using image moments to find dominant orientation
var u_max = new Int32Array([15,15,15,15,14,14,14,13,13,12,11,10,9,8,6,3,0]);
function ic_angle(img, px, py) {
    var half_k = 15; // half patch size
    var m_01 = 0, m_10 = 0;
    var src=img.data, step=img.cols;
    var u=0, v=0, center_off=(py*step + px)|0;
    var v_sum=0,d=0,val_plus=0,val_minus=0;

    // Treat the center line differently, v=0
    for (u = -half_k; u <= half_k; ++u)
        // console.log(`accessing src[${center_off+u}]: ${src[center_off+u]}`);
        m_10 += u * src[center_off+u];

    // Go line by line in the circular patch
    for (v = 1; v <= half_k; ++v) {
        // Proceed over the two lines
        v_sum = 0;
        d = u_max[v];
        for (u = -d; u <= d; ++u) {
            // console.log(`accessing src[${center_off+u+v*step}]: ${src[center_off+u+v*step]}`);
            val_plus = src[center_off+u+v*step];
            // console.log(`accessing src[${center_off+u-v*step}]: ${src[center_off+u-v*step]}`);
            val_minus = src[center_off+u-v*step];
            v_sum += (val_plus - val_minus);
            m_10 += u * (val_plus + val_minus);
        }
        m_01 += v * v_sum;
    }

    var res = Math.atan2(m_01, m_10);
    // console.log('ic_angle', px, py, '=', res);
    return res
}

module.exports = OrbDescriptor;
