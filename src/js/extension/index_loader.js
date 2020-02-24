const {fetch} = require('fetch-ponyfill')();
const config = require("../../../config.json");
const mtg_sets = require('../mtg_sets.js');

module.exports.load = async function(mtgSets) {
    return await Promise.all(mtgSets.map(s => {
            let sanitizedSet = s === 'con' ? '_con' : s; // Workaround to Chrome not accepting con.* files (https://chromium.googlesource.com/chromium/src/+/refs/tags/57.0.2958.1/net/base/filename_util.cc#157)
            return fetch(`assets/indexes/${sanitizedSet}.json`);
        }))
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
