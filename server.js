var express = require('express');
var app = express();
var exphbs = require('express-handlebars');
var request = require('request');
var async = require('async');
var util = require('util');
//var handlebars = require('handlebars');
var jsonfile = require('jsonfile');
var jsonQuery = require('json-query')

var app_base = 'C:/Users/tschmidt/github/learnlol/';
var lol_patch = '7.19.1';

var fs = require('fs');

var hbs = exphbs.create({
  defaultLayout: 'main',
  helpers: {
    expand_spell: function(spell) {
      console.log('tooltip: ' + spell.tooltip);
      var template_string = JSON.stringify(spell.tooltip);
      spell.e1 = spell.effectBurn[1];
      spell.e2 = spell.effectBurn[2];
      spell.e3 = spell.effectBurn[3];
      spell.e4 = spell.effectBurn[4];
      spell.e5 = spell.effectBurn[5];
      //console.log('SPELL: ' + template_string);
//      var template = hbs.compile(template_string);
      //console.log(template(spell));
//      return template(spell);
      return spell;

    }
  }
});

app.engine('handlebars', hbs.engine);

app.set('views', app_base + 'views/');
app.set('view engine', 'handlebars');

app.get('/', function(req, res) {
  res.render('index');
});

app.get('/search', function(req, res) {
  var data = {};
  data.lol_patch = lol_patch
  data.participants = []
  var api_key = 'RGAPI-a335ccb0-2088-4d4b-afbe-2d1d70a5378d';
  var s_toSearch = req.query.summoner.toLowerCase();
  var region = req.query.region;
  var lang = req.query.language;
  var dd_champion = JSON.parse(fs.readFileSync(app_base + 'dragontail-' + lol_patch + '/' + lol_patch + '/data/' + lang + '/championFull.json', 'utf8'));

  async.waterfall([
    //Searches for summoner

    function(callback) {
      var URL = 'https://' + region + '.api.riotgames.com/lol/summoner/v3/summoners/by-name/' + s_toSearch + '?api_key=' + api_key;
      request(URL, function(err, response, body) {
        //console.log(body);
        if(!err && response.statusCode == 200) {
          var json = JSON.parse(body);
          //console.log(json);
          data.id = json.id;
          data.name = json.name;
          console.log("Found summoner " + json.name + ' in region ' + region)
          // So here it worked and we move to next function
          callback(null, data);
        } else {
          data.name=s_toSearch+ ' not currently in game';
          console.log(data.name);
          console.log(err);
          callback(null, data);
        }

      });
    },

    // Fetches list of participants
    function(data, callback) {
      var URL = 'https://' + region + '.api.riotgames.com/lol/spectator/v3/active-games/by-summoner/' + data.id + '?api_key=' + api_key;
      //console.log(URL);
      request(URL, function(err, response, body) {
        if(!err && response.statusCode == 200) {
          var summId = 0;
          var json = JSON.parse(body);
          //console.log(util.inspect(json, {showHidden: false, depth: null}));
          // Can use array since no async functions
          //console.log(json);
          for( var c = 0; c < json['participants'].length; c++) {
            //console.log('c=' + c);
            data.participants[c] = {};
            data.participants[c].summonerId = json['participants'][c].summonerId;
            data.participants[c].summonerName = json['participants'][c].summonerName;
            // blue = 0; red = 1
            if(json['participants'][c].teamId == '100') { data.participants[c].teamId = 0; }
            else {  data.participants[c].teamId = 1; }
            data.participants[c].championId = json['participants'][c].championId;
            //console.log(json['participants'][c].summonerName + ':' + json['participants'][c].summonerId + ':' + json['participants'][c].championId)
          }
          async.each(data.participants, function(participant, callback) {
            console.log('Summoner: ' + participant.summonerName + ', id=' + participant.championId)
						//console.log('')
          }, function(err) {
            if (err) {
              console.log('static-data error:' + err);
            }
            else {
              console.log('Loops finished');
            }
          });

          console.log('Loops finished');
          // We are done go to next function
          callback(null, data);
          //console.log('data length=' + json['participants'].length)
        } else {
          console.log('getSpectatorGameInfo error: ' + err);
          callback(null, data);
        }

      });
      //callback(null, data);

    },
    // Now here is where it gets tricky for me

    function(data, callback) {
      //console.log('data length=' + data.participants.length)
      //console.log(util.inspect(data, {showHidden: false, depth: null}));

      for( var d = 0; d < data.participants.length; d++) {
        data.participants[d].championInfo = {}
        //var champ_json;
        //console.log(d, data.participants[d].summonerName, data.participants[d].championId);
        //console.log(util.inspect(dd_champion, {showHidden: false, depth: null}));
        var championId = jsonQuery('data[**][key=' + data.participants[d].championId + ']', {data: dd_champion}).value.id
        data.participants[d].championInfo = jsonQuery('data[**][key=' + data.participants[d].championId + ']', {data: dd_champion}).value
        //var championInfo = JSON.parse(fs.readFileSync(app_base + 'dragontail-' + lol_patch + '/' + lol_patch + '/data/' + lang + '/champion/' + championId +'.json', 'utf8'));

        //console.log(util.inspect(data.participants[d].championInfo, {showHidden: false, depth: 1}));

        //data.participants[d].championInfo = championInfo.data[championId]
        console.log(util.inspect(data.participants[d].championInfo.passive, {showHidden: false, depth: 3}));

        /*var URL = 'https://na.api.pvp.net/api/lol/static-data/na/v1.2/champion/' + data.participants[d].championId + '?api_key=' + api_key;
        request(URL, function(err, response, body) {
          if(!err && response.statusCode == 200) {
            champ_json = JSON.parse(body);
            console.log('d=' + d);
            console.log(util.inspect(champ_json, {showHidden: false, depth: null}));
          } else {
            console.log(err);
          }
        });
        */
        //console.log('d=' + d);
        //console.log(util.inspect(champ_json, {showHidden: false, depth: null}));
        //data.participants[d].championName = champ_json.name;
        console.log(d, data.participants[d].summonerName, data.participants[d].championInfo.name, data.lol_patch);
        //console.log(util.inspect(data.participants[d].championInfo.spells, {showHidden: false, depth: 0}));
        //callback(null, data);

      }
      callback(null, data);
    },

  ],
  // Final callback function which writes out page
  function(err, data) {
    if(err) {
      console.log(err);
      return;
    }
    console.log('Done and rendering');
    //console.log(data);
    res.render('index', {
      info: data
    });
  });
});

var server_port = 8080;
var server_ip_address = '0.0.0.0';

console.log( "Listening on " + server_ip_address + ", server_port " + server_port )
app.listen(server_port, server_ip_address);
