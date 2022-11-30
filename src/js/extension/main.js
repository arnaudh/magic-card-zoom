console.log('main.js');

import '../../css/main.css'
import '../../img/loading.gif'

const config = require('../../../config.json');

let channelUrlRegex = /.*youtube\.com\/channel\/([a-zA-Z0-9_-]+)/;

let theCanvas;
let mousePos;
let currentRectangle;
let popup;
let popupImage;
let loadingPopup;
let loadingPopupImage;
let parentOfPopup = document.body;

let mousePosition = null;
let lastMouseLoopPosition = null;
let lastMouseStopToIdentifyPosition = null;
let mouse_stopped_to_identify = false;
let lastMove = new Date();
let identifyRequestId = null;
let channelID;


// how long must the mouse stay fixed over the video to trigger identify()
const MOUSE_STOP_AND_IDENTIFY_DELAY = 50;
const MOUSE_CHECK_LOOP_INTERVAL = 10;

// horizontal space between mouse and popup card
const spaceX = 30;
// css Px
const MOVE_DISTANCE_TO_CANCEL_IDENTIFICATION = 5;

let waitingForIdentifyResponseMessageID = null;
let lastMessageSent = null;

let checkMouseLoopInterval;
let readyStateCheckInterval = setInterval(function() {
  console.log('[MCZ main.js] Checking if there is a video...');
  let videos = document.getElementsByTagName('video');
  if (videos.length > 0) {
    console.log(`[MCZ main.js] Found ${videos.length} video(s)`);
    clearInterval(readyStateCheckInterval);

    channelID = getChannelId();
    
    popupImage = document.createElement('img');
    popup = document.createElement('div');
    popup.className = "mcz-popup";
    popup.appendChild(popupImage);
    
    loadingPopupImage = document.createElement('img');
    loadingPopupImage.src = chrome.runtime.getURL("loading.gif");
    loadingPopup = document.createElement('div');
    loadingPopup.className = "loading-popup";
    loadingPopup.appendChild(loadingPopupImage);

    parentOfPopup.appendChild(popup);
    parentOfPopup.appendChild(loadingPopup);

    document.addEventListener('mousemove', mymousemove, false);

    if (config.devMode) {
      console.log('DEV MODE ENABLED, adding key listener');
      addKeyListener();
    }

    checkMouseLoopInterval = setInterval(checkMouseLoop, MOUSE_CHECK_LOOP_INTERVAL);

    chrome.runtime.sendMessage({ messageType: "mainLoopActive", pageTitle: document.title });
  }
}, 10);


let messageID = 0;

function addKeyListener() {
  document.onkeypress = function(e) {
    e = e || window.event;
    let charCode = (typeof e.which == "number") ? e.which : e.keyCode;
    let char = String.fromCharCode(charCode)
    console.log('KEY PRESS', char)
    switch (char) {
      case 'y':
      case 'n':
        let correctlyIdentified = (char === 'y');
        console.log('correct card?', correctlyIdentified);
        let videoId = window.location.href.match(/v=([^&#]+)/)[1];
        sendChromeMessage(
          'sendFeedback',
          {
            correctlyIdentified: correctlyIdentified,
            videoId: videoId
          }
        );
        break;
      default:
        break;
      }
  };
}

function movePopupAndLoadingIfNecessary() {
  // if in fullscreen, make sure popup is under the fullscreen element
  if (document.fullscreenElement && popup.parentElement != document.fullscreenElement) {
    console.log('moving popup & loading under fullscreen element');
    document.fullscreenElement.appendChild(popup);
    document.fullscreenElement.appendChild(loadingPopup);
  }
  // if not in fullscreen, make sure popup is under the body
  if (!document.fullscreenElement && popup.parentElement != document.body) {
    console.log('moving popup & loading under body');
    document.body.appendChild(popup);
    document.body.appendChild(loadingPopup);
  }
}

// simple timer class
// can pass timer as input, so we can pass it through chrome.runtime.sendMessage, and create a new one on reception
// (chrome.runtime.sendMessage can only pass JSON around, not objects with state/functions)
function Timer(timer) {
  // console.log(`new Timer(${timer})`);
  if (timer) {
    this.times = Array.from(timer.times);
    this.previousTime = timer.previousTime;
  } else {
    this.times = [];
    this.previousTime = (new Date()).getTime();
  }
  this.top = function(stepName) {
    let newTime = (new Date()).getTime();
    this.times.push({
      stepName: stepName,
      time: newTime - this.previousTime
    });
    this.previousTime = newTime;
  }
  this.logTimes = function() {
    console.log(this.times.map(t => `[TIMER] ${t.stepName}: ${t.time} ms`).join('\n'));
  }
};

function checkMouseLoop() {
  movePopupAndLoadingIfNecessary();
  if (
    mousePosition == lastMouseLoopPosition
    && !mouse_stopped_to_identify
    && +new Date() > +lastMove + MOUSE_STOP_AND_IDENTIFY_DELAY
  ) {
    let hoveredVideo = getHoveredVideo(mousePosition);
    if (hoveredVideo) {
      lastMouseStopToIdentifyPosition = mousePosition;
      // from there on, we shouldn't ask to identify unless we move again
      mouse_stopped_to_identify = true;
      let timer = new Timer();

      let data = {
        mousePosition: mousePosition,
        videoBoundingRect: hoveredVideo.getBoundingClientRect(),
        devicePixelRatio: window.devicePixelRatio,
        page: {
          title: document.title,
          channelID: channelID
        },
        timer: timer
      };
      sendChromeMessage('mouseMovedOverVideo', data, handleResponseFromBackground);
      showLoadingGif();
    }
  }

  if (lastMouseStopToIdentifyPosition && distance(mousePosition, lastMouseStopToIdentifyPosition) > MOVE_DISTANCE_TO_CANCEL_IDENTIFICATION) {
    // just so we don't spam with cancelIdentify messages
    if (lastMessageSent && lastMessageSent.messageType != 'cancelIdentify') {
      sendChromeMessage('cancelIdentify');
      hidePopupAndLoadingGif();
    }
  }
  lastMouseLoopPosition = mousePosition;
}

function sendChromeMessage(messageType, data, callback) {
  messageID++;
  let message = {
    messageID: messageID,
    messageType: messageType,
    createdAt: new Date().toISOString(),
    data: data
  };
  waitingForIdentifyResponseMessageID = messageID;
  lastMessageSent = message;
  console.log(`===> SEND [${message.messageID}] ${message.messageType} @ ${message.createdAt}`, data);
  chrome.runtime.sendMessage(message, callback);
}

function handleResponseFromBackground(response) {
  console.log('<=== handleResponseFromBackground', response);
  if (!response) {
    console.log(`handleResponseFromBackground DROPPING MESSAGE since response is ${response}`);
    return;
  }
  if (response.messageID !== lastMessageSent.messageID) {
    console.log(`handleResponseFromBackground DROPPING MESSAGE since ${response.messageID} !== ${lastMessageSent.messageID}`);
    return;
  }
  if (typeof response !== "undefined") {
    switch (response.status) {
      case 'error':
        alert(response.message);
        break;
      case 'success':
        let timer = new Timer(response.timer);
        identifyRequestId = response.identify_request_id;
        console.log('CARD', response.card)
        if (response.card) {
          showCard(response.card.image_url);
        } else {
          hidePopupAndLoadingGif()
        }
        timer.top('show/hide Card')
        timer.logTimes();
        break;
    }
  }
}

function messageListener(message, sender, sendResponse) {
  console.log(`===> main RECEIVE [${message.messageID}] ${message.messageType} @ ${new Date().toISOString()}`, message);
  switch (message.messageType) {
    case 'stopMainLoop':
      clearInterval(checkMouseLoopInterval);
      removePopupAndLoadingGif();
      document.removeEventListener('mousemove', mymousemove, false);
      chrome.runtime.onMessage.removeListener(messageListener);
      break;
  }
}
chrome.runtime.onMessage.addListener(messageListener);

function distance(mousePositionA, mousePositionB) {
  return Math.hypot(mousePositionA.clientX - mousePositionB.clientX, mousePositionA.clientY - mousePositionB.clientY);
}

function mymousemove(evt){
  mousePosition = {
    // relative to viewport inside chrome (under bookmark bar)
    clientX: evt.clientX,
    clientY: evt.clientY,
    // relative to whole screen
    screenX: evt.screenX,
    screenY: evt.screenY
  };
  lastMove = new Date();
  mouse_stopped_to_identify = false;

  const parentWidth = document.documentElement.clientWidth;
  const parentHeight = document.documentElement.clientHeight;

  const x = evt.clientX;
  const y = evt.clientY;

  const cardWidth = popupImage.width;
  const cardHeight = popupImage.height;
  const loadingWidth = parseFloat(window.getComputedStyle(loadingPopup).width);

  // Show the loading & card on the right if the card fits on the right, else on the left
  // Always show card in full view
  const loadingX = (x + spaceX + cardWidth > parentWidth) ? (x - spaceX - loadingWidth) : (x + spaceX);
  const popupX   = (x + spaceX + cardWidth > parentWidth) ? (x - spaceX - cardWidth)    : (x + spaceX);
  const loadingY = y;
  const popupY = bounded(y - cardHeight/2, 10, parentHeight - cardHeight - 10);

  loadingPopup.style.left = `${loadingX}px`;
  loadingPopup.style.top  = `${loadingY}px`;
  popup.style.left        = `${popupX}px`;
  popup.style.top         = `${popupY}px`;
}

function bounded(x, min, max) {
  return Math.min(Math.max(min, x), max);
}

function getHoveredVideo(mousePosition) {
  let videos = document.getElementsByTagName('video');
  for (let video of videos) {
    if (mouseOverVideo(mousePosition, video)) {
      return video;
    }
  }
  return null;
}

function mouseOverVideo(m, video) {
  if (m === null) {
    return false;
  }
  const r = video.getBoundingClientRect();
  const res =
    r.left < m.clientX && m.clientX < r.right &&
    r.top < m.clientY && m.clientY < r.bottom;
  return res;
}

function hidePopupAndLoadingGif() {
  popup.style.visibility = "hidden";
  loadingPopup.style.visibility = "hidden";
}

function removePopupAndLoadingGif() {
  popup.parentNode.removeChild(popup);
  loadingPopup.parentNode.removeChild(loadingPopup);
}

function showCard(card_url) {
  popupImage.onload = function() {
    loadingPopup.style.visibility = "hidden";
    popup.style.visibility = "visible";
    console.log('CARD popup', popupImage);
  }
  popupImage.src = card_url;
}

function showLoadingGif() {
  loadingPopup.style.visibility = "visible";
}


function getChannelId() {
  let l = document.links;
  for(let i=0; i<l.length; i++) {
    let match = channelUrlRegex.exec(l[i].href);
    if (match) {
      let channelID = match[1];
      console.log(`Found channel ID: ${channelID}`);
      return channelID;
    }
  }
  console.log(`Couldn't find channel ID on the page`);
  return null;
}
