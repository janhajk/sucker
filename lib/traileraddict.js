var parseXML = require('xml2js').parseString;
var request = require('request');
var utils = require(__dirname + '/utils.js');

var api = 'http://api.traileraddict.com/?';

var apicall = function(call, callback) {
    request.get(api + call, function(err, response, body) {
        utils.log((err === null ? 'No ' : '') + 'Error when calling api');
        utils.log(err);
        utils.log('-');
        parseXML(body, function(err, xml) {
            utils.log((err === null ? 'No ' : '') + 'Error when parseXML() from ' + feed);
            if(err) {
                utils.log('returning from \'apicall(call, callback)\' with error...');
                utils.log('-');
                return callback(err);
            }
            //utils.log(xml);
            utils.log('calling callback(err, rss) from apicall...');
            callback(null, xml);
        });
    });
};

exports.searchByImdb = function(imdbId) {
    if (imdbId.length)if (imdbId.length)
};

