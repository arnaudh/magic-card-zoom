const descriptors = require('../core/descriptors.js');
const fs = require('fs-extra');
const CvDebug = require('./cv_debug.js');
const mtg_sets = require('../mtg_sets.js');
const config = require("../../../config.json");
const program = require('commander');
const cliProgress = require('cli-progress');
const path = require('path');

program
    .usage('[options] <mtg_set...>')
    .description('Index images')
    .option('-d, --descriptor [name]', 'Which descriptor to use (default from config.json)')
    .option('-c, --cvdebug', 'Write debug images to disk')
    .parse(process.argv);


let expanded_mtg_sets;
if (program.args.length > 0) {
    expanded_mtg_sets = mtg_sets.expandSets(program.args);
} else {
    expanded_mtg_sets = mtg_sets.allAvailableSets;
}
// console.log('expanded_mtg_sets', expanded_mtg_sets);
let descriptorName = program.descriptor || config.descriptorIndexName;
let descriptor = descriptors.fromName(descriptorName);


async function onRuntimeInitialized(){
    console.assert(cv !== undefined);
    cvDebug = new CvDebug(cv, `assets/images/cards/${descriptor.name}`, false);

    if (typeof require != 'undefined' && require.main==module) {
        sets_to_index = expanded_mtg_sets.filter(s => !checkAlreadyCreated(index_file(descriptor, s)));
        if (sets_to_index.length == 0) {
            console.log(`All ${expanded_mtg_sets.length} sets have been indexed`);
            return;
        }
        console.log(`Indexing ${sets_to_index.length} sets: ${sets_to_index}`);

        let index = 0;
        // TODO: does this break the terminal? e.g. cuts lines at the end.
        const bar1 = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
        bar1.start(sets_to_index.length, 0);
        for (const mtgSet of sets_to_index) {
            await indexImages(mtgSet, cvDebug)
            index++;
            bar1.update(index);
        }
        bar1.stop();
        console.log(`Sucessfully indexed ${sets_to_index.length} sets`);
    }
}
// Finally, load the opencv.js as before. The function `onRuntimeInitialized` contains our program.
Module = {
  onRuntimeInitialized
};
cv = require("../lib/opencv.js");

function index_file(descriptor, mtgSet) {
    return `assets/indexes/${descriptor.name}/${mtgSet}.json`;
}

async function indexImages(mtgSet, cvDebug) {
    let localFilename = index_file(descriptor, mtgSet);
    return fs.mkdirs(path.dirname(localFilename))
        .then(() => fs.readdir(`assets/images/cards/small/${mtgSet}/`))
        .then(files => {
            // Filter out hidden files such as .DS_Store
            files = files.filter(item => ! /^\./.test(item));
            // console.log('ONLY DOING 1 FILE'); files = [files[0]];
            // console.log('files', files);
            let items = files.map(file => {
                let [card_number, extension] = file.split('.');
                let card_id = `${mtgSet}-${card_number}`;
                return [`assets/images/cards/small/${mtgSet}/${file}`, card_id, cvDebug];
            });
            // No more than 250 open files at a time so we don't run into limits (eg MacOS
            // has default limit at 256)
            return promiseAllInBatches(readAndDescribe, items, 250)
            // .then(x => console.log(`Wrote to ${localFilename}`));
        })
        .then(results => {
            let index = Object.assign(...results);
            return fs.writeFile(localFilename, JSON.stringify(index));
        });
}

// https://stackoverflow.com/a/64543086/533591
async function promiseAllInBatches(task, items, batchSize) {
    let position = 0;
    let results = [];
    while (position < items.length) {
        const itemsForBatch = items.slice(position, position + batchSize);
        // console.log('itemsForBatch', itemsForBatch);
        results = [...results, ...await Promise.all(itemsForBatch.map(item => task(item)))];
        // console.log('results', results)
        position += batchSize;
    }
    return results;
}

async function readAndDescribe(item) {
    let [file, card_id, cvDebug] = item;
    // console.log('readAndDescribe', file, card_id);
    let originalImg = await cvDebug.imread_async(file);

    if (descriptor.cardHeight) {
        originalImg = cvDebug.resize(originalImg, [null, descriptor.cardHeight]);
    }

    let blurredImg = cvDebug.gaussianBlur(originalImg);
    let croppedImg = cvDebug.cropToArtPlusOrbBorderInside(blurredImg);
    // cvDebug.imwrite(`readAndDescribe/${card_id}/croppedImg.png`, croppedImg)
    // let croppedImg = cvDebug.makeShittyAndCropToArtPlusOrbBorderInside(originalImg);
    
    let croppedImageData = cvDebug.toImageData(croppedImg);
        
    return Promise.resolve(croppedImageData)
        .then(async (imageData) => {
            // /(.*)\/([a-z]+)\/([0-9]+)./
            let description = await descriptor.describe(imageData);
            if (program.cvdebug) {
                cvDebug.imwrite(`cropped/${card_id}.png`, croppedImg);
                let keypointsImg = cvDebug.drawPoints(croppedImg, description.keypoints);
                cvDebug.imwrite(`cropped_keypoints/${card_id}.png`, keypointsImg);
            }
            // console.log(`description for ${card_id} has ${description.keypoints.length} keypoints (${description.features.length} features)`);
            // console.log('{[card_id]: description}', {[card_id]: description});
            return {[card_id]: description};
        });
}

function checkAlreadyCreated(filename) {
    if (fs.existsSync(filename) && fs.statSync(filename)['size'] > 0) {
        console.log(`Skipping because already created: ${filename}`);
        return true;
    } else {
        return false
    }
}

