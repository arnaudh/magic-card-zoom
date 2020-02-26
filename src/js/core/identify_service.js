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

    constructor(name, jsonIndex, cvwrapper) {
        let [descriptorName, searcherName, matcherName] = name.split('_');
        this.name = name;
        this.featuresDescriptor = descriptors.fromName(descriptorName);
        if (!this.featuresDescriptor.cardHeight) {
            throw 'this.featuresDescriptor.cardHeight is not defined'
        }
        this.featuresMatcher = new Matcher(matcherName, jsonIndex, this.featuresDescriptor.cardHeight, searchers.fromName(searcherName), cvwrapper);
        this.contourFinder = new ContourFinder(cvwrapper);
        // console.log('IdentifyService', this.name);
    }

    identifyMultiScales(imageData, potentialCardHeights, previousMatches, loopAndCheckForCancellation, callback, cv_debug) {
        const timer = new Timer();
        let matches = [];
        let that = this;
        // let myFFF = function(cardHeight) {
        loopAndCheckForCancellation(potentialCardHeights.length, function loopIdentifyMultiScales(i, next) {
            let cardHeight = potentialCardHeights[i];
            console.log(`Checking cardHeight[${i}] = ${cardHeight}`);
            // let i = -1000;
        // for (let i = 0; i < potentialCardHeights.length; i++) {
        //     let cardHeight = potentialCardHeights[i];
            let scale = that.featuresDescriptor.cardHeight / cardHeight;
            let newWidth = Math.round(scale * imageData.width);
            let newHeight = Math.round(scale * imageData.height);
            let imageDataResized = resizeImageData(imageData, newWidth, newHeight);
            if (cv_debug) {
                cv_debug.setDescriptorInputImg(cv_debug.fromImageData(imageDataResized));
            }

            let imgSize = [imageDataResized.width, imageDataResized.height];
            let cursorPosition = [Math.round(imgSize[0]/2), Math.round(imgSize[1]/2)];
            let query_description = that.featuresDescriptor.describe(imageDataResized, cv_debug);

            matches = that.checkMatchPreviousMatches(previousMatches, query_description, cursorPosition);
            console.log(`identifyMultiScales: checkedPreviousMatches[${i}] ${timer.get()}`);

            let doneIdentifySingleScale = function(matches) {
                console.log(`identifyMultiScales: identified[${i}] ${timer.get()}`);
                if (matches.length > 0) {
                    matches[0].cardHeight = contourSideLength(matches[0].contour) / scale;
                    // break;
                    callback({matches: matches });
                } else {
                    // callback2(null);
                    console.log('hmm not sure where I am at now. no matches after identifyMultiScales, I guess it will go to the next cardHeight now? I hope?');
                    next();
                }
            };
            if (matches.length > 0) {
                doneIdentifySingleScale(matches);
            } else {
                // matches = 
                that.identifySingleScale(imageDataResized, query_description, loopAndCheckForCancellation, doneIdentifySingleScale, next, cv_debug);
            }
            // if (matches.length > 0) {
            //     matches[0].cardHeight = contourSideLength(matches[0].contour) / scale;
            //     // break;
            //     return {matches: matches };
            // }
            // return null;
        }, callback);
        
        // loopAndCheckForCancellation(myFFF, potentialCardHeights, callback);
        
        // return {
        //     matches: matches,
        //     time: timer.get()
        // }
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

    identifySingleScale(imageData, query_description, loopAndCheckForCancellation, callback, nextOuterLoop, cv_debug = null) {        
        const timer = new Timer();
        if (! imageData.data) {
            throw 'Expected imageData'
        }
        
        let imgSize = [imageData.width, imageData.height];
        let cursorPosition = [Math.round(imgSize[0]/2), Math.round(imgSize[1]/2)];
        // let result = 
        this.featuresMatcher.matchAroundCursor(query_description, cursorPosition, loopAndCheckForCancellation, function doneMatchAroundCursor(result) {
            let matches_per_card_id_sorted;
            if (result) {
                matches_per_card_id_sorted = [result];
            } else {
                matches_per_card_id_sorted = [];
            }
            
            // console.log("identifySingleScale: DONE in " + timer.get() + " ms.");
            // return matches_per_card_id_sorted
            callback(matches_per_card_id_sorted);
        }, nextOuterLoop, cv_debug);
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
