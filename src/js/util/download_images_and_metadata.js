const fs = require('fs-extra');
const request = require('request');
const ioTools = require('./io_tools.js');
const scryfallApi = require('./scryfall_api');
const assert = require('assert');
const Promise = require('bluebird');
Promise.promisifyAll(fs);

const LOCAL_CARDS_METADATA_DIR = 'assets/metadata/cards/full';
const LOCAL_CARDS_DISPLAY_URLS_DIR = 'assets/metadata/cards/display_urls';
const LOCAL_CARD_IMAGES_DIR = 'assets/images/cards';
const LOCAL_SET_IMAGES_DIR = 'assets/images/sets';

const generateDuplicateIllustrationsDictionnary = require('./find_duplicate_illustrations.js');

// For all image types, see https://scryfall.com/docs/api/images
let INDEX_IMAGE_TYPE = 'small';
let DISPLAY_IMAGE_TYPE = 'normal';
let WAIT_BETWEEN_REQUESTS_MILLIS = 50; // as asked by the Scryfall folks https://scryfall.com/docs/api

function downloadImagesAndMetadata() {
    console.log('#####################################################');
    console.log('#   Downloading images and metadata from Scryfall   #');
    console.log('#####################################################');
    
    const mtg_sets = require('../mtg_sets.js');
    console.log(`Downloading images and metadata from ${mtg_sets.allAvailableSets.length} sets (${mtg_sets.allAvailableSets.join(' ')})`);

    let chain = Promise.resolve();
    for (let mtgSet of mtg_sets.allAvailableSets) {
        chain = chain
            .then(() => downloadIconForSet(mtgSet, mtg_sets.getMtgSetIconUrl(mtgSet)))
            .then(() => downloadCardsMetadata(mtgSet))
            .then(() => downloadCardImagesForSet(mtgSet, INDEX_IMAGE_TYPE))
            .then(() => generateCardsDisplayUrlsForSet(mtgSet, DISPLAY_IMAGE_TYPE))
    }
    chain = chain.then(generateDuplicateIllustrationsDictionnary);
    chain.then(() => console.log(`Download images and metadata from ${mtg_sets.allAvailableSets.length} sets DONE\n`));
    return chain;
}

function downloadIconForSet(mtgSet, iconUrl) {
    let chain = fs.mkdirsAsync(LOCAL_SET_IMAGES_DIR);
    let localFilename = `${LOCAL_SET_IMAGES_DIR}/${mtgSet}.svg`;
    if (checkAlreadyDownloaded(localFilename)) {
        return;
    } else {
        chain = chain
            .then(() => downloadFile(iconUrl, localFilename))
            .then(() => Wait(WAIT_BETWEEN_REQUESTS_MILLIS));
    }
    return chain;
}

function downloadCardsMetadata(mtgSet) {
    let localFilename = `${LOCAL_CARDS_METADATA_DIR}/${mtgSet}.json`;
    if (checkAlreadyDownloaded(localFilename)) {
        return;
    }
    console.log(`Downloading set metadata for ${mtgSet}`);
    return scryfallApi
        .getAllPaginatedItems(`https://api.scryfall.com/cards/search?order=set&q=e%3A${mtgSet}&unique=prints`)
        .then(function(items) {
            console.log(`Got ${items.length} card metadata items for set ${mtgSet}`);
            ioTools.writePrettyJsonToFile(items, localFilename);
        })
}

function downloadCardImagesForSet(mtgSet, imageType) {
    return ioTools.readJsonAsync(`${LOCAL_CARDS_METADATA_DIR}/${mtgSet}.json`)
        .then(function(items) {
            let chain = Promise.resolve();
            for (let item of items) {
                chain = chain
                    .then(() => downloadImagesForItem(item, mtgSet, imageType))
            }
            return chain;
        })
}

function generateCardsDisplayUrlsForSet(mtgSet, imageType) {
    let localFilename = `${LOCAL_CARDS_DISPLAY_URLS_DIR}/${mtgSet}.json`;
    if (checkAlreadyDownloaded(localFilename)) {
        return;
    }
    console.log(`Generating display urls for ${mtgSet}`);
    return ioTools.readJsonAsync(`${LOCAL_CARDS_METADATA_DIR}/${mtgSet}.json`)
        .then(function(items) {
            let metadataDict = {};
            items.forEach(item => {
                getSidesIdAndUrl(item, imageType).forEach(([sideId, imageUrl]) => {
                    metadataDict[`${mtgSet}-${sideId}`] = imageUrl;
                });
            });
            ioTools.writePrettyJsonToFile(metadataDict, localFilename);
        })
}

function downloadImagesForItem(item, mtgSet, imageType) {
    let sides = getSidesIdAndUrl(item, imageType);
    let localDir = `${LOCAL_CARD_IMAGES_DIR}/${imageType}/${mtgSet}`;

    let chain = fs.mkdirsAsync(localDir);
    for (const [sideId, imageUrl] of sides) {
        let localFilename = `${localDir}/${sideId}.jpg`;
        if (checkAlreadyDownloaded(localFilename)) {
            return;
        } else {
            chain = chain
                .then(() => downloadFile(imageUrl, localFilename))
                .then(() => Wait(WAIT_BETWEEN_REQUESTS_MILLIS));
        }
    }
    return chain;
}

// Note: beware of special case collector numbers "250a", also "S2" (https://scryfall.com/card/8ed/S2/vengeance)
// eg: https://scryfall.com/search?q=cn%3A250a&unique=cards&as=grid&order=name
function getSidesIdAndUrl(item, imageType) {
    let imageUrls;
    if (item.image_uris) {
        imageUrls = [item.image_uris[imageType]];
    } else {
        imageUrls = item.card_faces.map(face => face.image_uris[imageType]);
    }
    assert(imageUrls.length == 1 || imageUrls.length == 2);
    let sides = [];
    for (var i = 0; i < imageUrls.length; i++) {   
        let sideId = item.collector_number;
        if (imageUrls.length == 2) {
            sideId += (i == 0) ? "_1" : "_2";
        }
        sides.push([sideId, imageUrls[i]])
    }
    return sides;
}

function downloadFile(fileUrl, filename) {
    console.log(`Downloading ${fileUrl} -> ${filename}`);
    return new Promise(resolve =>
        request(fileUrl)
            .pipe(fs.createWriteStream(filename))
            .on('finish', resolve)
    );
}

function checkAlreadyDownloaded(filename) {
    if (fs.existsSync(filename) && fs.statSync(filename)['size'] > 0) {
        console.log(`Skipping because already downloaded: ${filename}`);
        return true;
    } else {
        return false
    }
}

function Wait(millis) {
    return new Promise(r => setTimeout(r, millis))
}

module.exports = downloadImagesAndMetadata;

if (require.main === module) {
    downloadImagesAndMetadata();
}
