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
    
    async identify(videoImageData, closeupImageData, defaultPotentialCardHeights, cv_debug = null) {
        let previousMatchCardHeights = [];
        if (this.withHistory) {
            previousMatchCardHeights = this.previousMatches.slice(-1).map(matches => matches[0].cardHeightRatio * videoImageData.height);
        }
        let estimatedPotentialCardHeights = this.contourFinder.getPotentialCardHeights(videoImageData);
        let potentialCardHeights = previousMatchCardHeights.concat(estimatedPotentialCardHeights).concat(defaultPotentialCardHeights);
        potentialCardHeights = [...new Set(potentialCardHeights.map(h => Math.ceil(h/2)*2))];
        console.log('|previousMatchCardHeights', previousMatchCardHeights);
        console.log('|estimatedPotentialCardHeights', estimatedPotentialCardHeights);
        console.log('|defaultPotentialCardHeights', defaultPotentialCardHeights);
        console.log('|=> potentialCardHeights', potentialCardHeights);
        const timer = new Timer();
        let matches = [];

        let resultMultiScales = await this.identifyService.identifyMultiScales(closeupImageData, potentialCardHeights, this.previousMatches);
        console.log(`resultMultiScales = ${resultMultiScales}`);
        if (resultMultiScales.matches.length > 0) {
            matches = resultMultiScales.matches;
            matches[0].cardHeightRatio = matches[0].cardHeight / videoImageData.height;
            if (this.withHistory) {
                this.previousMatches.push(matches);
                if (this.previousMatches.length > MAX_HISTORY_SIZE) {
                    this.previousMatches.shift(1); // Remove oldest entry
                }
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
