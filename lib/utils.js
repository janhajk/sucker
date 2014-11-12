var fs       = require('fs');
var path     = require('path');
var config   = require(__dirname + '/../config.js');
var hosters  = require(__dirname + '/hoster.js');

var resolutions = ['720p', '1080p', '480p', 'hdtv', 'WEBRip', 'DVDRip', 'BluRay', 'BDRip'];
exports.resolutions = resolutions;

var isResolution = function(res) {
    return (resolutions.indexOf(res) > -1) ? true : false;
};
exports.isResolution = isResolution;


var getContentFromMultipleUrls = function(urls, callback) {
    var request = require('request');
    var contents = [];
    var i;
    var fileCount = urls.length;
    var curFile = 0;
    for(i = 0; i < fileCount; i++) {
        request(urls[i].link, function(error, response, body) {
            contents.push(body);
            curFile++;
            if(curFile++ === fileCount) {
                var links = hosters.getAllLinksFromString(contents.join(' '));
                callback(links);
            }
        });
    }
};
exports.getContentFromMultipleUrls = getContentFromMultipleUrls;



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
            link      : dlfiles[i]
        });
    }
    return files;
};



/*
 * retrieves RSS content from all RSS-Movie-Feeds
 *
 */
var rssGet = function(type, callback) {
    var async = require('async');
    log('start reading feeds of type ' + type);
    var Scrapper = require(__dirname + '/scrapper.js');
    var items = [];
    log('reading from total of: ' + config.feeds[type].feeds.length + ' feeds from type ' + type);
    async.map(config.feeds[type].feeds, function(item, callback) {
        log('begin scrapping from url: ' + item +'...');
        Scrapper.scrap(item, function(err, rss) {
            log('finished scrapping from ' + item);
            log('Errors:'); log(err); log('-');
            callback(null, rss); // First param indicates error, null=> no error
        });
    }, function(err, results) {
        log('Finished scrapping all links');
        log('Error/s:'); log(err); log(results); log('-');
        var i, s, title, regex;
        for(var s in results) {
            log('-'); log('finding sites in #' + (parseInt(s)+1).toString());
            if(results[s] !== undefined) {
                for(i in results[s].items) {
                    log('-');log('processing');log(results[s].items[i]);
                    // Check if feed contains searchstring of TV-Show
                    for(title in config.feeds[type].queries) {
                        regex = new RegExp(config.feeds[type].queries[title].title, 'g');
                        if(regex.exec(results[s].items[i].title)) {
                            items.push(results[s].items[i]);
                        }
                    }
                }
                log('-'); log('processed ' + results[s].items.length + ' feed-items'); log('-');
            }
        }
        log('sending all '+items.length+' items back to browser...'); log('-');
        callback(items)
    });
};
exports.rssGet = rssGet;


var log = function(log) {
    if(config.dev) {
        if (log === '-') log = '------------------------------------------';
        console.log(log);
    }
};
exports.log = log;








