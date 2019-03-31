const {fetch} = require('fetch-ponyfill')();
const mtg_sets = require('../mtg_sets.js');

let urlsDict;

Promise.all(mtg_sets.allAvailableSets.map(s => fetch(`assets/metadata/cards/display_urls/${s}.json`)))
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
