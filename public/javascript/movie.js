(function() {
    
    
    
    /**
     * App
     * 
     * 
     */
    var App = function() {
        this.engine = new Engine();
        this.movies = new Movies();
        
    };
    
    var App.prototype.loadMovies = function() {
        this.movies.load(0, function(){

        });        
    };
    
    var App.prototype.loadTv = function(){
        
        
    };
    
    var app = new App();
    
    /*
     * Engine Class
     * 
     * 
     * 
     * 
     */
    var Engine = function() {
        this.tasks = [];
        this.isRunning = false;
    };
    Engine.prototype.addTask = function(site) {
        this.tasks.push(new Task(site));
        if (this.isRunning === false) {
            this.start();
        }
    };
    Engine.prototype.start = function() {
        for (var i in this.tasks) {
            if (this.tasks[i].status === 0) {
                this.tasks[i].run();
            }
        }
        
    };
    Engine.prototype.pause = function() {};
    Engine.prototype.resume = function() {};
    
        
    
    /**
     * Task Class
     * 
     * 
     */
    var Task = function(site) {
        this.id = id;
        this.status = 0;
        this.site = site;
        this.links = [];
    };
    
    Task.prototype.run = function(callback) {
        var self = this;
        if (this.links.length === 0) {
            $.post('/site/links', {sites: [this.site]}, function(ids) {
                for (var i in ids) {
                    self.links.push(new Link(ids[i]));
                }
                for (i in self.links) {
                    self.links[i].check(function(){
                        
                    });
                }
            }, 'json');
        }
        // Links are already in task
        else {
            for (var i in this.links) {
                this.links[i].check(function(){
                    
                });
            }
        }
    };
    
    /**
     * Link Class
     * 
     * 
     */
    var Link = function(link) {
        this.link = link;
        this.hoster = '';
        this.extension = '';
        this.id = '';
        this.status = -1;
        this.filename = '';
        this.size = 0;
    };
    
    Link.prototype.check = function(callback){
        var self = this;
        $.getJSON('/ul/' + value + '/check', function(info) {
            if (info !== false) {
                self.status = true;
                self.filename = info.filename
                self.size = info.size;
                self.id = info.id;
                self.link = info.link;
                self.extension = info.extension;
                self.hoster = info.hoster;
            }
            else {
                self.status = 0;
            }
            callback();
        });
    };
    
    /**
     * Paste class
     *
     *
     */
    var Paste = function(string, callback) {
        if (validateURL(string) && !isUploaded(string)) {
            $.post('/site/rip', {link: string}).done(function(ids){
                callback(ids);
            }, 'json');
        }
        else if (/^[a-zA-Z0-9-]{8}/i.test(string) && string !== 'uploaded') { 
            callback(string);
        }
        else {
            // Plain string that may contain links
            callback(getLinksFromString(string));
        }
    };
    
    
    
    /**
     * Movie Class 
     * 
     * 
     */
    var Movies = function(){
        this.movies = [];
    };
    
    Movies.prototype.load = function(id, callback) {
        $.getJSON('/movies', function(data) {
            data.sort(function(a, b) {
                a = new Date(a.lastUpdate);
                b = new Date(b.lastUpdate);
                return a > b ? -1 : a < b ? 1 : 0;
            });
            for (i = 0; i < data.length; i++) {
                this.movies.push(new movie(data[i]));
            }
            callback();
        });
        
    };
    
    
    
    /**
     * Movie Class 
     * 
     * 
     */
    var movie = function(dbMovie) {
        dbMovie.info.posters = dbMovie.info.posters !== undefined ? dbMovie.info.posters.thumbnail : '';
        this.info = dbMovie;
        
    };
    
    movie.prototype.siteList = function() {
        var list = [],
            div;
        for(var key in this.info.sites) {
            div = document.createElement('div');
            div.className = 'hyperlinkParse';
            div.textContent = this.info.sites[key].pubDate + ': ' + this.info.sites[key].text;
            div.onclick = function() {
                engine.addSite(this.info.sites[key]);
            };
            list.push(div);
        }
        return list;
    };
    
    movie.prototype.card = function() {
        var div = document.createElement('div');
        div.className = 'movieDigest';
        var divOuter = document.createElement('div');
        divOuter.className = 'movieInfo';

        var divTitle = document.createElement('div');
        divTitle.className = 'movieInfoTitle';
        divTitle.textContent = this.info.title;

        var divDetails = document.createElement('div');
        divDetails.className = 'movieInfoLine';
        divDetails.textContent = 'Length: ' + this.info.info.runtime + 'min, Year: ' + this.info.info.year + ', ';
        var spanRemove = createElementSpanRemove();
        divDetails.appendChild(spanRemove);
        divDetails.appendChild(createElementSpanSpace());
        var spanUpdate = createElementSpanUpdate();
        divDetails.appendChild(spanUpdate);

        var divSynopsis = document.createElement('div');
        divSynopsis.className = 'movieInfoLine';
        divSynopsis.textContent = this.info.info.synopsis;
        divSynopsis.style.fontStyle = 'italic';

        var poster = this.image();
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
    movie.prototype.removeLink = function() {
        var id = this.info._id;
        var span = document.createElement('span');
        span.textContent = 'remove';
        span.title = 'don\'t display this movie anymore.';
        span.className = 'hyperlink';
        span.style.cursor = 'pointer';
        span.style.textDecoration = 'underline';
        span.style.color = 'blue';
        span.style.fontSize = '0.8em';
        span.onclick = function() {
            $.getJSON('/movie/' + id + '/hide', function(data) {
                msg.set('Movie will not be shown anymore!', 'fadeout');
                $('#content').tabs({
                    active: 0
                }); // Jump to tab 1 > links
                thumbDiv.parentNode.removeChild(thumbDiv);
            });
        }
        return span;
    };
    
    /**
     * Creates a HTML Movie-Thumb from the Movie-Poster
     * 
     * @param {string} imageUrl The Url of the Movie-Poster-Image
     * @param {string} title Title of the Movie as title-tag
     * 
     * @returns {Object} the DOM-Object of the div
     */
    movie.prototype.image = function(param) {
        var div = document.createElement('div');
        div.title = this.info.title + ' (' + this.info.info.year + ')';
        div.style.backgroundImage = 'url(' + this.info.posters + ')';
        div.style.backgroundSize = '52px 81px';
        div.textContent = this.info.title;
        div.style.margin = "5px";
        div.style.fontSize = "10px";
        div.style.width = "52px";
        div.style.height = "81px";
        div.style.padding = "5px";
        div.style.border = "1px soid black";
        div.style.textAlign = "center";
        div.style.hyphens = "auto";
        div.style.overflow = "hidden";
        div.style.wordWrap = "break-word";
        
        // Image -> no Image
        if (imageUrl === '' || (/poster_default/).test(this.info.posters)) {
            div.style.backgroundImage = '';
        }
        else {
            div.style.fontSize = "1px"; // If Image, for searching purposes add title very small
        }
        
        // Show resolution(s) on Poster
        if (param !== undefined && param.resolution !== undefined && param.resolution === true) {
            var res = this.info.info.resolutions;
            var divRes = document.createElement('div');
            divRes.className = 'resolutionBar';
            divRes.textContent = res.join(', ');
            div.appendChild(divRes);
        }

        return div; // DOM-Element
    };
    
})();


