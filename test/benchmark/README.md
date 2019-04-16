

# Benchmark & dataset

In order to build and improve the detection algorithm, I have started curating a dataset of annotated YouTube screen captures, which can be found in [dataset/](dataset/).
Each item in the dataset is a folder that contains:
- `input.png` the screen capture with a card in the center
- `info.yml` metadata containing the true card ID, as well as information such as video ID, card height (needed by the current ORB descriptor) and optional tags.

## Run benchmark

In order to measure the accuracy of an algorithm, run the following script:

```
node test/benchmark/benchmark.js -d orb-maxkeypoints200-cardheight70 -i orb-maxkeypoints10000-cardheight70_bruteforce-hamming_min3-max100-ratio0.82min3-affine1
```
The `-d` argument is the name of the descriptor whose index we want to load. The `-i` argument is the full name of the algorithm to identify the card: it's composed of a descriptor name (which must be the same as for `-d`, except perhaps different number of keypoints), a searcher name and other parameters (see [identify_service.js](../../src/js/core/identify_service.js) as a starting point to understand the naming).

This will run the identification algorithm on all items in the dataset, and compare the detected card IDs to the true card IDs.

The result for the current best algorithm is the following:

```
                      ┌─────┬─────────┬──────────┐
                      │  ✔  │   ✘ (!) │ accuracy │
 ┌────────────────────┼─────┼─────────┼──────────┤
 │    Card in picture │  61 │   6 (0) │     91.0 │
 │ No card in picture │  36 │   0 (0) │    100.0 │
 └────────────────────┼─────┼─────────┼──────────┤
                Total │  97 │   6 (0) │     94.2 │
                      └─────┴─────────┴──────────┘
```
Meaning of symbols:
- `✔` detected the correct card
- `✘` did not detect the correct card
- `!` detected a card that is not in the picture (worse than not detecting a card at all)



## Expand dataset

You can help grow the dataset as you use the extension!

To do this, set `devMode` to `true` inside `config.json`.
Then, whenever the extension fails to detect a card in a video (or detects the wrong card), simply type `n`. This will download the cropped screen capture and info file.
You can then move these files from your `Download/` folder inside the `dataset/` folder by running the following:

```
node src/js/util/move_feedback_to_training.js
```

The last step is to annotate the new entry with the true card ID.
A card ID has the form `{setName}-{cardNumber}`, for example `m15-63`.
One way to find it is to run the benchmark script on it, and manually check the best guesses printed in the console.

Tip: you can tag dataset entries with any tags you wish, e.g.  `tags: reflection new`, and then run the benchmark on entries with a specific tag using the `-t` argument.





