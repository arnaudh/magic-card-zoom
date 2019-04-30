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

    constructor(name, jsonIndex, cvwrapper, withHistory) {
        let [descriptorName, searcherName, matcherName] = name.split('_');
        this.name = name;
        this.featuresDescriptor = descriptors.fromName(descriptorName);
        if (!this.featuresDescriptor.cardHeight) {
            throw 'this.featuresDescriptor.cardHeight is not defined'
        }
        this.featuresMatcher = new Matcher(matcherName, jsonIndex, this.featuresDescriptor.cardHeight, searchers.fromName(searcherName), cvwrapper);
        this.withHistory = withHistory;
        if (this.withHistory) {
            this.previousMatches = []; //TODO limit in time
        }
        this.contourFinder = new ContourFinder(cvwrapper);
        console.log('IdentifyService', this.name);
    }

    // TODO pass whole screen with cursor position (so we can detect card contours over whole screen) OR move contour detection outside
    // TODO deal with cardHeight (video ratio) instead of cardHeight (pixels)
    async identify(imageData, defaultPotentialCardHeights, cv_debug = null) {
        let previousMatchCardHeights = [];
        if (this.withHistory) {
            previousMatchCardHeights = this.previousMatches.map(matches => matches[0].cardHeight);
        }
        let estimatedPotentialCardHeights = this.contourFinder.getPotentialCardHeights(imageData);
        let potentialCardHeights = previousMatchCardHeights.concat(estimatedPotentialCardHeights).concat(defaultPotentialCardHeights);
        potentialCardHeights = [...new Set(potentialCardHeights.map(h => Math.ceil(h/2)*2))];
        console.log('previousMatchCardHeights', previousMatchCardHeights);
        console.log('estimatedPotentialCardHeights', estimatedPotentialCardHeights);
        console.log('defaultPotentialCardHeights', defaultPotentialCardHeights);
        console.log('=> potentialCardHeights', potentialCardHeights);
        const timer = new Timer();
        let matches = [];
        if (this.withHistory) {
            matches = this.checkMatchPreviousMatches(imageData, potentialCardHeights, cv_debug);
        }
        if (matches.length === 0) {
            for (let i = 0; i < potentialCardHeights.length; i++) {
                let cardHeight = potentialCardHeights[i];
                let scale = this.featuresDescriptor.cardHeight / cardHeight;
                let newWidth = Math.round(scale * imageData.width);
                let newHeight = Math.round(scale * imageData.height);
                let imageDataResized = resizeImageData(imageData, newWidth, newHeight);

                matches = this.identifySingleScale(imageDataResized, cv_debug);
                if (matches.length > 0) {
                    console.log('matches[0].contour', matches[0].contour);
                    matches[0].cardHeight = contourSideLength(matches[0].contour);
                    if (this.withHistory) {
                        this.previousMatches.push(matches);
                    }
                    break;
                }
            }
        }
        console.log("identify() DONE in " + timer.get() + " ms.");
        return {
            matches: matches,
            time: timer.get()
        }
    }

    checkMatchPreviousMatches(imageData, potentialCardHeights, cv_debug = null) {
        const timer = new Timer();
        let checked_card_ids = [];

        let query_descriptions = [];
        for (let i = 0; i < potentialCardHeights.length; i++) {
            let cardHeight = potentialCardHeights[i];
            let scale = this.featuresDescriptor.cardHeight / cardHeight;
            let newWidth = Math.round(scale * imageData.width);
            let newHeight = Math.round(scale * imageData.height);
            let imageDataResized = resizeImageData(imageData, newWidth, newHeight);
            
            let imgSize = [imageDataResized.width, imageDataResized.height];
            let cursorPosition = [Math.round(imgSize[0]/2), Math.round(imgSize[1]/2)];
            let query_description = this.featuresDescriptor.describe(imageDataResized, cv_debug);
            console.log(`checkMatchPreviousMatches() after describe ${timer.get()} ms.`);
            query_descriptions.push([query_description, cardHeight, cursorPosition]);
        }

        let card_id = null;
        let matches = [];
        outer_loop: for (var i = this.previousMatches.length - 1; i >= Math.max(0, this.previousMatches.length-20); i--) {
            let previousMatch = this.previousMatches[i];
            card_id = previousMatch[0].card_id;
            let cardHeight = previousMatch[0].cardHeight;

            if (checked_card_ids.includes(card_id)) {
                console.log(`checkMatchPreviousMatches() not checking again ${card_id}`);
                break;
            }
        
            for (var j = 0; j < query_descriptions.length; j++) {
                let [query_description, cardHeight, cursorPosition] = query_descriptions[j];
                let contour = this.featuresMatcher.checkMatch(query_description, card_id, cursorPosition);
                console.log(`checkMatchPreviousMatches() after checkMatch ${timer.get()} ms.`);

                if (contour) {
                    matches = [{
                            card_id: card_id,
                            cardHeight: cardHeight,
                            contour: contour
                        }];
                    break outer_loop;
                }
            }
        }
        console.log(`checkMatchPreviousMatches() got ${card_id} DONE in ${timer.get()} ms.`);
        return matches;
    }

    identifySingleScale(imageData, cv_debug = null) {        
        const timer = new Timer();
        if (! imageData.data) {
            throw 'Expected imageData'
        }
        let img;
        if (cv_debug) {
            img = cv_debug.fromImageData(imageData)
            cv_debug.setDescriptorInputImg(img);
        }
        
        let query_description = this.featuresDescriptor.describe(imageData, cv_debug);
        console.log(`describe() got ${query_description.keypoints.length} keypoints DONE in ${timer.get()} ms.`);
        let imgSize = [imageData.width, imageData.height];
        let cursorPosition = [Math.round(imgSize[0]/2), Math.round(imgSize[1]/2)];
        let result = this.featuresMatcher.matchAroundCursor(query_description, cursorPosition, cv_debug);
        let matches_per_card_id_sorted;
        if (result) {
            matches_per_card_id_sorted = [result];
        } else {
            matches_per_card_id_sorted = [];
        }
        
        console.log("identifySingleScale() DONE in " + timer.get() + " ms.");
        return matches_per_card_id_sorted
    }
}

function contourSideLength(c) {
    let l0 = distance(c[0], c[1]);
    let l1 = distance(c[1], c[2]);
    let l2 = distance(c[2], c[3]);
    let l3 = distance(c[3], c[0]);
    console.log('l0', l0);
    console.log('l1', l1);
    console.log('l2', l2);
    console.log('l3', l3);
    let sidesSorted = [l0, l1, l2, l3].sort();
    console.log('sidesSorted');
    let averageLength = (sidesSorted[2]+sidesSorted[3])/2;
    console.log('averageLength', averageLength);
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
