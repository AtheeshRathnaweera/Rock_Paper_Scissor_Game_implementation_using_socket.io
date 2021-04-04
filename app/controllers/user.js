const express = require('express');
const router = express.Router();

const config = require('../../config/config');

const storageHelper = require('../../storage/helper');

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
  console.log("rec name : " + userName);

  userNamesSet = storageHelper.get("user-names-list");

  console.warn("names : " + JSON.stringify(userNamesSet));

  if (userName !== null && userName.trim().length > 0 && !userNamesSet.has(userName)) {
    console.log("user name not exist");
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



