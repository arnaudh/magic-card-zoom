const fs = require('fs-extra');
const path = require('path');
const requestPromise = require('request-promise');
const cheerio = require('cheerio');
const allSetsInfo = require("../../../assets/metadata/sets/sets.json");


const WIKIPEDIA_STANDARD_URL = 'https://en.wikipedia.org/wiki/Timeline_of_Magic:_the_Gathering_Standard_(Type_II)';
const LOCAL_FILE = 'assets/metadata/sets/standard.json';

const latestMtgSet = 'dmu';
// These are used for substring matching, e.g. will ignore all sets containing the word "exclusive"
const ignoreUnrecognizedSetNames = [
    'exclusive',
    'restricted',
    'other Arena-only cards',
    '+WelcomeDeck2017',
];

// to translate from wikipedia to scryfall
let alternativeNames = {
    '4TH EDITION': 'FOURTH EDITION',
    '5TH EDITION': 'FIFTH EDITION',
    '6TH EDITION': 'CLASSIC SIXTH EDITION',
    '7TH EDITION': 'SEVENTH EDITION',
    '8TH EDITION': 'EIGHTH EDITION',
    '9TH EDITION': 'NINTH EDITION',
    '10TH EDITION': 'TENTH EDITION',
    'TIMESHIFTED': 'TIME SPIRAL TIMESHIFTED',
    'IKORIA: LAND OF BEHEMOTHS': 'IKORIA: LAIR OF BEHEMOTHS',
    'STRIXHAVEN': 'STRIXHAVEN: SCHOOL OF MAGES',
    'D&AMP;D FORGOTTEN REALMS': 'ADVENTURES IN THE FORGOTTEN REALMS',
    // Looks like new sets all have the name of the plane in it, but the Wikipedia page omits it
    'MIDNIGHT HUNT': 'INNISTRAD: MIDNIGHT HUNT',
    'CRIMSON VOW': 'INNISTRAD: CRIMSON VOW',
    'NEON DYNASTY': 'KAMIGAWA: NEON DYNASTY',
}

function downloadStandardInfo() {
    console.log('################################################');
    console.log('#   Downloading Standard info from Wikipedia   #');
    console.log('################################################');
    console.log(`Calling ${WIKIPEDIA_STANDARD_URL}`);
    return requestPromise(WIKIPEDIA_STANDARD_URL)
        .then(function (body) {
            const $ = cheerio.load(body);

            // helper function to get text from HTML tag, converting children <br> tags to newlines
            $.prototype.textln = function () {
                this.find('br').replaceWith('\n');
                this.find('*').each(function () {
                    $(this).replaceWith($(this).text());
                });
                return this.html();
            }

            let mtgStandardDict = {};
            let haveErrors = false;

            $('.wikitable tr').each(function (i, elem) {
                let tds = $(this).find('td');
                if (tds.length == 6) {
                    let mtgSetsList = [];
                    let setsDirty = $(tds[2]).textln().split('\n');
                    // console.log('setsDirty', setsDirty);

                    for (var mtgSet of setsDirty) {
                        mtgSet = mtgSet.trim();
                        if (mtgSet && ! /^[-"&(]|Revised.*/.exec(mtgSet)) {
                            let sanitizedMtgSetName = mtgSet
                                .replace(/\[.*\]/, '')
                                .replace(/\(.*\)/, '')
                                .replace(/&apos;/, "'")
                                .trim();
                            let mtgSetCode = mtgSetNameToCode(sanitizedMtgSetName);
                            if (mtgSetCode) {
                                mtgSetsList.push(mtgSetCode);
                            } else if (ignoreUnrecognizedSetNames.some(x => sanitizedMtgSetName.includes(x))) {
                                console.log(`Warning: ignoring set name "${sanitizedMtgSetName}"`);
                            } else {
                                haveErrors = true;
                                console.log(`Error: unknown set name "${sanitizedMtgSetName}"`);
                                // throw Error(`Unknown mtg set name ${sanitizedMtgSetName}`);
                            }
                        }
                    }

                    let lastMtgSet = mtgSetsList[mtgSetsList.length - 1];

                    if (mtgStandardDict[lastMtgSet] && !arraysEqual(mtgStandardDict[lastMtgSet], mtgSetsList) && !['fem', 'mir', 'eld', 'znr'].includes(lastMtgSet)) {
                        throw Error(`Trying to add format ${mtgSetsList}. However we already have entry for ${lastMtgSet}: ${mtgStandardDict[lastMtgSet]}. Consider adding an exclusion in the code.`);
                    }

                    mtgStandardDict[lastMtgSet] = mtgSetsList;
                    if (lastMtgSet == latestMtgSet) {
                        console.log(`Reached latest known set ${latestMtgSet}, stopping here`);
                        return false; // break .each()
                    }
                }
            });

            if (haveErrors) {
                throw Error(`Errors in downloading standard info (see messages above)`);
            }

            // var prettyBody = JSON.stringify(mtgStandardDict, null, 4);
            var prettyBody = '{\n';
            for (var key in mtgStandardDict) {
                prettyBody += `    "${key}": [${mtgStandardDict[key].map(x => '"'+x+'"').join(', ')}],\n`;
            }
            prettyBody = prettyBody.slice(0, -2) + '\n}\n';
            // console.log('prettyBody', prettyBody);
            let filename = LOCAL_FILE;
            fs.mkdirsSync(path.dirname(filename));
            fs.writeFileSync(filename, prettyBody); 
            console.log(`Wrote to ${filename}`);
            console.log('Download Standard info from Wikipedia DONE\n');
        });
}


function mtgSetNameToCode(name) {
    let namesToMatch = [
        name.toUpperCase(),
        name.toUpperCase().replace(/:/, '')
    ];
    let coreSetMatch = /M(20)?(\d{2})/.exec(name);
    if (coreSetMatch) {
        let code = coreSetMatch[2];
        namesToMatch.push(`MAGIC 20${code}`);
    }
    let alternativeName = alternativeNames[name.toUpperCase()];
    if (alternativeName) {
        namesToMatch.push(alternativeName);
    }
    for (let set_info of allSetsInfo) {
        if (namesToMatch.includes(set_info.name.toUpperCase())) {
            return set_info.code;
        }
    }
    return null;
}

function arraysEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (a.length != b.length) return false;
  for (var i = 0; i < a.length; ++i) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

module.exports = downloadStandardInfo;

if (require.main === module) {
    downloadStandardInfo();
}
