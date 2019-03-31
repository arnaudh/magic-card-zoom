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
                
                // display form
                let HTML_string = ''
                // HTML_string += '<form id="my-form"  onsubmit="return false;">'
                var any_checked = false;
                for (var i = 0; i < available_formats.length; i++) {
                    var checked_string = '';
                    if (suggested_format !== null && suggested_format.value === available_formats[i].value) {
                        any_checked = true;
                        checked_string = 'checked';
                    }
                    HTML_string += `<div>`;
                    HTML_string += `<input type="radio" id="radio-${i}" name="mtg_format" value="${available_formats[i].value}" ${checked_string}>`;
                    HTML_string += `<label for="radio-${i}">${available_formats[i].text}</label>`;
                    HTML_string += `</div>`;
                }
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
