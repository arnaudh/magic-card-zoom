const assert = require('assert');
const ContourFinder = require('../../../src/js/core/contour_finder.js');
const CvDebug = require('../../../src/js/util/cv_debug.js');

let contourFinder;

before(function(done) {
    this.timeout(15000);
    return require('../../../src/js/core/opencvjs_wrapper.js').initialize(function(cvwrapper) {
        contourFinder = new ContourFinder(cvwrapper);
        done();
    })
})

describe('contour_finder', () => {
    describe('#getPotentialCardHeights', () => {
            it(`should work`, (done) => {
                let originalImg = new CvDebug().imread(`test/unit/assets/screenshot1.png`);
                let originalImageData = new CvDebug().toImageData(originalImg);
                let expectedSize = 66;
                let maxPxDifference = 2;

                let results = contourFinder.getPotentialCardHeights(originalImageData);

                let foundExpectedSize = results.some(e => Math.abs(e-expectedSize) <= maxPxDifference);
                assert.equal(foundExpectedSize, true, `Results ${results} did not contain ${expectedSize} ± ${maxPxDifference}`);
                done();
            })
        })
});
