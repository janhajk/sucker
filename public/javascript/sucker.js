(function() {
    $(document).ready(function() {
        
        

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
                    div = thumbPosterWithInfo(poster, json[i].title, json[i].info.year, json[i].resolutions);
                    div.style.float  = 'left';
                    div.style.cursor = 'pointer';
                    div.onclick = (function(_id, title, info, image, sites, div) {
                        return function() {
                            $('#content').tabs({active: 1}); // Jump to tab 1 > links; tabs start with 0 = first tab
                            $('#linksDetails').empty();
                            $('#linksDetails').append(divMovieInfo(
                                _id,
                                title,
                                image,
                                info.runtime ? info.runtime : '?',
                                info.year,
                                'imdb-Rating',
                                info.synopsis === '' ? 'no synopsis' : info.synopsis,
                                'actors',
                                div
                            ));
                            // Site-Links for ripping links
                            // Link to Rip all links at the same time
                            $('#linksDetails').append(parseLink('>- rip All Sites -<', sites, function(sites){
                                $.post('/site/links', {sites: sites}, function(ids){
                                    msg.set('parsing all sites...');
                                    parseIDs(ids);
                                }, 'json');
                            }));
                            // Single Links that can be parsed
                            for (var key in sites) {
                                $('#linksDetails').append(parseLink(sites[key].title, sites[key], function(site){
                                    $.post('/site/links', {sites: [site]}, function(links){
                                        msg.set('parsing site...');
                                        listLinks(links);
                                    }, 'json');
                                }));
                            }
                        };
                    })(json[i]._id, json[i].title, json[i].info, poster, json[i].sites, div);
                    $('#rss_Movies').append(div);
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
            msg.set('start looking for links...');
            $('#content').tabs({active: 1}); // Jump to tab 1 > links
            
            // is link to page that may contain uploaded.net links > rip Site
            if (validateURL(data) && !isUploaded(data)) {
                msg.set('parsing site...');
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


        var listLinks = function(links) {
            makeTableChecked(links);
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
                msg.set((filescount - curfile) + ' files left to check...');
                makeTableChecked(files);
            };
            msg.set('start checking ' + filescount + ' files...');
            $.each(ids, function(key, value) {
                defs.push($.getJSON('/ul/' + value + '/check', function(info) {
                    addFile(info);
                }));
            });
            $.when.apply(null, defs).done(function() {
                msg.set(filescount + ' files checked!', 'fadeout');
                makeTableChecked(files);
            });
        };



        $('#go').click(function() {
            parseData($('#data').val());
        });


    });
})();