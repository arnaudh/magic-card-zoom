console.log('pre_main.js');

const config = require("../../../config.json");
let channelUrlRegex = /.*youtube\.com\/channel\/([a-zA-Z0-9_-]+)/;

channelID = getChannelId();
videoPublishDate = getVideoPublishDate();
if (videoPublishDate === null) {
  chrome.runtime.sendMessage({
    messageType: "popupMessage",
    data: {
      message: `Could not detect video publish date. Try again when the page is fully loaded.`
    }
  });
} else {
  console.log('We good');
  chrome.runtime.sendMessage({
    messageType: "okToShowAvailableFormats",
    data: {
      videoPublishDate: videoPublishDate
    }
  });
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
  console.log("Couldn't find channel ID on the page");
  return null;
}

function getVideoPublishDate() {
  let dateElements = document.getElementsByClassName('date');
  if (dateElements.length > 0) {
    let publishDateString = dateElements[0].textContent;
    let publishDate = new Date(Date.parse(publishDateString));
    return publishDate;
  }
  console.log("Couldn't find video publish date on the page");
  return null;
}
