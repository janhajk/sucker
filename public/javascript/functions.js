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


/*
 * Converts bytes to human readable format
 *
 *
 */
var bytesToSize = function(bytes) {
    var sizes = ['Bytes', 'KiB', 'MiB', 'GiB', 'TiB'];
    if (bytes === 0) return 'n/a';
    var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)), 10);
    return Math.round((i === 0) ? (bytes / Math.pow(1024, i)) : (bytes / Math.pow(1024, i)).toFixed(1) * 10) / 10 + sizes[i];
};


/*
 * Checks if string is valid url
 *
 *
 */
var validateURL = function(textval) {
    var urlregex = new RegExp("^(http|https|ftp)\://([a-zA-Z0-9\.\-]+(\:[a-zA-Z0-9\.&amp;%\$\-]+)*@)*((25[0-5]|2[0-4][0-9]|[0-1]{1}[0-9]{2}|[1-9]{1}[0-9]{1}|[1-9])\.(25[0-5]|2[0-4][0-9]|[0-1]{1}[0-9]{2}|[1-9]{1}[0-9]{1}|[1-9]|0)\.(25[0-5]|2[0-4][0-9]|[0-1]{1}[0-9]{2}|[1-9]{1}[0-9]{1}|[1-9]|0)\.(25[0-5]|2[0-4][0-9]|[0-1]{1}[0-9]{2}|[1-9]{1}[0-9]{1}|[0-9])|([a-zA-Z0-9\-]+\.)*[a-zA-Z0-9\-]+\.(com|edu|gov|int|mil|net|org|biz|arpa|info|name|pro|aero|coop|museum|[a-zA-Z]{2}))(\:[0-9]+)*(/($|[a-zA-Z0-9\.\,\?\'\\\+&amp;%\$#\=~_\-]+))*$");
    return urlregex.test(textval.trim());
};



/**
 * Creates a JDownloader div-link
 *
 * This link opens a Downloadable Link in jDownloader
 *
 */
var jDLink = function(link) {
    var div = document.createElement('div');
    div.className = 'icon iconjd';
    div.title = 'open in jDownloader';
    div.onclick = function() {
        $.ajax({
            type: 'POST',
            url: 'http://127.0.0.1:9666/flash/add',
            data: {
                urls: link
            }
        });
    };
    return div;
};




/*
 * Loads the list of Downloaded files that are on the server
 */
var loadFiles = function() {
    $.ajax({
        url: '/files',
        type: 'get',
        cache: false,
        dataType: 'json'
    }).done(function(data){
        $('#rss_files tbody').empty();
        // Sort files by Filename
        data.sort(function(a, b) {
            a = a.filename.toLowerCase();
            b = b.filename.toLowerCase();
            return a > b ? 1 : a < b ? -1 : 0;
        });
        var tr, td = [], a, icon, del, s, i;
        for(i in data) {
            $('#rss_files tbody').append(fileRow(data[i]));
        }
    }).fail(function(){

    });
};



/**
 * Plowdown a File to the server
 *
 * @param {String} id The ul.to/id
 */
var plowdown = function(link) {
    msg.set('start downloading file to the server...');
    $.post('plowdown', {link: link}, function(success) {
        msg.set(success == true ? 'download complete!' : 'error while downloading!', 'fadeout');
        loadFiles(); // reload files-table to show newly downloaded file
    }, 'json');
};

/**
 * Download a File to your diskstation
 *
 * @param {String} url The url of the link
 */  
var DownloadStation = function(uri) {
    msg.set('start downloading file to Diskstation...');
    jQuery.ajax({
        type: 'POST',
        url: '/diskstation/DownloadStation',
        data: {method: 'create', uri: uri},
        success: function(body) {
            msg.set(body);
        },
        dataType: 'json'
    });
};


Date.prototype.easy = function() {
    var now = new Date();
    var diff;
    var today_start = (new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)).getTime();
    if(this.getTime() - today_start > 0) {
        return 'today';
    } else if(this.getTime() - (today_start - 86400000) > 0) {
        return 'yesterday';
    }
    if(this.getTime() - (today_start - 7 * 86400000) > 0) {
        return Math.floor((now.getTime() - this.getTime()) / 86400000) + ' days ago';
    }
    diff = Math.floor((now.getTime() - this.getTime()) / 86400000 / 7);
    return diff + ' week' + (diff > 1 ? 's' : '') + ' ago';
};