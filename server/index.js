const config = require('../config/config');
const SocketConnection = require('../storage/models/socket-connection');

const storageHelper = require('../storage/helper');
const helper = require("../app/helpers");
const { info } = require('console');

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
                            OldConnectionEndedAlert(socket);
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

                //user avatar for new connection
                let avatarName = helper.getARandomAvatarName();

                let newConnection = new SocketConnection(
                    {
                        user_name: userName,
                        connection_id: connectionId,
                        avatar_name: avatarName
                    }
                );
                connectionsPool.add(newConnection);
            }

            storageHelper.storeAKey("connections-pool", new Set(connectionsPool));

            //broadcast to all the clients
            broadcastConnectionsPoolUpdate(connectionsPool);

            socket.on("logout", (data) => {
                connectionsPool.forEach(function (data) {

                    if (data.user_name === userName) {
                        io.sockets.sockets.forEach((socket) => {
                            // If given socket id is exist in list of all sockets, kill it
                            if (socket.id === data.connection_id) {
                                socket.disconnect(true);
                            }
                        });

                        //remove the current connection from the connection pool
                        connectionsPool.delete(data);
                        return;
                    }
                });

                //broadcast to all the clients
                broadcastConnectionsPoolUpdate(connectionsPool);
            });
        } else {
            console.log("user name is not found in the user names list");
            socket.emit("disconnected-forever", "Bye");

            socket.disconnect(true);

            connectionsPool = storageHelper.get("connections-pool");

            //broadcast to all the clients
            broadcastConnectionsPoolUpdate(connectionsPool);
        }

    });

    function broadcastConnectionsPoolUpdate(updatedConnectionPool) {
        io.sockets.emit("connection-pool-update", { pool: Array.from(updatedConnectionPool) });
    }

    function OldConnectionEndedAlert(socket) {
        socket.emit("old-connection-alert", { value: true, message: "" });
    }

    //middleware for validate user name
    io.use((socket, next) => {
        const username = socket.handshake.auth.username;

        if (!username || typeof username === 'undefined') {
            console.log("user name not found");
            // socket.disconnect();
            return next(new Error("invalid username"));
        }
        socket.username = username;
        next();
    });

    httpServer.listen(config.server_port);
}

module.exports = server;