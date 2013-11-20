var fs       = require('fs');
var path     = require('path');
var config   = require('../config.js');



var getFilesizeInBytes = function(filename) {
    return (fs.statSync(filename)).size;
};
exports.getFilesizeInBytes = getFilesizeInBytes;


exports.getDownloadedFiles = function() {
    var files = [];
    var dlfiles = (fs.readdirSync(config.fPath)).sort(function(a,b){a=a.toLowerCase();b=b.toLowerCase();return a>b?1:a<b?-1:0;});
    for (var i=0;i<dlfiles.length; i++) {
        files.push({
            id        : 0,
            filename  : path.basename(dlfiles[i], path.extname(dlfiles[i])),
            extension : (path.extname(dlfiles[i])).replace(/\./,''),
            size      : getFilesizeInBytes(config.fPath + '/' + dlfiles[i]),
            link      : '/file/' + dlfiles[i] + '/download'
        });
    }
    return files;
};