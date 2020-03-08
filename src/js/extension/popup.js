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
                });

                
                // display form
                let HTML_string = '';
                // HTML_string += '<form id="my-form"  onsubmit="return false;">'
                var any_checked = false;

                HTML_string += `<div>Please select the pool of cards to use.</div>`;

                HTML_string += `<div>`;
                HTML_string += `    <div>`;
                HTML_string += `        <label>`;
                HTML_string += `        <input type="radio" name="mtg_format" value="standard" id="standard-radio">`;
                HTML_string += `            Standard:`;
                HTML_string += `            <select id="standard-select">`;
                HTML_string += `              <option value="default" disabled selected value></option>`;
                for (let i = 0; i < available_formats.length; i++) {
                    let checked_string = '';
                    let selected_string = '';
                    let asterisk_string = '';
                    let legalSets = available_formats[i].info.sets;
                    let formatName = available_formats[i].value;
                    let firstSetName = legalSets[0].name;
                    let lastSetName = legalSets[legalSets.length-1].name;
                    let lastSetReleasedAt = legalSets[legalSets.length-1].released_at;
                    let isSuggestedBasedOnVideoTitle = false;
                    let isSuggestedBasedOnVideoPublishedDate = false;
                    if (suggested_format !== null && suggested_format.value === available_formats[i].value) {
                        any_checked = true;
                        checked_string = 'checked';
                        selected_string = 'selected';
                        isSuggestedBasedOnVideoTitle = true;
                        asterisk_string += '*';
                    }
                    if (i === lastSetReleasedBeforeVideo) {
                        isSuggestedBasedOnVideoPublishedDate = true;
                        asterisk_string += '*';
                    }
                    
                    // HTML_string += `${lastSetName}${asterisk_string}`;
                    HTML_string += `<option value="${formatName}" ${selected_string}>${lastSetName}${asterisk_string}</option>`;
                }
                HTML_string += `            </select>`;
                HTML_string += `        </input>`;
                HTML_string += `        </label>`;
                HTML_string += `    </div>`;
                HTML_string += `    <div>`;
                HTML_string += `        <label>`;
                HTML_string += `        <input type="radio" name="mtg_format" value="allsets" id="allsets-radio">`;
                HTML_string += `            All sets`;
                HTML_string += `        </input>`;
                HTML_string += `        </label>`;
                HTML_string += `    </div>`;
                HTML_string += `</div>`;



                // HTML_string += `<table class="greyGridTable">`;
                // HTML_string += `<tr>`;
                // HTML_string += `<th></th>`;
                // HTML_string += `<th>Standard</th>`;
                // HTML_string += `<th>Release date</th>`;
                // HTML_string += `<th>Sets included</th>`;
                // HTML_string += `</tr>`;
                // for (let i = 0; i < available_formats.length; i++) {
                //     let checked_string = '';
                //     let selected_string = '';
                //     let asterisk_string = '';
                //     let legalSets = available_formats[i].info.sets;
                //     let firstSetName = legalSets[0].name;
                //     let lastSetName = legalSets[legalSets.length-1].name;
                //     let lastSetReleasedAt = legalSets[legalSets.length-1].released_at;
                //     let isSuggestedBasedOnVideoTitle = false;
                //     let isSuggestedBasedOnVideoPublishedDate = false;
                //     if (suggested_format !== null && suggested_format.value === available_formats[i].value) {
                //         any_checked = true;
                //         checked_string = 'checked';
                //         selected_string = 'selected';
                //         isSuggestedBasedOnVideoTitle = true;
                //         asterisk_string += '*';
                //     }
                //     if (i === lastSetReleasedBeforeVideo) {
                //         isSuggestedBasedOnVideoPublishedDate = true;
                //         asterisk_string += '*';
                //     }
                    
                //     if (isSuggestedBasedOnVideoTitle || isSuggestedBasedOnVideoPublishedDate) {
                //         lastSetName = `<em>${lastSetName}</em>`;
                //         HTML_string += `<tr id="tr-${i}" class="tooltip ${selected_string}">`;
                //         HTML_string += `<td>`;
                //         HTML_string += `<span class="tooltiptext">`;
                //         let hints = [];
                //         if (isSuggestedBasedOnVideoTitle) { hints.push('title'); }
                //         if (isSuggestedBasedOnVideoPublishedDate) { hints.push('publish date'); }
                //         HTML_string += `Suggestion based on the <br>video ${hints.join(' and ')}`;
                //         HTML_string += `</span>`;
                //     } else {
                //         HTML_string += `<tr id="tr-${i}">`;
                //         HTML_string += `<td>`;
                //     }
                //     HTML_string += `<input type="radio" id="radio-${i}" name="mtg_format" value="${available_formats[i].value}" ${checked_string}>`;
                //     HTML_string += `</td>`;
                //     HTML_string += `<td>`;
                //     HTML_string += `${lastSetName}${asterisk_string}`;
                //     HTML_string += `</td>`;
                //     HTML_string += `<td>`;
                //     HTML_string += `${lastSetReleasedAt}`;
                //     HTML_string += `</td>`;
                //     HTML_string += `<td>`;
                //     for (let mtgSet of legalSets) {
                //         let mtgSetCodeSanitized = mtgSet['code'] === 'con' ? '_con' : mtgSet['code']; // Workaround to Chrome not accepting con.* files (https://chromium.googlesource.com/chromium/src/+/refs/tags/57.0.2958.1/net/base/filename_util.cc#157)
                //         HTML_string += `<img src="assets/images/sets/${mtgSetCodeSanitized}.svg" title="${mtgSet['name']}" class="mtg-set-icon">`;
                //     }
                //     HTML_string += `</td>`;
                //     HTML_string += `</tr>`;

                // }
                // HTML_string += `</table>`;

                HTML_string += '<button id="my-button" disabled>Start MagicCardZoom</button>';
                HTML_string += '<a id="feedback-link" href="https://docs.google.com/forms/d/e/1FAIpQLSc74wD1PziO3uHVpGuEHrQj9vrd_EMKhSxVJhtaJDyT42ELTQ/viewform?usp=sf_link">Feedback?</a>';
                
                mainDiv.innerHTML = HTML_string;

                // Make links work inside extension popup
                // https://stackoverflow.com/questions/8915845/chrome-extension-open-a-link-from-popup-html-in-a-new-tab
                var links = document.getElementsByTagName("a");
                console.log('links', links);
                for (var i = 0; i < links.length; i++) {
                    (function () {
                        var ln = links[i];
                        var location = ln.href;
                        ln.onclick = function () {
                            chrome.tabs.create({active: true, url: location});
                        };
                    })();
                }

                let standardRadio = document.getElementById('standard-radio');
                let standardSelect = document.getElementById('standard-select');
                let allSetsRadio = document.getElementById('allsets-radio');
                let myButton = document.getElementById('my-button');
                if (any_checked) {
                    standardRadio.checked = true;
                    myButton.disabled = false;
                }

                standardSelect.onchange = function() {
                    standardRadio.checked = true;
                }
                standardRadio.onclick = function() {
                    if (standardSelect.value === 'default') {
                        return false;
                    }
                }
                standardRadio.onchange = function() {
                    myButton.disabled = false;
                }
                allSetsRadio.onchange = function() {
                    myButton.disabled = false;
                }

                // for (var i = 0; i < available_formats.length; i++) {
                //     document.getElementById(`radio-${i}`).onclick = (function() { // Closure function to capture i correctly
                //         let j = i;
                //         return function() {
                //             for (var x = 0; x < available_formats.length; x++) {
                //                 document.getElementById(`tr-${x}`).classList.remove("selected");
                //             }
                //             document.getElementById(`tr-${j}`).classList.add("selected");
                //             myButton.disabled = false;
                //             return true;
                //         }
                //     })();
                //     document.getElementById(`tr-${i}`).onclick = (function() { // Closure function to capture i correctly
                //         let j = i;
                //         return function() {
                //             document.getElementById(`radio-${j}`).click();
                //             return true;
                //         }
                //     })();
                // }

                myButton.onclick = function() {
                    myButton.disabled = true;
                    myButton.innerText = 'Loading...';
                    const checked_radio = document.querySelector('input[name=mtg_format]:checked');
                    let mtg_format = (checked_radio.value === 'standard') ? standardSelect.value : 'standard-allthecards';
                    chrome.runtime.sendMessage({
                        messageType: "activateMagic",
                        data: {
                            mtg_format: mtg_format
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
                        <button>Stop MagicCardZoom</button>
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
