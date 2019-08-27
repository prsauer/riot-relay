# riot-relay

A simple http proxy server to enable client calls to the Riot API using your own API key. CORS prevents us from querying the Riot API directly from a client -- this proxy fixes that. Not intended for large scale production use.

A barebones Node.js app using [Express 4](http://expressjs.com/) and express-http-proxy.

## Running Locally

Make sure you have [Node.js](http://nodejs.org/) and the [Heroku CLI](https://cli.heroku.com/) installed.

```sh
$ git clone https://github.com/prsauer/riot-relay.git # or clone your own fork
$ cd node-js-getting-started
$ export RIOT_API_KEY='<your riot key>'
$ npm install
$ npm start
```

Your app should now be running on [localhost:5000](http://localhost:5000/).

## Deploying to Heroku

```
$ heroku create
$ git push heroku master
$ Add RIOT_API_KEY as an config var with your Riot API key as the value 
$ heroku open
```
or

## More information

- [Getting Started with Node.js on Heroku](https://devcenter.heroku.com/articles/getting-started-with-nodejs)
- [Heroku Node.js Support](https://devcenter.heroku.com/articles/nodejs-support)
- [Node.js on Heroku](https://devcenter.heroku.com/categories/nodejs)
- [Best Practices for Node.js Development](https://devcenter.heroku.com/articles/node-best-practices)
- [Using WebSockets on Heroku with Node.js](https://devcenter.heroku.com/articles/node-websockets)
