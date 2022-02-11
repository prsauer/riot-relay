var proxy = require("express-http-proxy");

var cache = require("express-redis-cache");
var redis = require("redis");

const express = require("express");

const PORT = process.env.PORT || 5000;

var app = express();

var redisCache;

var REDIS_URL = process.env.REDIS_URL;

console.log(`Proxying ${"https://us.api.blizzard.com"}`);

if (REDIS_URL) {
  redisCache = cache({ client: redis.createClient(REDIS_URL) });
}

var CLIENT_ID = process.env.CLIENT_ID;
var CLIENT_SECRET = process.env.CLIENT_SECRET;

const keyCache = {
  expires_in: "",
  access_token: "",
  sub: "",
  token_type: "",
  cached_on: "",
};

function resolveApiKey(region, clientId, clientSecret) {
  const expired = cachedOn + parseInt(keyCache.expires_in);
  console.log("expiry", expired, cachedOn, keyCache.expires_in);
  if (!keyCache.access_token || expired) {
    return fetch(
      `https://${region}.battle.net/oauth/token?grant_type=client_credentials`,
      {
        method: "POST",
        headers: {
          Authorization:
            "Basic " +
            Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
        },
      }
    ).then((r) => ({ ...r.json(), cachedOn: new Date().getTime() }));
  }
  return new Promise((resolve) => resolve(keyCache));
}

app.use(
  "/",
  function (req, res, next) {
    res.header("Access-Control-Allow-Origin", req.header("Origin"));
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept"
    );
    const token = resolveApiKey("us", CLIENT_ID, CLIENT_SECRET)
      .then(() => {
        req.url += `&access_token=${token.access_token}`;
        console.log("API Key Resolved", token);
        if (req.method === "OPTIONS") {
          res.header("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
          res.send(200);
        } else {
          if (redisCache) {
            // console.log("Cache.GET", req.originalUrl);
            redisCache.get(req.originalUrl, function (error, entries) {
              // console.log("Cache.HIT", entries);
              if (entries.length && entries[0].body != null) {
                res.header("Cache-control", "public, max-age=3000");
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
      })
      .catch(() => {
        console.log("API Key Refresh Failed");
        next();
      });
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
            // console.log("Cache.WRITE", added);
          }
        );
      }
      return proxyResData;
    },
    userResHeaderDecorator(headers, userReq, userRes, proxyReq, proxyRes) {
      // recieves an Object of headers, returns an Object of headers.
      // if (proxyRes.statusCode === 200) {
      headers["cache-control"] = "public, max-age=3000";
      // }
      return headers;
    },
  })
);

app.listen(PORT);
