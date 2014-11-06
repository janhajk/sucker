var config = require(__dirname + '/../config.js');
var mongoose = require('mongoose');
var utils    = require(__dirname + '/../lib/utils.js');


exports.connect = function(callback) {
        utils.log('Connecting to database...');
        mongoose.connect(config.database);

        var db = mongoose.connection;
        db.on('error', console.error.bind(console, 'Connection error:'));
        db.once('open', function() {
                utils.log('Connected to DB successfully!');
                callback();
        });
};

exports.movie = require('./movieDb.js');