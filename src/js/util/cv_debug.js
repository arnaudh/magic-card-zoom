var cv = require('opencv4nodejs');
var fs = require('fs-extra');
var path = require('path');
var rimraf = require('rimraf');
const program = require('commander');


class CvDebug {
    constructor(outputDir, deleteOutputDir) {
        this.cv = cv;
        this.outputDir = outputDir;
        if (outputDir && deleteOutputDir) {
            console.log(`Deleting ${this.outputDir}`);
            rimraf.sync(this.outputDir);
        }
    }

     makeShitty(img) {
        let new_height = 70;
        // let new_height = 70;
        // console.log('makeShitty', img);
        var imgResized = img.resize(new_height, Math.round(img.cols*new_height/img.rows), 0, 0, cv.INTER_AREA);
        // console.log('imgResized', imgResized);
        // var imgBlurred = imgResized.convertScaleAbs(0.1, 0.6)
        var imgBlurred = imgResized.gaussianBlur(new cv.Size(1, 1), 1.2);
        // console.log('imgBlurred', imgBlurred);
        return imgBlurred;
    }

    makeShittyAndCropToArt(img) {
        // image notation
        let x_art_begin = 0.062
        let x_art_end = 0.93
        let y_art_begin = 0.097
        let y_art_end = 0.56
        var shitty = this.makeShitty(img);
        // console.log('shitty.cols', shitty.cols);
        // console.log('x_art_end-x_art_begin', x_art_end-x_art_begin);
        // console.log('shitty.cols*(x_art_end-x_art_begin)', shitty.cols*(x_art_end-x_art_begin));
        var cropped = this.crop(
            shitty,
            Math.round(shitty.cols*x_art_begin),
            Math.round(shitty.rows*y_art_begin),
            Math.round(shitty.cols*(x_art_end-x_art_begin)),
            Math.round(shitty.rows*(y_art_end-y_art_begin))
        );
        return cropped;
    }

    makeShittyAndCropToArtPlusOrbBorderInside(img) {
        // image notation
        let x_art_begin = 0.0
        let x_art_end = 1.0
        let y_art_begin = 0.0
        let y_art_end = 0.8
        var shitty = this.makeShitty(img);
        // console.log('shitty.cols', shitty.cols);
        // console.log('x_art_end-x_art_begin', x_art_end-x_art_begin);
        // console.log('shitty.cols*(x_art_end-x_art_begin)', shitty.cols*(x_art_end-x_art_begin));
        var cropped = this.crop(
            shitty,
            Math.round(shitty.cols*x_art_begin),
            Math.round(shitty.rows*y_art_begin),
            Math.round(shitty.cols*(x_art_end-x_art_begin)),
            Math.round(shitty.rows*(y_art_end-y_art_begin))
        );
        return cropped;
    }

    cropToArtPlusOrbBorderInside(img) {
        // image notation
        let x_art_begin = 0.0
        let x_art_end = 1.0
        let y_art_begin = 0.0
        let y_art_end = 0.8
        shitty = img;
        // console.log('shitty.cols', shitty.cols);
        // console.log('x_art_end-x_art_begin', x_art_end-x_art_begin);
        // console.log('shitty.cols*(x_art_end-x_art_begin)', shitty.cols*(x_art_end-x_art_begin));
        var cropped = this.crop(
            shitty,
            Math.round(shitty.cols*x_art_begin),
            Math.round(shitty.rows*y_art_begin),
            Math.round(shitty.cols*(x_art_end-x_art_begin)),
            Math.round(shitty.rows*(y_art_end-y_art_begin))
        );
        return cropped;
    }

    crop(img, x, y, width, height) {
        // console.log('img', img);
        console.log(`cropping image [${img.cols}, ${img.rows}] with region [${x}, ${y}, ${width}, ${height}]`);
        if (
            x < 0 || x >= img.cols ||
            y < 0 || y >= img.rows ||
            width < 0 || x + width > img.cols ||
            height < 0 || y + height > img.rows
            ) {
            throw `Crop region out of bounds: img [${img.cols}, ${img.rows}], crop [${x}, ${y}, ${width}, ${height}]`;
        }
        var cropped = img.getRegion(new cv.Rect(x, y, width, height));
        // console.log('cropped', cropped);
        return cropped;
    }

    setDescriptorInputImg(descriptor_input_img) {
        this.descriptor_input_img = descriptor_input_img;
    }

    readBase64(imageBase64) {
        let match = /base64,(.*)/.exec(imageBase64);
        let base64imageWithoutPrefix = match[1];
        return cv.imdecode(Buffer.from(base64imageWithoutPrefix, 'base64'));
    }

    toBase64(img, extension = '.png') {
        // console.log('toBase64', img, extension);
        return cv.imencode(extension, img).toString('base64');
    }

    // this doesn't even return an actual ImageData, but it does the job
    toImageData(img) {
        const matRGBA = img.channels === 1
          ? img.cvtColor(cv.COLOR_GRAY2RGBA)
          : img.cvtColor(cv.COLOR_BGR2RGBA);
        return {
          data: new Uint8ClampedArray(matRGBA.getData()),
          width: img.cols,
          height: img.rows
        };
    }
    fromImageData(imageData) {
        const wrongColorImg = new cv.Mat(Buffer.from(imageData.data), imageData.height, imageData.width, cv.CV_8UC4);
        const img = wrongColorImg.cvtColor(cv.COLOR_RGBA2BGR);
        return img;
    }

    imread(filename) {
        // console.log('imread ', filename);
        if (!fs.existsSync(filename)) {
            throw `File not found: ${filename}`;
        }
        try {
            return cv.imread(filename);
        } catch(error) {
            throw Error(`Could not read ${filename}`);

        }
    }

    imwrite(filename, img) {
        let full_filename = `${this.outputDir}/${filename}`;
        let dirname = path.dirname(full_filename);
        fs.mkdirsSync(dirname);
        let res = cv.imwrite(full_filename, img);
        console.log(`Wrote image to ${full_filename}`);
    }

    drawPoints(img_original, points) {
        // console.log('drawPoints', img_original, points);
        var img = img_original.copy();
        let color = new cv.Vec(255, 0, 255);
        for (const point of points) {
            img.drawCircle(new cv.Point2(point[0], point[1]), 2, color);
        }
        return img;
    }

    drawContour(img_original, contour) {
        var img = img_original.copy();

        let points2 = [];
        for (const point of contour) {
            let vec = new cv.Point2(point[0], point[1]);
            points2.push(vec);
        }
        let contourCv = new cv.Contour(points2);
        let color =  new cv.Vec(255, 0, 255);
        img.drawContours([contourCv], color);
        return img;
    }

    resize(img, [width, height]) {
        var new_height, new_width;
        if (width) {
            if (height) {
                new_width = width;
                new_height = height;
            } else {
                new_width = width;
                new_height = Math.round(img.rows * width / img.cols);
            }
        } else if (height) {
            new_width = Math.round(img.cols * height / img.rows);
            new_height = height;
        } else {
            throw 'resize() needs width or height, or both';
        }
        // console.log(`cv_debug resizing image [${img.cols}, ${img.rows}] -> [${new_width}, ${new_height}]`);
        let resizedImg = img.resize(new_height, new_width);
        return resizedImg;
    }

    joinImages(img1, img2) {
        // this.imwrite('img2.png', img2)
        // console.log('joinImages', img1, img2);
        let rows = Math.max(img1.rows, img2.rows);
        let cols = img1.cols + img2.cols;
        // console.log('cv.CV_8UC3', cv.CV_8UC3, img1.type, img2.type);
        let sideBySide = new cv.Mat(rows, cols, cv.CV_8UC3, [0, 0, 0]);
        // console.log('sideBySide', sideBySide);
        // console.log('new cv.Rect(0, 0, img1.rows, img1.cols)', new cv.Rect(0, 0, img1.rows, img1.cols));
        // console.log('should be like img1', img1);
        img1.copyTo(sideBySide.getRegion(new cv.Rect(0, 0, img1.cols, img1.rows)));
        img2.copyTo(sideBySide.getRegion(new cv.Rect(img1.cols, 0, img2.cols, img2.rows)));
        // console.log('new cv.Rect(0, img1.cols, img2.rows, img2.cols)', new cv.Rect(0, img1.cols, img2.rows, img2.cols));
        // console.log('should be like img2', img2);
        // img2.copyTo(sideBySide.getRegion(new cv.Rect(0, 0, img2.rows, img2.cols)));
        // console.log('Done', sideBySide);
        return sideBySide;
    }

    drawAndSaveMatches(card_id, matches, filename, min_matches = 1) {
        // console.log('drawAndSaveMatches', card_id, this.descriptor_input_img);
        let keypoints_1 = matches.map(m => m.keypoint1);
        let keypoints_2 = matches.map(m => m.keypoint2);
        if (keypoints_1.length >= min_matches) {
            let img_keypoints = this.drawPoints(this.descriptor_input_img, keypoints_1);
            let true_card_img = this.imread(`assets/images/cards/orb-maxkeypoints200-cardheight70/cropped/${card_id}.png`);
            // console.log(`drawAndSaveMatches ${card_id} [${true_card_img.cols}, ${true_card_img.rows}] kp1:`, keypoints_1);
            // console.log(`drawAndSaveMatches ${card_id} [${true_card_img.cols}, ${true_card_img.rows}] kp2:`, keypoints_2);
            let true_card_img_keypoints = this.drawPoints(true_card_img, keypoints_2);
            let true_card_img_resized = this.resize(true_card_img_keypoints, [null, img_keypoints.cols]);
            let img_combined = this.joinImages(img_keypoints, true_card_img_resized);
            this.imwrite(filename, img_combined);
        }
    }

    drawAndSaveContour(card_id, contour, filename) {
        let img_contour = this.drawContour(this.descriptor_input_img, contour);
        let true_card_img = this.imread(`assets/images/cards/orb-maxkeypoints200-cardheight70/cropped/${card_id}.png`);
        let true_card_img_resized = this.resize(true_card_img, [null, img_contour.cols]);
        let img_combined = this.joinImages(img_contour, true_card_img_resized);
        this.imwrite(filename, img_combined);
    }
}

if (typeof require != 'undefined' && require.main==module) {
    program
        .usage('[options] img_path')
        // .option('-d, --descriptor [name]', 'Which descriptor to use')
        // .option('-c, --cvdebug', 'Write debug images to disk')
        .parse(process.argv);
    var imgPath = program.args[0];
    var cvDebug = new CvDebug('bla', false);
    var img = cvDebug.imread(imgPath);
    var shitty = cvDebug.makeShitty(img);
    cvDebug.imwrite('shitty.png', shitty);
}

module.exports = CvDebug;


