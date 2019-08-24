var proxy = require('express-http-proxy');
const express = require('express');
const path = require('path')
const PORT = process.env.PORT || 5000

var app = express();

app.use(function(req, res, next) {
  console.log(req);
  res.header("Access-Control-Allow-Origin", req.headers.origin); // update to match the domain you will make the request from
  res.header("Access-Control-Allow-Headers", "X-Riot-Token, Origin, X-Requested-With, Content-Type, Accept");
  req.headers["X-Riot-Token"] = 'RGAPI-fd81911c-fde0-4b7e-b233-4ed87f81084a';
  if (req.method === 'OPTIONS') {
    res.header("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
    res.send( 200 );
  } else {
    next();
  }
});

app.use('/', proxy('https://na1.api.riotgames.com'));

app.listen(PORT);
