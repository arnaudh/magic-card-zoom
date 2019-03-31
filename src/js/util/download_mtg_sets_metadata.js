var scryfallApi = require("./scryfall_api.js");
var ioTools = require("./io_tools.js");

const SCRYFALL_SETS_URL = 'https://api.scryfall.com/sets';
const LOCAL_FILE = 'assets/metadata/sets/sets.json';

function downloadMtgSetsMetadata() {
    console.log('###############################################');
    console.log('#   Downloading sets metadata from Scryfall   #');
    console.log('###############################################');

    return scryfallApi.getAllPaginatedItems(SCRYFALL_SETS_URL)
        .then(function (items) {
            ioTools.writePrettyJsonToFile(items, LOCAL_FILE);
            console.log('Download sets metadata from Scryfall DONE\n');
        });
}

module.exports = downloadMtgSetsMetadata;

if (require.main === module) {
    downloadMtgSetsMetadata();
}
