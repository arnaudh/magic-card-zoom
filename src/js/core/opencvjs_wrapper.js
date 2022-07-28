const opencvjs = require("../lib/opencv.js");
const fs = require('fs-extra');

// Extract data with `sharp` (faster)
// var get_image_data = require('get-image-data/native')
const { createCanvas, loadImage } = require('canvas')

class OpenCVJsWrapper {
    constructor(){
        if (!opencvjs) {
            throw 'opencvjs is not ready yet';
        }
    }

    async imread(filename) {
        let grayMat = new opencvjs.Mat();
        // opencvjs.cvtColor(grayMat, grayMat, opencvjs.COLOR_RGBA2GRAY, 0);
        // console.log('imread ', filename);
        if (!fs.existsSync(filename)) {
            throw `File not found: ${filename}`;
        }
        try {
            // opencvjs cv.imread takes a canvas element or id, or img element or id. That
            // doesn't work for us. We want to use cv.matFromImageData(imgData) (which is
            // used by imread under the hood)
            const myimg = await loadImage(filename);
            // TODO: How to go from Image to imageData? The following throws an error.
            return opencvjs.matFromImageData(myimg);
            console.log('myimg', myimg);
        } catch(error) {
            throw Error(`Could not read ${filename}: ${error}`);
        }
    }

    estimateAffinePartial2D(keypoints1, keypoints2) {
        if (keypoints1.length < 3 || keypoints2.length < 3 || keypoints1.length != keypoints2.length) {
            throw `estimateAffinePartial2D: arrays must be of same length >= 3, got ${keypoints1.length} and ${keypoints2.length}`;
        }
        let cvMat1 = arrayToCvMat(keypoints1);
        let cvMat2 = arrayToCvMat(keypoints2);
        let inliers = arrayToCvMat([[-1], [-1], [-1]], opencvjs.CV_8U);


        let method = opencvjs.RANSAC;
        let ransacReprojThreshold = 2; // default is 3
        let maxIters = 2000;
        let confidence = 0.99;
        let refineIters = 10;

        let transform = opencvjs.estimateAffinePartial2D(cvMat1 , cvMat2, inliers, method, ransacReprojThreshold, maxIters, confidence, refineIters);
        let transformArr = cvMatToArray(transform);
        let inliersArr = cvMatToArray(inliers);

        cvMat1.delete();
        cvMat2.delete();
        inliers.delete();

        return {
            transform: transformArr,
            inliers: inliersArr,
            transformComponents: transformMatrixToComponents(transformArr)
        };
    }

    // Adapted from https://github.com/opencv/opencv/blob/master/samples/python/squares.py
    findRectangles(imageData, minContourLength = 150, minArea = 1000, maxArea = 50000) {
        let cvMat = opencvjs.matFromImageData(imageData);
        let grayMat = new opencvjs.Mat();
        opencvjs.cvtColor(cvMat, grayMat, opencvjs.COLOR_RGBA2GRAY, 0);
        // console.log('grayMat', grayMat.channels());

        let thresholdedMat = new opencvjs.Mat(grayMat.size(), opencvjs.CV_8U);

        let rectangles = [];

        for (let threshold = 0; threshold < 255; threshold += 26) {
            if (threshold == 0) {
                let edgesMat = new opencvjs.Mat(grayMat.size(), opencvjs.CV_8U);
                opencvjs.Canny(grayMat, edgesMat, 0, 50, 5);
                let kernel = new opencvjs.Mat({ width: 0, height: 0 }, opencvjs.CV_8U);
                opencvjs.dilate(edgesMat, thresholdedMat, kernel);
                edgesMat.delete();
                kernel.delete();
            } else {
                opencvjs.threshold(grayMat, thresholdedMat, threshold, 255, opencvjs.THRESH_BINARY);
            }

            let contours = new opencvjs.MatVector();
            let otherThing = new opencvjs.Mat();
            opencvjs.findContours(thresholdedMat, contours, otherThing, opencvjs.RETR_LIST, opencvjs.CHAIN_APPROX_SIMPLE, new opencvjs.Point());
            
            for (let c = 0; c < contours.size(); c++) {
                let contour = contours.get(c); // this creates a new object which needs to be deleted
                let contourLength   = opencvjs.arcLength(contour, true);
                if (contourLength < minContourLength) {
                    contour.delete();
                    continue;
                }
                let approximatedContour = new opencvjs.Mat();
                opencvjs.approxPolyDP(contour, approximatedContour, 0.02*contourLength, true);
                contour.delete();

                let numCorners = approximatedContour.size().height;
                
                if (numCorners === 4) {
                    let contourArea = opencvjs.contourArea(approximatedContour);

                    if (contourArea > minArea && contourArea < maxArea) {

                        if (opencvjs.isContourConvex(approximatedContour)) {
                            let rectangle = cvMatToArray(approximatedContour);
                            let anglesCos = [0, 1, 2, 3]
                                .map(i => angle_cos(rectangle[i], rectangle[(i+1) % 4], rectangle[(i+2) % 4]))
                            let maxCos = Math.max.apply(Math, anglesCos);

                            if (maxCos < 0.1) { // all corners are right angles
                                if (!isAlreadyAdded(rectangles, rectangle)) {
                                    rectangles.push(rectangle);
                                }
                            }
                        }
                    }
                }
                approximatedContour.delete();
            }
            contours.delete();
            otherThing.delete();
        }
        cvMat.delete();
        grayMat.delete();
        thresholdedMat.delete();
        return rectangles;
    }
}

function isAlreadyAdded(rectangles, rectangle) {
    return rectangles.some(r => areRectanglesEqual(r, rectangle));
}

function areRectanglesEqual(rect1, rect2) {
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 2; j++) {
            if (rect1[i][j] !== rect2[i][j]) {
                return false;
            }
        }
    }
    return true;
}


function angle_cos(p0, p1, p2) {
    let v1 = [p0[0]-p1[0], p0[1]-p1[1]];
    let v2 = [p2[0]-p1[0], p2[1]-p1[1]];
    let result = Math.abs( dot(v1, v2) / Math.sqrt( dot(v1, v1) * dot(v2, v2) ) );
    return result;
}

function dot(v1, v2) {
    return v1[0]*v2[0] + v1[1]*v2[1];
}


// https://math.stackexchange.com/questions/13150/extracting-rotation-scale-values-from-2d-transformation-matrix/13165#13165
function transformMatrixToComponents(transformArr) {
    let a = transformArr[0][0];
    let b = transformArr[0][1];
    let c = transformArr[1][0];
    let d = transformArr[1][1];
    let tx = transformArr[0][2];
    let ty = transformArr[1][2];
    // https://stackoverflow.com/questions/283406/what-is-the-difference-between-atan-and-atan2-in-c
    // https://en.wikipedia.org/wiki/Atan2
    let angle = Math.atan2(c,d);
    if (Math.sign(a) < 0) {
        angle += Math.PI;
    }
    return {
        translateX: tx,
        translateY: ty,
        scaleX: Math.hypot(a, b),
        scaleY: Math.hypot(c, d),
        angle: angle
    }
}

function distance(a, b) {
    return Math.hypot(...a.map((e,i)=>e-b[i]));
}

function arrayToCvMat(arr, type=opencvjs.CV_64F) {
    // console.log('arr', arr);
    // console.log('arr.length', arr.length);
    let height = arr.length;
    let width = arr[0].length;
    let mat = new opencvjs.Mat(height, width, type);
    for (let i = 0; i < height; i++) {
        for (let j = 0; j < width; j++) {
            let data;
            switch (type) {
                case opencvjs.CV_8U:  data = mat.data;    break;
                case opencvjs.CV_8S:  data = mat.data8S;  break;
                case opencvjs.CV_16U: data = mat.data16U; break;
                case opencvjs.CV_16S: data = mat.data16S; break;
                case opencvjs.CV_32S: data = mat.data32S; break;
                case opencvjs.CV_32F: data = mat.data32F; break;
                case opencvjs.CV_64F: data = mat.data64F; break;
                default: throw `Unknown mat data type ${type}`;
            }
            data[width*i + j] = arr[i][j];
        }
    }
    return mat;
}

function cvMatToArray(mat) {
    let size = mat.size();
    let arr = [];
    if (mat.type() === opencvjs.CV_32SC2) {
        size.width = 2; // because we have 2 channels
    }
    for (let i = 0; i < size.height; i++) {
        let row = [];
        for (let j = 0; j < size.width; j++) {
            let value;
            switch (mat.type()) {
                case opencvjs.CV_8U:   value = mat.ucharAt(i,j);  break;
                case opencvjs.CV_8S:   value = mat.charAt(i,j);   break;
                case opencvjs.CV_16U:  value = mat.ushortAt(i,j); break;
                case opencvjs.CV_16S:  value = mat.shortAt(i,j);  break;
                case opencvjs.CV_32S:  value = mat.intAt(i,j);    break;
                case opencvjs.CV_32SC2:value = mat.intAt(i,j);    break;
                case opencvjs.CV_32F:  value = mat.floatAt(i,j);  break;
                case opencvjs.CV_64F:  value = mat.doubleAt(i,j); break;
                default: throw `Unknown mat data type ${mat.type()}`;
            }
            row.push(value);
        }
        arr.push(row);
    }
    return arr;
}

// This is all quite a mess
// How do we ensure all callbacks are called? (race condition)
let callbacks = [];
let opencvjsWrapper;

module.exports = {
  initialize: function (callback_) {
    console.log('opencvjs_wrapper.initialize()');
    if (opencvjsWrapper) {
        console.log('We have opencvjsWrapper');
        callback_(opencvjsWrapper);
    } else {
        console.log('We dont have opencvjsWrapper');
        callbacks.push(callback_);
    }
  }
};

let timer = new Timer();

opencvjs['onRuntimeInitialized']=()=>{
    console.log('onRuntimeInitialized()');
    console.log(`opencv.js loaded in ${timer.get()} ms.`);
    opencvjsWrapper = new OpenCVJsWrapper();
    console.log('CALLING CALLBACKS');
    callbacks.forEach(c => c(opencvjsWrapper));
    console.log('onRuntimeInitialized() DONE');
};

// simple timer class
function Timer() {
  let start = null;
  this.reset = function () {
    start = (new Date()).getTime();
  };
  this.get = function () {
    return (new Date()).getTime() - start;
  };
  this.reset();
};

console.log('opencvjs_wrapper.js END');