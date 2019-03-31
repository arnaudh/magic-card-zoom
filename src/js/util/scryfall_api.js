const request = require('request');
const requestPromise = require('request-promise');

/*

Weirdnesses in API:

1) imageFilename !== collectorNumber

Example: https://api.scryfall.com/cards/search?order=set&q=Alive+Well&unique=prints
imageFilename == 121a and collectorNumber == 121 (because it has two faces it seems)


*/

function getAllPaginatedItems(apiUrl) {
    console.log(`Calling ${apiUrl}`);
    return requestPromise({
        url: apiUrl,
        json: true
    }).then(async function (body) {
        console.log(`Got ${body.data.length} items from ${apiUrl}`);
        let extraData = [];
        if (body.has_more) {
            extraData = await getAllPaginatedItems(body.next_page);
        }
        return body.data.concat(extraData);
    });
}


module.exports.getAllPaginatedItems = getAllPaginatedItems;
