var async = require('async');
var hoster = require(__dirname + '/hoster.js');
var request = require('request');


var linkEngine = function(links, callback) {
    var urls = [];
    for (var i in links) {
        urls.push(links[i].link);
    }
    console.log(urls);
    async.map(urls, fileGetContents, function(err, results) {
        console.log(results);
        console.log('fetch');
        if(err) {
            // either file1, file2 or file3 has raised an error, so you should not use results and handle the error
        } else {
            var links = hoster.getAllLinksFromString(results.join(' '));
            console.log(links);
            callback(links);
            // results[0] -> "file1" body
            // results[1] -> "file2" body
            // results[2] -> "file3" body
        }
    });
};
exports.linkEngine = linkEngine;


var fileGetContents = function(url, callback) {
    console.log('fetching ' + url);
    request.get(url, function(err, response, body) {
        console.log('fetched ' + body);
        if(err) {
            callback(err);
        } else {
            callback(null, body); // First param indicates error, null=> no error
        }
    });
};