const assert = require('assert');
const ioTools = require('./io_tools.js');
const mtg_sets = require("../mtg_sets.js");

const LOCAL_CARDS_METADATA_DIR = 'assets/metadata/cards/full';
const OUTPUT_FILE = 'assets/metadata/cards/duplicate_illustrations.json'

function generateDuplicateIllustrationsDictionnary() {
    console.log('######################################################');
    console.log('#   Generating duplicate illustrations dictionnary   #');
    console.log('######################################################');
    
    let duplicatesDict = {};
    let totalCards = 0;

    for (let mtgSet of mtg_sets.allAvailableSets) {
        console.log('Reading cards metadata from', mtgSet);
        let obj = ioTools.readJsonSync(`${LOCAL_CARDS_METADATA_DIR}/${mtgSet}.json`);

        totalCards += obj.length

        for (let card of obj) {
            getSidesIdAndIllustrationID(card).forEach(([sideId, illustrationID]) => {
                let cardId = `${mtgSet}-${sideId}`;
                if (illustrationID in duplicatesDict) {
                    duplicatesDict[illustrationID].push(cardId);
                } else {
                    duplicatesDict[illustrationID] = [cardId];
                }
            });
        }
    }

    var duplicatesDictNoSingletons = Object.assign({}, ...
        Object.entries(duplicatesDict).filter(([k,v]) => v.length>1).map(([k,v]) => ({[k]:v}))
    );

    let duplicatesCount = Object.entries(duplicatesDictNoSingletons).map(([k,v]) => v.length-1).reduce((a,b)=>a+b)
    console.log('Total cards:', totalCards);
    console.log('Duplicate illustrations:', duplicatesCount);
    ioTools.writePrettyJsonToFile(duplicatesDictNoSingletons, OUTPUT_FILE);
}

//Example card with two faces, and so 2 illustration IDs: soi-49
//Note: all "faces" may not have an illustration_id, e.g. akh-214 (two arts on the same side of the card, a single illustration id)
function getSidesIdAndIllustrationID(item) {
    let illustrationIDs;
    if (item.illustration_id) {
        illustrationIDs = [item.illustration_id];
    } else if (item.card_faces) {
        illustrationIDs = item.card_faces.map(face => face.illustration_id).filter(x => x !== undefined);
    }

    if (illustrationIDs === undefined || illustrationIDs.length === 0) {
        console.log(`[find_duplicate_illustrations] Skipping card without illustrationID: ${item.name}`);
        return [];
    }

    let sides = [];
    for (var i = 0; i < illustrationIDs.length; i++) {   
        let sideId = item.collector_number;
        if (illustrationIDs.length == 2) {
            sideId += (i == 0) ? "_1" : "_2";
        }
        sides.push([sideId, illustrationIDs[i]])
    }
    return sides;
}

module.exports = generateDuplicateIllustrationsDictionnary;

if (require.main === module) {
    generateDuplicateIllustrationsDictionnary();
}

