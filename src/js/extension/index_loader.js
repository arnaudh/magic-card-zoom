const {fetch} = require('fetch-ponyfill')();
const config = require("../../../config.json");
const basicLands = require("../../../assets/metadata/cards/basic_lands.json");

module.exports.load = async function(mtg_sets) {
    return await Promise.all(mtg_sets.map(s => fetch(`assets/indexes/${s}.json`)))
        .then(responses => {
            let jsons = Promise.all(responses.map(r => r.json()));
            return jsons.then(jj => {
                let result = Object.assign(...jj);
                if (!config.includeBasicLands) {
                    let lengthBefore = Object.keys(result).length;
                    result = Object.fromEntries(Object.entries(result).filter(([k,v]) => !basicLands.includes(k)));
                    let lengthAfter = Object.keys(result).length;
                    console.log(`Removing basic lands: drops the number of cards from ${lengthBefore} to ${lengthAfter}`);
                }
                return result;
            })
        });
} 
