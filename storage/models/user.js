function User (opts) {
    if(!opts) opts = {};
    this.user_name = opts.user_name || '';
  }
  
  module.exports = User;