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
  let dateDiv = document.getElementById('date');
  if (dateDiv) {
    let publishDateString = dateDiv.textContent.replace(/[^0-9a-z\s]/gi, '');
    let publishDate = new Date(Date.parse(publishDateString));
    return publishDate;
  }
  console.log("Couldn't find video publish date on the page");
  return null;
}
