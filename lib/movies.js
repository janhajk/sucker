var config   = require(__dirname + '/../config.js');
var http     = require('http');

var db       = require(__dirname + '/../database/database.js');
var Movie    = require(__dirname + '/../database/movieDb.js');
var utils    = require(__dirname + '/utils.js');

var tmdb     = require('moviedb')(config.theMovieDbApiKey);





/*
 * Cron Function to update RSS-Feed-Entries into our Database
 */
var updateFeeds = function(callback) {

    utils.log('updating Movie-Feeds...');
    rssGet(function(rssItems) {
        utils.log('retrieved ' + rssItems.length + ' items from feeds');
        var movies = createMovieSetFromRss(rssItems);
       utils.log('start to go through movies from feed')
        for(var i in movies) {
            db.movie.exists(movies[i], function(exists, movieEntry, movieInput) {
                // merge movies if already in database
                if(exists) {
                   utils.log('movie "' + movies[i].title + '" already exists. Start merging with existing entry...');
                   var merged = db.movie.mergeMovies(movieEntry, movieInput);
                   utils.log('movies merged!');
                   movieEntry = merged.movie;
                   if(merged.newlinks) {
                      utils.log('Updating: ' + movieEntry.title);
                      movieEntry.lastUpdate = new Date(movieEntry.sites[movieEntry.sites.length - 1].pubdate);
                      movieEntry.save(function(e){callback(e)});
                   } else utils.log('No new links found for ' + movieEntry.title);
                }
                // add new movie
                else {
                    utils.log('Adding: ' + movieEntry.title);
                    movieEntry.lastUpdate = new Date();
                    movieEntry.save(function(e){callback(e)});
                }
            });
        }
    });
};
exports.updateFeeds = updateFeeds;


/*
 * picks one movie from db which has no Info
 * and adds gets info which is later added back to the db
 */
var cronUpdateInfo = function() {
    db.movie.findNew(function(err, movie) {
        if (movie !== null) {
            utils.log('Movie to udpate: ' + movie);
            catchAllInfos(movie, function() {});
        }
    });
};
exports.cronUpdateInfo = cronUpdateInfo;




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
var createMovieSetFromRss = function(items) {
   var movies = {};
   utils.log('going through items...');
    for (var i in items) {
        var title = getFilmTitleFromString(items[i].title);
        title = title.toLowerCase();
        var year  = yearFromString(items[i].title);
        // TODO: If there are two movies with same titles
        // but different year, this puts them into same
        // movie frame; this can be fixed
        utils.log('processing "' + title + '"');
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
        // get resolution of download-page
        var res = getResFromString(items[i].title);
        // add quality to list, if not existent
        if (res && movies[title].resolutions.indexOf(res) === -1)
            movies[title].resolutions.push(res);
    }
    return movies;
};
exports.createMovieSetFromRss = createMovieSetFromRss;



/*
 * Reads Info for one movie from tomatoes or TheMovieDb and saves it to the database
 *
 * TODO: get additional info from omdbapi via http://www.omdbapi.com/?i=9874923432
 */
var catchAllInfos = function(movie, callback) {
    utils.log('fetching info for: ' + movie.title);
    // Retrieve Data from TheMovieDb
    tmdb.searchMovie({
        query: movie.title
    }, function(err, res) {
        var correctMovie = null;
        movie.info.lastUpdated = new Date();
        utils.log(res);
        if(res.results.length === 0) {
            movie.save(function(err, product, numberAffected) {
                if(err) callback(err);
                else callback(true);
            });
        } else {
            var success = false;
            for(var i in res.results) {
                if(parseInt(String(res.results[i].release_date).substring(0, 4), 10) === movie.info.year) {
                    success = true;
                    correctMovie = res.results[i];
                    movie.info.ids.tmdb = correctMovie.id;
                    tmdb.movieInfo({
                        id: correctMovie.id
                    }, function(err, res) {
                        utils.log('-'); utils.log(res);
                        movie.info.runtime = (res.runtime!==null?res.runtime:0);
                        movie.info.synopsis = res.overview;
                        movie.info.ids.imdb = res.imdb_id;
                        movie.title = res.original_title;
                        movie.info.posters.thumbnail = 'http://image.tmdb.org/t/p/w500' + res.poster_path;
                        utils.log('going to save the following entry...');
                        utils.log(movie);
                        movie.save(function(err, product, numberAffected) {
                            if(err) callback(err);
                            else callback(true);
                        });
                    });
                    break;
                }
            }
            if(!success) { // if no date matches, then take first result
                correctMovie = res.results[0];
                movie.info.ids.tmdb = correctMovie.id;
                tmdb.movieInfo({
                    id: correctMovie.id
                }, function(err, res) {
                    movie.info.runtime = res.runtime;
                    movie.info.synopsis = res.overview;
                    movie.info.ids.imdb = res.imdb_id;
                    movie.title = res.original_title;
                    movie.info.posters.thumbnail = 'http://image.tmdb.org/t/p/w500' + res.poster_path;
                    utils.log('going to save the following entry...');
                    utils.log(movie);
                    movie.save(function(err, product, numberAffected) {
                        if(err) callback(err);
                        else callback(true);
                    });
                });
            }
        }
    });
};
exports.catchAllInfos = catchAllInfos;



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
    if(year !== null && year[2] !== undefined) {
        return parseInt(year[2], 10);
    }
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
    if(title !== null) {
        return title[1];
    }
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
    if(typeof string !== 'string') return false;
    var formats = utils.resolutions;
    var regex = new RegExp(formats.join('|'), 'i');
    var results = regex.exec(string);
    return(results === null) ? false : results[0];
};
exports.getResFromString = getResFromString;


/*
 * retrieves RSS content from all RSS-Movie-Feeds
 *
 */
var rssGet = function(callback) {
    utils.log('start reading feeds...');
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
    utils.log('reading from total of: ' + feedCount + ' feeds');
    for (var i = 0; i < feedCount; i++) {
        utils.log(config.feeds.Movies.feeds[i]);
        Scrapper.scrap(config.feeds.Movies.feeds[i], function(err, rss) {
            utils.log(rss);
            utils.log(err);
            processItems(err, rss);
        });
    }
};


/*
 * Clean-up/remove old entries after n-days
 */
exports.cleanUp = function(n, callback) {
   utils.log('-');
   var expire = new Date(new Date().setDate(new Date().getDate()-n)).toISOString();
   utils.log('removing all entries that were last updated before ' + n + ' days...');
   utils.log('> removing everything older than ' + expire);
   Movie.model.find({lastUpdate : {$lt : expire}}).remove(function(err){
      utils.log(err);
      utils.log('removed!');
      utils.log('-');
   });
   callback();
};







// moviedb return for movieInfo
/*

{ adult: false,
  backdrop_path: '/4IamAvByBWnclmbwlnZB8otMyB7.jpg',
  belongs_to_collection: null,
  budget: 0,
  genres: [ { id: 35, name: 'Comedy' }, { id: 18, name: 'Drama' } ],
  homepage: '',
  id: 243684,
  imdb_id: 'tt3179568',
  original_language: 'en',
  original_title: 'Men, Women & Children',
  overview: 'Follows the story of a group of high school teenagers and their parents as they attempt to navigate the many ways the internet has changed their relationships, their communication, their self-image, and their love lives.',
  popularity: 4.07571172700321,
  poster_path: '/5odPwDRx5rYaA4GX85w7cUgYDrX.jpg',
  production_companies:
   [ { name: 'Right of Way Films', id: 32157 },
     { name: 'Paramount Pictures', id: 4 } ],
  production_countries: [ { iso_3166_1: 'US', name: 'United States of America' } ],
  release_date: '2014-10-17',
  revenue: 0,
  runtime: 116,
  spoken_languages: [ { iso_639_1: 'en', name: 'English' } ],
  status: 'Released',
  tagline: 'Discover how little you know about the people you know.',
  title: 'Men, Women & Children',
  video: false,
  vote_average: 6.4,
  vote_count: 30 }

*/

















/**
 * deprecated IMDB-Functions
 * IMDB has no API to officialy retrieve Movie-information
 * 
 */


/*
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
*/