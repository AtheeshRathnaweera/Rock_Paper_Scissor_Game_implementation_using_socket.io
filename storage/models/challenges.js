function Challenges(opts) {
    if (!opts) opts = {};
    this.sent = opts.sent || new Array();
    this.received = opts.received || new Array();
}

module.exports = Challenges;