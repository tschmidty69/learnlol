var express = require('express');
var app = express();
var exphbs = require('express-handlebars');
var request = require('request');
var async = require('async');
var util = require('util');
//var handlebars = require('handlebars');
var jsonfile = require('jsonfile');
svar handlebars = require('handlebars');
var jsonQuery = require('json-query')

var app_base = './';
var lol_patch = '7.20.2';

app.set('views', 'views/');
var fs = require('fs');


var hbs = exphbs.create({
  defaultLayout: 'main',
  helpers: {
    expand_spell: function(spell) {
      //var template_string = JSON.stringify(spell.tooltip);

      spell.e0 = spell.effectBurn[0];
      spell.e1 = spell.effectBurn[1];
      spell.e2 = spell.effectBurn[2];
      spell.e3 = spell.effectBurn[3];
      spell.e4 = spell.effectBurn[4];
      spell.e5 = spell.effectBurn[5];
      spell.e6 = spell.effectBurn[6];
      spell.e7 = spell.effectBurn[7];
      spell.e8 = spell.effectBurn[8];
      spell.e9 = spell.effectBurn[9];

      spell.f1 = spell.effectBurn[7];
      spell.f2 = spell.effectBurn[7];
      spell.f3 = spell.effectBurn[7];
      spell.f4 = spell.effectBurn[7];
      spell.f5 = spell.effectBurn[7];

      spell.effect1amount = spell.effect[1][0];

      var spellA1 = jsonQuery('vars[**][key=a1]', {data: spell}).value
      if ( spellA1 && spellA1.link === 'spelldamage') { spell.a1 = spellA1.coeff*100 + '% of ability power'}
      if ( spellA1 && spellA1.link === 'attackdamage') { spell.a1 = spellA1.coeff*100 + '% of attack damage'}
      if ( spell.tooltip.match( /\{\{ [aef][\.0-9]*\*[0-9]*\ \}\}/ )) {
        //console.log('Replacing...')
        spell.tooltip = spell.tooltip.replace( /(f[0-9])\*100/g, '$1')
        spell['f1'] = spell.f1*100
        spell['f2'] = spell.f2*100
        spell['f3'] = spell.f3*100
      }
      spell.tooltip = spell.tooltip.replace( /charabilitypower\*\.01/g, spell.a1*.01)
      spell.tooltip = spell.tooltip.replace( /charabilitypower2\*\.01/g, spell.a1*.01)
      var template = hbs.handlebars.compile(spell.tooltip);
      //console.log(util.inspect(spell, {showHidden: false, depth: 2}));

      //console.log('tooltip: ' + spell.tooltip);
      //console.log('template_string: ' + template_string);
      //console.log('Spell: ' + template(spell.tooltip));
      //console.log('Spell: ' + template(spell));

      return template(spell);
      //return spell;
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
  var api_key = 'RGAPI-eea83325-ef07-442b-9f65-b0d2e31aafce';
  var s_toSearch = req.query.summoner.toLowerCase();
  var region = req.query.region;
  var lang = req.query.language;
  var dd_champion = JSON.parse(fs.readFileSync(app_base + 'datadragon/' + lang + '/championFull.json', 'utf8'));

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
          data.inGame = true;
          // So here it worked and we move to next function
          callback(null, data);
        } else {
          data.name=s_toSearch;
          console.log(data.name + ' not currently in game');
          data.inGame = false;
          if (err) { console.log(err); }
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
            //console.log('Summoner: ' + participant.summonerName + ', id=' + participant.championId)
						//console.log('')
          }, function(err) {
            if (err) {
              console.log('static-data error:' + err);
            }
            else {
              //console.log('Loops finished');
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
        //console.log(util.inspect(data.participants[d].championInfo.passive, {showHidden: false, depth: 3}));

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
        //console.log(d, data.participants[d].summonerName, data.participants[d].championInfo.name, data.lol_patch);
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
