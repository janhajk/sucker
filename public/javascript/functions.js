(function() {
    $(document).ready(function() {
        
        
        /**
         * Status Message
         */
        var Status = function() {
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
        var status = new Status();



        /**
         * Loads List of TV-Shows from RSS
         * 
         */
        var loadRssTV = function(type) {
            var rss = [];
            $.getJSON('/site/rss/' + type, function(json) {
                var html = '';
                for (var i in json) {
                    rss.push(json[i]);
                    html += '<tr><td><a href="javascript:" id="rss_' + type 
                    + '_items_' + i + '" class="rss_' + type + '_items">' 
                    + json[i].title + '</a></td><td></td></tr>';
                }
                $('#rss_' + type + ' tbody').html(html);
                $('.rss_' + type + '_items').click(function() {
                    var id = this.id;
                    id = id.replace('rss_' + type + '_items_', '');
                    parseData(rss[id].link);
                });
            });
        };



        /**
         * Loads list of Movies as Thumbnails from db
         * 
         */
        var loadRssMovies = function(type) {
            $.getJSON('/site/rss/Movies', function(json) {
                var div, i, poster;
                json.sort(function(a, b) {
                    a = new Date(a.lastUpdate);
                    b = new Date(b.lastUpdate);
                    return a > b ? -1 : a < b ? 1 : 0;
                });
                // Start creating Movie-Thumbs
                for (i = 0; i < json.length; i++) {
                    poster = json[i].info.posters !== undefined ? json[i].info.posters.thumbnail : '';
                    div = thumbPoster(poster, json[i].title);
                    div.style.float = 'left';
                    div.style.cursor = 'pointer';
                    div.onclick = (function(title, info, image, sites) {
                        return function() {
                            $('#content').tabs({
                                active: 1
                            }); // Jump to tab 1 > links
                            $('#linksDetails').empty();
                            var hasInfo = Object.keys(info).length;
                            $('#linksDetails').append(divMovieInfo(
                            title,
                            image,
                            info.runtime ? info.runtime : '?',
                            info.year, 'imdb-Rating',
                            info.synopsis === '' ? 'no synopsis' : info.synopsis, 'actors'));
                            // Site-Links for ripping links
                            var divLink;
                            for (var key in sites) {
                                divLink = document.createElement('div');
                                divLink.className = 'linkParseSite';
                                divLink.textContent = sites[key].title;
                                divLink.onclick = (function(link) {
                                    return function() {
                                        parseData(link);
                                    };
                                })(sites[key].link);
                                $('#linksDetails').append(divLink);
                            }
                        };
                    })(json[i].title, json[i].info, poster, json[i].sites);
                    $('#rss_' + type).append(div);
                }
            });
        };




        /**
         * Loads the list of Downloaded files on the server
         */
        var loadFiles = function() {
            $.getJSON('/file', function(files) {
                var links = '';
                $('#rss_files tbody').empty();
                files.sort(function(a, b) {
                    a = a.filename.toLowerCase();
                    b = b.filename.toLowerCase();
                    return a > b ? 1 : a < b ? -1 : 0;
                });
                for (var i in files) {
                    $('#rss_files tbody').append('<tr><td><a href="' + files[i].link + '">' + 
                    files[i].filename + '</a></td>' + '<td>' + bytesToSize(files[i].size) + '</td>' + 
                    '<td><div class="icon icon' + files[i].extension + '" title="' + files[i].extension + '"></div></a></td>');
                }
            });
        };


        loadRssTV('TV');
        loadRssMovies('Movies');
        loadFiles();


        var parseData = function(data) {
            var ids;
            status.set('start looking for links...');
            $('#content').tabs({
                active: 1
            }); // Jump to tab 1 > links
            if (validateURL(data)) {
                if (isUploaded(data)) { // is uploaded.net Link
                    ids = getLinksFromString(data);
                }
                else { // is link to page that may contain uploaded.net links > rip Site
                    ripSite(data);
                    return true;
                }
            }
            else if (/^[a-zA-Z0-9-]{8}/i.test(data)) { // is ul.to ID
                ids = {
                    data: data.substr(0, 8)
                };
            }
            else { // is string that may contain ul.to links
                ids = getLinksFromString(data);
            }
            parseIDs(ids);
        };

        var ripSite = function(url) {
            status.set('parsing site...');
            $.getJSON('/site/links', {
                url: url
            }).done(function(ids) {
                parseIDs(ids);
            });
        };

        /**
         * checks if url is uploaded.net link
         * @param {string} url A url-string
         */
        var isUploaded = function(url) {
            return /.*(ul\.to)|(uploaded\.net\/file)\/([a-zA-Z0-9-]{8}).*/gi.test(url) ? true : false;
        };


        /**
         * 
         */
        var parseIDs = function(ids) {
            var links = '';
            var files = [];
            var filescount = 0;
            var curfile = 0;

            for (var key in ids) {
                if (ids.hasOwnProperty(key)) {
                    links += "\n" + "http://ul.to/" + ids[key];
                    filescount++;
                }
            }
            $('#data').val(links);
            $('#content').append('<table id="links"></table>');
            var defs = [];
            var addFile = function(info) {
                if (info !== false) {
                    files.push(info);
                }
                curfile++;
                status.set((filescount - curfile) + ' files left to check...');
                makeTableChecked(files);
            };
            status.set('start checking ' + filescount + ' files...');
            $.each(ids, function(key, value) {
                defs.push($.getJSON('/ul/' + value + '/check', function(info) {
                    addFile(info);
                }));
            });
            $.when.apply(null, defs).done(function() {
                status.set(filescount + ' files checked!', 'fadeout');
                makeTableChecked(files);
            });
        };


        /**
         * Table with ul.to links that have been checked
         * 
         * @param {array} fileList an Array containing all ul.to links
         */
        var makeTableChecked = function(fileList) {
            var extensions = ['mp4', 'mkv', 'avi', 'rar', ''];
            var rowcols = ['link', 'size', 'extension', 'jd', 'cloud'];
            var target = '#tabs-links-';
            var links = '';
            for (var i in extensions)
            $(target + extensions[i] + ' tbody').empty();

            var cols = function() {
                var tds = [];
                for (var i in rowcols)
                    tds.push(document.createElement('td'));
                return tds;
            };
            fileList.sort(function(a, b) {
                return a.extension < b.extension ? 1 : a.extension > b.extension ? -1 : 0;
            }); // sort files by extension

            for (i in fileList) {
                var t = $.inArray(fileList[i].extension, extensions) > -1 ? target + fileList[i].extension : target;
                var tr = document.createElement('tr');
                var tds = new cols();
                var link = document.createElement('a');
                link.href = fileList[i].link;
                link.textContent = fileList[i].filename;
                tds[0].appendChild(link);

                tds[1].textContent = bytesToSize(fileList[i].size);

                var extension = document.createElement('div');
                extension.className = 'icon icon' + fileList[i].extension;
                extension.title = fileList[i].extension;
                tds[2].appendChild(extension);

                tds[3].appendChild(jDLink(fileList[i].id));

                var cloud = document.createElement('div');
                cloud.className = 'icon iconcloud';
                cloud.id = fileList[i].id;
                cloud.title = 'download to server';
                cloud.onclick = (function(i) {
                    return function() {
                        grabUl(fileList[i].id);
                    };
                })(i);
                tds[4].appendChild(cloud);

                for (var key in tds)
                tr.appendChild(tds[key]);

                $(t + ' tbody').append(tr);
                links += 'http://ul.to/' + fileList[i].id + ' ';
            }
            $('#paste').html(links);
        };


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

        var grabUl = function(id) {
            status.set('downloading file...');
            $.getJSON('ul/' + id + '/grab').done(function(data) {
                var msg = '';
                msg = data === true ? 'download complete!' : 'error when downloading!';
                status.set(msg);
            });
        };

        var validateURL = function(textval) {
            var urlregex = new RegExp("^(http|https|ftp)\://([a-zA-Z0-9\.\-]+(\:[a-zA-Z0-9\.&amp;%\$\-]+)*@)*((25[0-5]|2[0-4][0-9]|[0-1]{1}[0-9]{2}|[1-9]{1}[0-9]{1}|[1-9])\.(25[0-5]|2[0-4][0-9]|[0-1]{1}[0-9]{2}|[1-9]{1}[0-9]{1}|[1-9]|0)\.(25[0-5]|2[0-4][0-9]|[0-1]{1}[0-9]{2}|[1-9]{1}[0-9]{1}|[1-9]|0)\.(25[0-5]|2[0-4][0-9]|[0-1]{1}[0-9]{2}|[1-9]{1}[0-9]{1}|[0-9])|([a-zA-Z0-9\-]+\.)*[a-zA-Z0-9\-]+\.(com|edu|gov|int|mil|net|org|biz|arpa|info|name|pro|aero|coop|museum|[a-zA-Z]{2}))(\:[0-9]+)*(/($|[a-zA-Z0-9\.\,\?\'\\\+&amp;%\$#\=~_\-]+))*$");
            return urlregex.test(textval);
        };


        var getLinksFromString = function(string) {
            var ids = [];
            var schemas = ['ul\\.to/([a-zA-Z0-9-]{8})', 'uploaded\\.net/file/([a-zA-Z0-9-]{8})'];
            var regex = new RegExp(schemas.join('|'), 'gim');
            var link;
            while ((link = regex.exec(string)) !== null) {
                var id = link[0].match(/[a-z0-9-]{8}$/);
                if (ids.indexOf(id[0]) === -1) ids.push(id[0]);
            }
            return ids;
        };

        var bytesToSize = function(bytes) {
            var sizes = ['Bytes', 'K', 'M', 'G', 'T'];
            if (bytes === 0) return 'n/a';
            var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)), 10);
            return Math.round((i === 0) ? (bytes / Math.pow(1024, i)) : (bytes / Math.pow(1024, i)).toFixed(1) * 10) / 10 + sizes[i];
        };

        var thumbPoster = function(imageUrl, title) {
            var div = document.createElement('div');
            div.className = 'thumbPoster';
            div.title = title;
            div.style.backgroundImage = 'url(' + imageUrl + ')';
            if (imageUrl === '' || (/poster_default/).test(imageUrl)) {
                div.style.backgroundImage = '';
                div.textContent = title;
            }
            return div;
        };

        var thumbPosterWithInfo = function(info) {
            var thumb = thumbPoster(info.imageUrl, info.title);
            var res = info.res;

        };

        var divMovieInfo = function(title, posterUrl, runtime, year, imdb, synopsis, actors) {
            var div = document.createElement('div');
            div.className = 'movieDigest';
            var divOuter = document.createElement('div');
            divOuter.className = 'movieInfo';

            var divTitle = document.createElement('div');
            divTitle.className = 'movieInfoTitle';
            divTitle.textContent = title;

            var divDetails = document.createElement('div');
            divDetails.className = 'movieInfoLine';
            divDetails.textContent = 'Length: ' + runtime + 'min, Year: ' + year;

            var divSynopsis = document.createElement('div');
            divSynopsis.className = 'movieInfoLine';
            divSynopsis.textContent = synopsis;
            divSynopsis.style.fontStyle = 'italic';

            var poster = thumbPoster(posterUrl, title);
            poster.style.float = 'left';

            divOuter.appendChild(divTitle);
            divOuter.appendChild(divDetails);
            divOuter.appendChild(divSynopsis);

            div.appendChild(poster);
            div.appendChild(divOuter);
            return div;
        };

        $('#go').click(function() {
            parseData($('#data').val());
        });


    });
})();