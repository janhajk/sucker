var config   = require(__dirname + '/config.js');
var express  = require('express');
var path     = require('path');
var fs       = require('fs');

var ul       = require(__dirname + '/lib/uploaded.js');
var utils    = require(__dirname + '/lib/utils.js');
var movie    = require(__dirname + '/lib/movies.js');

var db       = require(__dirname + '/database/database.js');

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
 var result = (user === config.username && pass === config.password);
 callback(null /* error */, result);
});

app.get('/', auth, function(req, res) {
    fs.readFile(__dirname + '/public/index.html', 'utf-8', function (err, data) {
        res.send(data);
    });
});



app.get('/tv', auth, function(req, res) {
    utils.rssGet('TV', function(items) {
        console.log(items);
        res.json(items);
    });
});

app.get('/movies', auth, function(req, res) {
    db.movie.get(function(err, movies) {
        res.json(movies);
    });
});

/**
 * rip content from all sites and return all uploaded.net links
 */
app.post('/site/links', auth, function(req, res) {
    utils.getContentFromMultipleUrls(req.body.sites, function(content){
        res.json(content);
    });
});


/**
 * gets a List of all downloaded Files on server
 */
app.get('/file', auth, function(req, res) {
    res.json(utils.getDownloadedFiles());
});

/**
 * Send single file to client for downloading
 */
app.get('/file/:filename/download', auth, function(req, res){
  var file = path.join('/mnt/notpersistent/downloads', req.param('filename'));
  res.download(file);
});

/**
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


/**
 * Hides Movie from View
 */
app.get('/movie/:id/hide', auth, function(req, res) {
    db.movie.hide(req.param('id'), function(success){
        res.json(success);
    });
});

/**
 * Updates Movie-Info for Movie by mongo-Id
 */
app.get('/movie/:id/update', auth, function(req, res) {
    movie.updateInfoById(req.param('id'), function(success){
        res.json(success);
    });
});



/**
 * fetch Movie Info (IMDB/Tomatoes, Poster)
 * for developping/testing
 */
app.get('/:title/info', auth, function(req, res) {
    movie.getTomatoesFromTitle(movie.getFilmTitleFromString(req.param('title')), function(imdbInfo){
        res.json(imdbInfo);
    });
});

db.connect(function(){
    app.listen(app.get('port'));
    db.movie.fixDb();
});

