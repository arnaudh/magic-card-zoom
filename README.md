# ![Logo](src/img/icon30.svg) MagicCardZoom

MagicCardZoom is a browser extension to identify _Magic: the Gathering™_ cards in videos and streams.

![](src/img/capture1.gif)

## Installation

The extension can be installed directly from the [Chrome Web Store](https://chrome.google.com/webstore/detail/magic-card-zoom/cphkchmjhpgjajfogfkolbgageciokda).

<!--- Detailed Description for the Web Store
Chrome extension to identify Magic: The Gathering™ cards in videos and streams. Simply hover your mouse over any card to get a high definition visual.

=== Updates ===
[2020-04-10] Version 3.0
- Expanded the list of cards to include all cards ever printed!
You can now choose formats such as Pioneer, Modern, Vintage or Commander, in addition to the Standard formats. This was made possible by optimizing the detection algorithms and refactoring the extension's internal messaging system. Please keep in mind that a smaller pool of cards gives faster and more accurate results, so pick a smaller pool when possible.
- Added Ikoria: Lair of Behemoths set
[2020-01-14] Version 2.0.3
- Added Theros Beyond Death set
[2019-11-11] Version 2.0.2
- Added Eldritch Moon set
- Fixed memory leak that crashed the extension after a while
- Fixed fullscreen on Twitch
[2019-10-13] Version 2.0
- You can now use MagicCardZoom on any video/stream on the web, including Twitch!

=== How to use ===
1. Install the extension
2. Go to a video/stream showing a game of Magic (e.g. https://youtu.be/cKPaR2uSpPk?t=222)
3. Click on the extension icon in the top right corner of the browser
4. Select the appropriate pool of cards for the game (best guess will be selected by default), then click on "Start MagicCardZoom"
5. Hover your mouse over any card in the video to get a high definition visual of the card (works best when hovering over the card's art)

To stop running the extension, click on the extension icon, then click on "Stop MagicCardZoom". The extension will also stop when closing the tab or navigating to a new page.

=== Limitations ===
Identification of the correct card depends on how recognisable the card's artwork is, therefore strong light reflection or obstructions (e.g. by dice or other cards) will cause some cards to not be identified.
Also keep in mind that the number of cards in the pool has a direct impact on the accuracy of the detection, therefore the extension will work better on smaller formats such as Standard or Pioneer as opposed to larger formats such as Modern, Vintage or Commander.

=== Feedback / contribute ===
Please submit any feedback, questions or issues you have to magiccardzoom@gmail.com, or use the feedback link in the extension popup.
Also, this extension is Open Source and you are welcome to contribute: https://github.com/arnaudh/magic-card-zoom

=== Disclaimer ===
MagicCardZoom is unofficial Fan Content permitted under the Fan Content Policy. Not approved/endorsed by Wizards. Portions of the materials used are property of Wizards of the Coast. ©Wizards of the Coast LLC.

-->

## How does it work?

See [this page](./doc/How_it_works.md) for an explanation of how it works.

## Contributing

Please submit any feedback, issues, or feature requests you have [here](https://docs.google.com/forms/d/e/1FAIpQLSc74wD1PziO3uHVpGuEHrQj9vrd_EMKhSxVJhtaJDyT42ELTQ/viewform?usp=sf_link).

Also, you are more than welcome to contribute directly to this repository!
To do so, fork it, make some changes and submit a pull request.

## Setup

The following instructions guide you through setting up, building and loading the extension from source.

### Overview

1. [Prerequisites](#prerequisites)
2. [Clone the repository](#clone-the-repository)
3. [Install dependencies](#install-dependencies)
4. [Download images](#download-images)
5. [Index images](#index-images)
6. [Build the extension](#build-the-extension)
7. [Load the extension](#load-the-extension)


### Prerequisites

Make sure you have the following installed:
- [NodeJS](https://nodejs.org/)
- [Yarn](https://yarnpkg.com/en/docs/install)
- [CMake](https://cmake.org/download/)

### Clone the repository

```
git clone git@github.com:arnaudh/magic-card-zoom.git
cd magic-card-zoom/
```

### Install dependencies

Takes about 20 min, due to opencv4nodejs being built.

```
yarn
```

### Download images

> From here onwards, the images and indexes are downloaded & built for the pool of cards specified in [config.json](config.json) (under `availableStandards`).
> To speed up these steps, e.g. for dev/testing purposes, you can edit that file to target only one Standard set of your choosing.

This downloads all images and necessary metadata from [Scryfall](http://scryfall.com) (takes about 30 minutes for all Standard sets).

```
node src/js/util/download_all.js
```

This will create the `assets/` folder at the root of the repository.
- `assets/images/` contains all the card images
- `assets/metadata/` contains information about cards and sets


### Index images

Indexing is the generation of feature descriptors for all card images in the pool of cards. The feature descriptors are the "card signatures" that are later used to match the video pixels to a specific card.
Currently the feature descriptor used is [ORB](http://www.willowgarage.com/sites/default/files/orb_final.pdf), as provided by the [jsfeat](https://github.com/inspirit/jsfeat) library.

```
node src/js/util/index_images.js
```

This will create the `assets/indexes/` folder containing the indexes of all images, grouped by sets.

### Build the extension

```
node src/js/build/build.js
```

This will create the `build/` folder containing all code and assets required to load & run the extension in the browser.

### Load the extension

In Chrome: Menu > More Tools > Extensions > Load unpacked > Select the `build/` folder

The extension should now be loaded and ready to use.

After making changes to the code, re-build and then click the refresh button on the extensions page. If you have modified the feature descriptors used to identify images, you will need to re-run the indexing before building again.

### Adding a new _Magic: the Gathering™_ set

The following steps need to be done whenever a new set is released.

1. Check if there is a new set available on Scryfall: https://scryfall.com/sets

2. Edit download_standard_info.js to specify the latest set code:

```
const latestMtgSet = 'thb';
```

3. Edit standard.json to add the latest standard:

```
  "availableStandards": [
    ...,
    "standard-thb"
  ],
```

4. Re-run setup instructions starting from step 4 ([Download images](#download-images) etc.) 

5. Release the new version of the extension on the Webstore

## Test


Run unit tests

```
yarn test --recursive test/unit/
```

Run the integration test, which makes sure the extension can be built and loaded in the browser

```
yarn test test/integration/build_test.js
```

### Benchmark

Identifying cards from pixels is a challenge and depends on many factors such as video resolution, lighting and card obstruction.
In order to verify that changes to the algorithms improve the overall accuracy, I have annotated a dataset of YouTube screenshots with the ground truth (i.e. the true card ID).
The dataset and benchmark script can be found under [test/benchmark/](test/benchmark/).


## Aknowledgements

- [Scryfall](https://scryfall.com/): comprehensive search engine and API for _Magic: the Gathering™_ cards
- [jsfeat](https://github.com/inspirit/jsfeat): JavaScript computer vision library
- [OpenCV](https://github.com/opencv/opencv): open source computer vision library with C++, Python and Java interfaces
- [opencv4nodejs](https://github.com/justadudewhohacks/opencv4nodejs): OpenCV bindings for NodeJS
- [emscripten](https://emscripten.org/): toolchain for compiling C/C++ to asm.js and WebAssembly
- [ORB](http://www.willowgarage.com/sites/default/files/orb_final.pdf): fast rotation-invariant feature descriptor
- [PyImageSearch](http://www.pyimagesearch.com/): computer vision tutorials in Python using OpenCV


## Disclaimer

MagicCardZoom is unofficial Fan Content permitted under the Fan Content Policy. Not approved/endorsed by Wizards. Portions of the materials used are property of Wizards of the Coast. ©Wizards of the Coast LLC. 
