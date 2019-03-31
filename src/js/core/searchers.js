const BruteForceSearcher = require('./brute_force_searcher.js');

function searcherFromName(name) {
    if (name.startsWith('bruteforce')) {
        return new BruteForceSearcher(name);
    } else {
        throw `Unknown matcher name ${name}`;
    }
}

module.exports.fromName = searcherFromName;
