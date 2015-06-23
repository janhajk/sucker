var config   = require(__dirname + '/../config.js').diskstation;
var request = require('request');

var getUri = function(path) {
    var uri = config.scheme + '://' + config.url + ':' + config.port + path;
    return uri;
};

var serialize = function(obj) {
    var str = "";
    for (var key in obj) {
        if (str != "") {
            str += "&";
        }
        str += key + "=" + obj[key];
    }
    return str;
};

var dsLogin = function(callback) {
    var path = '/webapi/auth.cgi';
    var params = {
        api: 'SYNO.API.Auth',
        version: '2',
        method: 'login',
        session: 'DownloadStation',
        format: 'sid',
        account: config.username,
        passwd: config.password
    };
    request.get({
        url: getUri(path + '?' + serialize(params))
    }, function(error, response, body) {
        var sid = (JSON.parse(body)).data.sid;
        callback(sid);
    });
};

var dsDownloadStationCreate = function(uri, callback) {
    dsLogin(function(sid){
        request.post({
            url: getUri('/webapi/DownloadStation/task.cgi'),
            form: {
                api: 'SYNO.DownloadStation.Task',
                version: '1',
                method: 'create',
                uri:uri,
                _sid:sid}
        }, function(error, response, body){
            callback(JSON.parse(body));
        });
    });

};
exports.dsDownloadStationCreate = dsDownloadStationCreate;