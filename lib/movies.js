var config   = require(__dirname + '/../config.js');
var http     = require('http');

var db       = require(__dirname + '/../database/database.js');
var Movie    = require(__dirname + '/../database/movieDb.js');
var utils    = require(__dirname + '/utils.js');

var tmdb     = require('moviedb')(config.theMovieDbApiKey);


/*
 * Cron Function to update RSS-Feed-Entries into our Database
 */
var cronUpdateFeeds = function() {
    console.log('updating Movie-Feeds...');
    rssGet(function(items) {
        console.log('retrieved '+ items.length +' items from feeds');
        var movies = createSetFromRss(items);
        for (var i in movies) {
            db.movie.exists(movies[i], function(exists, movieEntry, movieInput) {
                if (exists) {
                    // If movie-title already exists in the db, then add new links to existing
                    var merged = db.movie.mergeMovies(movieEntry, movieInput);
                    movieEntry = merged.movie;
                    if (merged.newlinks) {
                        console.log('Updating: ' + movieEntry.title);
                        movieEntry.lastUpdate = new Date(movieEntry.sites[movieEntry.sites.length-1].pubdate);
                        movieEntry.save();
                    }
                }
                else {
                    console.log('Adding: ' + movieEntry.title);
                    movieEntry.lastUpdate = new Date(movieEntry.sites[movieEntry.sites.length-1].pubdate);
                    movieEntry.save();
                }
            });
        }
    });
};


/*
 * picks one movie from db which has no Info
 * and adds gets info which is later added back to the db
 */
var cronUpdateInfo = function() {
    db.movie.findNew(function(err, movie) {
        if (movie !== null) {
            catchAllInfos(movie, function() {});
        }
    });
};

var updateInfoById = function(_id, callback) {
    Movie.model.findById(_id, function(err, movie){
        movie.info.year = Math.max.apply(Math, movie.search.years);
        catchAllInfos(movie, function(){
            callback(true);
        });
    });
};
exports.updateInfoById = updateInfoById;


/**
 * Takes the data from the RSS Feeds and creates
 * database-models out of it
 */
var createSetFromRss = function(items) {
    var title, movies = {}, i, res, year;
    for (i in items) {
        title = getFilmTitleFromString(items[i].title);
        title = title.toLowerCase();
        year = yearFromString(items[i].title);
        if (movies[title] === undefined) {
            movies[title] = new Movie.model({
                title: title,
                search: {
                    years: [year],
                    titles: [title]
                },
                info: {
                    year: year,
                    lastUpdated: undefined
                }
            });
        }
        movies[title].sites.push(items[i]);
        res = getResFromString(items[i].title);
        if (res && movies[title].resolutions.indexOf(res) === -1)
            movies[title].resolutions.push(res);
    }
    return movies;
};
exports.createSetFromRss = createSetFromRss;



/*
 * Reads Info for one movie from tomatoes and saves it to the database
 */
var catchAllInfos = function(movie, callback) {
    console.log('fetching info for: ' + movie.title);
    testRottenTomatoesConnection(function(status){
        if (status) {     // get Info from rottenTomatoes if available
            getTomatoesFromTitle(movie.title, function(info) {
                if (info.length !== 0) {
                    var rightInfo = getRightInfo(movie.info.year, info);
                    if (movie.search.titles.indexOf(movie.title) < 0) movie.search.titles.push(movie.title);    // Add Title if new
                    if (movie.search.years.indexOf(movie.info.year) < 0) movie.search.years.push(movie.info.year); // Add years of Filename if new

                    // If no info from tomatoes, then add year only to info
                    if (info[rightInfo] === undefined) {
                        movie.info = {
                            year: movie.info.year
                        };
                    }
                    else {
                        movie.info = info[rightInfo];
                        if (movie.search.years.indexOf(info[rightInfo].year) < 0) movie.search.years.push(info[rightInfo].year); // adds year of Tomatoe-Info if new
                        movie.title = info[rightInfo].title;    //TODO: If Title is different from RSS-Title, 
                                                                // then search for existing db-entry and merge with that one if existent
                        movie.info.ids.tomatoes = info[rightInfo].id;
                        movie.info.ids.imdb     = info[rightInfo].alternate_ids !== undefined && info[rightInfo].alternate_ids.imdb !== undefined ? info[rightInfo].alternate_ids.imdb : 0;
                    }
                }
                movie.info.lastUpdated = new Date();
                //console.log(movie);
                movie.save(function (err, product, numberAffected) {
                    if (err) callback(err);
                    else callback(true);
                });
            });
        }
        // Retrieve Data from TheMovieDb
        else {
            tmdb.searchMovie({query: movie.title }, function(err, res){
                var correctMovie = null;
                movie.info.lastUpdated = new Date();
                if (res.results === null) {
                    movie.save(function (err, product, numberAffected) {
                        if (err) callback(err);
                        else callback(true);
                    });
                }
                for (var i in res.results) {
                    if (parseInt(String(res.results[i].release_date).substring(0,4), 10) === movie.info.year) {
                        correctMovie = res.results[i];
                        //console.log(correctMovie);
                        movie.info.ids.tmdb = correctMovie.id;
                        tmdb.movieInfo({id: correctMovie.id}, function(err, res){
                            //console.log(res);
                            movie.info.runtime = res.runtime;
                            
                            movie.info.synopsis = res.overview;
                            movie.info.ids.imdb = res.imdb_id;
                            movie.info.posters.thumbnail = 'http://image.tmdb.org/t/p/w500' + res.poster_path;
                            console.log('going to save the following entry...');
                            console.log(movie);
                            movie.save(function (err, product, numberAffected) {
                                if (err) callback(err);
                                else callback(true);
                            });
                        });
                        break;
                    }
                }
            });
        }
    });
};
exports.catchAllInfos = catchAllInfos;



/**
 * Pick right info from tomatoes
 * 
 * Tomatoes returns different results for a movie-title query
 * from the RSS we have the year inside the filename exp: the.movie.2013.mp4
 * this function tries to find a movie from the search-results-set, which
 * matches that year, and then returns the matched key
 * if no match can be found, we assume, it is the first match (most probable)
 *
 * @param year number a year exp: 2013
 * @param info array Array with infos that have a year info[key].year
 */
var getRightInfo = function(year, info) {
    for (var key in info) {
        if (parseInt(year, 10) === parseInt(info[key].year,10)) return key;
    }
    return 0;
};
exports.getRightInfo = getRightInfo;


/*
 * Fires Tomates-Query
 * 
 * The search on Tomatoes returns multiple results in an array
 * @param title string A Title of a movie
 * @param callback object function(err, info, title)
 */
var getTomatoesFromTitle = function(title, callback) {
    var uri = 'http://api.rottentomatoes.com/api/public/v1.0/movies.json?apikey='+config.rottenTomatoesApiKey+'?q='+encodeURIComponent(title);
    http.get(uri, function(res) {
        console.log(uri);
        if (res.statusCode !== 403) {
            callback(res);
        }
        else {
            console.log('Rottentomatoes rejected connection. Check your api-key.')
            callback('');
        }
    });
};
exports.getTomatoesFromTitle = getTomatoesFromTitle;

var testRottenTomatoesConnection = function(callback) {
    var uri = 'http://api.rottentomatoes.com/api/public/v1.0/movies.json?apikey='+config.rottenTomatoesApiKey;
    http.get(uri, function(res) {
        if (res.statusCode !== 200) {
            callback (false);
        }
        else callback (true);
    });
};


/*
 * Finds a Year in a String
 *
 * Year must be preceded by space or period
 * Year must be followed by space or period
 * Finds years from 1900-2099
 * exp: "Fathers.Day.2011.DC.BDRiP"
 * exp: "Fathers Day 2011 DC BDRiP"
 */
var yearFromString = function(title) {
    title = title.replace(/\./g, " "); // for "Fathers.Day.2011.DC.BDRiP" strings
    var year = title.match(/(.+)\s((19|20)\d{2})\s?/i);
    if (year !== null && year[2] !== undefined) return parseInt(year[2], 10);
    return 1900;
};
exports.yearFromString = yearFromString;


/**
 * Extracts Film Title from Movie-Filename-String
 *
 * Takes everything from the Start of the string to the first year-string
 * If there's no year, then the whole string is returned with stripped periods
 * 
 * @param string string A string containing a Movie-Title. Must have a year
 * @returns {String} The Title of the Movie; If no year, then returns string
 */
var getFilmTitleFromString = function(string) {
    string = string.replace(/\./g, " "); // for "Fathers.Day.2011.DC.BDRiP" strings
    string = string.replace(/\’/g, "");
    var title = string.match(/(.+)\s(19|20)\d{2}\s?/i); // everything til the first 4-digit year followed by space or nothing
    if (title !== null) return title[1];
    return string;
};
exports.getFilmTitleFromString = getFilmTitleFromString;



/*
 * Extracts Resolution/Format from given String
 *
 * only returns first occurence
 *
 * TODO: Cam, TS with .CAM. and .TS.
 */
var getResFromString = function(string) {
    if (typeof string !== 'string')
        return false;
    var formats = utils.resolutions;
    var regex   = new RegExp(formats.join('|'), 'i');
    var results = regex.exec(string);
    return (results === null) ? false : results[0];
};
exports.getResFromString = getResFromString;


/*
 * retrieves RSS content from all RSS-Movie-Feeds
 *
 */
var rssGet = function(callback) {
    console.log('start reading feeds...');
    var Scrapper = require(__dirname + '/scrapper.js');
    var items = [];
    var feedCount = config.feeds.Movies.feeds.length;
    var feedcounter = 0;
    var processItems = function(err, rss) {
        if (err === null) {
            var i, title, regex;
            for (i in rss.items) {
                for (title in config.feeds.Movies.queries) {
                    regex = new RegExp(config.feeds.Movies.queries[title].title, 'g');
                    if (regex.exec(rss.items[i].title)) {
                        items.push(rss.items[i]);
                    }
                }
            }
        }
        feedcounter++;
        if (feedcounter === feedCount) {
            callback(items);
        }
    };
    console.log('reading from total of: ' + feedCount + ' feeds');
    for (var i = 0; i < feedCount; i++) {
        console.log(config.feeds.Movies.feeds[i]);
        Scrapper.scrap(config.feeds.Movies.feeds[i], function(err, rss) {
            console.log(rss);
            console.log(err);
            processItems(err, rss);
        });
    }
};



setTimeout(cronUpdateFeeds, 6000);

setInterval(cronUpdateFeeds, config.updateIntervalFeeds);
setInterval(cronUpdateInfo, config.updateIntervalInfos);

























/**
 * deprecated IMDB-Functions
 * IMDB has no API to officialy retrieve Movie-information
 * 
 */



exports.getImdbFromTitle = function(title, callback) {
    var imdb = require('imdb-api');
    imdb.getReq({
        name: title
    }, function(err, info) {
        callback(err, info);
    });
};

exports.getImdbFromString = function(string, callback) {
    var imdb = require('imdb-api');
    var title = getFilmTitleFromString(string);
    if (title) {
        imdb.getReq({
            name: title
        }, function(err, info) {
            callback(err, info);
        });
    }
    else {
        callback(false);
    }
};