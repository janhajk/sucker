var http     = require('http');
var parseXML = require('xml2js').parseString;
var request = require('request');
var utils = require(__dirname + '/utils.js');

exports.scrap = function(feed, callback) {
    request.get(feed, function(err, response, body) {
        utils.log((err===null?'No ':'') + 'Error when requesting url ' + feed);
        utils.log(err);
        parseXML(body, function(err, feedXML) {
            utils.log('result of parseXML:')
            utils.log(err);
            if (err) {return callback(err);}
            utils.log('XMl of ' + feed);
            utils.log(feedXML);
            var rss = parseRSS(feedXML);
            if(!rss) rss = parseAtom(feedXML);
            callback(err, rss);
        });
    });
    /*
        http.get(feed, function (res) {
                var body = '';
                res.on('data', function (chunk) {
                        body += chunk;
                });

                res.on('end', function () {
                        // Got all response, now parsing...
                        if (res.statusCode !== 200) {
                            return callback(res.statusCode);
                        }
                        else if (!body) {
                            return callback({message: feed + ': No content found!'});
                        }
                        parseXML(body, function (err, rss) {
                            if (err)
                                return callback({message: feed+ ' is not a xml File!'});

                            feed = parseRSS(rss);
                            if (!feed)
                                feed = parseAtom(rss);
                            if (!feed)
                                return callback({message: 'No scrapper found for feed!'});
                            callback(err, feed);
                        });

                });

        }).on('error', function (error) {
                console.log('error while getting feed', error);
                callback(error, null);
        });*/
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