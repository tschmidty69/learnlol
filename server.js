var express = require('express');
var app = express();
var exphbs = require('express-handlebars');
var request = require('request');
var async = require('async');
var util = require('util');
app.engine('handlebars', exphbs({defaultLayout: 'main'}));

app.set('view engine', 'handlebars');

app.get('/', function(req, res) {
  res.render('index');
});

app.get('/search', function(req, res) {
  var data = {};
  data.participants = {}
  var api_key = 'f2a72364-5518-4e2d-8d4e-d5809314d16d';
  var s_toSearch = req.query.summoner.toLowerCase();

  async.waterfall([
    function(callback) {
      var URL = 'https://na.api.pvp.net/api/lol/na/v1.4/summoner/by-name/' + s_toSearch + '?api_key=' + api_key;
      request(URL, function(err, response, body) {
        if(!err && response.statusCode == 200) {
          var json = JSON.parse(body);
          data.id = json[s_toSearch].id;
          data.name = json[s_toSearch].name;
          console.log("Searched for summoner: " + json[s_toSearch].name)
          callback(null, data);
        } else {
          console.log(err);
        }
      });
    },
    function(data, callback) {
      var URL = 'https://na.api.pvp.net/observer-mode/rest/consumer/getSpectatorGameInfo/NA1/' + data.id + '?api_key=' + api_key;
      request(URL, function(err, response, body) {
        if(!err && response.statusCode == 200) {
          var summId = 0;
          var json = JSON.parse(body);
          //console.log(util.inspect(json, {showHidden: false, depth: null}));
          for( var c = 0; c < json['participants'].length; c++) {
            //console.log('c=' + c);
            data.participants[c] = {};
            data.participants[c].summId = json['participants'][c].summonerId;
            data.participants[c].summName = json['participants'][c].summonerName;
            data.participants[c].teamId = json['participants'][c].teamId;
            data.participants[c].championId = json['participants'][c].championId;
            console.log(json['participants'][c].summonerName + ':' + json['participants'][c].summonerId + ':' + json['participants'][c].championId)
            
          }
          callback(null, data);  
          //console.log('data length=' + json['participants'].length)
        } else {
          console.log(err);
        }        
      });

    },
    function(data, callback) {
      console.log('data length=' + data.participants.length)
      for( var d = 0; d < data.participants.length; d++) {
        var champ_json;
        console.log(d, data.participants[d].championId);
        var URL = 'https://na.api.pvp.net/api/lol/static-data/na/v1.2/champion/' + data.participants[d].championId + '?api_key=' + api_key;
        request(URL, function(err, response, body) {
          if(!err && response.statusCode == 200) {
            champ_json = JSON.parse(body);
            console.log('d=' + d);
            console.log(util.inspect(champ_json, {showHidden: false, depth: null}));
          } else {
            console.log(err);
          }
        });
        //console.log('d=' + d);
        console.log(util.inspect(champ_json, {showHidden: false, depth: null}));
        data.participants[d].championName = champ_json.name;
        //console.log(data.participants[d].championName);
        callback(null, data);
 
      }
    },
  ],
  function(err, data) {
    if(err) {
      console.log(err);
      return;
    }
    //console.log('here');
    //console.log(data);
    res.render('index', {
      info: data
    });
  });
});

var port = Number(process.env.PORT || 3000);
app.listen(port);