var proxy = require('express-http-proxy');

// Optional: Connect to a redis server to cache requests
var cache = require('express-redis-cache');
var redis = require('redis');

const express = require('express');
const path = require('path')
const PORT = process.env.PORT || 5000
const RIOT_API_KEY = process.env.RIOT_API_KEY;

var app = express();
var redisClient;

var REDIS_URL = process.env.REDIS_URL;

if (REDIS_URL) {
  redisClient = redis({ client: redis.createClient(REDIS_URL) });
}

function cacheWrite(req, res, next) {
  if (redisClient) {
    console.log("WRITING", req.originalUrl, req.body);
    redisClient.add(req.originalUrl, req.body, {
        type: res.headers['content-type'],
        status: res.statusCode,
      },
    );
  }
  next();
}

app.use('/',
  function(req, res, next) {
    res.header("Access-Control-Allow-Origin", req.headers.origin);
    res.header("Access-Control-Allow-Headers", "X-Riot-Token, Origin, X-Requested-With, Content-Type, Accept");
    req.headers["X-Riot-Token"] = RIOT_API_KEY;
    if (req.method === 'OPTIONS') {
      res.header("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
      res.send( 200 );
    } else {
      if (redisClient) {
        console.log("PEEKING FOR", req.originalUrl);
        var cached = redisClient.get(req.originalUrl);
        if ( cached.length &&  cached[0].body != null ) {
          res.contentType(cached[0].type);
          res.status(cached[0].status);
          res.send(cached[0].body);
        } else {
          // Cache Client but no entry
          next();
        }
      } else {
        // No Cache Client
        next();
      }
    }
  },
  proxy('https://na1.api.riotgames.com'),
  cacheWrite
);

app.listen(PORT);
