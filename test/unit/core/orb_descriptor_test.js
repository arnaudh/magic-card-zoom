const assert = require('assert');
const OrbDescriptor = require('../../../src/js/core/orb_descriptor.js');
const CvDebug = require('../../../src/js/util/cv_debug.js');

let cvDebug = new CvDebug();

describe('orb_descriptor', () => {
    var descriptor = new OrbDescriptor('orb-maxkeypoints200');
    let imageData = cvDebug.toImageData(cvDebug.imread(`/Users/ahenry/Desktop/Screenshot 2019-01-20 at 13.08.32.png`));
    describe('#describe', () => {
            it(`should work`, (done) => {
                let description = descriptor.describe(imageData);
                // console.log('description', description);
                // var results = bf_searcher.knn([0,3.2], 1);
                // assert.equal(results[0].i, 3);
                done();
            })
        })
});