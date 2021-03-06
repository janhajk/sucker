var path = require('path');
var exec = require('child_process').exec;
var config = require(__dirname + '/../config.js');
var hoster = require(__dirname + '/hoster.js');
var utils = require(__dirname + '/utils.js');

// TODO
// - Make a queue
// - run Download in Background with progress bar that shows progress





/*
 * Plowshare Commands
 */
var plowdownCmd  = 'plowdown --output-directory %dir% -a %username%:\'%password%\' %url%';
var plowprobeCmd = 'plowprobe --printf "%c%t%f%t%s%t%u%n" %url%';


/*
 * Plowshares plowdown function
 *
 */
var plowdown = function(link, callback) {
    utils.log('start downloading file: ' + link);
    var h = hoster.getHostFromLink(link);
    var c = plowdownCmd.replace('%dir%', config.fPath);
    c = c.replace('%username%', config.login[h].username);
    c = c.replace('%password%', config.login[h].password);
    c = c.replace('%url%', link);
    utils.log('running: exec(\'' + c + '\') ...');
    exec(c, function(err) {
        if(err === null) {
            callback(true);
        } else {
            utils.log('Error while downloading. Error:');
            utils.log(err);
            callback(false);}
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
    utils.log('running total of ' + links.length + ' links through plowprobe now...');
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
        utils.log('plowprobe found total of ' + infos.length + ' active links');
        callback(infos);
    });
};
exports.plowprobe = plowprobe;
