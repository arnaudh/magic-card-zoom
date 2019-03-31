const assert = require('assert');
const mtg_sets = require('../../src/js/mtg_sets.js');

describe('mtg_sets', () => {
    describe('#expandSets', () => {
            it(`should work with 'standard-xxx'`, (done) => {
                assert.deepEqual(
                    mtg_sets.expandSets(['standard-ktk']),
                    [ 'ths', 'bng', 'jou', 'm15', 'ktk', 'tktk', 'tm15', 'tjou', 'tbng', 'tths' ]
                );
                done();
            })
            it(`should work with 'without'`, (done) => {
                assert.deepEqual(
                    mtg_sets.expandSets(['akh', 'ktk', 'm15', 'without', 'akh']),
                    ['ktk', 'm15', 'tktk', 'tm15']
                );
                done();
            })
        })
});
