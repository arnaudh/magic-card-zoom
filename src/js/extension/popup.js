console.log('popup.js');

const mtg_sets = require('../mtg_sets.js');
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

                var any_standard_selected = false;
                
                let HTML_string = '';
                HTML_string += `<div>Please select the pool of cards to use; a smaller pool gives better results.</div>`;
                HTML_string += `<div id="radios-div">`;
                HTML_string += `    <div>`;
                HTML_string += `        <label>`;
                HTML_string += `        <input type="radio" name="mtg_format" value="standard" id="standard-radio">`;
                // HTML_string += `            Standard:`;
                HTML_string += `        </input>`;
                HTML_string += `        </label>`;
                HTML_string += `            <select id="standard-select">`;
                HTML_string += `              <option value="default" disabled selected value>Standard</option>`;
                for (let i = 0; i < available_formats.length; i++) {
                    let selected_string = '';
                    let asterisk_string = '';
                    let legalSets = available_formats[i].info.sets;
                    let formatName = available_formats[i].value;
                    let firstSetName = legalSets[0].name;
                    let lastSetName = legalSets[legalSets.length-1].name;
                    let lastSetReleasedAt = legalSets[legalSets.length-1].released_at;
                    let isSuggestedBasedOnVideoTitle = false;
                    let isSuggestedBasedOnVideoPublishedDate = false;
                    if (i === lastSetReleasedBeforeVideo) {
                        isSuggestedBasedOnVideoPublishedDate = true;
                        asterisk_string += '*';
                    }
                    if (suggested_format === available_formats[i].value) {
                        any_standard_selected = true;
                        selected_string = 'selected';
                        isSuggestedBasedOnVideoTitle = true;
                        asterisk_string += '*';
                    }
                    HTML_string += `<option value="${formatName}" ${selected_string}>Standard: ${asterisk_string}${lastSetName}${asterisk_string}`;
                    if (isSuggestedBasedOnVideoTitle || isSuggestedBasedOnVideoPublishedDate) {
                        let hints = [];
                        if (isSuggestedBasedOnVideoTitle) { hints.push('title'); }
                        if (isSuggestedBasedOnVideoPublishedDate) { hints.push('date'); }
                        HTML_string += ` (based on the <br>video ${hints.join(' and ')})`;
                    }
                    HTML_string += `</option>`;
                }
                HTML_string += `            </select>`;
                HTML_string += `    </div>`;
                HTML_string += `    <div>`;
                HTML_string += `        <label>`;
                HTML_string += `        <input type="radio" name="mtg_format" value="pioneer" id="pioneer-radio"/>`;
                HTML_string += `        Pioneer`;
                HTML_string += `        </label>`;
                HTML_string += `    </div>`;
                HTML_string += `    <div>`;
                HTML_string += `        <label>`;
                HTML_string += `        <input type="radio" name="mtg_format" value="modern" id="modern-radio"/>`;
                HTML_string += `        Modern`;
                HTML_string += `        </label>`;
                HTML_string += `    </div>`;
                HTML_string += `    <div>`;
                HTML_string += `        <label>`;
                HTML_string += `        <input type="radio" name="mtg_format" value="vintage" id="vintage-radio"/>`;
                HTML_string += `        Vintage`;
                HTML_string += `        </label>`;
                HTML_string += `    </div>`;
                HTML_string += `    <div>`;
                HTML_string += `        <label>`;
                HTML_string += `        <input type="radio" name="mtg_format" value="commander" id="commander-radio"/>`;
                HTML_string += `        Commander`;
                HTML_string += `        </label>`;
                HTML_string += `    </div>`;
                HTML_string += `</div>`;
                HTML_string += `<div>`;
                HTML_string += `<div id="selected-sets-label">Selected sets:</div>`;
                for (let code of mtg_sets.expandSets('all_sets', false).reverse()) {
                    let name = mtg_sets.getMtgSetName(code);
                    let mtgSetCodeSanitized = code === 'con' ? '_con' : code; // Workaround to Chrome not accepting con.* files (https://chromium.googlesource.com/chromium/src/+/refs/tags/57.0.2958.1/net/base/filename_util.cc#157)
                    HTML_string += `<img src="assets/images/sets/${mtgSetCodeSanitized}.svg" title="${name}" alt="${code}" class="mtg-set-icon" id="icon-${code}" style="display:none;">`;
                    // HTML_string += `<object id="svg1" data="assets/images/sets/${mtgSetCodeSanitized}.svg" type="image/svg+xml" title="TODO name" class="mtg-set-icon" id="icon-${code}"></object>`;
                }
                HTML_string += `</div>`;
                HTML_string += `<button id="my-button" disabled>Start MagicCardZoom</button>`;
                HTML_string += `<a id="feedback-link" href="https://docs.google.com/forms/d/e/1FAIpQLSc74wD1PziO3uHVpGuEHrQj9vrd_EMKhSxVJhtaJDyT42ELTQ/viewform?usp=sf_link">Feedback?</a>`;
                
                mainDiv.innerHTML = HTML_string;

                // Make links work inside extension popup
                // https://stackoverflow.com/questions/8915845/chrome-extension-open-a-link-from-popup-html-in-a-new-tab
                var links = document.getElementsByTagName("a");
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
                let modernRadio = document.getElementById('modern-radio');
                let pioneerRadio = document.getElementById('pioneer-radio');
                let vintageRadio = document.getElementById('vintage-radio');
                let commanderRadio = document.getElementById('commander-radio');
                let myButton = document.getElementById('my-button');
                let selectedSets = [];

                let getSelectedPool = function() {
                    const checked_radio = document.querySelector('input[name=mtg_format]:checked');
                    if (checked_radio.value === 'standard') {
                        return standardSelect.value;
                    } else {
                        return checked_radio.value;
                    }
                }
                let getSelectedSets = function() {
                    let selectedSets;
                    const checked_radio = document.querySelector('input[name=mtg_format]:checked');
                    if (checked_radio.value === 'standard') {
                        selectedSets = mtg_sets.expandSets(standardSelect.value);
                    } else {
                        selectedSets = mtg_sets.expandSets(checked_radio.value);
                    }
                    console.log('getSelectedSets', selectedSets);
                    return selectedSets;
                }
                let radioChange = function() {
                    console.log('radioChange()');
                    myButton.disabled = false;
                    let selectedSets = getSelectedSets().map(code => `icon-${code}`);
                    for (let icon of document.getElementsByClassName('mtg-set-icon')) {
                        if (selectedSets.includes(icon.id)) {
                            icon.style.display = 'inline';
                        } else {
                            icon.style.display = 'none';
                        }
                    }
                }
                standardRadio.onchange = radioChange;
                modernRadio.onchange = radioChange;
                pioneerRadio.onchange = radioChange;
                vintageRadio.onchange = radioChange;
                commanderRadio.onchange = radioChange;

                standardSelect.onchange = function() {
                    standardRadio.checked = true;
                    radioChange();
                }
                standardRadio.onclick = function() {
                    if (standardSelect.value === 'default') {
                        return false;
                    }
                }
                if (suggested_format) {
                    if (any_standard_selected) {
                        standardSelect.onchange();
                    } else {
                        let radio = document.getElementById(`${suggested_format}-radio`);
                        let oldText = radio.nextSibling.textContent.trim();
                        radio.nextSibling.textContent = ` *${oldText}* (based on the video title)`;
                        radio.checked = true;
                        radioChange();
                    }
                }

                myButton.onclick = function() {
                    myButton.disabled = true;
                    myButton.innerText = 'Loading...';
                    chrome.runtime.sendMessage({
                        messageType: "activateMagic",
                        data: {
                            selected_pool: getSelectedPool() 
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
