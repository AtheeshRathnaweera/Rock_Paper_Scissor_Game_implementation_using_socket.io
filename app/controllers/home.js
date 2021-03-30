const express = require('express');
const router = express.Router();

const config = require('../../config/config');

const routeProtector = require('../middlewares/routeProtector');

module.exports = (app) => {
  app.use('/', router);
};

router.get('/', routeProtector, (req, res, next) => {
  res.render('home', {
    title: 'Home',
    server_url: config.server_url
  });
});
