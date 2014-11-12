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
    var sizes = ['Bytes', 'K', 'M', 'G', 'T'];
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
    $.getJSON('/file', function(files) {
        $('#rss_files tbody').empty();
        // Sort files by Filename
        files.sort(function(a, b) {
            a = a.filename.toLowerCase();
            b = b.filename.toLowerCase();
            return a > b ? 1 : a < b ? -1 : 0;
        });
        var tr, td = [],
            a, icon, del, s;
        for(var i in files) {
            tr = document.createElement('tr');
            for(s = 0; s < 4; s++) {
                td.push(document.createElement('td'));
            }
            a = document.createElement('a');
            a.href = '/files/' + files[i].link;
            a.innerHTML = files[i].filename;
            td[0].appendChild(a);

            td[1].innerHTML = bytesToSize(files[i].size);

            icon = document.createElement('div');
            icon.class = 'icon icon' + files[i].extension;
            icon.title = files[i].extension;
            td[2].appendChild(icon);

            del = document.createElement('a');
            del.href = 'file/' + files[i].link + '/delete';
            del.innerHTML = 'delete';
            td[3].appendChild(del);

            for(s = 0; s < 4; s++) {
                tr.appenChild(td[s]);
            }
            $('#rss_files tbody').append(tr);
        }
    });
};



/**
 * Plowdown a File to the server
 *
 * @param {Number} id The ul.to/id
 */
var plowdown = function(link) {
    msg.set('start downloading file to the server...');
    $.post('plowdown', {link: link}, function(success) {
        msg.set(success == true ? 'download complete!' : 'error while downloading!', 'fadeout');
        loadFiles(); // reload files-table to show newly downloaded file
    }, 'json');
};