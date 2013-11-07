exports.database     = "mongodb://localhost/sucker";
exports.port         = 27017;
exports.cookieSecret = "1234";

exports.fPath    = '/mnt/notpersistent/downloads';
exports.ulUser   = 'user1';
exports.ulPwd    = 'anKkFssc7ACA';

exports.rottenTomatoesApiKey = '1234';
exports.tomatoesMaxQueriesPerSecond = 8;


exports.feeds    = {
  TV     : {feeds: [
                'http://www.scnsrc.me/tv/feed/',
                'http://bayw.org/feed.php?f=16'
              ],
              queries: [
                {title: "Walking Dead"     , size: 500},
                {title: "Modern Family"    , size: 200},
                {title: "Simpsons"         , size: 100},
                {title: "American Dad"     , size: 100},
                {title: "Once Upon a Time" , size: 300},
                {title: "Myth\s?Busters"   , size: 300}
              ]
             },
  Movies : {feeds: [
                'http://www.scnsrc.me/films/feed/',
                'http://www.wrzko.eu/movies/feed/'],
              queries: [
                {title: ".*"     , size: -1}
              ]
             }
};

exports.urlRegex = new RegExp("^(http[s]?:\\/\\/(www\\.)?|ftp:\\/\\/(www\\.)?|www\\.){1}([0-9A-Za-z-\\.@:%_\+~#=]+)+((\\.[a-zA-Z]{2,3})+)(/(.)*)?(\\?(.)*)?");
exports.emailRegex = new RegExp("^[a-z0-9]+([_|\.|-]{1}[a-z0-9]+)*@[a-z0-9]+([_|\.|-]{1}[a-z0-9]+)*[\.]{1}[a-z]{2,6}$");

exports.cacheTime = 60 * 60 * 1000; // 1 hour in milliseconds