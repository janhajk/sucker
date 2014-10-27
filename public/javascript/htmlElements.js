/**
 * Creates a HTML Movie-Thumb from the Movie-Poster
 * 
 * @param {string} imageUrl The Url of the Movie-Poster-Image
 * @param {string} title Title of the Movie as title-tag
 * 
 * @returns {Object} the DOM-Object of the div
 */
var thumbPoster = function(imageUrl, title, year) {
    var div = document.createElement('div');
    div.className = 'thumbPoster';
    div.style.backgroundSize = '52px 81px';
    div.title = title + ' (' + year + ')';
    div.style.backgroundImage = 'url(' + imageUrl + ')';
    
    div.textContent = title;
    if (imageUrl === '' || (/poster_default/).test(imageUrl)) {
        div.style.backgroundImage = '';
    }
    else {
        div.style.fontSize = "1px"; // For searching purposes
    }
    return div;
};



/**
 * Adds info to the movie-Thumb
 */
var thumbPosterWithInfo = function(imageUrl, title, year, resolutions) {
    var thumb = thumbPoster(imageUrl, title, year);
    var res = resolutions;
    var divRes = document.createElement('div');
    divRes.className = 'resolutionBar';
    divRes.textContent = res.join(', ');
    thumb.appendChild(divRes);
    return thumb;
};


/**
 * Creates the Movie-Info-Card
 */
var divMovieInfo = function(_id, title, posterUrl, runtime, year, imdb, synopsis, actors, thumbDiv) {
    var div = document.createElement('div');
    div.className = 'movieDigest';
    var divOuter = document.createElement('div');
    divOuter.className = 'movieInfo';

    var divTitle = document.createElement('div');
    divTitle.className = 'movieInfoTitle';
    divTitle.textContent = title;

    var divDetails = document.createElement('div');
    divDetails.className = 'movieInfoLine';
    divDetails.textContent = 'Length: ' + runtime + 'min, Year: ' + year + ', ';
    var spanRemove = createElementSpanRemove(_id, thumbDiv);
    divDetails.appendChild(spanRemove);
    divDetails.appendChild(createElementSpanSpace());
    var spanUpdate = createElementSpanUpdate(_id);
    divDetails.appendChild(spanUpdate);

    var divSynopsis = document.createElement('div');
    divSynopsis.className = 'movieInfoLine';
    divSynopsis.textContent = synopsis;
    divSynopsis.style.fontStyle = 'italic';

    var poster = thumbPoster(posterUrl, title, year);
    poster.style.float = 'left';

    divOuter.appendChild(divTitle);
    divOuter.appendChild(divDetails);
    divOuter.appendChild(divSynopsis);

    div.appendChild(poster);
    div.appendChild(divOuter);
    return div;
};


/**
 * Creates a link which removes a movie from future display
 */
var createElementSpanSpace = function(len) {
    if (len === undefined) len = 1;
    var span         = document.createElement('span');
    var space = '';
    for (var i=0; i < len; i++) {
        space += ' ';
    }
    span.textContent = space;
    return span;
};


/**
 * Creates a link which removes a movie from future display
 */
var createElementSpanRemove = function(id, thumbDiv) {
    var span         = document.createElement('span');
    span.textContent = 'remove';
    span.title       = 'don\'t display this movie anymore.';
    span.className   = 'hyperlink';
    span.onclick = function() {
        $.getJSON('/movie/' + id + '/hide', function(data){
            msg.set('Movie will not be shown anymore!', 'fadeout');
            $('#content').tabs({active: 0}); // Jump to tab 1 > links
            thumbDiv.parentNode.removeChild(thumbDiv);
        });
    }
    return span;
};

/**
 * Creates a link which updates a movie-info
 */
var createElementSpanUpdate = function(id) {
    var span         = document.createElement('span');
    span.textContent = 'update';
    span.title       = 'update info to this movie';
    span.className   = 'hyperlink';
    span.onclick = function() {
        $.getJSON('/movie/' + id + '/update', function(data){
            msg.set('Movie-Info Updated', 'fadeout');
        });
    }
    return span;
};


/**
 * Create a Link that can be parsed (for one or multiple Links)
 */
var parseLink = function(text, sites, clickEvent){
    var div         = document.createElement('div');
    div.className   = 'hyperlinkParse';
    div.textContent = text;
    div.onclick     = function(){
        clickEvent(sites);
    };
    return div;
};


/**
 * Table with ul.to links that have been checked for availability
 * 
 * @param {array} files an Array containing all checked ul.to links
 */
var makeTableChecked = function(files) {
    var extensions = {
        mp4 : 0,
        mkv : 0,
        avi : 0,
        rar : 0,
        default : 0
    };
    var rowcols = [
        'link',
        'size',
        'extension',
        'jd',
        'cloud'
    ];
    var target = '#tabs-links-';
    for (var i in extensions)
        $(target + i + ' tbody').empty();

    var cols = function() {
        var tds = [];
        for (var i in rowcols)
            tds.push(document.createElement('td'));
        return tds;
    };
    files.sort(function(a, b) {
        return a.extension < b.extension ? 1 : a.extension > b.extension ? -1 : 0;
    }); // sort files by extension

    // Loop through all uploaded-files
    for (i in files) {
        var t = (extensions[files[i].extension] !== undefined) ? files[i].extension : 'default';
        extensions[t]++;
        var t = target + t;
        var tr = document.createElement('tr');
        var tds = new cols();
        
        // Link/Name Col
        var link = document.createElement('a');
        link.href = files[i].link;
        link.textContent = files[i].filename;
        tds[0].appendChild(link);
        
        // Size Col
        tds[1].textContent = bytesToSize(files[i].size);

        // Extension Col
        var extension = document.createElement('div');
        extension.className = 'icon icon' + files[i].extension;
        extension.title = files[i].extension;
        tds[2].appendChild(extension);

        // J-Downloader Col
        tds[3].appendChild(jDLink(files[i].id));
        
        // Download to Server Col
        var cloud = document.createElement('div');
        cloud.className = 'icon iconcloud';
        cloud.id = files[i].id;
        cloud.title = 'download to server';
        cloud.onclick = (function(i) {
            return function() {
                grabUl(files[i].id);
            };
        })(i);
        tds[4].appendChild(cloud);

        for (var key in tds)
        tr.appendChild(tds[key]);

        $(t + ' tbody').append(tr);
    }
    
    // Add links to textarea for exporting
    $('#paste').html(files.map(function(elem){return 'http://ul.to/' + elem.id + ' ';}).join());
    
    // update files per extension
    if (extensions.mp4 === 0) {
        $('#rssLinks').tabs({active: 1});
    }
    else $('#rssLinks').tabs({active: 0});
    for (var i in extensions) {
        $('#rssLinks ul:first li:eq('+(Object.keys(extensions)).indexOf(i)+') a').text(i + '(' + extensions[i] + ')');
    }
};