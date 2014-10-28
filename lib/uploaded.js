var path     = require('path');
var exec     = require('child_process').exec;
var config   = require(__dirname + '/../config.js');

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
    link = regex.exec(string);
    while ((link != null) {
        var id = link[0].match(/[a-z0-9-]{8}$/);
        // only add unique ids
        if (ids.indexOf(id[0]) === -1)
            ids.push(id[0]);
    }
    return ids;
};
exports.getLinksFromString = getLinksFromString;


var fileExists = function(id, callback) {
    var id = validId(id);
    if (!id) {
        callback(false);
    }
    else {
        var c = 'plowprobe --printf "%c%t%f%t%s" http://ul.to/' + id;
        exec(c, function(err, stdout){
            if (err === null) {
              var info = stdout.split("\t"); // [ '0', 'name.mkv', '3270000000\n' ]
              info = {
                id        : id,
                status    : info[0],
                filename  : path.basename(info[1], path.extname(info[1])),
                extension : (path.extname(info[1])).replace(/\./,''),
                size      : info[2].replace(/[^a-z0-9]/g,''),
                link      : 'http://ul.to/' + id,
              };
              callback(info);
            }
            else callback(false);
        });
    }
};
exports.fileExists = fileExists;


var download = function(id, callback) {
        if (!id) {
          callback(false);
        }
        else {
            var login = ' -a '+config.login.ul[0]+':'+config.login.ul[1];
            var link  = ' http://ul.to/' + id;
            exec('plowdown --output-directory '+config.fPath+login+link, function(err){
                if (err === null) {
                  callback(true);
                }
                else callback(false);
            });
        }
};
exports.download = download;