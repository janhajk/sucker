var path = require('path');
var exec = require('child_process').exec;
var config = require(__dirname + '/../config.js');
var hoster = require(__dirname + '/hoster.js');

// TODO
// - Make a queue
// - run Download in Background with progress bar that shows progress





/*
 * Plowshare Commands
 */
var plowdownCmd  = 'plowdown --output-directory %dir% -a %username%:%password% %downloadLink%';
var plowprobeCmd = 'plowprobe --printf "%c%t%f%t%s" %downloadLink%';


/*
 * Plowshares plowdown function
 *
 */
var plowdown = function(link, callback) {
    var h = hoster.getHostFromLink(link);
    var c = plowdownCmd.replace('%dir%', config.fPath);
    c = c.replace('%username%', config.login[h].username);
    c = c.replace('%password%', config.login[h].password);
    c = c.replace('%downloadLink', link);
    exec(c, function(err) {
        if(err === null) {
            callback(true);
        } else callback(false);
    });
};
exports.plowdown = plowdown;



/*
 * Gets info from file via file-Hoster with help of plowprobe
 * plowprobe returns [status, filename, filesize in bits]
 *
 */
var plowprobe = function(links, callback) {
    var c = plowprobeCmd.replace('%downloadLink%', links);
    var infos = [], info;
    exec(c, function(err, stdout) {
        var inf = stdout.split("\n");
        console.log(inf);
        for(var i in inf) {
            if(err === null) {
                info = inf[i].split("\t"); // exp [ '0', 'name.mkv', '3270000000\n' ]
                console.log(info);
                info = {
                    //id: id,
                    status: info[0],
                    filename: path.basename(info[1], path.extname(info[1])),
                    extension: (path.extname(info[1])).replace(/\./, ''),
                    size: info[2].replace(/[^a-z0-9]/g, ''), // stdout as a trailing \n, so we'll take them out
                    link: link,
                };
                infos.push(info);
            }
        }
        console.log(infos);
        callback(infos);
    });
};
exports.plowprobe = plowprobe;
