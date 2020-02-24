const {fetch} = require('fetch-ponyfill')();
const config = require("../../../config.json");
const mtg_sets = require('../mtg_sets.js');

module.exports.load = async function(mtg_sets) {
    return await Promise.all(mtg_sets.map(s => fetch(`assets/indexes/${s}.json`)))
        .then(responses => {
            let jsons = Promise.all(responses.map(r => r.json()));
            return jsons.then(jj => {
                let result = Object.assign(...jj);
                if (!config.includeBasicLands) {
                    result = mtg_sets.filterOutBasicLands(result);
                }
                if (!config.includeDuplicateIllustrations) {
                    result = mtg_sets.filterOutDuplicateIllustrations(result);
                }
                return result;
            })
        });
} 
