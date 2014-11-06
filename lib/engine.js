var async = require('async');
var hoster = require(__dirname + '/hoster.js');
var request = require('request');
var plowprobe = require(__dirname + '/plowshare.js').plowprobe;
var plowdown = require(__dirname + '/plowshare.js').plowdown;


var linkEngine = function(links, callback) {
    var urls = [];
    for (var i in links) {
        urls.push(links[i].link);
    }
    console.log(urls);
    async.map(urls, fileGetContents, function(err, results) {
        if(err) {
            // either file1, file2 or file3 has raised an error, so you should not use results and handle the error
        } else {
            var links = hoster.getAllLinksFromString(results.join(' '));
            plowprobe(links.join(' '), function(info){
                console.log(info);
                callback(info);
            });
        }
    });
};
exports.linkEngine = linkEngine;


var fileGetContents = function(url, callback) {
    console.log('fetching ' + url);
    request.get(url, function(err, response, body) {
        if(err) {
            callback(err);
        } else {
            callback(null, body); // First param indicates error, null=> no error
        }
    });
};