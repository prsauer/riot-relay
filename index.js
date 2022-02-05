var proxy = require("express-http-proxy");

var cache = require("express-redis-cache");
var redis = require("redis");

const express = require("express");
const path = require("path");

const PORT = process.env.PORT || 5000;
const WOW_ACCESS_TOKEN = process.env.WOW_ACCESS_TOKEN;

var app = express();

var redisCache;

var REDIS_URL = process.env.REDIS_URL;

console.log(`Proxying ${"https://us.api.blizzard.com"}`);

if (REDIS_URL) {
  redisCache = cache({ client: redis.createClient(REDIS_URL) });
}

app.use(
  "/",
  function (req, res, next) {
    res.header("Access-Control-Allow-Origin", req.header("Origin"));
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept"
    );
    req.url += `&access_token=${WOW_ACCESS_TOKEN}`;
    if (req.method === "OPTIONS") {
      res.header("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
      res.send(200);
    } else {
      if (redisCache) {
        console.log("Cache.GET", req.originalUrl);
        var cached = redisCache.get(req.originalUrl, function (error, entries) {
          console.log("Cache.HIT", entries);
          if (entries.length && entries[0].body != null) {
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
  proxy("https://us.api.blizzard.com", {
    userResDecorator: function (proxyRes, proxyResData, userReq, userRes) {
      if (proxyRes.statusCode == 200 && redisCache) {
        redisCache.add(
          userReq.originalUrl,
          proxyResData.toString("utf8"),
          {
            type: proxyRes.headers["content-type"],
            status: proxyRes.statusCode,
          },
          function (error, added) {
            console.log("Cache.WRITE", added);
          }
        );
      }
      return proxyResData;
    },
  })
);

app.listen(PORT);
