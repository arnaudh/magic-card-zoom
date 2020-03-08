const standardDict = require("../../assets/metadata/sets/standard.json");
const allSetsInfo = require("../../assets/metadata/sets/sets.json");
const config = require("../../config.json");

// Available sets = core, expansion & token sets (with a few exceptions)
let allAvailableSetsInfo = allSetsInfo.filter(function(info) {
    if (["fbb", "4bb" ,"sum"].includes(info.code)) {
        // these 'core' sets are special reprints of other sets
        return false;
    } else if(info.code === 'chr') {
        // Chronicles is a 'masters' set but still was part of Standard (https://en.wikipedia.org/wiki/Magic:_The_Gathering_compilation_sets#Chronicles)
        return true;
    } else {
        return ["core", "expansion", "token"].includes(info.set_type);
    }
});
let allAvailableSets = allAvailableSetsInfo.map(info => info.code);

let setsDict = {};
for (let set_info of allAvailableSetsInfo) {
    setsDict[set_info.code] = set_info;
}

let allAvailableStandards = [];
for (let availableStandard of config.availableStandards) {
    allAvailableStandards.push(availableStandard);
}

function expandSets (mtg_sets, includeTokens=config.includeTokens) {
    if (typeof mtg_sets === "string") {
        mtg_sets = [mtg_sets];
    }
    let actual_mtg_sets = [];
    let without = false;
    let allSetsToConsiderInfo = allAvailableSetsInfo;
    if (!includeTokens) {
        allSetsToConsiderInfo = allSetsToConsiderInfo.filter(info => info.set_type !== "token");
    }
    for (let mtg_set of mtg_sets) {
        let match = /^standard-(.+)$/.exec(mtg_set);
        let mtg_sets_to_append;
        if (match) {
            mtg_sets_to_append = getLegalSetsForStandard(match[1]);
        } else if (mtg_set == "all") {
            mtg_sets_to_append = allSetsToConsiderInfo.map(info => info.code);
        } else if (mtg_set == "modern") {
            mtg_sets_to_append = allSetsSince(allSetsToConsiderInfo, '8ed');
        } else if (mtg_set == "pioneer") {
            mtg_sets_to_append = allSetsSince(allSetsToConsiderInfo, 'rtr');
        } else if (mtg_set == "without") {
            without = true;
            continue;
        } else if (allAvailableSets.includes(mtg_set)) {
            mtg_sets_to_append = [mtg_set]
        } else {
            throw `Unknown mtg_set ${mtg_set}`;
        }

        if (without) {
            actual_mtg_sets = difference(actual_mtg_sets, mtg_sets_to_append);
        } else {
            actual_mtg_sets.push(...mtg_sets_to_append);
        }
    }
    return actual_mtg_sets;
}

function allSetsSince(allSetsToConsiderInfo, code) {
    let index = allSetsToConsiderInfo.findIndex(info => info.code === code);
    // Assumes allSetsToConsiderInfo are ordered from most recent to oldest
    return allSetsToConsiderInfo.map(info => info.code).slice(0, index+1);
}

function getLegalSetsForStandard(mtg_set) {
    return standardDict[mtg_set];
}

function getMtgSetName(code) {
    return setsDict[code].name;
}

function getMtgSetIconUrl(code) {
    return setsDict[code].icon_svg_uri;
}

function findMtgStandardInText(text) {
    let textUpper = text.toUpperCase();
    for (const [code, set_info] of Object.entries(setsDict)) {
        if (allAvailableStandards.includes(`standard-${code}`)) {
            let mtgSetName = set_info.name.toUpperCase();
            if (textUpper.includes(mtgSetName)) {
                return `standard-${code}`;
            }
        }
    }
    console.log(`Standard not found in text: "${text}"`);
    return null;
}

function getStandardInfo(standard) {
    let match = /^standard-(.+)$/.exec(standard);
    if (match) {
        let legalSets = getLegalSetsForStandard(match[1]);
        return {
            'sets': legalSets.map(code => setsDict[code])
        };
    } else {
        throw Error(`standard "${standard}" was not of the form "standard-xxx"`);
    }
}

function flatten(arrayOfArrays) {
    return [].concat(...arrayOfArrays);
}

function unique(arr) {
    return [...new Set(arr)];
}

function difference(a, b) {
    return [...a].filter(x => !b.includes(x));
}

function filterDict(dict, filter) {
    // example: filterDict({'a':1,'b':1,'c':1}, ([k,v]) => ['a','c'].includes(k)))
    fromEntries = arr => Object.assign({}, ...Array.from(arr, ([k, v]) => ({[k]: v}) ));
    return fromEntries(Object.entries(dict).filter(filter));
}

function filterOutBasicLands(index) {
    const basicLands = require("../../assets/metadata/cards/basic_lands.json");
    let lengthBefore = Object.keys(index).length;
    let filteredIndex = filterDict(index, ([k,v]) => !basicLands.includes(k));
    let lengthAfter = Object.keys(filteredIndex).length;
    console.log(`Removed basic lands: number of cards went from ${lengthBefore} to ${lengthAfter}`);
    return filteredIndex;
}

function filterOutDuplicateIllustrations(index) {
    const duplicateIllustrations = require('../../assets/metadata/cards/duplicate_illustrations.json');
    let cardIdsToRemove = [];
    for (const [illustrationId, cardIds] of Object.entries(duplicateIllustrations)) {
        let cardIdsInIndex = cardIds.filter(cardId => index.hasOwnProperty(cardId));
        if (cardIdsInIndex.length > 1) {
            cardIdsToRemove.push(...cardIdsInIndex.slice(0,-1));
        }
    }
    let lengthBefore = Object.keys(index).length;
    let filteredIndex = filterDict(index, ([k,v]) => !cardIdsToRemove.includes(k));
    let lengthAfter = Object.keys(filteredIndex).length;
    console.log(`Removed duplicate illustrations: number of cards went from ${lengthBefore} to ${lengthAfter}`);
    return filteredIndex;
}

module.exports.expandSets = expandSets;
module.exports.allAvailableSets = allAvailableSets;
module.exports.allAvailableStandards = allAvailableStandards;
module.exports.getMtgSetName = getMtgSetName;
module.exports.getMtgSetIconUrl = getMtgSetIconUrl;
module.exports.getStandardInfo = getStandardInfo;
module.exports.findMtgStandardInText = findMtgStandardInText;
module.exports.filterOutBasicLands = filterOutBasicLands;
module.exports.filterOutDuplicateIllustrations = filterOutDuplicateIllustrations;

