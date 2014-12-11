(function() {
    $(document).ready(function() {



        /**
         * Loads List of TV-Shows direct from monitored RSS
         *
         */
        var loadRssTV = function(type) {
            var div, rssTV = document.getElementById('rss_TV');
            $.ajax({
                url: '/tv',
                type: 'get',
                dataType: 'json',
                cache: false
            }).done(function(data) {
                for(var i in data) {
                    rssTV.appendChild(siteRow(data[i]));
                }
            }).fail(function(data) {
                msg.set('Error loading TV-Shows');
            });
        };



        /**
         * Loads list of Movies as Thumbnails from db
         *
         */
        var loadRssMovies = function() {
            $.ajax({
                url: '/movies',
                type: 'get',
                dataType: 'json',
                cache: false,
            }).done(function(json) {
                var div, i;
                json.sort(function(a, b) {
                    a = new Date(a.lastUpdate);
                    b = new Date(b.lastUpdate);
                    return a > b ? -1 : a < b ? 1 : 0;
                });
                // Start creating Movie-Thumbs
                for(i = 0; i < json.length; i++) {
                    div = thumbPosterWithInfoClickable(json[i]);
                    div.style.float = 'left';
                    $('#rss_Movies').append(div);
                }
            }).fail(function(data) {
                msg.set('Error when loading movies');
            });
        };




        loadRssTV();
        loadRssMovies();
        loadFiles();
    });
})();