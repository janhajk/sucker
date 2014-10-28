var path      = require('path');
var exec      = require('child_process').exec;
var config    = require(__dirname + '/../config.js');
var plowshare = require(__dirname + '/plowshare.js');


var hoster = {
    id: 'ul',
    baseUrl: 'http://ul.to'
};


/*
 * Regular Expressions of File-Url-Patterns
 */
var urlPatterns = [
    'ul\\.to/([a-zA-Z0-9-]{8})',
    'uploaded\\.net/file/([a-zA-Z0-9-]{8})'
];




/*
 * checks if a string is a valid hoster-file-id
 */
var validId = function(id) {
  id = id.substring(0,8).replace(/[^a-z0-9]/g,'');
  return id.length === 8 ? id : false;
};
exports.validId = validId;





/*
 * get all file-ids from a string from this hoster
 */
var getLinksFromString = function(string) {
    var ids = [];
    var regex = new RegExp(urlPatterns.join('|'), 'gim');
    var link;
    var id = '';
    while ((link = regex.exec(string)) != null) {
        id = (link[1]===undefined?link[2]:link[1]);
        // only add unique ids
        if (ids.indexOf(id) === -1)
            ids.push(id);
    }
    return ids;
};
exports.getLinksFromString = getLinksFromString;


/*
 * Gets info from file via file-Hoster with help of plowprobe
 * plowprobe returns [status, filename, filesize in bits]
 * 
 */
var fileInfo = function(id, callback) {
    plowshare.status(id, hoster, callback);
};
exports.fileInfo = fileInfo;


var download = function(id, callback) {
    plowshare.download(id, hoster, callback);
};
exports.download = download;