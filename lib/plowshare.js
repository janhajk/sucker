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
var plowdownCmd  = 'plowdown --output-directory %dir% -a %username%:%password% %url%';
var plowprobeCmd = 'plowprobe --printf "%c%t%f%t%s%t%u%n" %url%';


/*
 * Plowshares plowdown function
 *
 */
var plowdown = function(link, callback) {
    var h = hoster.getHostFromLink(link);
    var c = plowdownCmd.replace('%dir%', config.fPath);
    c = c.replace('%username%', config.login[h].username);
    c = c.replace('%password%', config.login[h].password);
    c = c.replace('%url%', link);
    console.log('exec(\'' + c + '\') ...');
    exec(c, function(err) {
        console.log(err);
        if(err === null) {
            callback(true);
        } else callback(false);
    });
};
exports.plowdown = plowdown;


/*
 * Gets info from file via file-Hoster with help of plowprobe
 * @param links array Array of hoster-urls ['http://ul.to/lj23hg34', 'http://ul.to/mj23hg3g', etc.]
 * @returns array [[status, filename, filesize in bits, download-link]]
 *
 */
var plowprobe = function(links, callback) {
    var cmd = plowprobeCmd.replace('%url%', links.join(' '));
    var infos = [],
        info;
    exec(cmd, function(err, stdout) {
        var elements = stdout.split("\n");
        for(var i in elements) {
            if(err === null) {
                info = elements[i].split("\t"); // exp [ '0', 'filename.mkv', '32700000', 'http://ul.to/mj23hg3g' ]
                if(info.length === 4 && info[0] === '0') {
                    infos.push({
                        status: info[0],
                        filename: path.basename(info[1], path.extname(info[1])),
                        extension: (path.extname(info[1])).replace(/\./, ''),
                        size: info[2],
                        link: info[3],
                    });
                }
            }
        }
        callback(infos);
    });
};
exports.plowprobe = plowprobe;
