var fs       = require('fs');
var path     = require('path');
var config   = require(__dirname + '/../config.js');



var getFilesizeInBytes = function(filename) {
    return (fs.statSync(filename)).size;
};
exports.getFilesizeInBytes = getFilesizeInBytes;


exports.getDownloadedFiles = function() {
    var files = [];
    var dlfiles = (fs.readdirSync(config.fPath)).sort(function(a,b){a=a.toLowerCase();b=b.toLowerCase();return a>b?1:a<b?-1:0;});
    for (var i=0;i<dlfiles.length; i++) {
        files.push({
            id        : 0,
            filename  : path.basename(dlfiles[i], path.extname(dlfiles[i])),
            extension : (path.extname(dlfiles[i])).replace(/\./,''),
            size      : getFilesizeInBytes(config.fPath + '/' + dlfiles[i]),
            link      : '/file/' + dlfiles[i] + '/download'
        });
    }
    return files;
};




var rssGet = function(type, callback) {
    var Scrapper = require(__dirname + '/scrapper.js');
    var items = [];
    var feedCount = config.feeds[type].feeds.length;
    var feedcounter = 0;
    var processItems = function(err, rss) {
        if (err === null) {
            var i, title, regex;
            for (i in rss.items) {
                for (title in config.feeds[type].queries) {
                    regex = new RegExp(config.feeds[type].queries[title].title, 'g');
                    if (regex.exec(rss.items[i].title)) {
                        items.push(rss.items[i]);
                    }
                }
            }
        }
        feedcounter++;
        if (feedcounter === feedCount) {
            callback(items);
        }
    };
    for (var i = 0; i < feedCount; i++) {
        Scrapper.scrap(config.feeds[type].feeds[i], function(err, rss) {
            processItems(err, rss);
        });
    }
};
exports.rssGet = rssGet;