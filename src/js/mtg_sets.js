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
        return ["core", "expansion", "token", "commander"].includes(info.set_type);
    }
});
let allAvailableSets = allAvailableSetsInfo.map(info => info.code);

let setsDict = {};
for (let set_info of allAvailableSetsInfo) {
    setsDict[set_info.code] = set_info;
}

let allAvailableStandards = Object.keys(standardDict).map(x => `standard-${x}`);

function expandSets (mtg_sets, includeTokens=config.includeTokens) {
    console.log(`expandSets() includeTokens=${includeTokens}, mtg_sets=`, mtg_sets, );
    if (typeof mtg_sets === "string") {
        mtg_sets = [mtg_sets];
    }
    let actual_mtg_sets = [];
    let without = false;
    let allSetsToConsider = allAvailableSetsInfo;
    if (!includeTokens) {
        allSetsToConsider = allSetsToConsider.filter(info => info.set_type !== "token");
    }
    let allSetsToConsiderWithoutCommander = allSetsToConsider.filter(info => info.block !== "Commander");
    for (let mtg_set of mtg_sets) {
        let match = /^standard-(.+)$/.exec(mtg_set);
        let mtg_sets_to_append;
        if (match) {
            mtg_sets_to_append = getLegalSetsForStandard(match[1]);
            if (includeTokens) {
                for (let set_info of allSetsInfo) {
                    // assumes 1 level of parenting max
                    if (set_info.parent_set_code &&
                        mtg_sets_to_append.includes(set_info.parent_set_code) &&
                        set_info.set_type === "token") {
                        mtg_sets_to_append.push(set_info.code);
                    }
                }
            }
        } else if (mtg_set == "pioneer") {
            mtg_sets_to_append = allSetsSince(allSetsToConsiderWithoutCommander, 'rtr');
        } else if (mtg_set == "modern") {
            mtg_sets_to_append = allSetsSince(allSetsToConsiderWithoutCommander, '8ed');
        } else if (mtg_set == "vintage") {
            mtg_sets_to_append = allSetsToConsiderWithoutCommander.map(info => info.code);
        } else if (mtg_set == "commander" || mtg_set == "all") {
            mtg_sets_to_append = allSetsToConsider.map(info => info.code);
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
    console.log('expandSets() -> actual_mtg_sets=',actual_mtg_sets);
    return actual_mtg_sets;
}

function allSetsSince(setsInfo, code) {
    let index = setsInfo.findIndex(info => info.code === code);
    // Assumes setsInfo are ordered from most recent to oldest
    return setsInfo.map(info => info.code).slice(0, index+1);
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

function inferMtgFormatFromText(text) {
    let potentialMtgStandard = findMtgStandardInText(text);
    let textLower = text.toLowerCase();
    if (potentialMtgStandard) {
        return potentialMtgStandard;
    } else if (textLower.includes("commander")) {
        return "commander";
    } else if (textLower.includes("vintage")) {
        return "vintage";
    } else if (textLower.includes("modern")) {
        return "modern";
    } else if (textLower.includes("pioneer")) {
        return "pioneer";
    } else {
        return null;
    }     
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
module.exports.inferMtgFormatFromText = inferMtgFormatFromText;
module.exports.filterOutBasicLands = filterOutBasicLands;
module.exports.filterOutDuplicateIllustrations = filterOutDuplicateIllustrations;

