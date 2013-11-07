var config   = require(__dirname + '/config.js');
var express  = require('express');
var path     = require('path');
var fs       = require('fs');

var ul       = require(__dirname + '/uploaded.js');
var utils    = require(__dirname + '/utils.js');
var movie    = require(__dirname + '/movies.js');

var app = express();
app.configure(function(){
  app.use(express.compress());
  app.set('port', process.env.PORT || config.port);
  app.use(express.logger('dev'));
  app.use(express.json());
  app.use(express.urlencoded());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

// Asynchronous
var auth = express.basicAuth(function(user, pass, callback) {
 var result = (user === 'user1' && pass === 'anKkFssc7ACA');
 callback(null /* error */, result);
});

app.get('/', auth, function(req, res) {
    fs.readFile(__dirname + '/index.html', 'utf-8', function (err, data) {
                        res.send(data);
    });
});



app.get('/site/rss/:type', auth, function(req, res) {
    var type = req.param('type');
    rssGet(type, function(items){
      // TV Shows
      if (type === 'TV') {
          res.json(items);
          return;
      }
      // Movies
      var title, movies = {}, i;
      for (i in items) {
          title = movie.getFilmTitleFromString(items[i].title);
          title = title.toLowerCase();
          if (movies[title] === undefined)
              movies[title] = {
                  info  : [],
                  links : [],
                  year  : parseInt(movie.yearFromString(items[i].title)),
                  resolutions: []
                };
          movies[title].links.push(items[i]);
          var resolution = movie.getResFromString(items[i].title);
          if (resolution && movies[title].resolutions.indexOf(resolution) === -1)
                movies[title].resolutions.push(resolution);
      }      
      movie.catchAllInfos(movies, function(infos){
          res.json(infos);
      });
    });
});

/*
 * rip a sites content and return all uploaded.net links
 */
app.get('/site/links', auth, function(req, res){
  var request = require('request');
  request(req.query['url'], function(error, response, body) {
    res.json(ul.getLinksFromString(body));
  });
});

/*
 * gets a List of all downloaded Files on server
 */
app.get('/file', auth, function(req, res){
    res.json(utils.getDownloadedFiles());
});

/*
 * Send single file to client for downloading
 */
app.get('/file/:filename/download', auth, function(req, res){
  var file = path.join('/mnt/notpersistent/downloads', req.param('filename'));
  res.download(file);
});

/*
 * Checks if a File still exists on File-Hoster and returns info about file
 */
app.get('/ul/:id/check', auth, function(req, res){
    ul.fileExists(req.param('id'), function(info){
        res.json(info);
    });
});

/**
 * Downloads a file to the server
 */
app.get('/ul/:id/grab', auth, function(req, res){
    ul.download(req.param('id'), function(success){
        res.json(success);
    });
});


/*
 * fetch Movie Info (IMDB/Tomatoes, Poster)
 */
app.get('/:title/info', auth, function(req, res) {
    movie.getTomatoesFromString(req.param('title'), function(err, imdbInfo){
        res.json(imdbInfo);
    });
});

app.listen(app.get('port'));

var rssGet = function(type, callback) {
    var Scrapper = require(__dirname + '/scrapper.js');
    var items = [];
    var feedCount = config.feeds[type].feeds.length;
    var feedcounter = 0;
    for (var i = 0; i < feedCount; i++) {
          Scrapper.scrap({url:config.feeds[type].feeds[i]}, function (err, rss) {
            if (err === null) {
                for(var i in rss.items) {
                  for (var title in config.feeds[type].queries) {
                    var regex = new RegExp(config.feeds[type].queries[title].title, 'g'); 
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
          });
    }
};

