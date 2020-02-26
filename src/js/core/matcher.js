console.log('matcher.js');
const searchers = require('./searchers.js');
const math = require('mathjs');
const robustPointInPolygon = require("robust-point-in-polygon");

const MTG_LENGTH_TO_WIDTH_RATIO = 1.426;

class Matcher {
    constructor(name, jsonIndex, indexCardHeight, searcher, cvwrapper) {
        let timer = new Timer();
        this.all_features = [];
        this.all_keypoints = [];
        this.card_ids = [];
        this.all_descriptions = jsonIndex;
        this.indexCardHeight = indexCardHeight;

        let match = /min([0-9]+)-max([0-9]+)-ratio([0-9.]+)min([0-9]+)-affine([01])/.exec(name);
        if (match) {
            this.doCrossCheck = false;
            this.ratioThreshold = parseFloat(match[3]);
        } else {
            match = /min([0-9]+)-max([0-9]+)-()crosscheckmin([0-9]+)-affine([01])/.exec(name);
            if (!match) {
                throw `Unexpected matcher name ${name}`;
            }
            this.doCrossCheck = true;
        }
        this.singleCardMatchesMin = parseInt(match[4]);
        this.minMatches = parseInt(match[1]);
        this.maxMatches = parseInt(match[2]);
        this.doAffine = parseInt(match[5]) === 1;
        if (!this.doAffine) {
            throw 'doAffine=1 is required to be able to return contour';
        }
    
        for (const [card_id, description] of Object.entries(jsonIndex)) {
            for (let k = 0; k < description['keypoints'].length; k++) {
                let feature = description['features'][k];
                let keypoint = description['keypoints'][k];
                this.all_features.push(feature);
                this.all_keypoints.push(keypoint);
                this.card_ids.push(card_id);
            }
        }
        console.log('  _Matcher_________');
        this.logRanges();
        console.log(` | minMatches: ${this.minMatches}`);
        console.log(` | maxMatches: ${this.maxMatches}`);
        this.searcher = searcher;
        this.cvwrapper = cvwrapper;
        searcher.setPoints(this.all_features);
    }

    logRanges() {
        let feature_range = [Infinity, -Infinity];
        let keypoint_x_range = [Infinity, -Infinity];
        let keypoint_y_range = [Infinity, -Infinity];

        for (let k = 0; k < this.all_keypoints.length; k++) {
            let keypoint = this.all_keypoints[k];
            let feature = this.all_features[k];

            let min_feature = Math.min.apply(null, feature);
            let max_feature = Math.max.apply(null, feature);
            if (min_feature < feature_range[0]) feature_range[0] = min_feature;
            if (max_feature > feature_range[1]) feature_range[1] = max_feature;

            let keypoint_x = keypoint[0];
            if (keypoint_x < keypoint_x_range[0]) keypoint_x_range[0] = keypoint_x;
            if (keypoint_x > keypoint_x_range[1]) keypoint_x_range[1] = keypoint_x;

            let keypoint_y = keypoint[1];
            if (keypoint_y < keypoint_y_range[0]) keypoint_y_range[0] = keypoint_y;
            if (keypoint_y > keypoint_y_range[1]) keypoint_y_range[1] = keypoint_y;
        }
        console.log(` | num keypoints: ${this.all_keypoints.length}`);
        console.log(` | feature_range: ${feature_range}`);
        console.log(` | keypoint_x_range: ${keypoint_x_range}`);
        console.log(` | keypoint_y_range: ${keypoint_y_range}`);
    }


    matchAroundCursor(description, cursorPosition, loopAndCheckForCancellation, callback, nextOuterLoop, cv_debug) {
        let TOP_K = 1;
        let timer = new Timer();
        // logDescription(description);
        let keypoints = description['keypoints'];
        let features = description['features'];
        let matches_per_card_id = {};
        for (const card_id of this.card_ids) {
            matches_per_card_id[card_id] = [];
        }
        // Sort keypoints by distance to cursorPosition
        sortArraysBasedOnFirst(keypoints, features, function(a, b) {
            let da = distance(a, cursorPosition);
            let db = distance(b, cursorPosition);
            return ((da < db) ? -1 : ((da == db) ? 0 : 1));
        })

        let timer_total = new Timer();
        let maxK = Math.min(keypoints.length, this.maxMatches);
        let k;
        let card_ids_checked_no_match = [];
        let result = null;

        // for (k = 0; k < maxK; k++) {
        let that = this;
        // let funToLoop = function(k) {
        loopAndCheckForCancellation(maxK, function loopMatchAroundCursor(k, nextInnerLoop) {
            // console.log('matchAroundCursor k=', k);
            // let timer_loop = new Timer();
            let bests = that.searcher.knn(features[k], 1);
            let best = bests[0];
            let card_id = that.card_ids[best.i];
            best.k = k;

            let match = {
                keypoint1: keypoints[k],
                feature1: features[k],
                keypoint2: that.all_keypoints[best.i],
                feature2: that.all_features[best.i],
                distance: best.distance
            }
            matches_per_card_id[card_id].push(match);

            if (card_ids_checked_no_match.includes(card_id)) {
                console.log(`not checking again ${card_id}`);
                // continue;
                nextInnerLoop(); return;
            }
            if (matches_per_card_id[card_id].length < that.minMatches) {
                // continue;
                nextInnerLoop(); return;
            }

            let matchedCardContour = that.checkMatch(description, card_id, cursorPosition, cv_debug);
            if (matchedCardContour) {
                result = {
                    card_id: card_id,
                    contour: matchedCardContour
                };
                // break;
                console.log(`MATCHED with k=${k}`);
                callback(result); return;
            } else {
                card_ids_checked_no_match.push(card_id);
                nextInnerLoop(); return;
            }
        }, nextOuterLoop);

        // let range = Array.from({length: maxK}, (x,i) => i);
        // loopAndCheckForCancellation(funToLoop, range, callback);


        // console.log(`matchAroundCursor() result = ${result} after testing ${k+1} features (minMatches=${this.minMatches}, maxMatches=${this.maxMatches}) DONE in ${timer_total.get()} ms`);
        // return result;
    }

    checkMatch(description, card_id, cursorPosition, cv_debug) {
        let matchesSingleCardWithDupes;
        if (this.doCrossCheck) {
            matchesSingleCardWithDupes = this.matchSingleCardWithCrosscheck(description, card_id, cv_debug);   
        } else {
            matchesSingleCardWithDupes = this.matchSingleCardWithRatio(description, card_id, cv_debug);
        }
        let matchesSingleCard = this.deduplicateMatches(matchesSingleCardWithDupes);

        if (matchesSingleCard.length < this.singleCardMatchesMin) {
            // console.log('Too few matches single card', card_id, matchesSingleCard.length, 'min', this.singleCardMatchesMin);
            return null;
        }

        let affineResult = this.estimateAffineTransform(matchesSingleCard, cv_debug, card_id);
        let affineSensible = this.isAffineResultSensible(affineResult);
        if (!affineSensible) {
            // console.log('affine transform not sensible', card_id);
            return null;
        }
        let matchedCardContour = this.getMatchedCardContour(affineResult.transform, cv_debug, card_id);
        let pointInPolygon = isPointInPolygon(cursorPosition, matchedCardContour);
        if (pointInPolygon) {
            return matchedCardContour;
        }
        return null;
    }

    matchSingleCardWithRatio(description, card_id, cv_debug) {
        let card_id_description = this.all_descriptions[card_id];
        let matches = this.matchBetweenDescriptions(description, card_id_description);

        let goodMatches = matches.filter(m => m.ratioWithSecond < this.ratioThreshold);
        if (cv_debug) {
            cv_debug.drawAndSaveMatches(card_id, goodMatches, `matcher/matches_${("000"+goodMatches.length).slice(-3)}_${card_id}_ratio.png`, 2);
        }
        return goodMatches;
    }

    matchSingleCardWithCrosscheck(description, card_id, cv_debug) {
        let card_id_description = this.all_descriptions[card_id];
        let matches1 = this.matchBetweenDescriptions(description, card_id_description);
        let matches2 = this.matchBetweenDescriptions(card_id_description, description);

        let crossCheckedMatches = [];
        for (let i = 0; i < matches1.length; i++) {
            let idQuery = matches1[i].id1;
            for (let j = 0; j < matches2.length; j++) {
                if (matches1[i].id1 === matches2[j].id2 &&
                    matches1[i].id2 === matches2[j].id1) {
                    crossCheckedMatches.push(matches1[i]);
                }
            }
        }
        if (cv_debug) {
            cv_debug.drawAndSaveMatches(card_id, crossCheckedMatches, `matcher/matches_${card_id}_crosschecked.png`, 2);
        }
        return crossCheckedMatches;
    }

    deduplicateMatches(matches) {
        let keypoints1 = matches.map(m => m.keypoint1);
        let keypoints2 = matches.map(m => m.keypoint2);
        let countsKeypoints1 = countElements(keypoints1);
        let countsKeypoints2 = countElements(keypoints2);

        let dedupedMatches = matches.filter(m => countsKeypoints1[m.keypoint1] === 1 && countsKeypoints2[m.keypoint2] === 1);
        return  dedupedMatches;
    }

    estimateAffineTransform(matches, cv_debug, card_id) {
        let keypoints1 = matches.map(m => m.keypoint1);
        let keypoints2 = matches.map(m => m.keypoint2);
        let affineResult = this.cvwrapper.estimateAffinePartial2D(keypoints1, keypoints2);
        // console.log('affineResult.transform', affineResult.transform);
        // console.log('affineResult.transformComponents', affineResult.transformComponents);

        if (cv_debug && cv_debug.descriptor_input_img) {
            let mask = affineResult.inliers.filter(i => i[0] === 1);
            let matchesAffine = matches.filter((x, i) => mask[i]);
            // console.log('matchesAffine', matchesAffine);
            let min_matches = 2;
            cv_debug.drawAndSaveMatches(card_id, matchesAffine, `matcher/matches_affine_${card_id}.png`, min_matches);
        }

        return affineResult;
    }
        
    isAffineResultSensible(affineResult) {
        let isAffine = affineResult.transform.length > 0;
        let mask = affineResult.inliers.filter(i => i[0] === 1);
        let isScaleCloseTo1 = Math.abs(affineResult.transformComponents.scaleX - 1) < 0.2;
        
        let affineSensible = isAffine && mask.length >= 4 && isScaleCloseTo1;
        return affineSensible;
    }

    getMatchedCardContour(affineTransform, cv_debug, card_id) {
        let affineTransformCopy = affineTransform.slice();
        affineTransformCopy.push([0,0,1]);
        let inverseAffineTransformRaw = math.inv(affineTransformCopy)
        let inverseAffineTransform = [inverseAffineTransformRaw[0], inverseAffineTransformRaw[1]]; // no [0 0 1] row
        let height = this.indexCardHeight;
        let width = this.indexCardHeight / MTG_LENGTH_TO_WIDTH_RATIO;
        let indexCardContour = math.transpose([
            [0,     0,      1],
            [width, 0,      1],
            [width, height, 1],
            [0,     height, 1]
        ]);
        let matchedCardContour = math.multiply(inverseAffineTransform, indexCardContour);
        matchedCardContour = math.transpose(matchedCardContour);

        if (cv_debug && cv_debug.descriptor_input_img) {
            cv_debug.drawAndSaveContour(card_id, matchedCardContour, `matcher/matched_contour_${card_id}.png`);
        }
        return matchedCardContour;
    }

    matchBetweenDescriptions(description_1, description_2) {
        // console.log(`matchBetweenDescriptions(${description_1.keypoints.length}, ${description_2.keypoints.length})`);
        let searcher = searchers.fromName('bruteforce-hamming');
        searcher.setPoints(description_2.features);

        let matches = [];
        for (let k = 0; k < description_1.keypoints.length; k++) {
            let bests = searcher.knn(description_1.features[k], 2);
            let best = bests[0];
            let ratioWithSecond = bests[0].distance / bests[1].distance;
            let match = {
                id1: k,
                keypoint1: description_1.keypoints[k],
                feature1: description_1.features[k],
                id2: best.i,
                keypoint2: description_2.keypoints[best.i],
                feature2: description_2.features[best.i],
                distance: best.distance,
                ratioWithSecond: ratioWithSecond
            }
            matches.push(match);
        }
        return matches;
    }
}

function logDescription(description) {
    console.log('DESCRIPTION');
    for (let i = 0; i < description.keypoints.length; i++) {
        console.log(`[${i}] (${description.keypoints[i]}) ${description.features[i].join('')}`);
    }
}

function sortArraysBasedOnFirst(arr1, arr2, sortFn) {
    //1) combine the arrays:
    let list = [];
    for (let j = 0; j < arr1.length; j++) 
        list.push({'val1': arr1[j], 'val2': arr2[j]});

    //2) sort:
    list.sort(function(a, b) {
        return sortFn(a.val1, b.val1);
    });

    //3) separate them back out:
    for (let k = 0; k < list.length; k++) {
        arr1[k] = list[k].val1;
        arr2[k] = list[k].val2;
    }
}

function isPointInPolygon(point, polygon) {
    let polygonCheck = robustPointInPolygon(polygon, point);
    return (polygonCheck <= 0);
}

function distance(a, b) {
    return Math.hypot(...a.map((e,i)=>e-b[i]));
}

function countElements(arr) {
    return arr.reduce((a, b) => 
        Object.assign(a, {[b]: (a[b] || 0) + 1}), {});
}

function nthIndex(str, pat, n){
    let L= str.length, i= -1;
    while(n-- && i++<L){
        i= str.indexOf(pat, i);
        if (i < 0) break;
    }
    return i;
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

module.exports = Matcher;
