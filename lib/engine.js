var async = require('async');
var hoster = require(__dirname + '/hoster.js');
var request = require('request');
var plowprobe = require(__dirname + '/plowshare.js').plowprobe;
var plowdown = require(__dirname + '/plowshare.js').plowdown;
var utils = require(__dirname + '/utils.js');



/*
 * 1. Takes page links
 * 2. Parse html and extract hoster-links
 * 3. test links for availability
 * 4. returns links with fileinfo (size etc.)
 */
var linkEngine = function(links, callback) {
    var urls = [];
    for(var i in links) {
        urls.push(links[i].link);
    }
    utils.log(urls);
    async.map(urls, fileGetContents, function(err, results) {
        if(err) {
            utils.log('Error when downloading one or more urls:');
            utils.log(err);
        }
        var links = hoster.getAllLinksFromString(results.join(' '));
        plowprobe(links, function(info) {
            callback(info);
        });
    });
};
exports.linkEngine = linkEngine;


/*
 * get conent html from one or more urls
 */
var fileGetContents = function(url, callback) {
    utils.log('get html content of url: ' + url);
    request.get(url, function(err, response, body) {
        if(err) {
            callback(err);
        } else {
            callback(null, body); // First param indicates error, null=> no error
        }
    });
};