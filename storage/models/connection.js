function Connection(opts) {
    if (!opts) opts = {};
    this.user_name = opts.user_name || '';
    this.connection_id = opts.connection_id || '';
}

module.exports = Connection;