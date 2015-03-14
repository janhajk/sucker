var config   = require(__dirname + '/config.js');
var express  = require('express');
var path     = require('path');
var fs       = require('fs');

var hoster   = require(__dirname + '/lib/hoster.js');
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
        items.sort(function(a,b){a=a.title.toLowerCase();b=b.title.toLowerCase();return a>b?1:a<b?-1:0;});
        res.json(items);
    });
});

app.get('/movies', auth, function(req, res) {
    db.movie.get(function(err, movies) {
        res.json(movies);
    });
});

/**
 * rip content from [sites] and return all premium links
 */
app.post('/site/links', auth, function(req, res) {
    var engine   = require(__dirname + '/lib/engine.js');
    engine.linkEngine(req.body.sites, function(content){
        res.json(content);
    });
});


/**
 * gets a List of all downloaded Files on server
 */
app.get('/files', auth, function(req, res) {
    res.json(utils.getDownloadedFiles());
});



/**
 * Send single file to client for downloading
 */
app.get('/files/:filename', auth, function(req, res) {
    var file = path.join(config.fPath, req.param('filename'));
    utils.log('-');
    utils.log('sending file \'' + file + '\' to client...');
    res.download(file, function(err) {
        if(err) {
            utils.log('error when sending file to client:');
            utils.log(err);
        } else {
            utils.log('file successfully sent to client!');
        }
    });
});




/**
 * Delete file
 */
app.delete('/files/:filename/delete', auth, function(req, res) {
    var file = path.join(config.fPath, req.param('filename'));
    fs.unlink(file, function(err) {
        utils.log('-'); utils.log('Deleted file: ' + file);
        res.json(err);
    });
});

/**
 * Checks if a File still exists on File-Hoster and returns info about file
 */
app.get('/plowprobe/:links', auth, function(req, res){
    var plowprobe = require(__dirname + '/lib/plowshare.js').plowprobe;
    plowprobe(req.param('links'), function(info){
        res.json(info);
    });
});

/**
 * Downloads a file to the server
 */
app.post('/plowdown', auth, function(req, res){
    var plowdown = require(__dirname + '/lib/plowshare.js').plowdown;
    utils.log('Start downloading: ' + req.body.link);
    plowdown(req.body.link, function(success){
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
 * fetch Movie Info
 * for developping/testing
 */
app.get('/:title/info', auth, function(req, res) {
    movie.getTomatoesFromTitle(movie.getFilmTitleFromString(req.param('title')), function(imdbInfo) {
        res.json(imdbInfo);
    });
});



// Connects app to mongo database
db.connect(function() {
    app.listen(app.get('port'));
    db.movie.fixDb(); // Until this bug gets fixed...
    /*
     * cronjobs
     *
     */
    // Start first cronrun after 6 seconds
    setTimeout((function() {
        movie.updateFeeds(function(e) {
            utils.log(e)
        });
        movie.cleanUp(7, function(){
            utils.log('cleandup database');
        });
    })(), 6000);
    setInterval((function() {
        movie.updateFeeds(function(e) {
            utils.log(e)
        });
        movie.cleanUp(7, function(){
            utils.log('cleandup database');
        });
    })(), config.updateIntervalFeeds);
    setInterval(movie.cronUpdateInfo, config.updateIntervalInfos);
});

