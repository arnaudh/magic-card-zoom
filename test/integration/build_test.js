const puppeteer = require('puppeteer');
const path = require('path');
const util = require('util')
const { exec } = require('child_process');
const assert = require('assert');
const fs = require('fs-extra')

const buildPath = path.join(__dirname, '../../build');

describe('build & install', () => {

  // boots a Chrome instance using Puppeteer and adds the extension
  it('it installs the extension', async () => {
    const options = {
      headless: false,
      ignoreHTTPSErrors: true,
      args: [
        `--disable-extensions-except=${buildPath}`,
        `--load-extension=${buildPath}`,
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    }
    const browser = await puppeteer.launch(options)
    await browser.close()
  }).timeout(5000);
})
