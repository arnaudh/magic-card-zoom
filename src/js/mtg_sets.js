const standardDict = require("../../assets/metadata/sets/standard.json");
const allSetsInfo = require("../../assets/metadata/sets/sets.json");
const config = require("../../config.json");


let setsDict = {};
for (let set_info of allSetsInfo) {
    setsDict[set_info.code] = set_info;
}
const allSets = Object.keys(setsDict);


let allAvailableStandards = [];
let allAvailableSets = [];
for (let availableStandard of config.availableStandards) {
    allAvailableStandards.push(availableStandard);
    allAvailableSets.push(...expandSets([availableStandard]));
}
allAvailableSets = unique(allAvailableSets);

function expandSets (mtg_sets) {
    if (typeof mtg_sets === "string") {
        mtg_sets = [mtg_sets];
    }
    let actual_mtg_sets = [];
    let without = false;
    for (let mtg_set of mtg_sets) {
        let match = /^standard-(.+)$/.exec(mtg_set);
        let mtg_sets_to_append;
        if (match) {
            mtg_sets_to_append = getLegalSetsForStandard(match[1]);
        // } else if (mtg_groups.includes(mtg_set)) {
            // mtg_sets_to_append = mtg_groups[mtg_set]
        } else if (mtg_set == "all") {
            mtg_sets_to_append = allSets;
        } else if (mtg_set == "allowed") {
            mtg_sets_to_append = allAvailableSets;
        } else if (mtg_set == "without") {
            without = true;
            continue;
        } else if (allSets.includes(mtg_set)) {
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
    if (config.includeTokens) {
        for (let set_info of allSetsInfo) {
            // assumes 1 level of parenting max
            if (set_info.parent_set_code &&
                actual_mtg_sets.includes(set_info.parent_set_code) &&
                set_info.name.includes('Tokens')) {
                actual_mtg_sets.push(set_info.code);
            }
        }
    }
    return actual_mtg_sets;
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


module.exports.expandSets = expandSets;
module.exports.allAvailableSets = allAvailableSets;
module.exports.allAvailableStandards = allAvailableStandards;
module.exports.getMtgSetName = getMtgSetName;
module.exports.getMtgSetIconUrl = getMtgSetIconUrl;
module.exports.getStandardInfo = getStandardInfo;
module.exports.findMtgStandardInText = findMtgStandardInText;

