/**
 * Status Message
 */
var Msg = function() {
    this.set = function(msg, done) {
        $('#status').show(200);
        $('#status').html(msg);
        if (done === 'fadeout') {
            setTimeout(function() {
                $('#status').hide(500);
            }, 5000);
        }
    };
};
var msg = new Msg();

var bytesToSize = function(bytes) {
    var sizes = ['Bytes', 'K', 'M', 'G', 'T'];
    if (bytes === 0) return 'n/a';
    var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)), 10);
    return Math.round((i === 0) ? (bytes / Math.pow(1024, i)) : (bytes / Math.pow(1024, i)).toFixed(1) * 10) / 10 + sizes[i];
};


var validateURL = function(textval) {
    var urlregex = new RegExp("^(http|https|ftp)\://([a-zA-Z0-9\.\-]+(\:[a-zA-Z0-9\.&amp;%\$\-]+)*@)*((25[0-5]|2[0-4][0-9]|[0-1]{1}[0-9]{2}|[1-9]{1}[0-9]{1}|[1-9])\.(25[0-5]|2[0-4][0-9]|[0-1]{1}[0-9]{2}|[1-9]{1}[0-9]{1}|[1-9]|0)\.(25[0-5]|2[0-4][0-9]|[0-1]{1}[0-9]{2}|[1-9]{1}[0-9]{1}|[1-9]|0)\.(25[0-5]|2[0-4][0-9]|[0-1]{1}[0-9]{2}|[1-9]{1}[0-9]{1}|[0-9])|([a-zA-Z0-9\-]+\.)*[a-zA-Z0-9\-]+\.(com|edu|gov|int|mil|net|org|biz|arpa|info|name|pro|aero|coop|museum|[a-zA-Z]{2}))(\:[0-9]+)*(/($|[a-zA-Z0-9\.\,\?\'\\\+&amp;%\$#\=~_\-]+))*$");
    return urlregex.test(textval);
};


/**
 * checks if url is uploaded.net link
 * @param {string} url A url-string
 */
var isUploaded = function(url) {
    return /.*(ul\.to)|(uploaded\.net\/file)\/([a-zA-Z0-9-]{8}).*/gi.test(url) ? true : false;
};


/**
 * Creates a JDownloader link
 * 
 * This link opens a Downloadable Link in jDownloader
 * 
 */
var jDLink = function(id) {
    var input = document.createElement('div');
    input.className = 'icon iconjd';
    input.onclick = function() {
        $.ajax({
            type: 'POST',
            url: 'http://127.0.0.1:9666/flash/add',
            data: {
                urls: 'http://ul.to/' + id
            }
        });
        input.title = 'open in jDownloader';
    };
    return input;
};



/**
 * Downlaods an ul-File to the server
 * 
 * @param {Number} id The ul.to/id
 */
var grabUl = function(id) {
    msg.set('start downloading file to the server...');
    $.getJSON('ul/' + id + '/grab').done(function(success) {
        msg.set(success === true ? 'download complete!' : 'error while downloading!', 'fadeout');
    });
};




/**
 * Gets all ul.to/uploaded.net links from a string
 * 
 * @param {String} string String containing links
 * @returns {Array} Array which contains all ul.to Ids; returns [] if none found
 * 
 */
var getLinksFromString = function(string) {
    var ids = [];
    var schemas = [
        'ul\\.to/([a-zA-Z0-9-]{8})',
        'uploaded\\.net/file/([a-zA-Z0-9-]{8})'
    ];
    var regex = new RegExp(schemas.join('|'), 'gim');
    var link, id;
    while ((link = regex.exec(string)) !== null) {
        id = link[0].match(/[a-z0-9-]{8}$/);
        if (ids.indexOf(id[0]) === -1) {
            ids.push(id[0]);
        }
    }
    return ids;
};