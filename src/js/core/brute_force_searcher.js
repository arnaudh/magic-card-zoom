
class BruteForceSearcher {
  constructor(name) {
    let match = /bruteforce-([a-z]+)/.exec(name);
    this.name = name;
    this.distance = match[1];
    if (!['hamming', 'euclidean'].includes(this.distance)) {
      throw `Unknown BruteForceSearcher ${name}`;
    }
  }

  setPoints(points) {
    this.points = points;
  }

  query(point) {
    let [best] = this.knn(point, 1);
    return best.i;
  }

  knn(queryPoint, k) {
    let distance;
    if (this.distance == 'hamming') {
      distance = hammingDistance;
    } else if (this.distance == 'euclidean') {
      distance = euclideanDistance;
    }
    let is_hamming = this.distance.startsWith('hamming');

    let best_distance = Infinity;
    let best_i;
    let bests = new Array(k);
    for (let i = 0; i < k; i++) {
      bests[i] = {
        distance: Infinity,
        i: -1
      };
    }

    for (let i = 0; i < this.points.length; i++) {
      let d = 0;
      if (is_hamming) {
        for (let j = 0; j < queryPoint.length; j++) {
          d += distance(queryPoint[j], this.points[i][j]);
        }
      } else {
        d = distance(queryPoint, this.points[i]);
      }
      if  (k===1) {
        if (d < best_distance) {
          best_distance = d;
          best_i = i;
        }
      } else {
        // Store in the top k bests
        let insertAt = -1;
        for (let j = bests.length - 1; j >= 0; j--) {
          if (d < bests[j].distance) {
            insertAt = j;
          } else {
            break;
          }
        }
        if (insertAt > -1) {
          bests.splice(insertAt, 0, {distance:d, i:i});
          bests.pop();
        }
      }
    }

    let results;
    if (k == 1) {
      results = [{
        i: best_i,
        distance: best_distance
      }];
    } else {
      results = bests;
    }
    return results;
  }
}

function euclideanDistance(a, b) {
  return Math.hypot(...a.map((e,i)=>e-b[i]));
}

function hammingDistance(x, y) {
  return hammingWeight(x ^ y);
}

// from tracking.js
function hammingWeight(i) {
  i = i - ((i >> 1) & 0x55555555);
  i = (i & 0x33333333) + ((i >> 2) & 0x33333333);

  return ((i + (i >> 4) & 0xF0F0F0F) * 0x1010101) >> 24;
};

module.exports = BruteForceSearcher;
