const express = require('express');
const config = require('./config/config');

const storageClient = require('./storage');
const storageHelper = require('./storage/helper');

const app = express();

module.exports = require('./config/express')(app, config);

storageClient.createClient();

storageHelper.storeAKey("user-names-list", new Set([]));
storageHelper.storeAKey("connections-pool", new Set([]));


app.listen(config.port, () => {
  console.log('Express server listening on port ' + config.port);
});

