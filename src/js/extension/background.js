console.log('background.js');

// any image needed by the extension needs to be imported here
import '../../img/icon128_recording.png'
import '../../img/icon128.png'

let runtimeReady = false;
let cvwrapper;
require('../core/opencvjs_wrapper.js').initialize(function(cvwrapper_){
  cvwrapper = cvwrapper_;
  runtimeReady = true;
  console.log('Runtime is ready');
});

const indexLoader = require('./index_loader.js');
const IdentifySession = require('../core/identify_session.js');
const DisplayService = require('./display_service.js');
const mtg_sets = require('../mtg_sets.js');
const config = require('../../../config.json');

import { saveAs } from 'file-saver';

let mcz_active_tabs = {};
let LATEST_MESSAGE_ID = -1;

let lastBlob = null;
let lastCardId = null;
let lastVideoHeight = null;
let lastCardHeight = null;

// Update the declarative rules on install or upgrade.
// TODO move to manifest https://developer.chrome.com/extensions/manifest/event_rules
chrome.runtime.onInstalled.addListener(function() {
  chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
    chrome.declarativeContent.onPageChanged.addRules([{
      conditions: [
        // When a page contains a <video> tag...
        new chrome.declarativeContent.PageStateMatcher({
          pageUrl: { hostEquals: 'www.youtube.com' },
          css: ["video"]
        })
      ],
      // ... show the page action. // could also change the icon
      actions: [new chrome.declarativeContent.ShowPageAction() ]
    }]);
  });
});


// sender.tab is set for messages sent by content script, NOT by popup
chrome.runtime.onMessage.addListener(
  function(message, sender, sendResponse) {
    console.log(`===> RECEIVE [${message.messageID}] ${message.messageType} @ ${new Date().toISOString()}`, message);
    if (message.messageID) {
      LATEST_MESSAGE_ID = message.messageID;
    }
    switch (message.messageType) {
      case 'pageActionClicked':
        if (!runtimeReady) {
          console.log('RUNTIME NOT READY, IGNORING MESSAGE');
          chrome.runtime.sendMessage({
            messageType: "popupMessage",
            data: {
              message: 'MCZ runtime is not ready, please try again in a moment.'
            }
          });
          return;
        }
        getCurrentTabId(function(currentTabId) {
          console.log(`currentTabId ${currentTabId} in mcz_active_tabs ${mcz_active_tabs}? `, currentTabId in mcz_active_tabs);
          if (currentTabId in mcz_active_tabs) {
            console.log('sending popupShowTurnOffButton');
            chrome.runtime.sendMessage({messageType: "popupShowTurnOffButton"});
          } else {
            chrome.tabs.executeScript(currentTabId, {file: 'pre_main.bundle.js'});
          }
        });
        break;

      case 'okToShowAvailableFormats':
        getCurrentTab(function(currentTab) {
          console.log('currentTab', currentTab);
          let availableFormats = mtg_sets.allAvailableStandards.map(standard => {
            let standardName = mtg_sets.getStandardName(standard);
            return {
              'value': standard,
              'text': standardName
            };
          })
          availableFormats.reverse();
          let potentialMtgStandard = mtg_sets.findMtgStandardInText(currentTab.title);
          let suggested_format = potentialMtgStandard ? {'value': potentialMtgStandard} : null;
          console.log('HERE background sending popupShowAvailableFormats');
          chrome.runtime.sendMessage({
            messageType: "popupShowAvailableFormats",
            createdAt: new Date().toISOString(),
            data: {
              'available_formats': availableFormats,
              'suggested_format': suggested_format,
              'status': 'success',
              'available_action': 'turn-on'
            }
          });
        });
        break;

      case 'activateMagic':
        getCurrentTabId(function(currentTabId) {
          mcz_active_tabs[currentTabId] = {
            mtgFormat: message.data.mtg_format
          };
          console.log(`mcz_active_tabs (inserted ${currentTabId})`, Object.keys(mcz_active_tabs));
          indexLoader.load(mtg_sets.expandSets(message.data.mtg_format))
            .then(index => { 
              console.log('index size', Object.keys(index).length);
              console.log('USING cvwrapper in background.js');
              mcz_active_tabs[currentTabId].identifySession = new IdentifySession(config.identifyServiceName, index, cvwrapper, true);
              console.log(`mcz_active_tabs (set identifySession of ${currentTabId})`, Object.keys(mcz_active_tabs));

              chrome.tabs.executeScript(currentTabId, {
                file: 'main.bundle.js'
              });
            });
        });
        break;

      case 'turnOffMagic':
        getCurrentTabId(function(tabId) {
          stopTabRecording(tabId);
        });
        break;

      case 'mainLoopActive':
        chrome.pageAction.setIcon({tabId: sender.tab.id, path: 'icon128_recording.png'});
        break;

      case 'mouseMovedOverVideo':
        let currentTab = sender.tab;
        let currentTabId = sender.tab.id;
        if (currentTabId in mcz_active_tabs) {
          identifyCard(message, currentTab, sendResponse);
        } else {
          console.log(`WEIRD: content script still active, but tab ${currentTabId} not in mcz_active_tabs`);
        }
        return true; // so that the sender knows the response is asynchronous
        break;

      case 'cancelIdentify':
        // don't do anything, just setting the LATEST_MESSAGE_ID is enough
        break;

      case 'sendFeedback':
        let token = new Date().toISOString().replace(/:./g, '');
        let videoId = message.data.videoId;
        let cardId = message.data.correctlyIdentified ? lastCardId : '';
        saveAs(lastBlob, `${token}/input.png`);
        let yamlBlob = new Blob([`card: ${cardId}\nvideo: ${videoId}\nvideoheight: ${lastVideoHeight}\ncardheight: ${lastCardHeight}\n`], {type: "text/plain;charset=utf-8"});
        saveAs(yamlBlob, `${token}_info.yml`);
        break;
    }
  }
);

chrome.tabs.onRemoved.addListener(function(tabId, removeInfo) {
  if (tabId in mcz_active_tabs) {
    delete mcz_active_tabs[tabId];
    console.log(`mcz_active_tabs (deleted ${tabId} because tab closed)`, Object.keys(mcz_active_tabs));
  }
})

// when tabs loads (eg go to other video, reload)
chrome.tabs.onUpdated.addListener(function(tabId, updateInfo) {
  if (tabId in mcz_active_tabs && updateInfo.status) {
    stopTabRecording(tabId);
  }
})

function getCurrentTab(callback) {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    if (tabs.length === 0) {
      console.log('WEIRD: chrome.tabs.query() returned no tabs, not calling callback');
    } else {
      callback(tabs[0]);
    }
  });
}

function getCurrentTabId(callback) {
  getCurrentTab(t => callback(t.id));
}

function stopTabRecording(tabId) {
  console.log(`stopTabRecording(tabId=${tabId})`);
  chrome.tabs.sendMessage(tabId, {messageType: 'stopMainLoop'});
  delete mcz_active_tabs[tabId];
  console.log(`mcz_active_tabs (deleted ${tabId})`, Object.keys(mcz_active_tabs));
  chrome.pageAction.setIcon({tabId: tabId, path: 'icon128.png'});
}

function identifyCard(message, tab, sendResponse) {
  if (checkMessageOutdated(message.messageID, 'identifyCard')) return;
  
  const devicePixelRatio = message.data.devicePixelRatio;
  function cssPxToDevicePixel(cssPx) {
    // takes into account dpi and zoom factor
    return Math.round(cssPx * devicePixelRatio);
  }
  
  const clientX = cssPxToDevicePixel(message.data.mousePosition.clientX);
  const clientY = cssPxToDevicePixel(message.data.mousePosition.clientY);
  const videoX = cssPxToDevicePixel(message.data.videoBoundingRect.x);
  const videoY = cssPxToDevicePixel(message.data.videoBoundingRect.y);
  const videoWidth = cssPxToDevicePixel(message.data.videoBoundingRect.width);
  const videoHeight = cssPxToDevicePixel(message.data.videoBoundingRect.height);
  const channelID = message.data.page.channelID;


  const cardToScreenRatios = config.youtubeChannels[channelID].card_heights;
  const potentialCardHeights = cardToScreenRatios.map(function(ratio) {
    let cardHeight = Math.round(ratio * videoHeight);
    return cardHeight;
  });
  const maxCardHeight = Math.max(...potentialCardHeights);

  const cropLength = maxCardHeight*2;

  lastVideoHeight = videoHeight;
  chrome.tabs.captureVisibleTab(
    tab.windowId,
    {format: "jpeg"},
    function(dataUrl) {
      if (checkMessageOutdated(message.messageID, 'after captureVisibleTab')) return;
      cropImage2(
        dataUrl,
        {'x':videoX, 'y':videoY, 'width':videoWidth, 'height':videoHeight}, 
        {'x':clientX-cropLength/2, 'y':clientY-cropLength/2, 'width':cropLength, 'height':cropLength},
        function(imageData1, imageData2){
          if (checkMessageOutdated(message.messageID, 'after cropImage')) return;
          identify_query_in_frontend(imageData1, imageData2, potentialCardHeights, message.messageID, tab.id, sendResponse);
        }
      );

    }
  );

  return true; // so that the sender knows the response is asynchronous
}

function cropImage(dataUrl, cropLocation, cropSize, callback) {
  let sourceImage = new Image();
  let [cropX, cropY] = cropLocation;
  let [cropWidth, cropHeight] = cropSize;

  sourceImage.onload = function() {
    // console.log(`cropImage [${sourceImage.width}, ${sourceImage.height}] -> [${cropWidth}, ${cropHeight}], centered on (${cropX}, ${cropY})`);
    // Create a canvas with the desired dimensions
    let canvas = document.createElement("canvas");
    canvas.width = cropWidth;
    canvas.height = cropHeight;

    // Scale and draw the source image to the canvas
    let ctx = canvas.getContext('2d');
    ctx.drawImage(
      sourceImage,
      cropX - cropWidth/2, cropY - cropHeight/2, cropWidth, cropHeight,
      0, 0, cropWidth, cropHeight
    );

    canvas.toBlob(function(blob) {
      lastBlob = blob;
    });

    let imageData = ctx.getImageData(0, 0, cropWidth, cropHeight);
    callback(imageData);
  }

  sourceImage.src = dataUrl;
}


function cropImage2(dataUrl, boundingRect1, boundingRect2, callback) {
  console.log('boundingRect1', boundingRect1);
  console.log('boundingRect2', boundingRect2);
  let sourceImage = new Image();

  sourceImage.onload = function() {
    // Create a canvas with the desired dimensions
    let canvas = document.createElement("canvas");
    canvas.width = sourceImage.width;
    canvas.height = sourceImage.height;

    // Scale and draw the source image to the canvas
    let ctx = canvas.getContext('2d');
    ctx.drawImage(sourceImage, 0, 0);

    //TODO save only cropped blob
    // canvas.toBlob(function(blob) {
    //   lastBlob = blob;
    //   // saveAs(blob, `cropImage2.png`);
    // });

    let imageData1 = ctx.getImageData(boundingRect1.x, boundingRect1.y, boundingRect1.width, boundingRect1.height);
    let imageData2 = ctx.getImageData(boundingRect2.x, boundingRect2.y, boundingRect2.width, boundingRect2.height);
    callback(imageData1, imageData2);
  }

  sourceImage.src = dataUrl;
}

function identify_query_in_frontend(imageData1, imageData2, potentialCardHeights, messageID, tabId, sendResponse) {
  if (checkMessageOutdated(messageID, 'after getCurrentTabId')) return;
  mcz_active_tabs[tabId].identifySession.identify(imageData1, imageData2, potentialCardHeights)
    .then(results => {
      if (checkMessageOutdated(messageID, 'after identify')) return;
      let matches = results['matches'];
      let response;
      if (matches.length > 0) {
        let card_id = matches[0].card_id;
        lastCardHeight = matches[0].cardHeight;
        let contour = matches[0].contour; //TODO do something with contour, ie translate to relative video size and return to main.js
        lastCardId = card_id;
        response = {
          card: {
            image_url: DisplayService.getDisplayUrl(card_id)
          },
          status: 'success',
          messageID: messageID
        }
      } else {
        lastCardId = null;
        response = {
          card: null,
          status: 'success',
          messageID: messageID,
        };
      }
      console.log(`<=== sendResponse [${messageID}]`, response);
      console.log(`${new Date().toISOString()} calling back sendResponse() with card ${response.card}`);
      sendResponse(response);
    });
}

function checkMessageOutdated(messageID, stepName) {
  let outdated = messageID !== LATEST_MESSAGE_ID;
  if (outdated) {
    console.log(`*** message ${messageID} is not the latest (${LATEST_MESSAGE_ID}) - stopping @ ${stepName}`);
  }
  return outdated;
}


