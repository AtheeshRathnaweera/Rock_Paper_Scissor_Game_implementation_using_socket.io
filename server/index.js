const config = require('../config/config');
const SocketConnection = require('../storage/models/socket-connection');

const storageHelper = require('../storage/helper');
const helper = require("../app/helpers");
const Challenges = require('../storage/models/challenges');

const server = () => {
    console.log("server init started");

    const httpServer = require("http").createServer();
    const io = require("socket.io")(httpServer, {
        cors: {
            origin: "http://localhost:3000",
        },
    });

    io.on("connection", (socket) => {
        let userName = socket.handshake.query.user_name;

        userNamesSet = storageHelper.get("user-names-list");

        if (userNamesSet.has(userName)) {
            let connectionId = socket.id;

            console.log("new connection occurred " + socket.id + " query : " + JSON.stringify(socket.handshake.query));

            connectionsPool = storageHelper.get("connections-pool");

            let existFound = null;
            let connData = null;

            connectionsPool.forEach(function (data) {

                if (data.user_name === userName) {

                    io.sockets.sockets.forEach((socket) => {
                        // If given socket id is exist in list of all sockets, kill it
                        if (socket.id === data.connection_id) {
                            OldConnectionEndedAlert(socket);
                            socket.disconnect(true);
                        }
                    });

                    data.connection_id = connectionId;

                    existFound = true;
                    connData = data;
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
                        avatar_name: avatarName,
                        challenge_requests: new Challenges(),
                        in_game: false,
                        played_amount: 0,
                        win_amount: 0
                    }
                );
                connectionsPool.add(newConnection);
                connData = newConnection;
            }

            storageHelper.storeAKey("connections-pool", new Set(connectionsPool));

            welcome(socket, connData);
            //broadcast to all the clients
            broadcastConnectionsPoolUpdate(connectionsPool);

            //define the events for the socket
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

            socket.on("challenge", (data) => {
                sendTheGameRequest(socket, data.target_user_name, data.requester_user_name);
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

    function welcome(socket, connectionData) {
        socket.emit("greetings", { msg: "Welcome !", data: connectionData });
    }

    function broadcastConnectionsPoolUpdate(updatedConnectionPool) {
        io.sockets.emit("connection-pool-update", { pool: Array.from(updatedConnectionPool) });
        console.log("connection pool update brodcasted");
    }

    function OldConnectionEndedAlert(socket) {
        socket.emit("old-connection-alert", { value: true, message: "" });
    }

    function sendTheGameRequest(socket, targetUserName, requesterUserName) {

        //get the current connection pool
        connectionsPool = storageHelper.get("connections-pool");
        connectionsPoolArray = Array.from(connectionsPool);

        targetConnIndex = null;
        requesterConnIndex = null;

        requestCallBackData = {};

        for (let i = 0; i < connectionsPoolArray.length; i++) {
            let conn = connectionsPoolArray[i];

            if (targetConnIndex === null || requesterConnIndex === null) {

                if (targetConnIndex === null && conn.user_name === targetUserName) {
                    console.log("target index is found");
                    targetConnIndex = i;
                } else if (requesterConnIndex === null && conn.user_name === requesterUserName) {
                    console.log("requester index found");
                    requesterConnIndex = i;
                }
            } else {
                console.log("both the data is not null");
                break;
            }
        }

        if (requesterConnIndex !== null) {
            let requestConnData = connectionsPoolArray[requesterConnIndex];

            if (requestConnData.challenges.sent.length <= 10) {
                connectionsPoolArray[requesterConnIndex].challenges.sent.push(targetUserName);
            } else {
                console.log("maximum sent requests amount is exceeded");
                requestCallBackData = { status: "failed" };
            }
        }

        if (targetConnIndex !== null) {
            let targetConnData = connectionsPoolArray[targetConnIndex];

            if (targetConnData.challenges.received.length <= 5) {
                console.log("challenge request send to " + requesterUserName + " to " + targetUserName);

                socket.broadcast.to(targetConnData.connection_id).emit('challenge-request',
                    {
                        challenger: {
                            user_name: requesterUserName
                        }
                    });

                //update the target user challenge requests set
                connectionsPoolArray[targetConnIndex].challenges.received.push(requesterUserName);

                requestCallBackData = { status: "success" };
            } else {
                requestCallBackData = { status: "failed" };
            }
        }

        if (requesterConnIndex !== null && targetConnIndex !== null) {
            if (requestCallBackData.status === "success") {
                storageHelper.storeAKey("connections-pool", new Set(connectionsPool));
            }
        } else {
            requestCallBackData = { status: "error" };
        }

        //send call back to requester
        requestCallBackData["target_username"] = targetUserName;
        socket.emit("challenge-request-callback", requestCallBackData);
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