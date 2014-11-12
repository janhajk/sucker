(function() {
    $(document).ready(function() {


        /**
         * Loads List of TV-Shows from RSS
         *
         */
        var loadRssTV = function(type) {
            var div, rssTV = document.getElementById('rss_TV');
            $.getJSON('/tv', function(json) {
                for(var i in json) {
                    rssTV.appendChild(tvLine(json[i]));
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
                for(i = 0; i < json.length; i++) {
                    poster = json[i].info.posters !== undefined ? json[i].info.posters.thumbnail : '';
                    div = thumbPosterWithInfo(poster, json[i].title, json[i].info.year, json[i].resolutions);
                    div.style.float = 'left';
                    div.style.cursor = 'pointer';
                    div.onclick = (function(_id, title, info, image, sites, div) {
                        return function() {
                            $('#content').tabs({
                                active: 1
                            }); // Jump to tab 1 > links; tabs start with 0 = first tab
                            $('#linksDetails').empty();
                            $('#linksDetails').append(divMovieInfo(_id, title, image, info.runtime ? info.runtime : '?', info.year, 'imdb-Rating', info.synopsis === '' ? 'no synopsis' : info.synopsis, 'actors', div));
                            // Site-Links for ripping links
                            // Link to Rip all links at the same time
                            $('#linksDetails').append(parseLink('>- rip All Sites -<', sites, function(sites) {
                                $.post('/site/links', {
                                    sites: sites
                                }, function(ids) {
                                    msg.set('parsing all sites...');
                                    parseIDs(ids);
                                }, 'json');
                            }));
                            // Single Links that can be parsed
                            for(var key in sites) {
                                $('#linksDetails').append(parseLink(sites[key].title, sites[key], function(site) {
                                    $.post('/site/links', {
                                        sites: [site]
                                    }, function(links) {
                                        msg.set('parsing site...');
                                        makeTableChecked(links);
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
    });
})();