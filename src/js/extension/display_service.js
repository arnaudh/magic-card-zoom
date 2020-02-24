const {fetch} = require('fetch-ponyfill')();
const mtg_sets = require('../mtg_sets.js');

let urlsDict;

Promise.all(mtg_sets.allAvailableSets.map(s => {
        let sanitizedSet = s === 'con' ? '_con' : s; // Workaround to Chrome not accepting con.* files (https://chromium.googlesource.com/chromium/src/+/refs/tags/57.0.2958.1/net/base/filename_util.cc#157)
        return fetch(`assets/metadata/cards/display_urls/${sanitizedSet}.json`);
    }))
    .then(responses => {
        let jsons = Promise.all(responses.map(r => r.json()));
        return jsons.then(jj => {
            urlsDict = Object.assign(...jj);
            console.log(`display_service ready with ${Object.keys(urlsDict).length} items`);
        })
    });

function getDisplayUrl(card_id) {
    if (!card_id in urlsDict) {
        throw Error(`card_id ${card_id} not found in urlsDict containing ${Object.keys(urlsDict).length} entries`);
    }
    return urlsDict[card_id];
}


module.exports.getDisplayUrl = getDisplayUrl;
