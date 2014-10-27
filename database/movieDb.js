var mongoose = require('mongoose');

var MovieSchema = mongoose.Schema({
    title: { type: String, index: true },
    search: {
        titles: {type: [String], index: true},
        years:  {type: [Number], index: true},
    },
    info: {
        runtime: {type: Number, default: 0},
        year: { type: Number, index: true },
        synopsis: {type: String, default: ''},
        ids: {
            imdb: String,
            tomatoes: Number,
            tmdb: Number,
        },
        ratings: {
            imdb: Number,
            tomatoes: Number,
            tmdb: Number,
        },
        posters: {
            thumbnail: String,
            profile: String,
            original: String
        },
        mpaa_rating: String,
        critics_consensus: String,
        lastUpdated: Date
    },
    sites: [{
        link: String,
        title: String,
        resolution: String,
        pubdate: Date,
        lastRipped: Date
    }],
    links: [{
        link: String,
        type: String,
        status: Number,
        lastChecked: Date
    }],
    resolutions: {type: [String]},
    lastUpdate: {type: Date, index: true},
    dateAdded: Date,
    display: {type: Boolean, default:true, index: true}
});

var Movie = mongoose.model('Movie', MovieSchema);
exports.model = Movie;


exports.add = function(title, info, callback) {
    Movie.findOne()
        .where('title').equals(title)
        .where('info.year').equals(info.year).exec(function (err, movie) {
            if (movie) {    // Movie already in DB
                callback(movie);
            }
            else {  // Create new Movie in database
                movie = new Movie({title: title, info:info});
                movie.dateAdded = new Date();
                movie.save(function(err) {
                      callback(err, movie);
                });
            }
            return true;
    });
};


/**
 * Reads all Movies from the Database that are on 'display'
 */
exports.get = function(callback) {
    Movie.find({$or: [{display:true}, {display: undefined}]}, function (err, movies) {
        callback(err, movies);
    });
};

exports.findNew = function(callback) {
    Movie.findOne({'info.lastUpdated': undefined}, function (err, movie){
        console.log('Movie to udpate: ' + movie);
        callback(err, movie);
    });
};

exports.exists = function(movieInput, callback) {
    Movie.findOne({'search.titles': {$regex: '^'+movieInput.title, $options: 'i'}, 'search.years': movieInput.info.year}, function(err, movie) {
        if (movie) {    // Movie already in DB
            callback(true, movie, movieInput);
        }
        else {  // Create new Movie in database
            callback(false, movieInput);
        }
        return true;
    });
};

exports.hide = function(movieId, callback) {
    Movie.findByIdAndUpdate(movieId, { $set: { display: false }}, function(){
        callback(true);
    });
};

var mergeMovies = function(movie1, movie2) {
    var key1, key2, movie = movie1, i = false, count = 0;
    // Merge Links and count newly added links
    for (key1 in movie2.sites) {
        i = false;
        for (key2 in movie1.sites) {
            if (movie2.sites[key1].link === movie1.sites[key2].link) {
                i = true;
                break;
            }
        }
        if (!i) {
            movie.sites.push(movie2.sites[key1]);
            count++;
        }
    }
    // Merge resolutions
    for (key1 in movie2.resolutions){
        if (movie1.resolutions.indexOf(movie2.resolutions[key1]) < 0)
            movie.resolutions.push(movie2.resolutions[key1]);
    }
    return {
        movie:movie,
        newlinks: count};
};
exports.mergeMovies = mergeMovies;




exports.fixDb = function(callback) {
    var utils = require(__dirname + '/../lib/utils');
    Movie.find(function(err, movies){
        for (var key in movies) {
            var res = [];
            for (var i in movies[key].resolutions) {
                if (typeof movies[key].resolutions[i] === 'string' && utils.isResolution(movies[key].resolutions[i])) {
                    res.push(movies[key].resolutions[i]);
                }
            }
            //console.log(res);
            movies[key].resolutions = res;
            movies[key].save();
        }
    });
};

