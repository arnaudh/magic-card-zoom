const ContourFinder = require('../../src/js/core/contour_finder.js');
const IdentifyService = require('../../src/js/core/identify_service.js');
const CvDebug = require('../../src/js/util/cv_debug.js');
const mtg_sets = require('../../src/js/mtg_sets.js');
const fs = require('fs-extra');
const rimraf = require('rimraf');
const path = require('path');
const readYaml = require('read-yaml');
const program = require('commander');
const clustering = require('density-clustering');

program
    .option('-d, --descriptor [name]', 'Which index descriptor to use [eg orb-maxkeypoints200]')
    .option('-i, --identify_service [name]', 'Which identify service to use [eg orb-maxkeypoints10000_bruteforce-hamming]')
    .option('-c, --cvdebug', 'Write debug images to disk')
    .option('-q, --quiet', 'Reduce noise')
    .option('-t, --tag [tag]', 'Tag to filter training items by [eg fantom]')
    .option('-n, --item_numbers [tag]', 'Which specific dataset items to run [eg "10 12 60"]')
    .option('-l, --limit [limit]', 'limit number of training items [eg 1]')
    .parse(process.argv);

youtubeVideoFormats = {
  "sQk7RSUgsA4": "standard-akh",
  "SZDaM4VpSBk": "standard-rtr",
  "CZgzZ3vrnRI": "standard-ktk",
  "qjwJ0yYvjfk": "standard-akh",
  "cKPaR2uSpPk": "standard-kld",
  "FqgYWEY9YPg": "standard-kld",
  "LCZtwDL0fcM": "standard-soi",
  "5ZMM4SjlzWw": "standard-ths",
  "-tVtF73URAk": "standard-grn",
  "IsP_H-hydNA": "standard-grn",
  "A8J5LngG05k": "standard-rna"
}

// console.log('program', program);

let identify_service_name = program.identify_service;
if (!identify_service_name) {
    throw 'Need to specify identify_service_name';
}

let descriptorName = program.descriptor;
console.log('descriptorName', descriptorName);

let itemNumbers = program.item_numbers && program.item_numbers.split(',').map(Number);
console.log('itemNumbers', itemNumbers);

// let available_mtg_formats = ['standard-ths'];
let available_mtg_formats = mtg_sets.allAvailableStandards;

let trainingItems = [];
for (let trainingSubdir of fs.readdirSync(`test/benchmark/dataset`)) {
    let infoFile = `test/benchmark/dataset/${trainingSubdir}/info.yml`;
    if (fs.existsSync(infoFile)) {
        let info = readYaml.sync(infoFile);
        let true_card_id = info.card;
        let video_id = info.video;
        let cardheight = info.cardheight;
        let mtg_format = youtubeVideoFormats[video_id];
        let tags = info.tags ? info.tags.split(' ') : [];
        let reasonToExclude = null;
        if (itemNumbers && !itemNumbers.includes(Number(trainingSubdir))) {
            reasonToExclude = `item number not in selection`;
        } else if (!cardheight) {
            reasonToExclude = `no cardheight`;
        } else if (!video_id) {
            reasonToExclude = `no video id`;
        } else {
            if (!mtg_format || !available_mtg_formats.includes(mtg_format)) {
                reasonToExclude = `format ${mtg_format} for video ${video_id} not supported`;
            } else if (true_card_id) {
                let true_mtg_set = true_card_id.split('-')[0];
                if (!mtg_sets.expandSets(mtg_format).includes(true_mtg_set)) {
                    reasonToExclude = `set ${true_mtg_set} not supported`;
                }
            }
            if (!reasonToExclude && program.tag) {
                if (!tags || !tags.includes(program.tag)) {
                    reasonToExclude = `tag ${tags} doesnt match ${program.tag}`;
                }
            }
        }

        if (reasonToExclude) {
            if (!program.quiet) console.log(`NOT INCLUDED because ${reasonToExclude} [${infoFile}]`);
            continue;
        } else {
            trainingItems.push({
                trainingDir: `test/benchmark/dataset/${trainingSubdir}`,
                true_card_id: true_card_id,
                video_id: video_id,
                mtg_format: mtg_format,
                tags: tags,
                cardheight: cardheight
            });
            if (program.limit && trainingItems.length >= program.limit) {
                if (!program.quiet) console.log(`STOPPING HERE because we got ${program.limit} training items`);
                break;
            }
        }
    }
}
console.log('trainingItems', trainingItems);

function unique(arr) {
    return [...new Set(arr)];
}

const concat = (x,y) =>
  x.concat(y)
const flatMap = (f,xs) =>
  xs.map(f).reduce(concat, [])

let training_formats = unique(trainingItems.map(i => i.mtg_format));
let training_mtg_sets = unique(flatMap(i => mtg_sets.expandSets(i.mtg_format), trainingItems));

let indexes = {};
for (var mtg_set of training_mtg_sets) {
    let index_file = `../../assets/indexes/${descriptorName}/${mtg_set}.json`;
    console.log(`Loading ${index_file}`);
    indexes[mtg_set] = require(index_file);
}

function average(arr) {
    return arr.reduce( ( p, c ) => p + c, 0 ) / arr.length;
}

function doTest(cvwrapper) {
    console.log('doTest');
    let identify_services = {}
    for (var mtg_format of training_formats) {
        let index = {};
        for (var mtg_set of mtg_sets.expandSets(mtg_format)) {
            index = {...index, ...indexes[mtg_set]};
        }
        identify_services[mtg_format] = new IdentifyService(identify_service_name, index, cvwrapper, false);
    }
    let contourFinder = new ContourFinder(cvwrapper);

    let benchmarkDir = `benchmarks/${identify_service_name}__test${trainingItems.length}/`;
    rimraf.sync(benchmarkDir);
    fs.mkdirsSync(benchmarkDir);

    (async () => {
        var all_promises = trainingItems.map(item => {
            // console.log('item', item);
            let dir = item.trainingDir
            let true_card_id = item.true_card_id;
            let video_id = item.video_id;
            let potentialCardHeights = [item.cardheight];
            let mtg_format = item.mtg_format;
            let test_item_name = path.basename(dir);
            let debugOutputDir = `${benchmarkDir}/images/${test_item_name}/`;
            let cvDebug = program.cvdebug ? new CvDebug(debugOutputDir, true) : null;
            console.log(`*** ${item.trainingDir} [${item.true_card_id}] (${item.tags}) ***`);
            
            var originalImg = new CvDebug().imread(`${dir}/input.png`);
            var originalImageData = new CvDebug().toImageData(originalImg);

            if (cvDebug) {
                // save training image and info in benchmark dir
                cvDebug.imwrite('input.png', originalImg);
                copyFile(`${dir}/info.yml`, `${debugOutputDir}/info.yml`);

                cvDebug.true_card_id = true_card_id;
            }

            let previousMatches = [];

            return identify_services[mtg_format]
                .identifyMultiScales(originalImageData, potentialCardHeights, previousMatches, cvDebug)
                .then(result => {
                    let {matches: matches, time: time} = result;
                    let card_identified;
                    if (matches && matches[0] && matches[0].card_id) {
                        card_identified = matches[0].card_id;
                    } else {
                        card_identified = null;
                    }
                    let is_match = (card_identified === true_card_id);
                    return {
                        item: item,
                        card_identified: card_identified,
                        is_match: is_match,
                        debugOutputDir: debugOutputDir,
                        time: time
                    };
                });
        });

        await Promise.all(all_promises).then(results => {
            let resultsFile = `${benchmarkDir}/results.txt`;
            console.log(`\n*** ${resultsFile} ***`);
            results.forEach(result => {
                let tagString = result.item.tags ? result.item.tags.join(' ') : '';
                let result_str = `${result.item.trainingDir} [${String(result.item.true_card_id).padStart(7)}] time ${String(result.time).padStart(4)} ms matched ${String(result.card_identified).padStart(7)} | ${result.is_match ? 1 : 0} (${tagString})`;
                logAndAppendToFile(resultsFile, result_str);
            });

            let totalFile = `${benchmarkDir}/total.txt`;
            console.log(`\n*** ${totalFile} ***`);
            logAndAppendToFile(totalFile, `                      ┌─────┬─────────┬──────────┐`);
            logAndAppendToFile(totalFile, `                      │  ✔  │   ✘ (!) │ accuracy │`);
            logAndAppendToFile(totalFile, ' ┌────────────────────┼─────┼─────────┼──────────┤');
            logBreakdown(totalFile, results, r => r.item.true_card_id !== null, 'Card in picture');
            logBreakdown(totalFile, results, r => r.item.true_card_id === null, 'No card in picture');
            logAndAppendToFile(totalFile, ' └────────────────────┼─────┼─────────┼──────────┤');
            logBreakdown(totalFile, results, r => true, 'Total');
            logAndAppendToFile(totalFile, '                      └─────┴─────────┴──────────┘');

            // TODO: histograms
            // executeShell(
            //     `cat ${benchmarkDir}/results.txt | perl -lne '/time +([0-9]+)/ and print $1' | histogram.py > ${benchmarkDir}/time_hist.txt`,
            //     () => executeShell(
            //         `tail -n +1 ${benchmarkDir}/results.txt ${benchmarkDir}/time_hist.txt ${benchmarkDir}/pos_hist.txt`,
            //         () => {})
            //     )
        });    

    })();

}

console.log('CALLING initialize from benchmark.js');
require('../../src/js/core/opencvjs_wrapper.js').initialize(doTest);

function logAndAppendToFile(file, str) {
    console.log(str);
    fs.appendFileSync(file, str+'\n');
}


function logBreakdown(totalFile, results, p, name) {
    let ok = results.filter(p).filter(r => r.is_match).length;
    let notOk = results.filter(p).filter(r => !r.is_match).length;
    let notOkIdentifiedOtherCard = results.filter(p).filter(r => !r.is_match && r.card_identified).length;
    let ratio = ok * 100.0 / (ok + notOk + 1e-10);
    let firstCharacter = (name === 'Total') ? ' ' : '│';
    let str = ` ${firstCharacter}${name.padStart(19)} │ ${String(ok).padStart(3)} │ ${(notOk+' ('+notOkIdentifiedOtherCard+')').padStart(7)} │ ${ratio.toFixed(1).padStart(8)} │`;
    logAndAppendToFile(totalFile, str);
}

function copyFile(sourceFile, targetFile) {
    fs.writeFileSync(targetFile, fs.readFileSync(sourceFile));
}

function executeShell(command, callback) {
    const { exec } = require('child_process');
    exec(command, (err, stdout, stderr) => {
      if (err) {
        throw `err ${err}`;
      }
      console.log(stdout);
      console.log(stderr);
      callback();
    });
}

function zeroPad(num, numZeros) {
    var n = Math.abs(num);
    var zeros = Math.max(0, numZeros - Math.floor(n).toString().length );
    var zeroString = Math.pow(10,zeros).toString().substr(1);
    if( num < 0 ) {
        zeroString = '-' + zeroString;
    }
    return zeroString+n;
}

function readFileBase64(file) {
    // read binary data
    var bitmap = fs.readFileSync(file);
    // convert binary data to base64 encoded string
    return Buffer.from(bitmap).toString('base64');
}
