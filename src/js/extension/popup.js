console.log('popup.js');

import "../../css/popup.css";

chrome.runtime.onMessage.addListener(
    function(message, sender, sendResponse) {
        console.log(`===> popup RECEIVE [${message.messageID}] ${message.messageType} @ ${new Date().toISOString()}`, message);
        let mainDiv = document.getElementById('main-div');
        switch (message.messageType) {
            case 'popupMessage':
                mainDiv.innerHTML = message.data.message.replace(/\n/g, '<br>');
                break;
            case 'popupShowAvailableFormats':
                let suggested_format = message.data.suggested_format;
                let available_formats = message.data.available_formats;
                let video_publish_date = new Date(Date.parse(message.data.video_publish_date)); // chrome messages are JSON, any date is received as a String
                // Assumes formats ordered from newest to oldest
                let lastSetReleasedBeforeVideo = available_formats.findIndex(f => {
                    let legalSets = f.info.sets;
                    let lastSetReleasedAt = legalSets[legalSets.length-1].released_at;
                    let isSetReleasedBeforeVideo = new Date(Date.parse(lastSetReleasedAt)) < video_publish_date;
                    return isSetReleasedBeforeVideo
                })

                
                // display form
                let HTML_string = ''
                // HTML_string += '<form id="my-form"  onsubmit="return false;">'
                var any_checked = false;

                HTML_string += `<table>`;
                for (var i = 0; i < available_formats.length; i++) {
                    var checked_string = '';
                    let legalSets = available_formats[i].info.sets;
                    let firstSetName = legalSets[0].name;
                    let lastSetName = legalSets[legalSets.length-1].name;
                    let lastSetReleasedAt = legalSets[legalSets.length-1].released_at;
                    let isSuggestedBasedOnVideoTitle = false;
                    let isSuggestedBasedOnVideoPublishedDate = false;
                    if (suggested_format !== null && suggested_format.value === available_formats[i].value) {
                        any_checked = true;
                        checked_string = 'checked';
                        lastSetName = `<strong>${lastSetName}</strong>`;
                        isSuggestedBasedOnVideoTitle = true;
                        lastSetReleasedAt = `<strong>${lastSetReleasedAt}</strong>`;
                        lastSetName = `<strong>${lastSetName}</strong>`;
                    }
                    if (i === lastSetReleasedBeforeVideo) {
                        // emphasize the last set released before the video was published
                        lastSetReleasedAt = `<strong>${lastSetReleasedAt}</strong>`;
                        lastSetName = `<strong>${lastSetName}</strong>`;
                        isSuggestedBasedOnVideoPublishedDate = true;
                    }
                    
                    if (isSuggestedBasedOnVideoTitle || isSuggestedBasedOnVideoPublishedDate) {
                        HTML_string += `<tr class="tooltip">`;
                        HTML_string += `<td>`;
                        HTML_string += `<span class="tooltiptext">`;
                        let hints = [];
                        if (isSuggestedBasedOnVideoTitle) { hints.push('title'); }
                        if (isSuggestedBasedOnVideoPublishedDate) { hints.push('publish date'); }
                        HTML_string += `Guess based on the <br>video ${hints.join(' and ')}`;
                        HTML_string += `</span>`;
                    } else {
                        HTML_string += `<tr>`;
                        HTML_string += `<td>`;
                    }
                    HTML_string += `<input type="radio" id="radio-${i}" name="mtg_format" value="${available_formats[i].value}" ${checked_string}>`;
                    HTML_string += `</td>`;
                    HTML_string += `<td>`;
                    HTML_string += `<label for="radio-${i}">${lastSetName}</label>`;
                    HTML_string += `</td>`;
                    HTML_string += `<td>`;
                    HTML_string += `<label for="radio-${i}">${lastSetReleasedAt}</label>`;
                    HTML_string += `</td>`;
                    HTML_string += `</tr>`;
                }
                HTML_string += `</table>`;
                HTML_string += '<button id="my-button">Start MCZ!</button>';
                // HTML_string += '</form>';
                mainDiv.innerHTML = HTML_string;

                let myButton = document.getElementById('my-button');
                // disable submit until option selected
                if (! any_checked) {
                    myButton.disabled = true;
                    for (var i = 0; i < available_formats.length; i++) {
                        document.getElementById(`radio-${i}`).onclick = function() {
                            myButton.disabled = false;
                            return true;
                        }
                    }
                }

                myButton.onclick = function() {
                    myButton.disabled = true;
                    myButton.innerText = 'Loading...';
                    const checked_radio = document.querySelector('input[name=mtg_format]:checked');
                    chrome.runtime.sendMessage({
                        messageType: "activateMagic",
                        data: {
                            mtg_format: checked_radio.value
                        }
                    });
                    return true;
                };
                break;

            case 'mainLoopActive':
                window.close();
                break;

            case 'popupShowTurnOffButton':
                console.log('available action: turn OFF');
                mainDiv.innerHTML = `
                <form id="my-form">
                        <button>Turn off MCZ</button>
                </form>
                `;

                document.getElementById('my-form').onsubmit = function() {
                    chrome.runtime.sendMessage({messageType: "turnOffMagic"});
                    window.close();
                    return true;
                };
                break;
        }
    }
);

chrome.runtime.sendMessage({ messageType: "pageActionClicked" });
