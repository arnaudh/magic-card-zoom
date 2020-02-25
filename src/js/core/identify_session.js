console.log('identify_session.js');

const ContourFinder = require('./contour_finder.js');
const IdentifyService = require('./identify_service.js');

const MAX_HISTORY_SIZE = 10;

class IdentifySession {

    constructor(name, jsonIndex, cvwrapper, withHistory) {
        this.identifyService = new IdentifyService(name, jsonIndex, cvwrapper);
        this.withHistory = withHistory;
        this.previousMatches = [];
        this.contourFinder = new ContourFinder(cvwrapper);
    }
    
    identify(videoImageData, closeupImageData, defaultPotentialCardHeights, timer, loopAndCheckForCancellation, callback, cv_debug = null) {
        let previousMatchCardHeights = [];
        if (this.withHistory) {
            previousMatchCardHeights = this.previousMatches.slice(-1).map(matches => matches[0].cardHeightRatio * videoImageData.height);
        }
        let estimatedPotentialCardHeights = this.contourFinder.getPotentialCardHeights(videoImageData, cv_debug);
        let potentialCardHeights = previousMatchCardHeights.concat(estimatedPotentialCardHeights).concat(defaultPotentialCardHeights);
        potentialCardHeights = [...new Set(potentialCardHeights.map(h => Math.ceil(h/2)*2))];
        // console.log('|previousMatchCardHeights', previousMatchCardHeights);
        // console.log('|estimatedPotentialCardHeights', estimatedPotentialCardHeights);
        // console.log('|defaultPotentialCardHeights', defaultPotentialCardHeights);
        console.log('|=> potentialCardHeights', potentialCardHeights);
        let matches = [];

        // TODO here only run identify on 1 scale, and then hop through Chrome message system to make sure we don't have a new message
        let that = this;
        let callbackHere = function(resultMultiScales) {
            if (resultMultiScales.matches.length > 0) {
                matches = resultMultiScales.matches;
                matches[0].cardHeightRatio = matches[0].cardHeight / videoImageData.height;
                if (that.withHistory) {
                    that.previousMatches.push(matches);
                    if (that.previousMatches.length > MAX_HISTORY_SIZE) {
                        that.previousMatches.shift(1); // Remove oldest entry
                    }
                }
            }
            timer.top('IdentifySession.identify');
            callback({
                matches: matches
            });
        }
        // let resultMultiScales = this.identifyService.identifyMultiScales(closeupImageData, potentialCardHeights, this.previousMatches, loopAndCheckForCancellation, callback);
        this.identifyService.identifyMultiScales(closeupImageData, potentialCardHeights, this.previousMatches, loopAndCheckForCancellation, callbackHere);
        // console.log(`resultMultiScales = ${resultMultiScales}`);

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


module.exports = IdentifySession;
