var async = require('async');
var hoster = require(__dirname + '/hoster.js'var lvar linkEngine = function(urls, callback) {
    async.map(urls, fileGetContents, function(err, results) {
        console.log(results);
        console.log('fetch')
        if(err) {
            // either file1, file2 or file3 has raised an error, so you should not use results and handle the error
        } else {
            var links = hoster.getAllLinksFromString(results.join(' '));
            console.log(links);
            // results[0] -> "file1" body
            // results[1] -> "file2" body
            // results[2] -> "file3" body
        }
    });
};


var fileGetContents = function(url, callback) {
    request.get(url, function(err, response, body) {
        if(err) {
            callback(err);
        } else {
            callback(null, body); // First param indicates error, null=> no error
        }
    });
}