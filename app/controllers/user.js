const express = require('express');
const router = express.Router();

const config = require('../../config/config');

const storageHelper = require('../../storage/helper');
const helper = require('../helpers');

module.exports = (app) => {
  app.use('/user', router);
};


//protection middleware
const protectedAuth = (req, res, next) => {
  if (typeof req.session.user_name === 'undefined') {
    next();
  } else {
    // console.log("already authenticated " + req.session.user_name);
    res.redirect("/");
  }
};

router.get('/register', protectedAuth, (req, res, next) => {
  res.render('index', {
    title: 'Register',
    server_url: config.server_url
  });
});

router.post('/register', (req, res, next) => {
  let userName = req.body.userName;

  userNamesSet = storageHelper.get("user-names-list");

  if (userName !== null && userName.trim().length > 0 && !userNamesSet.has(userName)) {
    console.log("user name not exist");

    //user name
    userNamesSet.add(userName);
    storageHelper.storeAKey("user-names-list", userNamesSet);
    req.session.user_name = userName;

    res.redirect("/");
    return;
  }

  console.log("user name exist");
  res.render('index', {
    alertType: 'danger',
    errorMessage: 'User name already exist. Please try something different.'
  });
});

router.post('/logout', (req, res, next) => {
  console.log("log out used started " + req.session.user_name);

  let userNamesSet = storageHelper.get("user-names-list");

  //remove the user name
  userNamesSet.delete(req.session.user_name);
  storageHelper.storeAKey("user-names-list", userNamesSet);

  req.session.destroy();

  res.redirect("/user/register");
});

router.post('/gameRequest/:connectionId', (req, res, next) => {
  let request_id = req.params.connectionId;

  console.log("user game request started " + request_id);

  res.redirect("/user/register");
});



