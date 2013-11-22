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
            var div, rssTV = document.getElementById('rss_TV');
            $.getJSON('/tv', function(json) {
                for (var i in json) {
                    div = document.createElement('div');
                    div.className   = 'hyperlinkParse';
                    div.textContent = json[i].title;
                    div.onclick     = (function(link){
                        return function(){
                            parseData(link);
                        };
                    })(json[i].link);
                    rssTV.appendChild(div);
                }
            });
        };



        /**
         * Loads list of Movies as Thumbnails from db
         * 
         */
        var loadRssMovies = function() {
            $.getJSON('/movies', function(json) {
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
                    div.onclick = (function(_id, title, info, image, sites) {
                        return function() {
                            $('#content').tabs({
                                active: 1
                            }); // Jump to tab 1 > links; tabs start with 0 = first tab
                            $('#linksDetails').empty();
                            $('#linksDetails').append(divMovieInfo(
                                _id,
                                title,
                                image,
                                info.runtime ? info.runtime : '?',
                                info.year,
                                'imdb-Rating',
                                info.synopsis === '' ? 'no synopsis' : info.synopsis,
                                'actors'
                            ));
                            // Site-Links for ripping links
                            // Link to Rip all links at the same time
                            var divAll = document.createElement('div');
                            divAll.className = 'hyperlinkParse';
                            divAll.textContent = '>- rip All Sites -<';
                            divAll.onclick = (function(sites){
                                return function() {
                                    status.set('parsing all sites...');
                                    $.post('/site/links', {sites: sites}, function(ids){
                                        parseIDs(ids);
                                    }, 'json');
                                };
                            })(sites);
                            $('#linksDetails').append(divAll);
                            // Single Links
                            var divLink;
                            for (var key in sites) {
                                divLink = document.createElement('div');
                                divLink.className = 'hyperlinkParse';
                                divLink.textContent = sites[key].title;
                                divLink.onclick = (function(site){
                                    return function() {
                                        status.set('parsing site...');
                                        $.post('/site/links', {sites: [site]}, function(ids){
                                            parseIDs(ids);
                                        }, 'json');
                                    };
                                })(sites[key]);
                                $('#linksDetails').append(divLink);
                            }
                        };
                    })(json[i]._id, json[i].title, json[i].info, poster, json[i].sites);
                    $('#rss_Movies').append(div);
                }
            });
        };




        /**
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
                for (var i in files) {
                    $('#rss_files tbody').append('<tr><td><a href="' + files[i].link + '">' + 
                    files[i].filename + '</a></td>' + '<td>' + bytesToSize(files[i].size) + '</td>' + 
                    '<td><div class="icon icon' + files[i].extension + '" title="' + files[i].extension + '"></div></a></td>');
                }
            });
        };


        loadRssTV();
        loadRssMovies();
        loadFiles();


        /**
         * Takes the input string and decides if
         *    - String is URL but not uploaded-link > rip site
         *    - String is ul.to Id > check ul-File
         *    - String contains ul.to links
         * 
         * It then takes the Ids to the Id-Parser which checks the links
         * 
         * @param {string} data A string that contains URLs, an Id or plain text
         */
        var parseData = function(data) {
            status.set('start looking for links...');
            $('#content').tabs({active: 1}); // Jump to tab 1 > links
            
            // is link to page that may contain uploaded.net links > rip Site
            if (validateURL(data) && !isUploaded(data)) {
                status.set('parsing site...');
                $.post('/site/links', {sites: [{link:data}]}).done(function(ids){
                    parseIDs(ids);
                }, 'json');
            }
            else if (/^[a-zA-Z0-9-]{8}/i.test(data) && data !== 'uploaded') { // is ul.to ID
                parseIDs({data: data.substr(0, 8)});
            }
            else { // is string that may contain ul.to links
                parseIDs(getLinksFromString(data));
            }
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
         * Table with ul.to links that have been checked for availability
         * 
         * @param {array} files an Array containing all checked ul.to links
         */
        var makeTableChecked = function(files) {
            var extensions = {mp4:0, mkv:0, avi:0, rar:0, default:0};
            var rowcols    = ['link', 'size', 'extension', 'jd', 'cloud'];
            var target     = '#tabs-links-';
            var links      = '';
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
                links += 'http://ul.to/' + files[i].id + ' ';
            }
            // Add links to textarea for exporting
            $('#paste').html(links);
            
            // update files per extension
            if (extensions.mp4 === 0) {
                $('#rssLinks').tabs({active: 1});
            }
            else $('#rssLinks').tabs({active: 0});
            for (var i in extensions) {
                $('#rssLinks ul:first li:eq('+(Object.keys(extensions)).indexOf(i)+') a').text(i + '(' + extensions[i] + ')');
            }
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

        /**
         * Downlaods an ul-File to the server
         * 
         * @param {Number} id The ul.to/id
         */
        var grabUl = function(id) {
            status.set('start downloading file to the server...');
            $.getJSON('ul/' + id + '/grab').done(function(success) {
                status.set(success === true ? 'download complete!' : 'error while downloading!');
            });
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


        /**
         * Creates a HTML Movie-Thumb from the Movie-Poster
         * 
         * @param {string} imageUrl The Url of the Movie-Poster-Image
         * @param {string} title Title of the Movie as title-tag
         * 
         * @returns {Object} the DOM-Object of the div
         */
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

        /**
         * Adds info to the movie-Thumb
         */
        var thumbPosterWithInfo = function(info) {
            var thumb = thumbPoster(info.imageUrl, info.title);
            var res = info.res;

        };

        /**
         * Creates the Movie-Info-Card
         */
        var divMovieInfo = function(_id, title, posterUrl, runtime, year, imdb, synopsis, actors) {
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
            var spanRemove = document.createElement('span');
            spanRemove.textContent = 'remove';
            spanRemove.title = 'don\'t display this movie anymore.';
            spanRemove.className = 'hyperlink';
            spanRemove.onclick = function() {
                $.getJSON('/movie/' + _id + '/hide', function(data){Status.set('Movie will not be shown anymore!')});
            };
            divDetails.appendChild(spanRemove);

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