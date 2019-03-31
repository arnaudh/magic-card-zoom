const assert = require('assert');
const BruteForceSearcher = require('../../../src/js/core/brute_force_searcher.js');

describe('brute_force_searcher', () => {
    var bf_searcher = new BruteForceSearcher('bruteforce-euclidean');
    bf_searcher.setPoints([
        [0,0],
        [0,1],
        [0,2],
        [0,3],
        [0,4]
    ]);
    describe('#knn', () => {
            it(`should work for k==1`, (done) => {
                var results = bf_searcher.knn([0,3.2], 1);
                assert.equal(results[0].i, 3);
                done();
            })
            it(`should work for k==2`, (done) => {
                var results = bf_searcher.knn([0,1.2], 2);
                assert.equal(results[0].i, 1);
                assert.equal(results[1].i, 2);
                done();
            })
            it(`should work for k==3`, (done) => {
                var results = bf_searcher.knn([0,1.2], 3);
                assert.equal(results[0].i, 1);
                assert.equal(results[1].i, 2);
                assert.equal(results[2].i, 0);
                done();
            })
        })
});