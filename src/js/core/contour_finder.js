const clustering = require('density-clustering');


let MTG_LENGTH_TO_WIDTH_RATIO = 1.426;

class ContourFinder {
    
    constructor(cvwrapper) {
        this.cvwrapper = cvwrapper;
    }

    getPotentialCardHeights(imageData, cvDebug = null) {
        let rectangles = this.cvwrapper.findRectangles(imageData);
        let rectanglesNotOnBorder = discardRectanglesOnBorderOfImage(rectangles, [imageData.width, imageData.height]);
        let rectanglesMtgRatio = rectanglesNotOnBorder.filter(hasMtgRatio);
        if (cvDebug) {
            cvDebug.imwrite('rectangles.png', cvDebug.drawContours(cvDebug.fromImageData(imageData), rectangles));
            cvDebug.imwrite('rectangles_not_on_border.png', cvDebug.drawContours(cvDebug.fromImageData(imageData), rectanglesNotOnBorder));
            cvDebug.imwrite('rectangles_mtg_ratio.png', cvDebug.drawContours(cvDebug.fromImageData(imageData), rectanglesMtgRatio));
        }
        
        let rectangleLengths = rectanglesMtgRatio.map(getRectangleLength);
        
        let dbscan = new clustering.DBSCAN();
        let clusters = dbscan.run(rectangleLengths.map(l => [l]), 3, 2);
        let clustersWithNoise = clusters.concat(dbscan.noise.map(x => [x]));

        let countAndAverage = clustersWithNoise.map(cluster => {
            let avg = mean(cluster.map(i => rectangleLengths[i]));
            return [cluster.length, avg];
        });
        let potentialCardHeights = countAndAverage.sort((a, b) => b[0] - a[0]).map(a => a[1]);
        return potentialCardHeights;
    }

}

function mean(arr) {
    return arr.reduce( ( p, c ) => p + c, 0 ) / arr.length;
}


function discardRectanglesOnBorderOfImage(rectangles, imgSize) {
    let newRectangles = [];
    for (let rectangle of rectangles) {
        let pointsOnXBorder = [];
        let pointsOnYBorder = []
        for (let point of rectangle) {
            if (point[0] <= 2 || point[0] >= imgSize[0]-2) {
                pointsOnXBorder.push(point)
            }
            if (point[1] <= 2 || point[1] >= imgSize[1]-2) {
                pointsOnYBorder.push(point)
            }
        }
        if (pointsOnXBorder.length < 2 && pointsOnYBorder.length < 2) {
            newRectangles.push(rectangle);
        }
    }

    return newRectangles
}


function getRectangleLengthWidth(rectangle) {
    let d1 = Math.hypot(rectangle[0][0] - rectangle[1][0], rectangle[0][1] - rectangle[1][1]);
    let d2 = Math.hypot(rectangle[2][0] - rectangle[1][0], rectangle[2][1] - rectangle[1][1]);
    let [length, width] = (d1>d2) ? [d1, d2] : [d2, d1];
    return [length, width];
}

function getRectangleLength(rectangle) {
    let [length, width] = getRectangleLengthWidth(rectangle);
    return length;
}

function hasMtgRatio(rectangle) {
    let [length, width] = getRectangleLengthWidth(rectangle);
    let ratio = length / width;
    return Math.abs(ratio - MTG_LENGTH_TO_WIDTH_RATIO) < 0.08;
}

function dedupeOverlapping(rectangles) {

}

module.exports = ContourFinder;

