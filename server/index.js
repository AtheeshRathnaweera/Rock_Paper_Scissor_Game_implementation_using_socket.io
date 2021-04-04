const config = require('../config/config');
const Connection = require('../storage/models/connection');

const storageHelper = require('../storage/helper');

const server = () => {
    console.log("server init started");
    let newSocket = null;

    const httpServer = require("http").createServer();
    const io = require("socket.io")(httpServer, {
        cors: {
            origin: "http://localhost:3000",
        },
    });

    io.on("connection", (socket) => {
        let userName = socket.handshake.query.user_name;

        userNamesSet = storageHelper.get("user-names-list");

        newSocket = socket;

        if (userNamesSet.has(userName)) {
            let connectionId = socket.id;

            // JSON.stringify(socket.handshake.query)

            console.log("new connection occurred " + socket.id + " query : " + JSON.stringify(socket.handshake.query));
            socket.emit("greetings", "Welcome ! ");

            connectionsPool = storageHelper.get("connections-pool");

            let existFound = null;

            console.log("connection pool size : " + connectionsPool.size);

            connectionsPool.forEach(function (data) {

                if (data.user_name === userName) {

                    io.sockets.sockets.forEach((socket) => {
                        // If given socket id is exist in list of all sockets, kill it
                        if (socket.id === data.connection_id) {
                            console.log("old connection ended");
                            socket.disconnect(true);
                        }
                    });

                    console.log("exist connection is updated");
                    data.connection_id = connectionId;

                    existFound = true;

                    console.log("after update : " + JSON.stringify(data));
                    return;
                }
            });

            if (!existFound) {
                console.log("new connection entry added to the pool");
                let newConnection = new Connection({ user_name: userName, connection_id: connectionId });
                connectionsPool.add(newConnection);
            }

            storageHelper.storeAKey("connections-pool", new Set(connectionsPool));

            socket.on("reconnected", (newSocketId) => {
                console.log("reconnected : " + newSocketId);
            });
        } else {
            console.log("user name is not found in the user names list");
            socket.disconnect();
        }

    });

    //middleware for validate user name
    io.use((socket, next) => {
        const username = socket.handshake.auth.username;

        if (!username || typeof username === 'undefined') {
            console.log("user name not found");
            return next(new Error("invalid username"));
        }
        socket.username = username;
        next();
    });

    httpServer.listen(config.server_port);
}

module.exports = server;