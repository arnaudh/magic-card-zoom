
# Manifest v3

Chrome is [phasing out Manifest v2](https://developer.chrome.com/docs/extensions/mv3/mv2-sunset/):
- June 2023: Chrome may run experiments to turn off support for Manifest V2 extensions
- Jan 2024: removal of all Manifest V2 items

[Manifest v3 migration guide](https://developer.chrome.com/docs/extensions/mv3/mv3-migration/)

TODO
- [x] Go through [checklist](https://developer.chrome.com/docs/extensions/mv3/mv3-migration-checklist/)
    - DONE except service workers
- [ ] Quick patch each issue below (eg remove affected code) until the extension loads ok, so we uncover all major issues
- [ ] Replace background page with service workers (SW)
    - SW are short lived. Probably need to re-work the index loading / session storage.
    - index loading
        - measure time for each step in index_loader.load (fetch file, load, etc.)
        - consider if it makes sense to switch to Web SQL Database or application cache (are we alread using the application cache?)
    - [Some tricks to make SW more persistent](https://stackoverflow.com/questions/66618136/persistent-service-worker-in-chrome-extension/66618269#66618269)
- [ ] Handle code which uses `eval` or equivalent `new Function(...)`
    - not allowed in v3 anymore, as deemed unsafe
    - one solution seems to be sandboxing: [official link](https://developer.chrome.com/docs/extensions/mv3/sandboxingEval/), [unofficial blog post](https://medium.com/geekculture/how-to-use-eval-in-a-v3-chrome-extension-f21ca8c2160c)
    - Code in MagicCardZoom affected:
        - opencv.js: uses `new Function` a bunch of times, seemingly just to name anonymous functions?
        - robust-point-in-polygon package, which uses robust-orientation ([known issue](https://github.com/mikolalysenko/robust-orientation/issues/4)). Alternative could be the point-in-polygon package?
        - more?
- [ ] wasm
    - got the error "Refused to compile or instantiate WebAssembly module because neither 'wasm-eval' nor 'unsafe-eval' is an allowed"
    - `wasm-unsafe-eval` should fix this?

# ![Logo](src/img/icon30.svg) MagicCardZoom

MagicCardZoom is a browser extension to identify _Magic: the Gathering™_ cards in videos and streams.

![](src/img/capture1.gif)

## Installation

The extension can be installed directly from the [Chrome Web Store](https://chrome.google.com/webstore/detail/magic-card-zoom/cphkchmjhpgjajfogfkolbgageciokda).

<!--- Detailed Description for the Web Store
Chrome extension to identify Magic: The Gathering™ cards in videos and streams. Simply hover your mouse over any card to get a high definition visual.

=== Updates ===
[2020-02-09] Version 3.1.3
- Add Kaldheim set
[2020-09-05] Version 3.1.2
- Add Zendikar Rising set
- starter sets are now included (e.g. Arena Beginner Set)
[2020-08-09] Version 3.1.1
- Use simpler Scryfall API to render cards
- Add Core Set 2021 set
[2020-05-01] Version 3.1
- Add the Modern Masters and Modern Horizons sets to the Modern format
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

Please submit any feedback, issues, or feature requests you have using [GitHub issues](/../../issues) or [this quick feedback link](https://docs.google.com/forms/d/e/1FAIpQLSc74wD1PziO3uHVpGuEHrQj9vrd_EMKhSxVJhtaJDyT42ELTQ/viewform?usp=sf_link), or by sending an email to magiccardzoom@gmail.com.

Also, you are more than welcome to contribute to this repository!
Please first open an issue (or send an email) so we can discuss the approach and I can help you get setup.

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

### Clone the repository

```
git clone git@github.com:arnaudh/magic-card-zoom.git
cd magic-card-zoom/
```

### Install dependencies

```
yarn
```

### Download images

> From here onwards, the cards used to build and run the extension are taken from the formats specified in [config.json](config.json), using the `allowedFormats` property.
> If left empty, all sets found on Scryfall will be used. To speed up development and testing, it is recommended to limit to a single format, e.g. `allowedFormats: ["standard-kld"]`

The following command downloads all images and necessary metadata from [Scryfall](http://scryfall.com) (can take around 4 hours for all sets, or 3 minutes for a single Standard).

```
node src/js/util/download_all.js
```

This will create the `assets/` folder at the root of the repository.
- `assets/images/` contains all the card images
- `assets/metadata/` contains information about cards and sets

The script can be interrupted, and when re-run it will continue to download images and metadata that it hasn't downloaded yet.

### Index images

Indexing is the generation of feature descriptors, i.e. the "card signatures" that are later used to match the video pixels to a specific card.
Currently the feature descriptor used is [ORB](http://www.willowgarage.com/sites/default/files/orb_final.pdf), as provided by the [jsfeat](https://github.com/inspirit/jsfeat) library.

```
node src/js/util/index_images.js
```

This will create the `assets/indexes/` folder containing the indexes of all images, grouped by sets.

### Build the extension

```
node src/js/build/build.js
```

Note: check there is no `WARNING - unable to locate ...`, as this means we'd miss out on some indexes.

This will create the `build/` folder containing all code and assets required to load & run the extension in the browser.

### Load the extension

In Chrome: Menu (⋮) > More Tools > Extensions > Load unpacked > select the `build/` folder.

The extension should now be loaded and ready to use.

After making changes to the code, re-build and then click the refresh button on the extensions page. If you have modified the feature descriptors used to identify images, you will need to re-run the indexing before building again.

## Adding a new _Magic: the Gathering™_ set

The following steps need to be done whenever a new set is released.

1. Check if there is a new set available on Scryfall: https://scryfall.com/sets

    Make sure that latest set has all its cards available on scryfall.

2. Edit download_standard_info.js to specify the latest set code:

    ```
    const latestMtgSet = 'znr';
    ```

3. (Optional) delete existing metadata and index files

    ```
    trash ./assets/metadata/cards/full/ ./assets/indexes/orb-maxkeypoints200-cardheight70/
    ```

    Doing this makes sure we download and index the latest list of cards for each set
    (there may have been new images uploaded on older sets since the last run).

    Can also see discrepancies between metadata and indexes:
    ```
    jq -r '.[] | {code,card_count} | join(" ")' assets/metadata/sets/sets.json | sort > metadata.csv
    for set in assets/indexes/orb-maxkeypoints200-cardheight70/*; do indexed_cards=$(grep -o keypoints $set | wc -l | tr -d ' ') && echo $(basename $set .json) $indexed_cards; done | sort > indexes.csv
    join indexes.csv metadata.csv | awk '$2<$3'
    ```

4. Re-run setup instructions starting from step 4 ([Download images](#download-images) etc.)

    There may be some errors here that need to be dealt with manually. For example the parsing of the Standard formats from Wikipedia is prone to issues, so special cases may need to be added in `download_standard_info.js`.

    Check that the `build/` folder loads and the extension works as expected on the new set(s).

5. Regenerate test files

    First set `let regenerate = true` in `mtg_sets_test.js`, then re-run unit tests: `yarn test --recursive test/unit/`.
    Check that the changes in `test/unit/assets/expanded_sets.json` make sense (should just add the new sets), then revert to `let regenerate = false`.

    Then commit the changes:

    ```
    git commit -am "Add <name_of_the_set> set"
    ```

6. Bump the version

    Bump the patch version in `src/manifest.json` and commit the changes:

    ```
    git commit -am "Set version to <X.X.X>"
    ``` 

7. Release the new version of the extension on the Webstore

    ```
    make package
    ```

    Confirm the zip file loads and runs as expected.

    Then manually upload the zip file to the [Chrome Dev Console](https://chrome.google.com/u/2/webstore/devconsole).

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
- [OpenCV](https://github.com/opencv/opencv): open source computer vision library with C++, Python and Java interfaces (and [JavaScript binding](https://docs.opencv.org/3.4/d5/d10/tutorial_js_root.html))
- [opencv4nodejs](https://github.com/justadudewhohacks/opencv4nodejs): OpenCV bindings for NodeJS
- [emscripten](https://emscripten.org/): toolchain for compiling C/C++ to asm.js and WebAssembly
- [ORB](http://www.willowgarage.com/sites/default/files/orb_final.pdf): fast rotation-invariant feature descriptor
- [PyImageSearch](http://www.pyimagesearch.com/): computer vision tutorials in Python using OpenCV


## Disclaimer

MagicCardZoom is unofficial Fan Content permitted under the Fan Content Policy. Not approved/endorsed by Wizards. Portions of the materials used are property of Wizards of the Coast. ©Wizards of the Coast LLC. 
