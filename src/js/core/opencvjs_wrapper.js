const opencvjs = require("../lib/opencv.js");

class OpenCVJsWrapper {
    constructor(){
        if (!opencvjs) {
            throw 'opencvjs is not ready yet';
        }
    }

    estimateAffinePartial2D(keypoints1, keypoints2) {
        if (keypoints1.length < 3 || keypoints2.length < 3 || keypoints1.length != keypoints2.length) {
            throw `estimateAffinePartial2D: arrays must be of same length >= 3, got ${keypoints1.length} and ${keypoints2.length}`;
        }
        let cvMat1 = arrayToCvMat(keypoints1);
        let cvMat2 = arrayToCvMat(keypoints2);
        let inliers = arrayToCvMat([[-1], [-1], [-1]], opencvjs.CV_8U);

        let transform = opencvjs.estimateAffinePartial2D(cvMat1 , cvMat2, inliers);
        let transformArr = cvMatToArray(transform);
        let inliersArr = cvMatToArray(inliers);

        return {
            transform: transformArr,
            inliers: inliersArr,
            transformComponents: transformMatrixToComponents(transformArr)
        };
    }
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
    for (var i = 0; i < size.height; i++) {
        let row = [];
        for (var j = 0; j < size.width; j++) {
            let value;
            switch (mat.type()) {
                case opencvjs.CV_8U:   value = mat.ucharAt(i,j);  break;
                case opencvjs.CV_8S:   value = mat.charAt(i,j);   break;
                case opencvjs.CV_16U:  value = mat.ushortAt(i,j); break;
                case opencvjs.CV_16S:  value = mat.shortAt(i,j);  break;
                case opencvjs.CV_32S:  value = mat.intAt(i,j);    break;
                case opencvjs.CV_32F:  value = mat.floatAt(i,j);  break;
                case opencvjs.CV_64F:  value = mat.doubleAt(i,j); break;
                default: throw `Unknown mat data type ${type}`;
            }
            row.push(value);
        }
        arr.push(row);
    }
    return arr;
}

let callback;

module.exports = {
  initialize: function (callback_) {
    console.log('opencvjs_wrapper.initialize(), setting callback');
    callback = callback_;
  }
};

let timer = new Timer();

opencvjs['onRuntimeInitialized']=()=>{
    console.log('onRuntimeInitialized()');
    console.log(`opencv.js loaded in ${timer.get()} ms.`);
    console.log('opencvjs.estimateAffinePartial2D', opencvjs.estimateAffinePartial2D);
    console.log('CALLING CALLBACK');
    let opencvjsWrapper = new OpenCVJsWrapper();
    callback(opencvjsWrapper);
};

// simple timer class
function Timer() {
  var start = null;
  this.reset = function () {
    start = (new Date()).getTime();
  };
  this.get = function () {
    return (new Date()).getTime() - start;
  };
  this.reset();
};
