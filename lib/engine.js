var async = require('async');
var hoster = require(__dirname + '/hoster.js');



var linkEngine = function(urls) {
    fileGetContents(urls, function(html){
        var links = hoster.getAllLinksFromString(html.join(' '));
    });
    
};


var fileGetContents = function(urls, callback) {
    var tasks = [];
    for(var i in urls) {
        tasks.push(function(callback) {
            request(urls[i], function(error, response, body) {
                callback(null, body);
            });
        });
    }
    async.series(tasks, function(err, results) {
        callback(results);
    });
};
