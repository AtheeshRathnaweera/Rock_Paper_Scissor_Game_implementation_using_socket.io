const express = require('express');
const config = require('./config/config');

const storageClient = require('./storage');
const storageHelper = require('./storage/helper');
const helper = require('./app/helpers');

const app = express();

app.use(express.static('public'));

module.exports = require('./config/express')(app, config);

//get the available avatar names and store in the cache
helper.getAvailableAvatarNames().then((avatarImages) => {
  storageHelper.storeAKey("avatar-images", avatarImages);
}).catch((err)=>{
  console.log("error in get avaialable vatar names : "+err);
});

storageClient.createClient();

storageHelper.storeAKey("user-names-list", new Set([]));
storageHelper.storeAKey("connections-pool", new Set([]));

app.listen(config.port, () => {
  console.log('Express server listening on port ' + config.port);
});

