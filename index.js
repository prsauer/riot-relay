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

// process.env.REDIS_URL
var REDIS_URL = "redis://h:pce6fb632bcd59e5435ce9b242fabe0162387173bd09544afcdcdd495bc43a6fb@ec2-18-205-197-149.compute-1.amazonaws.com:32639";

if (REDIS_URL) {
  ({ client: redis.createClient(REDIS_URL) })
}

function cacheWrite(req, res, next) {
  if (redisClient) {
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
        var cached = redisClient.get(req.originalUrl);
        if ( cache.length &&  cache[0].body != null ) {
          res.contentType(cache[0].type);
          res.status(cache[0].status);
          res.send(cache[0].body);
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
