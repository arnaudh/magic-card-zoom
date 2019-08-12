console.log('pre_main.js');

const config = require("../../../config.json");

videoPublishDate = getYoutubeVideoPublishDate();
chrome.runtime.sendMessage({
  messageType: "okToShowAvailableFormats",
  data: {
    videoPublishDate: videoPublishDate
  }
});

function getYoutubeVideoPublishDate() {
  let dateElements = document.getElementsByClassName('date');
  if (dateElements.length > 0) {
    let publishDateString = dateElements[0].textContent;
    let publishDate = new Date(Date.parse(publishDateString));
    return publishDate;
  }
  console.log("Couldn't find video publish date on the page");
  return null;
}
