var path = require('path');
var exec = require('child_process').exec;
var config = require(__dirname + '/../config.js');



/*
 * Gets info from file via file-Hoster with help of plowprobe
 * plowprobe returns [status, filename, filesize in bits]
 * 
 */
var status = function(id, hoster, callback) {
    var c = 'plowprobe --printf "%c%t%f%t%s" ' + hoster.baseUrl + '/' + id;
    exec(c, function(err, stdout) {
        if(err === null) {
            var info = stdout.split("\t"); // exp [ '0', 'name.mkv', '3270000000\n' ]
            info = {
                id: id,
                status: info[0],
                filename: path.basename(info[1], path.extname(info[1])),
                extension: (path.extname(info[1])).replace(/\./, ''),
                size: info[2].replace(/[^a-z0-9]/g, ''),    // stdout had some weird characters, so we'll take them out
                link: hoster.baseUrl + '/' + id,
            };
            callback(info);
        } else callback(false);
    });
};
exports.status = status;


var download = function(id, hoster, callback) {
        if (!id) {
          callback(false);
        }
        else {
            var login = ' -a '+config.login[hoster.id][0]+':'+config.login[hoster.id][1];
            var link  = ' ' + hoster.baseUrl + '/' + id;
            exec('plowdown --output-directory '+config.fPath+login+link, function(err){
                if (err === null) {
                  callback(true);
                }
                else callback(false);
            });
        }
};
exports.download = download;
