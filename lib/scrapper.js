var parseXML = require('xml2js').parseString;
var request = require('request');
var utils = require(__dirname + '/utils.js');

exports.scrap = function(feed, callback) {
    request.get(feed, function(err, response, body) {
        utils.log((err===null?'No ':'') + 'Error when requesting url ' + feed);
        utils.log(err); utils.log('-');
        parseXML(body, function(err, feedXML) {
            utils.log((err===null?'No ':'') + 'Error when parseXML() from ' + feed);
            if (err) {
                utils.log('returning from \'scrap(feed, callback)\' with error...'); utils.log('-');
                return callback(err);
            }
            //utils.log('XML of ' + feed);
            //utils.log(feedXML);
            var rss = parseRSS(feedXML);
            //if(!rss) rss = parseAtom(feedXML);
            if (!rss) {
                utils.log('XML is neither rss nor Atom Feed')
                return callback('XML is neither rss nor Atom Feed');
            }
            utils.log('calling callback(err, rss) from scrap...');

            // Success! feed is valid, returning feed as js-object
            callback(null, rss);
        });
    });

};


var parseRSS = function (rss) {
        try {
                var items = [];
                for (var i = 0; i < rss.rss.channel[0].item.length - 1; i++) {
                        items.push({
                                title: rss.rss.channel[0].item[i].title[0],
                                pubdate: rss.rss.channel[0].item[i].pubDate[0],
                                link: rss.rss.channel[0].item[i].guid[0]._,
                                description: rss.rss.channel[0].item[i].description[0]
                        });
                };

                var feed = {
                        name: rss.rss.channel[0].title,
                        description: rss.rss.channel[0].description,
                        link: rss.rss.channel[0].link,
                        items: items
                };
                return feed;
        }
        catch (e) { // If not all the fiels are inside the feed
                return null;
        }
}
var parseAtom = function (rss) {
        try {
                var items = [];
                for (var i = 0; i < rss.feed.entry.length - 1; i++) {
                        items.push({
                                title: rss.feed.entry[i].title[0]._,
                                link: rss.feed.entry[i].link[0].$.href,
                                description: rss.feed.entry[i].content[0]._
                        })
                };
                var feed = {
                        name: rss.feed.title,
                        description: "No description",
                        link: rss.feed.link[0].$.href,
                        items: items
                };
                return feed;
        }
        catch (e) { // If not all the fiels are inside the feed
                console.log(e);
                return null;
        }
}