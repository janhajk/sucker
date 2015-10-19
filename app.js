var config      = require(__dirname + '/config.js');

// Express
var express        = require('express');
var compression    = require('compression');
var bodyParser     = require('body-parser');
var methodOverride = require('method-override');
var basicAuth      = require('basic-auth-connect');
var auth           = require('http-auth');

// Filesystem
var path     = require('path');
var fs       = require('fs');

// User
var hoster   = require(__dirname + '/lib/hoster.js');
var utils    = require(__dirname + '/lib/utils.js');
var movie    = require(__dirname + '/lib/movies.js');

var db       = require(__dirname + '/database/database.js');

// Setting up Express
var app = express();
app.use(compression());
app.use(methodOverride());                  // simulate DELETE and PUT
app.use(express.static((path.join(__dirname, 'public'))));
app.use(bodyParser.json());    // parse application/json
app.use(bodyParser.urlencoded({ extended: false }));

app.listen(process.env.PORT || config.port);

var basic = auth.basic({
   realm: "Sucker"
}, function(username, password, callback) { // Custom authentication method.
   callback(user === config.username && pass === config.password);
});



app.get('/', auth.connect(basic), function(req, res) {
    fs.readFile(__dirname + '/public/index.html', 'utf-8', function (err, data) {
        res.send(data);
    });
});



app.get('/tv', auth.connect(basic), function(req, res) {
    utils.rssGet('TV', function(items) {
        items.sort(function(a,b){a=a.title.toLowerCase();b=b.title.toLowerCase();return a>b?1:a<b?-1:0;});
        res.json(items);
    });
});

app.get('/movies', auth.connect(basic), function(req, res) {
    db.movie.get(function(err, movies) {
        res.json(movies);
    });
});

/**
 * rip content from [sites] and return all premium links
 */
app.post('/site/links', auth.connect(basic), function(req, res) {
    var engine   = require(__dirname + '/lib/engine.js');
    engine.linkEngine(req.body.sites, function(content){
        res.json(content);
    });
});


/**
 * gets a List of all downloaded Files on server
 */
app.get('/files', auth.connect(basic), function(req, res) {
    res.json(utils.getDownloadedFiles());
});



/**
 * Send single file to client for downloading
 */
app.get('/files/:filename', auth.connect(basic), function(req, res) {
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
app.delete('/files/:filename/delete', auth.connect(basic), function(req, res) {
    var file = path.join(config.fPath, req.param('filename'));
    fs.unlink(file, function(err) {
        utils.log('-'); utils.log('Deleted file: ' + file);
        res.json(err);
    });
});

/**
 * Checks if a File still exists on File-Hoster and returns info about file
 */
app.get('/plowprobe/:links', auth.connect(basic), function(req, res){
    var plowprobe = require(__dirname + '/lib/plowshare.js').plowprobe;
    plowprobe(req.param('links'), function(info){
        res.json(info);
    });
});

/**
 * Downloads a file to the server
 */
app.post('/plowdown', auth.connect(basic), function(req, res){
    var plowdown = require(__dirname + '/lib/plowshare.js').plowdown;
    utils.log('Start downloading: ' + req.body.link);
    plowdown(req.body.link, function(success){
        res.json(success);
    });
});


/**
 * Hides Movie from View
 */
app.get('/movie/:id/hide', auth.connect(basic), function(req, res) {
    db.movie.hide(req.param('id'), function(success){
        res.json(success);
    });
});

/**
 * Updates Movie-Info for Movie by mongo-Id
 */
app.get('/movie/:id/update', auth.connect(basic), function(req, res) {
    movie.updateInfoById(req.param('id'), function(success){
        res.json(success);
    });
});



/**
 * fetch Movie Info
 * for developping/testing
 */
app.get('/:title/info', auth.connect(basic), function(req, res) {
    movie.getTomatoesFromTitle(movie.getFilmTitleFromString(req.param('title')), function(imdbInfo) {
        res.json(imdbInfo);
    });
});


app.post('/diskstation/DownloadStation', auth.connect(basic), function(req, res) {
    var diskstation = require(__dirname + '/lib/diskstation.js');
    if (req.body.method === 'create') {
        utils.log('Start downloading: ' + req.body.uri);
        diskstation.dsDownloadStationCreate(req.body.uri, function(body){
            res.json(body);
        });
    }
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
        movie.cleanUp(config.keepTime, function(){
        });
    })(), 6000);
    setInterval((function() {
        movie.updateFeeds(function(e) {
            utils.log(e)
        });
        movie.cleanUp(config.keepTime, function(){
        });
    })(), config.updateIntervalFeeds);
    setInterval(movie.cronUpdateInfo, config.updateIntervalInfos);
});

