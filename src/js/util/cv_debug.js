// TODO merge this file with opencvjs_wrapper.js. Or keep it with the `outputDir` logic and
// move the rest out.

// Note: this file is missing a few functions that were once there, and which may get called
// when debugging stuff eg identify_service. These were not ported over when we switched
// from opencv4nodejs to opencv.js (eg cv_debug.fromImageData,
// cv_debug.setDescriptorInputImg). Shouldn't be too hard to port them if needed, you can
// start looking at the merge commit where this comment is introduced and fish out the
// deleted code.

const Jimp = require('jimp');
var fs = require('fs-extra');
var path = require('path');


class CvDebug {
    constructor(cv, outputDir, deleteOutputDir) {
        this.cv = cv;
        this.outputDir = outputDir;
        if (outputDir && deleteOutputDir) {
            console.log(`Deleting ${this.outputDir}`);
            rimraf.sync(this.outputDir);
        }
    }

    log_img(img) {
        console.log(
            'image width: ' + img.cols + '\n' +
            'image height: ' + img.rows + '\n' +
            'image size: ' + img.size().width + '*' + img.size().height + '\n' +
            'image depth: ' + img.depth() + '\n' +
            'image channels ' + img.channels() + '\n' +
            'image type: ' + img.type() + '\n'
        );
    }

    async imread_async(filename) {
        // console.log(`imread(${filename})`);
        var jimpSrc = await Jimp.read(filename);
        // console.log('jimpSrc.bitmap', jimpSrc.bitmap)
        let src = this.cv.matFromImageData(jimpSrc.bitmap);
        return src;
    }

    imwrite(filename, img) {
        let full_filename = `${this.outputDir}/${filename}`;
        let dirname = path.dirname(full_filename);
        fs.mkdirsSync(dirname);
        new Jimp({
            width: img.cols,
            height: img.rows,
            data: Buffer.from(img.data)
        }).write(full_filename);
        console.log(`Wrote image to ${full_filename}`);
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
        // let resizedImg = img.resize(new_height, new_width);
        let dst = new this.cv.Mat();
        let dsize = new this.cv.Size(new_width, new_height);
        this.cv.resize(img, dst, dsize);
        return dst;
        // return resizedImg;
    }

    gaussianBlur(img) {
        let dst = new this.cv.Mat();
        this.cv.GaussianBlur(img, dst, new this.cv.Size(1, 1), 1.2)
        return dst;
    }

    cropToArtPlusOrbBorderInside(img) {
        // image notation
        let x_art_begin = 0.0
        let x_art_end = 1.0
        let y_art_begin = 0.0
        let y_art_end = 0.8
        var cropped = this.crop(
            img,
            Math.round(img.cols*x_art_begin),
            Math.round(img.rows*y_art_begin),
            Math.round(img.cols*(x_art_end-x_art_begin)),
            Math.round(img.rows*(y_art_end-y_art_begin))
        );
        return cropped;
    }

    crop(img, x, y, width, height) {
        // console.log('img', img);
        // console.log(`cropping image [${img.cols}, ${img.rows}] with region [${x}, ${y}, ${width}, ${height}]`);
        if (
            x < 0 || x >= img.cols ||
            y < 0 || y >= img.rows ||
            width < 0 || x + width > img.cols ||
            height < 0 || y + height > img.rows
            ) {
            throw `Crop region out of bounds: img [${img.cols}, ${img.rows}], crop [${x}, ${y}, ${width}, ${height}]`;
        }
        // let rect = new this.cv.Rect(100, 100, 200, 200);
        // dst = src.roi(rect);
        // console.log(this.cv.GetSubRect);
        // console.log(this.cv.getRegion);
        // console.log(this.cv.nonexistente);
        // this.imwrite(`before_crop.png`, img);
        var cropped = img.roi(new this.cv.Rect(x, y, width, height));
        // console.log('cropped', cropped);
        return cropped;
    }

    // this doesn't even return an actual ImageData, but it does the job
    toImageData(img) {
        let matRGBA = new this.cv.Mat();
        if (img.channels === 1) {
            this.cv.cvtColor(img, matRGBA, this.cv.COLOR_GRAY2RGBA)
        } else {
            this.cv.cvtColor(img, matRGBA, this.cv.COLOR_BGR2RGBA);
        }
        return {
            data: new Uint8ClampedArray(matRGBA.data),
            width: img.cols,
            height: img.rows
        };
    }
}


module.exports = CvDebug;


