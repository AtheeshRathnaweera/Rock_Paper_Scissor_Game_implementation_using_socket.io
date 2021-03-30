const path = require('path');
const rootPath = path.normalize(__dirname + '/..');
const env = process.env.NODE_ENV || 'development';

const config = {
  development: {
    root: rootPath,
    app: {
      name: 'rpssocketproject'
    },
    port: process.env.PORT || 3000,
    server_port: process.env.SERVER_PORT || 3100,
    host: process.env.HOST || 'http://localhost',
    client_url: (process.env.HOST || 'http://localhost') + ":" + (process.env.PORT || 3000),
    server_url: (process.env.HOST || 'http://localhost') + ":" + (process.env.SERVER_PORT || 3100)
  },

  test: {
    root: rootPath,
    app: {
      name: 'rpssocketproject'
    },
    port: process.env.PORT || 3000,
  },

  production: {
    root: rootPath,
    app: {
      name: 'rpssocketproject'
    },
    port: process.env.PORT || 3000,
  }
};

module.exports = config[env];
