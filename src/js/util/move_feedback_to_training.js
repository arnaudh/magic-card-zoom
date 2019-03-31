const fs = require('fs-extra');
const os = require('os');

let downloadDir = `${os.homedir()}/Downloads`;
let datasetDir = 'test/benchmark/dataset';

let datasetDirNumbers = fs.readdirSync(datasetDir).map(Number).filter(x => !isNaN(x));
let datasetInsertIndex = Math.max(...datasetDirNumbers) + 1;

fs.readdirSync(downloadDir)
  .forEach((file) => {
    let match = file.match(/(.*)_info\.yml/);
    if (match) {
        let prefix = match[1];
        let datasetSubdir = `${datasetDir}/${datasetInsertIndex.toString().padStart(5, '0')}`;
        fs.mkdirsSync(datasetSubdir);
        fs.rename(`${downloadDir}/${prefix}_info.yml`, `${datasetSubdir}/info.yml`);
        fs.rename(`${downloadDir}/${prefix}_request_input.png`, `${datasetSubdir}/request_input.png`);
        console.log(`Moved ${downloadDir}/${prefix}_{info.yml,request_input.png} to ${datasetSubdir}/`);
        datasetInsertIndex++;
    }
  });
