var path      = require('path');
var exec      = require('child_process').exec;
var config    = require(__dirname + '/../config.js');
var plowshare = require(__dirname + '/plowshare.js');

/*
 * Define Hosters here
 *
 * 'id': {
 *      id: '<id>',
 *      baseUrl: '<baseUrl>'    the base Url of the hoster
 *      urlPatterns: [array]    array of regular expression patterns
 *      short: function         function that returns the minimal url for a download link exp. http://ul.to/<id>
 * }
 *
 */

var hosts = {
    'ul': {
        id: 'ul',
        baseUrl: 'http://ul.to',
        urlPatterns: ['ul\\.to/([a-zA-Z0-9-]{8})', 'uploaded\\.net/file/([a-zA-Z0-9-]{8})'],
        short: function(link) {
            var regex = new RegExp(this.urlPatterns.join('|'), 'gim');
            var link  = regex.exec(link);
            var id = (link[1]===undefined?link[2]:link[1]);
            return this.baseUrl + '/' + id;
        }
    }
}
exports.hosts = hosts;



/*
 * get all premium-hoster-links from a string
 * returns array with unique short-links
 */
var getAllLinksFromString = function(string) {
    var links = [],
        link,
        l,
        regex;
    for(var i in config.login) {
        regex = new RegExp(hosts[i].urlPatterns.join('|'), 'gim');
        while((l = regex.exec(string)) != null) {
            link = hosts[i].short(l[0])
            if(links.indexOf(link) === -1) links.push(link); // only add unique ids
        }
    }
    return links;
};
exports.getAllLinksFromString = getAllLinksFromString;



/*
 * Checks a link for a valid hoster
 */
var getHostFromLink = function(link){
    var regex, status;
    for (var i in hosts) {
        regex = new RegExp(hosts[i].urlPatterns.join('|'), 'gim');
        status = regex.exec(link);
        if (status != null) {
            return i;
        }
    }
    return false;
};
exports.getHostFromLink = getHostFromLink;