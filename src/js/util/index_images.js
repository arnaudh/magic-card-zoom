const descriptors = require('../core/descriptors.js');
const fs = require('fs-extra');
const CvDebug = require('./cv_debug.js');
const mtg_sets = require('../mtg_sets.js');
const config = require("../../../config.json");
const program = require('commander');


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

cvDebug = new CvDebug(`assets/images/cards/${program.descriptor}`, false);

if (typeof require != 'undefined' && require.main==module) {
    console.log(`Running image indexer on ${expanded_mtg_sets}`);
    for (var mtgSet of expanded_mtg_sets) {
        indexImages(mtgSet);
    }
}

async function indexImages(mtgSet) {
    let localDir = `assets/indexes/${descriptor.name}`;
    let localFilename = `${localDir}/${mtgSet}.json`;
    if (checkAlreadyCreated(localFilename)) {
        return;
    }
    console.log(`Indexing ${mtgSet}`);
    fs.mkdirsSync(localDir);

    fs.readdir(`assets/images/cards/small/${mtgSet}/`)
        .then(files => {
            // Filter out hidden files such as .DS_Store
            files = files.filter(item => ! /^\./.test(item));
            // console.log('ONLY DOING 1 FILE'); files = [files[0]];
            console.log('files', files);
            var descriptionPromises = files.map(file => {
                let [card_number, extension] = file.split('.');
                let card_id = `${mtgSet}-${card_number}`;
                return readAndDescribe(`assets/images/cards/small/${mtgSet}/${file}`, card_id);
            });
            Promise.all(descriptionPromises)
            .then(results => {
                var index = Object.assign(...results);
                fs.mkdirsSync(`assets/indexes/${descriptor.name}`);
                return fs.writeFile(localFilename, JSON.stringify(index));
            })
            .then(x => console.log(`Wrote to ${localFilename}`));
        });
}

async function readAndDescribe(file, card_id) {
    console.log('file', file);
    var originalImg = cvDebug.imread(file);

    if (descriptor.cardHeight) {
        originalImg = cvDebug.resize(originalImg, [null, descriptor.cardHeight]);
    }

    var croppedImg = cvDebug.cropToArtPlusOrbBorderInside(originalImg.gaussianBlur(new cvDebug.cv.Size(1, 1), 1.2));
    // var croppedImg = cvDebug.makeShittyAndCropToArtPlusOrbBorderInside(originalImg);
    
    var croppedImageData = new CvDebug().toImageData(croppedImg);
        
    return Promise.resolve(croppedImageData)
        .then(async (imageData) => {
            // /(.*)\/([a-z]+)\/([0-9]+)./
            var description = await descriptor.describe(imageData);
            if (program.cvdebug) {
                cvDebug.imwrite(`cropped/${card_id}.png`, croppedImg);
                var keypointsImg = cvDebug.drawPoints(croppedImg, description.keypoints);
                cvDebug.imwrite(`cropped_keypoints/${card_id}.png`, keypointsImg);
            }
            console.log(`description for ${card_id} has ${description.keypoints.length} keypoints (${description.features.length} features)`);
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

