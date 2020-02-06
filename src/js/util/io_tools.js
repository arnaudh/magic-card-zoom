const fs = require('fs-extra');
const path = require('path');
const Promise = require('bluebird');
Promise.promisifyAll(fs);


function writePrettyJsonToFile(json, filename) {
    var prettyBody = JSON.stringify(json, null, 4);
    fs.mkdirsSync(path.dirname(filename));
    fs.writeFileSync(filename, prettyBody); 
    console.log(`Wrote to ${filename}`);
}

function readJsonAsync(filename) {
    return fs.readFileAsync(filename)
        .then(JSON.parse);
}

function readJsonSync(filename) {
    return JSON.parse(fs.readFileSync(filename));
}

module.exports.writePrettyJsonToFile = writePrettyJsonToFile;
module.exports.readJsonAsync = readJsonAsync;
module.exports.readJsonSync = readJsonSync;
