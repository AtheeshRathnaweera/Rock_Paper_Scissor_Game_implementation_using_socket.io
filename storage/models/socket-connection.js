const Challenges = require("./challenges");

function SocketConnection(opts) {
    if (!opts) opts = {};
    this.user_name = opts.user_name || '';
    this.connection_id = opts.connection_id || '';
    this.avatar_name = opts.avatar_name || '';
    this.challenges = opts.challenges || new Challenges();
    this.in_game = opts.in_game || false;
    this.played_amount = opts.played_amount || 0;
    this.win_amount = opts.win_amount || 0;
}

module.exports = SocketConnection;