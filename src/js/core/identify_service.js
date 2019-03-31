console.log('identify_service.js');

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
        this.previousMatches = []; //TODO limit in time
        console.log('IdentifyService', this.name);
    }

    async identify(imageData, potentialCardHeights, cv_debug = null) {
        const timer = new Timer();
        let results = null;
        results = this.checkMatchPreviousMatches(imageData, potentialCardHeights, cv_debug);
        if (results.matches.length == 0) {
            for (let i = 0; i < potentialCardHeights.length; i++) {
                let cardHeight = potentialCardHeights[i];
                let scale = this.featuresDescriptor.cardHeight / cardHeight;
                let newWidth = Math.round(scale * imageData.width);
                let newHeight = Math.round(scale * imageData.height);
                let imageDataResized = resizeImageData(imageData, newWidth, newHeight);

                results = this.identifySingleScale(imageDataResized, cv_debug);
                if (results.matches.length > 0) {
                    results.matches[0].cardHeight = cardHeight;
                    this.previousMatches.push(results.matches);
                    break;
                }
            }
        }
        console.log("identify() DONE in " + timer.get() + " ms.");
        return results
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

        for (var i = this.previousMatches.length - 1; i >= Math.max(0, this.previousMatches.length-20); i--) {
            let previousMatch = this.previousMatches[i];
            let card_id = previousMatch[0].card_id;
            let cardHeight = previousMatch[0].cardHeight;

            if (checked_card_ids.includes(card_id)) {
                console.log(`checkMatchPreviousMatches() not checking again ${card_id}`);
                break;
            }
        
            // let imageDataResized = resizeImageData(imageData, newWidth, newHeight);
            for (var j = 0; j < query_descriptions.length; j++) {
                let [query_description, cardHeight, cursorPosition] = query_descriptions[j];
                let contour = this.featuresMatcher.checkMatch(query_description, card_id, cursorPosition);
                console.log(`checkMatchPreviousMatches() after checkMatch ${timer.get()} ms.`);

                if (contour) {
                    let results = {
                        matches: [{
                            card_id: card_id,
                            cardHeight: cardHeight,
                            contour: contour
                        }]
                    };
                    console.log(`checkMatchPreviousMatches() got ${card_id} DONE in ${timer.get()} ms.`);
                    return results;
                }
            }
            // console.log(`checkMatchPreviousMatches() after resize ${timer.get()} ms.`);
        
        }
        console.log(`checkMatchPreviousMatches() got null DONE in ${timer.get()} ms.`);
        let results = {
            matches: []
        };
        return results;
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
        return {
            'matches': matches_per_card_id_sorted,
            'time': timer.get()
        };
    }
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
