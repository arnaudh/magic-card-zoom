const ioTools = require('./io_tools.js');
const mtg_sets = require("../mtg_sets.js");

const LOCAL_CARDS_METADATA_DIR = 'assets/metadata/cards/full';
const OUTPUT_FILE = 'assets/metadata/cards/basic_lands.json'

const basicLandNames = [
    'Mountain',
    'Plains',
    'Forest',
    'Island',
    'Swamp'
];

function generateBasicLandArray() {
    console.log('####################################');
    console.log('#   Generating basic lands array   #');
    console.log('####################################');
    
    let basicLandsArray = [];
    let totalCards = 0;

    for (let mtgSet of mtg_sets.allAvailableSets) {
        console.log('Reading cards metadata from', mtgSet);
        let obj = ioTools.readJsonSync(`${LOCAL_CARDS_METADATA_DIR}/${mtgSet}.json`);

        totalCards += obj.length

        for (let card of obj) {
            if (basicLandNames.includes(card.name)) {
                let cardId = `${mtgSet}-${card.collector_number}`;
                basicLandsArray.push(cardId);
            }
        }
    }

    console.log('Total cards:', totalCards);
    console.log('Basic lands:', basicLandsArray.length);
    ioTools.writePrettyJsonToFile(basicLandsArray, OUTPUT_FILE);
}


module.exports = generateBasicLandArray;

if (require.main === module) {
    generateBasicLandArray();
}

