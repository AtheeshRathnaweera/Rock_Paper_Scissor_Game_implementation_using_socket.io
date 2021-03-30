const express = require('express');
const router = express.Router();
const Article = require('../models/article');

const config = require('../../config/config');

module.exports = (app) => {
  app.use('/', router);
};

router.get('/', (req, res, next) => {
  const articles = [new Article(), new Article()];
  res.render('index', {
    title: 'Generator-Express MVC',
    articles: articles,
    server_url: config.server_url
  });
});
