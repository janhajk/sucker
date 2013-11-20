var path     = require('path');
var exec     = require('child_process').exec;
var config   = require(__dirname + '/config.js');



var validId = function(id) {
  id = id.substring(0,8).replace(/[^a-z0-9]/g,'');
  return id.length === 8 ? id : false;
};
exports.validId = validId;


var getLinksFromString = function(string) {
    var ids = [];
    var schemas = [
        'ul\.to\/([a-zA-Z0-9-]{8})',
        'uploaded\.net\/file\/([a-zA-Z0-9-]{8})'
    ];
    var regex = new RegExp(schemas.join('|'), 'gim');
    var link;
    while ((link = regex.exec(string)) != null) {
        var id = link[0].match(/[a-z0-9-]{8}$/);
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
              var info = stdout.split("\t");
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
            var login = ' -a '+config.ulUser+':'+config.ulPwd;
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