const express = require('express');
const config = require('./config/config');

const app = express();

const server = require('./server');

module.exports = require('./config/express')(app, config);

server();

app.listen(config.port, () => {
  console.log('Express server listening on port ' + config.port);
});

