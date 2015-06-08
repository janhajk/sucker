var config   = require(__dirname + '/../config.js').diskstation;
var request = require('request');

var login = function(callback) {
    var path = '/webapi/auth.cgi?';
    var params = 'api=SYNO.API.Auth&version=2&method=login&account=' + config.username + '&passwd=' + config.password + '&session=DownloadStation&format=sid';
    var url = config.scheme + '://' + config.url + ':' + config.port + path + params;
    console.log(url);
    request.get({url:url}, function(error, response, body){
        console.log(body);
        callback(body.data.sid);
    });
};

var create = function(uri, callback) {
    var path = '/webapi/DownloadStation/task.cgi';
    var url = config.scheme + '://' + config.url + ':' + config.port + path;
    login(function(sid){
        request.post({
            url: url,
            form: {
                api: 'SYNO.DownloadStation.Task',
                version: '1',
                method: 'create',
                uri:uri,
                _sid:sid}
        }, function(error, response, body){
            console.log(error);
            console.log(response);
            console.log(body);
            callback(body);
        });
    });

};
exports.create = create;