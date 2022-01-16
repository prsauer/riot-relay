const dotenv = require('dotenv')
dotenv.config()

var proxy = require('express-http-proxy');

var cache = require('express-redis-cache');
var redis = require('redis');

const express = require('express');

const PORT = process.env.PORT || 5000;
const HSR_COOKIE = process.env.HSR_COOKIE;

var app = express();
var redisCache;

var REDIS_URL = process.env.REDIS_URL;

if (REDIS_URL) {
  const expire = 60 * 60; // seconds until cache item expires
  redisCache = cache({ client: redis.createClient(REDIS_URL), expire });
}

console.log('HSR', HSR_COOKIE);

app.use('/',
  function(req, res, next) {
    res.header("Access-Control-Allow-Origin", req.headers.origin);
    res.header("Access-Control-Allow-Headers", "X-Riot-Token, Origin, X-Requested-With, Content-Type, Accept");
    // req.header('HSR_COOKIE', HSR_COOKIE);
    req.header('cookie', HSR_COOKIE);
    req.header("Content-Type", "application/json");
    if (req.method === 'OPTIONS') {
      res.header("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
      res.send( 200 );
    } else {
      if (redisCache) {
        console.log("Cache.GET", req.originalUrl);
        var cached = redisCache.get(req.originalUrl, function (error, entries) {
          console.log("Cache.HIT", entries.length);
          if ( entries.length &&  entries[0].body != null ) {
            res.contentType(entries[0].type);
            res.status(200);
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
  proxy('hsreplay.net', {
    https: true,
    proxyReqOptDecorator: function(proxyReqOpts, srcReq) {
      console.log(proxyReqOpts.hostname, proxyReqOpts.url);
      console.log(srcReq.hostname, srcReq.url);
      proxyReqOpts.headers['cookie'] = HSR_COOKIE;
      // console.log('reqCookie', proxyReqOpts.headers['cookie']);
      proxyReqOpts.headers['content-type'] = 'application/json';
      console.log(proxyReqOpts.headers);
      return proxyReqOpts;
    },
    userResDecorator: function(proxyRes, proxyResData, userReq, userRes) {
      console.log(userReq.url);
      console.log('res header', proxyRes.headers);
      if (proxyRes.statusCode == 200 && redisCache) {
        console.log("Writing", proxyResData.toString('utf-8'));
        redisCache.add(userReq.originalUrl, proxyResData.toString('utf-8'), {
            type: proxyRes.headers['content-type'],
            status: proxyRes.statusCode,
          },
          function (error, added) { console.log("Cache.WRITE", added, error); }
        );
      }
      return proxyResData;
    }
  })
);

app.listen(PORT);
