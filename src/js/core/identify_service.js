console.log('identify_service.js');

const ContourFinder = require('./contour_finder.js');
const descriptors = require('./descriptors.js');
const searchers = require('./searchers.js');
const Matcher = require('./matcher.js');
const resizeImageDataExternal = require('resize-image-data')

function logDescription(description) {
    console.log('DESCRIPTION');
    for (let i = 0; i < description.keypoints.length; i++) {
        console.log(`${description.keypoints[i]} ${description.features[i].join('')}`);
    }
}


class IdentifyService {

    constructor(name, jsonIndex, cvwrapper, loopAndCheckForCancellation) {
        let [descriptorName, searcherName, matcherName] = name.split('_');
        this.name = name;
        this.featuresDescriptor = descriptors.fromName(descriptorName);
        if (!this.featuresDescriptor.cardHeight) {
            throw 'this.featuresDescriptor.cardHeight is not defined'
        }
        this.featuresMatcher = new Matcher(matcherName, jsonIndex, this.featuresDescriptor.cardHeight, searchers.fromName(searcherName), cvwrapper, loopAndCheckForCancellation);
        this.contourFinder = new ContourFinder(cvwrapper);
        this.loopAndCheckForCancellation = loopAndCheckForCancellation;
    }

    identifyMultiScales(imageData, potentialCardHeights, previousMatches, callback, cv_debug) {
        let matches = [];
        let that = this;
        this.loopAndCheckForCancellation(potentialCardHeights.length, function loopIdentifyMultiScales(i, next) {
            const timer = new Timer();
            let nextWithPrint = function() {
                console.log(`identifyMultiScales[${i}]: not identified ${timer.get()} ms`); timer.reset();
                next();
            }
            let cardHeight = potentialCardHeights[i];
            console.log(`identifyMultiScales[${i}]: cardHeight = ${cardHeight}px`);
            let scale = that.featuresDescriptor.cardHeight / cardHeight;
            let newWidth = Math.round(scale * imageData.width);
            let newHeight = Math.round(scale * imageData.height);
            let imageDataResized = resizeImageData(imageData, newWidth, newHeight);
            if (cv_debug) {
                throw `Can't cv_debug, sorry. Didn't port some functions when switching from opencv4nodejs to opencv.js, eg cv_debug.fromImageData and cv_debug.setDescriptorInputImg. Shouldn't be too hard if you need them though.`
                cv_debug.setDescriptorInputImg(cv_debug.fromImageData(imageDataResized));
            }

            let imgSize = [imageDataResized.width, imageDataResized.height];
            let cursorPosition = [Math.round(imgSize[0]/2), Math.round(imgSize[1]/2)];
            let query_description = that.featuresDescriptor.describe(imageDataResized, cv_debug);

            matches = that.checkMatchPreviousMatches(previousMatches, query_description, cursorPosition);
            console.log(`identifyMultiScales[${i}]: checkedPreviousMatches ${timer.get()} ms`); timer.reset();

            let doneIdentifySingleScale = function(matches) {
                if (matches.length > 0) {
                    let cardHeightsString = potentialCardHeights.map((h, ind) => (ind==i) ? '('+h+')' : h).join(', ')
                    console.log(`MATCHED on cardHeight: [${cardHeightsString}]`);
                    console.log(`identifyMultiScales[${i}]: identified ${timer.get()} ms`); timer.reset();
                    matches[0].cardHeightUsedForDetection = cardHeight;
                    matches[0].measuredCardHeight = contourSideLength(matches[0].contour) / scale;
                    callback({matches: matches });
                } else {
                    nextWithPrint();
                }
            };
            if (matches.length > 0) {
                doneIdentifySingleScale(matches);
            } else {
                that.identifySingleScale(imageDataResized, query_description, doneIdentifySingleScale, nextWithPrint, cv_debug);
            }
        }, callback);
    }


    checkMatchPreviousMatches(previousMatches, query_description, cursorPosition) {
        const timer = new Timer();
        let checked_card_ids = [];
        let matches = [];
        for (var i = previousMatches.length - 1; i >= 0; i--) {
            let previousMatch = previousMatches[i];
            let card_id = previousMatch[0].card_id;

            if (checked_card_ids.includes(card_id)) {
                continue;
            }
            checked_card_ids.push(card_id);

            let contour = this.featuresMatcher.checkMatch(query_description, card_id, cursorPosition);
            // console.log(`checkMatchPreviousMatches: checkMatch[card ${i}] ${timer.get()}`);

            if (contour) {

                matches = [{
                    card_id: card_id,
                    // cardHeight: cardHeight,
                    contour: contour
                }];
                break;
            }
        }
        // console.log(`checkMatchPreviousMatches: got ${matches.length} match DONE ${timer.get()}`);
        return matches;
    }

    identifySingleScale(imageData, query_description, callback, nextOuterLoop, cv_debug = null) {        
        const timer = new Timer();
        if (! imageData.data) {
            throw 'Expected imageData'
        }
        
        let imgSize = [imageData.width, imageData.height];
        let cursorPosition = [Math.round(imgSize[0]/2), Math.round(imgSize[1]/2)];
        this.featuresMatcher.matchAroundCursor(
            query_description,
            cursorPosition,
            function doneMatchAroundCursor(result) {
                if (result) {
                    callback([result]);
                } else {
                    callback([]);
                }
            },
            nextOuterLoop,
            cv_debug
        );
    }
}

function contourSideLength(c) {
    let l0 = distance(c[0], c[1]);
    let l1 = distance(c[1], c[2]);
    let l2 = distance(c[2], c[3]);
    let l3 = distance(c[3], c[0]);
    let sidesSorted = [l0, l1, l2, l3].sort();
    let averageLength = (sidesSorted[2]+sidesSorted[3])/2;
    return averageLength;
}

function distance(a, b) {
    return Math.hypot(...a.map((e,i)=>e-b[i]));
}

// simple timer class
function Timer() {
  let start = null;
  this.reset = function () {
    start = (new Date()).getTime();
  };
  this.get = function () {
    return (new Date()).getTime() - start;
  };
  this.reset();
};

function resizeImageData(imageData, width, height) {
    const imageDataResized = resizeImageDataExternal(imageData, width, height, 'biliniear-interpolation');
    return imageDataResized;
}


module.exports = IdentifyService;
