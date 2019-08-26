var proxy = require('express-http-proxy');
const express = require('express');
const path = require('path')
const PORT = process.env.PORT || 5000
const RIOT_API_KEY = process.env.RIOT_API_KEY;

var app = express();

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", req.headers.origin);
  res.header("Access-Control-Allow-Headers", "X-Riot-Token, Origin, X-Requested-With, Content-Type, Accept");
  req.headers["X-Riot-Token"] = RIOT_API_KEY;
  if (req.method === 'OPTIONS') {
    res.header("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
    res.send( 200 );
  } else {
    next();
  }
});

app.use('/', proxy('https://na1.api.riotgames.com'));

app.listen(PORT);
