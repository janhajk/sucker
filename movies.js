var config   = require(__dirname + '/config.js');
var imdb     = require('imdb-api');
var tomatoes = require('tomatoes');
var tomatoe  = tomatoes(config.rottenTomatoesApiKey);  // API Key


var catchAllInfos = function(titles, callback) {
    // start adding Movie-Info from rottentomatoes to each item
    // this is beeing done in timesteps to prevent having more
    // queries to the tomatoes-api than allowed
    var counter = 0;
    (function getInfo(i){
        setTimeout(function(){
          getTomatoesFromTitle(Object.keys(titles)[i-1], function(err, info, title){
              if (err !== undefined) {
                  console.log(err);
                  titles[title].info = {};
              }
              else 
                for (var key in info) {
                    if (info[key].year === titles[title].year) {
                        titles[title].info = info[key];
                        break;
                    }
                    titles[title].info = {};
                }
              counter++;
              if (counter === Object.keys(titles).length) {
                  callback(titles);
              }
          });
          if (--i) getInfo(i);
        }, 1000/config.tomatoesMaxQueriesPerSecond);  // Reduce queries/second
    })(Object.keys(titles).length);
};
exports.catchAllInfos = catchAllInfos;


var getTomatoesFromTitle = function(title, callback) {
    tomatoe.search(title, function(err, info) {
        callback(err, info, title);
    });
};
exports.getTomatoesFromTitle = getTomatoesFromTitle;


var getTomatoesFromString = function(string, callback) {
    var title = getFilmTitleFromString(string);
    if (title) {
        tomatoe.search(title, function(err, results) {
            callback(err, results);
        });
    }
    else {
        callback(false);
    }
};
exports.getTomatoesFromString = getTomatoesFromString;

var yearFromString = function(title) {
    title = title.replace(/\./g, " "); // for "Fathers.Day.2011.DC.BDRiP" strings
    var year = title.match(/(.+)\s((19|20)\d{2})\s?/i);
    if (year !== null && year[2] !== undefined)
        return year[2];
    return false;
};
exports.yearFromString = yearFromString;

var getFilmTitleFromString = function(string) {
    string = string.replace(/\./g, " "); // for "Fathers.Day.2011.DC.BDRiP" strings
    string = string.replace(/\’/g, "");
    var title = string.match(/(.+)\s(19|20)\d{2}\s?/i); // everything til the first 4-digit year followed by space or nothing
    if (title !== null)
        return title[1];
    return string;
};
exports.getFilmTitleFromString = getFilmTitleFromString;


exports.getResFromString = function(string) {
    var results = string.match(/720p|1080p|480p|hdtv/i);
    if (results !== null) {
        var res = results[0];
        if (res === 'hdtv') res = '720p';
        return res;
    }
    return false;
};



exports.getImdbFromTitle = function(title, callback) {
    imdb.getReq({ name: title}, function(err, info) {
        callback(err, info);
    });
};

exports.getImdbFromString = function(string, callback) {
    var title = getFilmTitleFromString(string);
    if (title) {
        imdb.getReq({ name: title}, function(err, info) {
            callback(err, info);
        });
    }
    else {
        callback(false)
    }
};