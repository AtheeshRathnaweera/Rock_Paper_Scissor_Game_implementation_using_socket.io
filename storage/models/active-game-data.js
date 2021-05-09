function ActiveGameData(opts) {
    if (!opts) opts = {};
    this.role = opts.role || null; // requester or target
    this.requester = opts.requester || null;
    this.target = opts.target || null;
    this.status = opts.status || null;
    this.room_name = opts.room_name || null;
}

module.exports = ActiveGameData;