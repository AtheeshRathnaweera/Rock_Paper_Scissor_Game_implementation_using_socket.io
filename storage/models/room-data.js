function RoomData(opts) {
    if (!opts) opts = {};
    this.name = opts.name || null;
    this.status = opts.status || null;
    this.clients = opts.clients || new Array();
    this.activeAmount = opts.activeAmount || 0;
}

// statuses -> initialized,created, in_use, closed

module.exports = RoomData;