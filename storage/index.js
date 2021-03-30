const NodeCache = require("node-cache");
myCache = null;


module.exports = {
    createClient(){
        myCache = new NodeCache({ stdTTL: 0, checkperiod: 0 });
    },
    getClient() {
        return myCache;
    }
}
