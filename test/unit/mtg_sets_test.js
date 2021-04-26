const assert = require('assert');
const mtg_sets = require('../../src/js/mtg_sets.js');
const fs = require('fs');

let regenerate = false; // set this to true to regenerate the test data file

let dict_file = `${__dirname}/assets/expanded_sets.json`;
let expected_dict = JSON.parse(fs.readFileSync(dict_file));
let regenerated_dict = {};

function test_expand_set(format_name, includeTokens) {
    it(`should work with "${format_name}" includeTokens=${includeTokens}`, (done) => {
        let result = mtg_sets.expandSets(format_name, includeTokens);
        if (regenerate) {
            if (! (format_name in regenerated_dict)) {
                regenerated_dict[format_name] = {}
            }
            regenerated_dict[format_name][includeTokens] = result;
        } else {
            let expected = expected_dict[format_name][includeTokens];
            assert.deepEqual(
                result,
                expected
            );
        }
        done();
    })
}

function update_regenerated_dict() {
    it('regenerate dict', (done) => {
        fs.writeFileSync(dict_file, JSON.stringify(regenerated_dict, null, 2));
        done();
    })
}

describe('mtg_sets', () => {
    describe('#expandSets', () => {
            test_expand_set('standard-ktk', includeTokens=false);
            test_expand_set('standard-ktk', includeTokens=true);
            test_expand_set('modern', includeTokens=false);
            test_expand_set('modern', includeTokens=true);
            test_expand_set('vintage', includeTokens=false);
            test_expand_set('vintage', includeTokens=true);
            test_expand_set('commander', includeTokens=false);
            test_expand_set('commander', includeTokens=true);
            test_expand_set('all_sets', includeTokens=false);
            test_expand_set('all_sets', includeTokens=true);
            if (regenerate) {
                update_regenerated_dict()
            }
        })
    
    describe('#inferMtgFormatFromText', () => {
        it('should work with standard', (done) => {
            assert.equal(
                mtg_sets.inferMtgFormatFromText('Finals Khans of Tarkir'),
                "standard-ktk"
            );
            done();
        })
        it('should match longer name first', (done) => {
            assert.equal(
                mtg_sets.inferMtgFormatFromText('Zendikar Rising Spoilers — September 5'),
                "standard-znr" // Zendikar Rising, and not "standard-zen" which corresponds to "Zendikar"
            );
            done();
        })
        it('should work with alternate names', (done) => {
            assert.equal(
                mtg_sets.inferMtgFormatFromText('Strixhaven - Draft MTG | Reid Duke'),
                "standard-stx" // "Strixhaven" is the short name for "Strixhaven: School of Mages"
            );
            done();
        })
    })     
});
