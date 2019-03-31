const {fetch} = require('fetch-ponyfill')();

module.exports.load = async function(mtg_sets) {
    return await Promise.all(mtg_sets.map(s => fetch(`assets/indexes/${s}.json`)))
        .then(responses => {
            let jsons = Promise.all(responses.map(r => r.json()));
            return jsons.then(jj => {
                var result = Object.assign(...jj);
                return result;
            })
        });
} 
