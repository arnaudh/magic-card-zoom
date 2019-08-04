const assert = require('assert');

let cv;

before(function(done) {
    this.timeout(15000);
    return require('../../../src/js/core/opencvjs_wrapper.js').initialize(function(cv_) {
        console.log('initialize done, inside the callback');
        cv = cv_;
        done();
    })
})


describe('opencvjs_wrapper', () => {
    describe('#estimateAffinePartial2D', () => {
        it('should return identity', (done) => {
            let keypoints1 = [[0,1], [2,3], [4,5]];
            let keypoints2 = [[0,1], [2,3], [4,5]];
            let result = cv.estimateAffinePartial2D(keypoints1, keypoints2);
            assert.deepEqual(result.transform, [
                [1, 0, 0],
                [0, 1, 0]
            ]);
            done();
        })
        it('should return translate', (done) => {
            let keypoints1 = [[0,0], [0,1], [1,0]];
            let keypoints2 = [[1,-1], [1,0], [2,-1]];
            let result = cv.estimateAffinePartial2D(keypoints1, keypoints2);
            assert.deepEqual(result.transform, [
                [1, 0,  1],
                [0, 1, -1]
            ]);
            done();
        })
        it('should return scale * 2', (done) => {
            let keypoints1 = [[0,0], [0,1], [1,0]];
            let keypoints2 = [[0,0], [0,2], [2,0]];
            let result = cv.estimateAffinePartial2D(keypoints1, keypoints2);
            assert.deepEqual(result.transform, [
                [2, 0, 0],
                [0, 2, 0]
            ]);
            done();
        })
        it('should return rotate Pi/2', (done) => {
            let keypoints1 = [[0,0], [1,0], [0,1]];
            let keypoints2 = [[0,0], [0,1], [-1,0]];
            let result = cv.estimateAffinePartial2D(keypoints1, keypoints2);
            assert.deepEqual(result.transform, [
                [0, -1, 0],
                [1,  0, 0]
            ]);
            done();
        })
        it('should select correct inliers', (done) => {
            // This is a case which initially returned [[1],[0],[1],[1],[1]] as inliers instead of [[1],[1],[1],[1],[0]]
            // Setting ransacReprojThreshold = 2 (instead of default 3) made estimateAffinePartial2D pick the correct inliers 
            let keypoints1 = [ [ 70, 67 ], [ 64, 68 ], [ 74, 66 ], [ 70, 62 ], [ 38, 94 ] ];
            let keypoints2 = [ [ 19, 28 ], [ 20, 34 ], [ 17, 25 ], [ 15, 28 ], [ 33, 35 ] ];
            let affineResult = cv.estimateAffinePartial2D(keypoints1, keypoints2);
            assert.deepEqual(
                affineResult.inliers,
                [[1],[1],[1],[1],[0]]
            );
            done();
        })
    })

    // describe('#findRectangles', () => {
    //     it('should findRectangles', (done) => {
    //         let grayImg = [
    //             [0,  0,  0,  0,  0,  0,  0,  0,  0,  0],
    //             [0,  0,  0,  0,100,100,100,  0,  0,  0],
    //             [0,  0,  0,  0,100,100,100,  0,  0,  0],
    //             [0,  0,  0,  0,100,100,  0,  0,  0,  0],
    //             [0,  0,  0,  0,  0,  0,  0,  0,  0,  0],
    //             [0,  0,  0,  0,  0,  0,  0,  0,  0,  0],
    //             [0,  0,  0,  0,100,100,100,  0,  0,  0],
    //             [0,  0,  0,  0,100,100,100,  0,  0,  0],
    //             [0,  0,  0,  0,100,100,100,  0,  0,  0],
    //             [0,  0,  0,  0,  0,  0,  0,  0,  0,  0]
    //         ];
    //         let minContourLength = 5;
    //         let minArea = 0;
    //         let maxArea = 100;
    //         let imageData = new ImageData(new Uint8ClampedArray(grayImg).flatten, grayImg[0].length, grayImg.length);
    //         let rectangles = cv.findRectangles(imageData, minContourLength, minArea, maxArea);
    //         assert.deepEqual(rectangles, [
    //             [[4, 6], [4, 8], [6, 8], [6, 6]]
    //         ]);
    //         done();
    //     })
    // })
})
