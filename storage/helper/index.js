const storageClient = require('../../storage');

module.exports = {
    testFunc() {
        console.log("it owkred fine");
    },
    storeAKey(key, value) {
        console.log("save a key started");
        let cacheClient = storageClient.getClient();

        success = cacheClient.set(key, value);
        return success;
    },
    storeMultipleKeys(keyValuesSet) {
        // keys -> [
        //     {key: "myKey", val: obj, ttl: 10000},
        //     {key: "myKey2", val: obj2},
        // ]
        const success = myCache.mset(keyValuesSet)
        return success;
    },
    get(key) {
        value = myCache.get(key);
        if (value != undefined) {
            return value;
        }
        return null;
    },
    getAllKeys() {
        mykeys = myCache.keys();
        console.log(mykeys);
        return mykeys;
    },
    flushAll() {
        if (myCache) {
            myCache.flushAll();
        }
    }
}