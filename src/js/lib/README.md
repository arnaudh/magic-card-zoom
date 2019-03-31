

## Compiling Opencv.js

Here are the instructions to compile specific OpenCV functions (here `calib3d.estimateAffinePartial2D`) to Javascript:

1. Clone https://github.com/opencv/opencv.git (commit that worked for me: `d073215f10d586e6984a6681ac4475e1a402cbad`)
2. Edit modules/calib3d/CMakeLists.txt: add `js` after `WRAP java python`
3. Edit modules/js/src/embindgen.py: add `calib3d = {'': ['estimateAffinePartial2D']}` and set `white_list = makeWhiteList([calib3d])`
4. Run `python platforms/js/build_js.py build_js`

This will create an `opencv.js` file inside the `build_js/` folder. 

