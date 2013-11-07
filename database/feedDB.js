var config = require(__dirname + '/../config.js');
var mongoose = require('mongoose');
var Scrapper = require(__dirname + '/../scrapper.js');

var feedSchema = mongoose.Schema({
        url: String,
        creationDate: { type: Date, default: Date.now },
        lastUpdate: { type: Date, default: 0 },
        updateFrequence: Number,
        name: { type: String, default: "Loading..." },
        description: { type: String, default: "Loading..." },
        link: { type: String, default: "Loading..." },
        items: [{
                title: String,
                link: String,
                description: String,
                content: String
        }]
});

var Feed = mongoose.model('Feed', feedSchema);
exports.model = Feed;

exports.add = function(url, callback) {
        Feed.findOne().where('url').equals(url).exec(function (err, feed) {
                if (feed) {
                  if (feed._owners.indexOf(user._id) == -1) {
                    Feed.update({_id: feed._id}).exec(callback);
                  }
                  else {
                    callback(2);
                  }
                }
                else // Create feed in database and reference to user
                {
                        feed = new Feed({url: url});
                        Scrapper.scrap(feed, function (err, rss) {
                                if (err) return callback(err);
                                for(var k in rss) {
                                  feed[k]=rss[k];
                                }
                                feed.lastUpdate = Date.now();
                                feed.save(function(err) {
                                  callback(err, feed);
                                });
                        });
                }
                return true;
        });
}

exports.delete = function(user, feedID, callback) {
        if (user._feeds.indexOf(feedID) == -1)
                return callback(true);
        Feed.findById(feedID).exec(function (err, feed) {
                if (!feed || err)
                        return callback(err);
                if (feed._owners.length == 1) // No more owners, removing feed from database
                        Feed.remove({_id: feed._id}).exec();
                var index = user._feeds.indexOf(feedID);
                var toUnset = {};
                toUnset['_feeds.' + index] = 1;
                User.model.update({_id: user._id}, {$unset: toUnset}).exec(callback); // Unsetting feed from user
        });
}

exports.get = function(user, callback) {
        User.model.findById(user._id).populate('_feeds').exec(function (err, user) {
                var total = user._feeds.length;
                if (!total)
                        callback();
                for (var i = user._feeds.length - 1; i >= 0; i--) {
                        update(user._feeds[i], function (err, feed) {
                                user._feeds[i] = feed;
                                total--;
                                if (total == 0)
                                        callback(err, user._feeds);
                        });
                };
        });
}

exports.getOne = function (feedID, callback) {
        Feed.findById(feedID).exec(function (err, feed) {
                if (!feed)
                        return callback({message: "No such feed"}, null);
                update(feed, callback);
        });
}


update = function(feed, callback) {


        if (feed.lastUpdate && Date.now() - Date.parse(feed.lastUpdate) < config.cacheTime)
                return callback(false, feed);

        console.log("[info ] Getting feed %s", feed.url);

        Scrapper.scrap(feed, function (err, rss) {
                if (err)
                        return callback({message: "Not a valid RSS feed"});

                rss.lastUpdate = Date.now();

                Feed.findByIdAndUpdate(feed._id, {$set: rss}, callback);
        });
}

exports.update = update;