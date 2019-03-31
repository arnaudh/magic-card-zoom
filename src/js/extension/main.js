console.log('main.js');

import '../../css/main.css'
import '../../img/eye01_smaller.gif'

let channelUrlRegex = /.*youtube\.com\/channel\/([a-zA-Z0-9_-]+)/;

var theVideo;
var theVideoSource;
var theCanvas;
var mousePos;
var currentRectangle;
var popup;
var popupImage;
var loadingPopup;
var loadingPopupImage;
var parentOfPopup;

var mousePosition = null;
var lastMouseLoopPosition = null;
var lastMouseStopToIdentifyPosition = null;
var mouse_stopped_to_identify = false;
var lastMove = new Date();
var identifyRequestId = null;
var channelID;


// how long must the mouse stay fixed over the video to trigger identify()
const MOUSE_STOP_AND_IDENTIFY_DELAY = 50;
const MOUSE_CHECK_LOOP_INTERVAL = 10;

// horizontal space between mouse and popup card
const spaceX = 30;
// css Px
const MOVE_DISTANCE_TO_CANCEL_IDENTIFICATION = 5;

var waitingForIdentifyResponseMessageID = null;
var lastMessageSent = null;

var checkMouseLoopInterval;
var readyStateCheckInterval = setInterval(function() {
  console.log('[MCZ main.js] Checking if there is a video...');
  var body = document.getElementsByTagName('body')[0];
  var videos = document.getElementsByTagName('video');
  if (videos.length > 0) {
    clearInterval(readyStateCheckInterval);

    channelID = getChannelId();

    theVideo = videos[0];
    console.log("A WILD VIDEO APPEARED", theVideo);
    
    popupImage = document.createElement('img');
    popup = document.createElement('div');
    popup.className = "mcz-popup";
    popup.appendChild(popupImage);
    
    loadingPopupImage = document.createElement('img');
    loadingPopupImage.src = chrome.extension.getURL("eye01_smaller.gif");
    loadingPopup = document.createElement('div');
    loadingPopup.className = "loading-popup";
    loadingPopup.appendChild(loadingPopupImage);

    // (on youtube) 
    // we can't add a child element to the <video>, and the parent has 0 height, so we add the popup to the parent's parent
    parentOfPopup = theVideo.parentNode.parentNode;
    parentOfPopup.appendChild(popup);
    parentOfPopup.appendChild(loadingPopup);

    // // Set video cursor
    // theVideo.style.cursor = `url('${chrome.extension.getURL("24_bg.gif")}'), auto`;

    document.addEventListener('mousemove', mymousemove, false);

    addKeyListener();

    checkMouseLoopInterval = setInterval(checkMouseLoop, MOUSE_CHECK_LOOP_INTERVAL);

    chrome.runtime.sendMessage({ messageType: "mainLoopActive", pageTitle: document.title });
  }
}, 10);


var messageID = 0;

function addKeyListener() {
  document.onkeypress = function(e) {
    e = e || window.event;
    var charCode = (typeof e.which == "number") ? e.which : e.keyCode;
    var char = String.fromCharCode(charCode)
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

function checkMouseLoop() {
  if (
    mousePosition == lastMouseLoopPosition
    && +new Date() > +lastMove + MOUSE_STOP_AND_IDENTIFY_DELAY
    && mouseOverVideo(mousePosition)
    && !mouse_stopped_to_identify
  ) {
    lastMouseStopToIdentifyPosition = mousePosition;
    // from there on, we shouldn't ask to identify unless we move again
    mouse_stopped_to_identify = true;

    var data = {
      mousePosition: mousePosition,
      videoBoundingRect: theVideo.getBoundingClientRect(),
      devicePixelRatio: window.devicePixelRatio,
      page: {
        title: document.title,
        channelID: channelID
      }
    };
    sendChromeMessage('mouseMovedOverVideo', data, handleResponseFromBackground);
    showLoadingGif();
  } else {
    if (lastMouseStopToIdentifyPosition && distance(mousePosition, lastMouseStopToIdentifyPosition) > MOVE_DISTANCE_TO_CANCEL_IDENTIFICATION) {
      // just so we don't spam with cancelIdentify messages
      if (lastMessageSent && lastMessageSent.messageType != 'cancelIdentify') {
        sendChromeMessage('cancelIdentify');
        hidePopupAndLoadingGif();
      }
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
        identifyRequestId = response.identify_request_id;
        console.log('CARD', response.card)
        if (response.card) {
          showCard(response.card.image_url);
        } else {
          hidePopupAndLoadingGif()
        }
        break;
    }
  }
}

function messageListener(message, sender, sendResponse) {
  console.log(`===> main RECEIVE [${message.messageID}] ${message.messageType} @ ${new Date().toISOString()}`, message);
  switch (message.messageType) {
    case 'stopMainLoop':
      clearInterval(checkMouseLoopInterval);
      hidePopupAndLoadingGif();
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

  const parentRect = parentOfPopup.getBoundingClientRect();
  const parentWidth = parentRect.width;
  const parentHeight = parentRect.height;

  const x = evt.clientX - parentRect.left;
  const y = evt.clientY - parentRect.top;

// TODO read from css class
  const cardWidth = 312;
  const cardHeight = 445;

  const loadingWidth = 50;

  // Show the loading & card on the right if the card fits on the right, else on the left
  // Always show card in full view
  const loadingX = (x + spaceX + cardWidth > parentWidth) ? (x - spaceX - loadingWidth) : (x + spaceX);
  const popupX   = (x + spaceX + cardWidth > parentWidth) ? (x - spaceX - cardWidth)    : (x + spaceX);
  const loadingY = y;
  const popupY = bounded(y - cardHeight/2, 0, parentHeight - cardHeight);

  loadingPopup.style.left = `${loadingX}px`;
  loadingPopup.style.top  = `${loadingY}px`;
  popup.style.left        = `${popupX}px`;
  popup.style.top         = `${popupY}px`;
}

function bounded(x, min, max) {
  return Math.min(Math.max(min, x), max);
}

function mouseOverVideo(m) {
  if (m === null) {
    return false;
  }
  const r = theVideo.getBoundingClientRect();
  const res =
    r.left < m.clientX && m.clientX < r.right &&
    r.top < m.clientY && m.clientY < r.bottom;
  return res;
}

function hidePopupAndLoadingGif() {
  console.log('hide popup');
  popup.style.visibility = "hidden";
  loadingPopup.style.visibility = "hidden";
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
  // console.log('GIF popup', loadingPopup);
}


function getChannelId() {
  let l = document.links;
  for(var i=0; i<l.length; i++) {
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
