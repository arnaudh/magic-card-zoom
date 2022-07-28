
Promise.resolve()
    .then(require('./download_mtg_sets_metadata.js'))     // all sets info (code, name, etc)
    .then(require('./download_standard_info.js'))         // list of sets per standard
    .then(require('./download_images_and_metadata.js'));  // images and their urls
