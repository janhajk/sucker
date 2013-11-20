var config   = require('../config.js');
var imdb     = require('imdb-api');
var tomatoes = require('tomatoes');
var tomatoe  = tomatoes(config.rottenTomatoesApiKey); // API Key
var db       = require('../database/database.js');
var Movie    = require('../database/movieDb.js');


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
    getTomatoesFromTitle(movie.title, function(err, info) {
        if (err === undefined && info.length !== 0) {
            var rightInfo = getRightInfo(movie.year, info);
            if (movie.search.titles.indexOf(movie.title) < 0) movie.search.titles.push(movie.title);
            if (movie.search.years.indexOf(movie.info.year) < 0) movie.search.years.push(movie.info.year);
            if (movie.search.years.indexOf(info[rightInfo].year) < 0) movie.search.years.push(info[rightInfo].year);
            movie.title = info[rightInfo].title;    //TODO: If Title is different from RSS-Title, 
                                                    // then search for existing db-entry and merge with that one if existent
            movie.info = (info[rightInfo] !== undefined) ? info[rightInfo] : {
                year: movie.info.year
            };
        }
        movie.info.lastUpdated = new Date();
        movie.save();
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
        if (year === info[key].year) return key;
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
    tomatoe.search(title, function(err, info) {
        callback(err, info, title);
    });
};
exports.getTomatoesFromTitle = getTomatoesFromTitle;


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
    return false;
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
    var formats = ['720p', '1080p', '480p', 'hdtv', 'webrip', 'dvdrip'];
    var regex   = new RegExp(formats.join('|'), 'i');
    var results = regex.exec(string);
    if (results !== null) return results[0];
    return false;
};
exports.getResFromString = getResFromString;


/*
 * retrieves RSS content from all RSS-Feeds
 *
 */
var rssGet = function(callback) {
    console.log('start reading feeds...');
    var Scrapper = require('./scrapper.js');
    var items = [];
    var feedCount = config.feeds.Movies.feeds.length;
    var feedcounter = 0;
    var addSite = function(err, rss) {

    };
    console.log('reading from total of: ' + feedCount + ' feeds');
    for (var i = 0; i < feedCount; i++) {
        Scrapper.scrap({
            url: config.feeds.Movies.feeds[i]
        }, function(err, rss) {
            if (err === null) {
                for (var r in rss.items) {
                    for (var title in config.feeds.Movies.queries) {
                        var regex = new RegExp(config.feeds.Movies.queries[title].title, 'g');
                        if (regex.exec(rss.items[r].title)) {
                            items.push(rss.items[r]);
                        }
                    }
                }
            }
            feedcounter++;
            if (feedcounter === feedCount) {
                callback(items);
            }
        });
    }
};



exports.getImdbFromTitle = function(title, callback) {
    imdb.getReq({
        name: title
    }, function(err, info) {
        callback(err, info);
    });
};

exports.getImdbFromString = function(string, callback) {
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


setTimeout(cronUpdateFeeds, 6000);

setInterval(cronUpdateFeeds, 1000 * 60 * 60);
setInterval(cronUpdateInfo, 10000);