var config      = require(__dirname + '/config.js');

// Express
var express        = require('express');
var compression    = require('compression');
var bodyParser     = require('body-parser');
var methodOverride = require('method-override');
var cookieParser   = require('cookie-parser');
var session        = require('express-session');


// Auth
var passport       = require('passport');
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;

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
app.use(bodyParser.json());    // parse application/json
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(session({genid: function(req) {return genuuid()},secret: 'keyboard cat'}));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static((path.join(__dirname, 'public'))));


app.listen(process.env.PORT || config.port);

// Authentication
passport.serializeUser(function(user, done) {
   done(null, user);
});
passport.deserializeUser(function(obj, done) {
   done(null, obj);
});
passport.use(new GoogleStrategy({
   clientID: config.GOOGLE_CLIENT_ID,
   clientSecret: config.GOOGLE_CLIENT_SECRET,
   callbackURL: config.baseurl + "/auth/google/callback"
}, function(accessToken, refreshToken, profile, done) {
   utils.log(profile);
   process.nextTick(function() {
      var id = profile.id;
      if (id === config.googleUser) {
         utils.log('Login in user "' + user.displayName + '"');
         return done(null, user);
      }
      else {
         utils.log('User not authorised!');
         return done(err);
      }
   });
}));

app.get('/auth/google', passport.authenticate('google', {scope: ['https://www.googleapis.com/auth/plus.login']}), function(req, res) {});
app.get('/auth/google/callback', passport.authenticate('google', {failureRedirect: '/login'}), function(req, res) {
   res.redirect('/start');
});
app.get('/logout', function(req, res) {
   req.logout();
   res.redirect('/login');
});

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/login');
}


// Router

app.get('/', function(req, res){
   fs.readFile(__dirname + '/public/login.html', 'utf-8', function (err, data){
      res.send(data);
   });
});
app.get('/login', function(req, res){
   fs.readFile(__dirname + '/public/login.html', 'utf-8', function (err, data){
      res.send(data);
   });
});

app.get('/start', ensureAuthenticated, function(req, res) {
    fs.readFile(__dirname + '/public/index.html', 'utf-8', function (err, data) {
        res.send(data);
    });
});



app.get('/tv', ensureAuthenticated, function(req, res) {
    utils.rssGet('TV', function(items) {
        items.sort(function(a,b){a=a.title.toLowerCase();b=b.title.toLowerCase();return a>b?1:a<b?-1:0;});
        res.json(items);
    });
});

app.get('/movies', ensureAuthenticated, function(req, res) {
    db.movie.get(function(err, movies) {
        res.json(movies);
    });
});

/**
 * rip content from [sites] and return all premium links
 */
app.post('/site/links', ensureAuthenticated, function(req, res) {
    var engine   = require(__dirname + '/lib/engine.js');
    engine.linkEngine(req.body.sites, function(content){
        res.json(content);
    });
});


/**
 * gets a List of all downloaded Files on server
 */
app.get('/files', ensureAuthenticated, function(req, res) {
    res.json(utils.getDownloadedFiles());
});



/**
 * Send single file to client for downloading
 */
app.get('/files/:filename', ensureAuthenticated, function(req, res) {
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
app.delete('/files/:filename/delete', ensureAuthenticated, function(req, res) {
    var file = path.join(config.fPath, req.param('filename'));
    fs.unlink(file, function(err) {
        utils.log('-'); utils.log('Deleted file: ' + file);
        res.json(err);
    });
});

/**
 * Checks if a File still exists on File-Hoster and returns info about file
 */
app.get('/plowprobe/:links', ensureAuthenticated, function(req, res){
    var plowprobe = require(__dirname + '/lib/plowshare.js').plowprobe;
    plowprobe(req.param('links'), function(info){
        res.json(info);
    });
});

/**
 * Downloads a file to the server
 */
app.post('/plowdown', ensureAuthenticated, function(req, res){
    var plowdown = require(__dirname + '/lib/plowshare.js').plowdown;
    utils.log('Start downloading: ' + req.body.link);
    plowdown(req.body.link, function(success){
        res.json(success);
    });
});


/**
 * Hides Movie from View
 */
app.get('/movie/:id/hide', ensureAuthenticated, function(req, res) {
    db.movie.hide(req.param('id'), function(success){
        res.json(success);
    });
});

/**
 * Updates Movie-Info for Movie by mongo-Id
 */
app.get('/movie/:id/update', ensureAuthenticated, function(req, res) {
    movie.updateInfoById(req.param('id'), function(success){
        res.json(success);
    });
});



/**
 * fetch Movie Info
 * for developping/testing
 */
app.get('/:title/info', ensureAuthenticated, function(req, res) {
    movie.getTomatoesFromTitle(movie.getFilmTitleFromString(req.param('title')), function(imdbInfo) {
        res.json(imdbInfo);
    });
});


app.post('/diskstation/DownloadStation', ensureAuthenticated, function(req, res) {
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

