
downloadMtgSetsMetadata = require('./download_mtg_sets_metadata.js');
downloadStandardInfo = require('./download_standard_info.js');
downloadImagesAndMetadata = require('./download_images_and_metadata.js');

Promise.resolve()
    .then(downloadMtgSetsMetadata)     // all sets info (code, name, etc)
    .then(downloadStandardInfo)        // list of sets per standard
    .then(downloadImagesAndMetadata);  // images and their urls
