console.log('identify_session.js');

const ContourFinder = require('./contour_finder.js');
const IdentifyService = require('./identify_service.js');

class IdentifySession {

    constructor(name, jsonIndex, cvwrapper, withHistory) {
        this.identifyService = new IdentifyService(name, jsonIndex, cvwrapper);
        this.withHistory = withHistory;
        if (this.withHistory) {
            this.previousMatches = []; //TODO limit in time
        }
        this.contourFinder = new ContourFinder(cvwrapper);
    }
    
    // TODO pass whole screen with cursor position (so we can detect card contours over whole screen)
    // TODO deal with cardHeight (video ratio) instead of cardHeight (pixels)
    async identify(imageData, defaultPotentialCardHeights, cv_debug = null) {
        let previousMatchCardHeights = [];
        if (this.withHistory) {
            previousMatchCardHeights = this.previousMatches.map(matches => matches[0].cardHeight);
        }
        let estimatedPotentialCardHeights = this.contourFinder.getPotentialCardHeights(imageData);
        let potentialCardHeights = previousMatchCardHeights.concat(estimatedPotentialCardHeights).concat(defaultPotentialCardHeights);
        potentialCardHeights = [...new Set(potentialCardHeights.map(h => Math.ceil(h/2)*2))];
        console.log('|previousMatchCardHeights', previousMatchCardHeights);
        console.log('|estimatedPotentialCardHeights', estimatedPotentialCardHeights);
        console.log('|defaultPotentialCardHeights', defaultPotentialCardHeights);
        console.log('|=> potentialCardHeights', potentialCardHeights);
        const timer = new Timer();
        let matches = [];
        if (this.withHistory) {
            matches = this.identifyService.checkMatchPreviousMatches(imageData, this.previousMatches.slice(-20), potentialCardHeights, cv_debug);
        }
        if (matches.length === 0) {
            let resultMultiScales = await this.identifyService.identifyMultiScales(imageData, potentialCardHeights, cv_debug);
            if (resultMultiScales.matches.length > 0) {
                matches = resultMultiScales.matches;
                this.previousMatches.push(matches);
            }
        }
        console.log("identify() DONE in " + timer.get() + " ms.");
        return {
            matches: matches,
            time: timer.get()
        }
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
