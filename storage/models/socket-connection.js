function SocketConnection(opts) {
    if (!opts) opts = {};
    this.user_name = opts.user_name || '';
    this.connection_id = opts.connection_id || '';
    this.avatar_name = opts.avatar_name || '';
}

module.exports = SocketConnection;