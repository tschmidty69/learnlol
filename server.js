var express = require('express');
var app = express();
var exphbs = require('express-handlebars');
var request = require('request');
var async = require('async');
var util = require('util');
var handlebars = require('handlebars');

var hbs = exphbs.create({
  defaultLayout: '/opt/learnlol/views/layouts/main',
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
      var template = handlebars.compile(template_string);
      //console.log(template(spell));
      return template(spell);
    }
  }

});

//app.engine('handlebars', exphbs({defaultLayout: '/opt/learnlol/views/layouts/main'}));
app.engine('handlebars', hbs.engine);
app.set('views', '/opt/learnlol/views/');
app.set('view engine', 'handlebars');


app.get('/', function(req, res) {
  res.render('index');
});

app.get('/search', function(req, res) {
  var data = {};
  data.participants = {}
  var api_key = 'f2a72364-5518-4e2d-8d4e-d5809314d16d';
  var s_toSearch = req.query.summoner.toLowerCase();
  var region = req.query.region;

  async.waterfall([
    //Searches for summoner
    function(callback) {
      var URL = 'https://' + region + '.api.pvp.net/api/lol/' + region +'/v1.4/summoner/by-name/' + s_toSearch + '?api_key=' + api_key;
      console.log(URL);
      request(URL, function(err, response, body) {
        if(!err && response.statusCode == 200) {
          var json = JSON.parse(body);
          data.id = json[s_toSearch].id;
          data.name = json[s_toSearch].name;
          console.log("Searched for summoner: " + json[s_toSearch].name + ' in region ' + region)
          // So here it worked and we move to next function
          //callback(null, data);
        } else {
          data.name=s_toSearch+ 'Summoner not currently in game';
          console.log(data.name);
          console.log(err);
        }
        callback(null, data);
      });
    },
    // Fetches list of participants
    function(data, callback) {
      var URL = 'https://' + region + '.api.pvp.net/observer-mode/rest/consumer/getSpectatorGameInfo/' + region.toUpperCase() + '1/' + data.id + '?api_key=' + api_key;
      console.log(URL);
      request(URL, function(err, response, body) {
        if(!err && response.statusCode == 200) {
          var summId = 0;
          var json = JSON.parse(body);
          //console.log(util.inspect(json, {showHidden: false, depth: null}));
          // Can use array since no async functions
          for( var c = 0; c < json['participants'].length; c++) {
            //console.log('c=' + c);
            data.participants[c] = {};
            data.participants[c].summId = json['participants'][c].summonerId;
            data.participants[c].summName = json['participants'][c].summonerName;
            data.participants[c].teamId = json['participants'][c].teamId;
            data.participants[c].championId = json['participants'][c].championId;
            console.log(json['participants'][c].summonerName + ':' + json['participants'][c].summonerId + ':' + json['participants'][c].championName)
          }
          async.each(data.participants, function(participant, callback) {
            console.log('name=' + participant.summName + ', id=' + participant.championId)
            var champ_json;

            var URL = 'https://global.api.pvp.net/api/lol/static-data/' + region +'/v1.2/champion/' + participant.championId + '?champData=passive,spells&api_key=' + api_key;
            console.log(URL)
            request(URL, function(err, response, body) {
              if(!err && response.statusCode == 200) {
                champ_json = JSON.parse(body);
                //console.log(util.inspect(champ_json, {showHidden: false, depth: null}));
                participant.championInfo = champ_json;
                console.log(participant.summName + ' playing ' + champ_json.name);
              } else {
                console.log(err);
              }
              callback();
            });
          }, function(err) {
            if (err) { 
              console.log('static-data error:' + err); 
            }
            else {
              console.log('Loops finished?');
              callback(null, data);
            }
          });
          // We are done go to next function

          //console.log('data length=' + json['participants'].length)
        } else {
          console.log('getSpectatorGameInfo error: ' + err);
          callback(null, data);
        }
      });
    },
    // Now here is where it gets tricky for me
/*    function(data, callback) {
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
*/
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
