const standardDict = require("../../assets/metadata/sets/standard.json");
const config = require("../../config.json");
const allSetsInfoUnsorted = require("../../assets/metadata/sets/sets.json");

// Sort by release date ascending
const allSetsInfo = allSetsInfoUnsorted.sort((a, b) => new Date(a.released_at) - new Date(b.released_at));

let allSetsInfoDict = {};
for (let set_info of allSetsInfo) {
    allSetsInfoDict[set_info.code] = set_info;
}

let coreExpansionSetsInfo = allSetsInfo.filter(function(info) {
    if (["fbb", "4bb" ,"sum"].includes(info.code)) {
        // these 'core' sets are actually special reprints of other sets
        return false;
    } else if (info.code === 'tjmp') {
        // work around Scryfall bug which refers to non-existent set (Jumpstart doesn't have tokens)
        return false;
    } else {
        return ["core", "expansion"].includes(info.set_type);
    }
});

let modernHorizonsSet = allSetsInfoDict['mh1'];
let modernMastersSets = allSetsInfo.filter(info => info.set_type === "masters" && info.name.includes("Modern Masters"));
let commanderSets = allSetsInfo.filter(info => info.set_type === "commander" && !info.name.includes("Tokens"));

let allStandards = Object.keys(standardDict).map(x => `standard-${x}`).reverse();
let allFormats = allStandards.concat('pioneer', 'modern', 'vintage', 'commander');

let allAvailableSets = expandSets("all_sets");
let allAvailableFormats = allFormats;

if (config.allowedFormats.length > 0) {
    let allowedSets = config.allowedFormats.map(format => expandSets(format)).flat()
    allAvailableSets = allAvailableSets.filter(code => allowedSets.includes(code));
    allAvailableFormats = allAvailableFormats.filter(s => config.allowedFormats.includes(s));
}

// Expand formats into their constituent sets
// Note: expands regardless of config.allowedFormats
function expandSets(mtg_sets_or_formats, includeTokens=config.includeTokens) {
    // console.log(`expandSets() includeTokens=${includeTokens}, mtg_sets_or_formats=`, mtg_sets_or_formats, );
    if (mtg_sets_or_formats == "all_sets") {
        mtg_sets_or_formats = ["commander", "modern"];
    }
    if (typeof mtg_sets_or_formats === "string") {
        mtg_sets_or_formats = [mtg_sets_or_formats];
    }
    let actual_mtg_sets_infos = [];
    for (let mtg_set_or_format of mtg_sets_or_formats) {
        if (mtg_set_or_format in allSetsInfoDict) {
            actual_mtg_sets_infos.push(allSetsInfoDict[mtg_set_or_format]);
        } else {
            let match = /^standard-(.+)$/.exec(mtg_set_or_format);
            let mtg_set_infos_to_append;
            if (match) {
                let legalSets = getLegalSetsForStandard(match[1]);
                mtg_set_infos_to_append = allSetsInfo.filter(info => legalSets.includes(info.code));
            } else if (mtg_set_or_format == "pioneer") {
                mtg_set_infos_to_append = coreExpansionSetsSince('rtr');
            } else if (mtg_set_or_format == "modern") {
                // According to https://mtg.gamepedia.com/Modern, the following sets are legal in Modern:
                // - Cards from all regular core sets and expansions since Eighth Edition
                // - Timeshifted cards in Time Spiral (included in the expansion sets above since set_type is 'expansion' and release date > release date of Eight Edition)
                // - Planeswalker decks (included in the expansion sets above, e.g. "Vraska, Regal Gorgon" is in grn.json, with collector number 269 out of 259)
                // - Buy-a-Box promos (included in the expansion sets above, e.g. "Firesong and Sunspeaker" is in dom.json, with collector number 280 out of 269)
                // - Modern Horizons 2019
                // - The Modern Masters series
                mtg_set_infos_to_append = coreExpansionSetsSince('8ed').concat(modernHorizonsSet).concat(modernMastersSets);
            } else if (mtg_set_or_format == "vintage") {
                mtg_set_infos_to_append = coreExpansionSetsInfo.slice(); // slice to clone
            } else if (mtg_set_or_format == "commander") {
                mtg_set_infos_to_append = coreExpansionSetsInfo.slice().concat(commanderSets); // slice to clone
            } else {
                throw `Unknown mtg_set_or_format "${mtg_set_or_format}"`;
            }

            if (includeTokens) {
                let parent_codes = mtg_set_infos_to_append.map(info => info.code);
                for (let set_info of allSetsInfo) {
                    if (set_info.set_type === "token" &&
                        set_info.parent_set_code &&
                        parent_codes.includes(set_info.parent_set_code)) {
                        mtg_set_infos_to_append.push(set_info);
                    }
                }
            }

            actual_mtg_sets_infos.push(...mtg_set_infos_to_append);
        }
    }
    
    let actual_mtg_sets_infos_unique = unique(actual_mtg_sets_infos);
    // Sort by released date asc, token sets after core sets if same release date
    let actual_mtg_sets_infos_sorted = actual_mtg_sets_infos_unique.sort(function compareFunction(a, b) {
        let res = new Date(a.released_at) - new Date(b.released_at);
        if (res === 0) {
            if (a.name.includes("Token")) {
                return 1;
            } else if (b.name.includes("Token")) {
                return -1;
            }
        }
        return res;
    });
    // console.log('expandSets() -> actual_mtg_sets=',actual_mtg_sets);
    return actual_mtg_sets_infos_sorted.map(info => info.code);
}

function coreExpansionSetsSince(code) {
    let releasedAt = allSetsInfoDict[code].released_at;
    return coreExpansionSetsInfo.filter(info => info.released_at >= releasedAt);
}

function getLegalSetsForStandard(mtg_set) {
    return standardDict[mtg_set];
}

function getMtgSetName(code) {
    return allSetsInfoDict[code].name;
}

function getMtgSetIconUrl(code) {
    return allSetsInfoDict[code].icon_svg_uri;
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
    for (const [code, set_info] of Object.entries(allSetsInfoDict)) {
        if (allAvailableFormats.includes(`standard-${code}`)) {
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
        let setsInfo = legalSets.map(code => allSetsInfoDict[code]);
        return {
            'sets': setsInfo,
            'released_at': setsInfo[setsInfo.length-1].released_at
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
module.exports.allAvailableFormats = allAvailableFormats;
module.exports.getMtgSetName = getMtgSetName;
module.exports.getMtgSetIconUrl = getMtgSetIconUrl;
module.exports.getStandardInfo = getStandardInfo;
module.exports.inferMtgFormatFromText = inferMtgFormatFromText;
module.exports.filterOutBasicLands = filterOutBasicLands;
module.exports.filterOutDuplicateIllustrations = filterOutDuplicateIllustrations;

