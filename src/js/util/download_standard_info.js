const fs = require('fs-extra');
const path = require('path');
const requestPromise = require('request-promise');
const cheerio = require('cheerio');

const WIKIPEDIA_STANDARD_URL = 'https://en.wikipedia.org/wiki/Timeline_of_Magic:_the_Gathering_Standard_(Type_II)';
const LOCAL_FILE = 'assets/metadata/sets/standard.json';

function downloadStandardInfo() {
    console.log('################################################');
    console.log('#   Downloading Standard info from Wikipedia   #');
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

            $('.wikitable tr').each(function (i, elem) {
                let tds = $(this).find('td');
                if (tds.length == 6) {
                    let mtgSetsList = [];
                    let setsDirty = $(tds[2]).textln().split('\n');

                    for (var mtgSet of setsDirty) {
                        mtgSet = mtgSet.trim();
                        if (mtgSet && ! /^[-"&(]|Revised.*/.exec(mtgSet)) {
                            let sanitizedMtgSetName = mtgSet
                                .replace(/\[\d+\]/, '')
                                .replace(/&apos;/, "'");
                            let mtgSetCode = mtgSetNameToCode(sanitizedMtgSetName);
                            if (mtgSetCode) {
                                mtgSetsList.push(mtgSetCode);
                            } else {
                                console.log(`Unknown set name "${sanitizedMtgSetName}" - skipping`);
                                // throw Error(`Unknown mtg set name ${sanitizedMtgSet}`);
                            }
                        }
                    }

                    let lastMtgSet = mtgSetsList[mtgSetsList.length - 1];

                    if (mtgStandardDict[lastMtgSet] && !arraysEqual(mtgStandardDict[lastMtgSet], mtgSetsList) && !['fem', 'mir'].includes(lastMtgSet)) {
                        throw Error(`Already have entry for ${lastMtgSet}`);
                    }

                    mtgStandardDict[lastMtgSet] = mtgSetsList;
                }
            });

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

// to translate from wikipedia to scryfall
let alternativeNames = {
    '4TH EDITION': 'FOURTH EDITION',
    '5TH EDITION': 'FIFTH EDITION',
    '6TH EDITION': 'CLASSIC SIXTH EDITION',
    '7TH EDITION': 'SEVENTH EDITION',
    '8TH EDITION': 'EIGHTH EDITION',
    '9TH EDITION': 'NINTH EDITION',
    '10TH EDITION': 'TENTH EDITION',
}

function mtgSetNameToCode(name) {
    const allSetsInfo = require("../../../assets/metadata/sets/sets.json");

    let namesToMatch = [name.toUpperCase()];
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
