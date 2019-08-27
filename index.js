var proxy = require('express-http-proxy');

// Optional: Connect to a redis server to cache requests
var cache = require('express-redis-cache');
var redis = require('redis');

const express = require('express');
const path = require('path')
const PORT = process.env.PORT || 5000
const RIOT_API_KEY = process.env.RIOT_API_KEY;

var app = express();
var redisCache;

var REDIS_URL = process.env.REDIS_URL;

if (REDIS_URL) {
  redisCache = cache({ client: redis.createClient(REDIS_URL) });
}

function cacheWrite(req, res, next) {
  console.log('CacehWrite.Entry');
  if (redisCache) {
    console.log("WRITING", req.originalUrl, req.body);
    redisCache.add(req.originalUrl, req.body, {
        type: res.headers['content-type'],
        status: res.statusCode,
      },
      function (error, added) { console.log("ADDED", added); }
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
      if (redisCache) {
        console.log("PEEKING FOR", req.originalUrl);
        var cached = redisCache.get(req.originalUrl, function (error, entries) {
          console.log("CACHE.GET.ENTRIES", entries);
          if ( entries.length &&  entries[0].body != null ) {
            res.contentType(entries[0].type);
            res.status(entries[0].status);
            res.send(entries[0].body);
          } else {
            // Cache Client but no entry
            next();
          }
        });
      } else {
        // No Cache Client
        next();
      }
    }
  },
  proxy('https://na1.api.riotgames.com', {
    userResDecorator: function(proxyRes, proxyResData, userReq, userRes) {
      console.log('useRes', proxyResData.toString('utf8'));
      return userRes;
    }
  })
);

app.listen(PORT);
