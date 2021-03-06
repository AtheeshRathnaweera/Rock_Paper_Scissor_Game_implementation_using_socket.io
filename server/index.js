const config = require('../config/config');
const SocketConnection = require('../storage/models/socket-connection');

const storageHelper = require('../storage/helper');
const helper = require("../app/helpers");
const Challenges = require('../storage/models/challenges');
const ActiveGameData = require('../storage/models/active-game-data');

const { v4: uuidv4 } = require('uuid');
const RoomData = require('../storage/models/room-data');
const e = require('express');

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
                        active_game: null,
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

            socket.on("challenge-response", (data) => {
                console.log("accept the challenge started " + JSON.stringify(data));
                handleTheGameRequestResponse(socket, data.response, data.target_user_name, data.requester_user_name);
            });

            socket.on("join-game", (data) => {
                joinToGameRoom(socket, data.user_name, data.opponent_user_name);
            });

            socket.on("disconnect", (reason) => {
                //trigger when the client is disconnected
                console.log("some one is disconnected " + reason + " " + socket.id);
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

        requestCallBackData = {
            status: null,
            target_username: null,
            message: null
        };

        for (let i = 0; i < connectionsPoolArray.length; i++) {
            let conn = connectionsPoolArray[i];

            if (targetConnIndex === null || requesterConnIndex === null) {

                if (targetConnIndex === null && conn.user_name === targetUserName) {
                    targetConnIndex = i;
                } else if (requesterConnIndex === null && conn.user_name === requesterUserName) {
                    requesterConnIndex = i;
                }
            } else {
                console.log("both the data is not null");
                break;
            }
        }

        if (requesterConnIndex !== null && targetConnIndex !== null) {
            let requestConnData = connectionsPoolArray[requesterConnIndex];
            let targetConnData = connectionsPoolArray[targetConnIndex];

            let challengesAmountValidation = requestConnData.challenges.sent.length <= 10 && targetConnData.challenges.received.length <= 5;

            if (challengesAmountValidation && (requestConnData.active_game === null && targetConnData.active_game === null)) {

                connectionsPoolArray[requesterConnIndex].challenges.sent.push(targetUserName);
                connectionsPoolArray[targetConnIndex].challenges.received.push(requesterUserName);

                requestCallBackData.status = "success";
                requestCallBackData.target_username = targetUserName;
                requestCallBackData.message = "You challenged to " + targetUserName + " !";

                storageHelper.storeAKey("connections-pool", new Set(connectionsPool));

                //send the requests to target
                io.to(targetConnData.connection_id).emit('challenge-request',
                    {
                        challenger: {
                            user_name: requesterUserName
                        }
                    });
            } else {
                requestCallBackData.status = "failed";

                //customize the error messages
                if (!challengesAmountValidation) {
                    requestCallBackData.message = "Maximum challenge request amount is exceeded. Please try again later !"
                } else if (requestConnData.active_game !== null) {
                    requestCallBackData.message = "Another game is in progress. Please end the current game to challenge again !"
                } else if (targetConnData.active_game !== null) {
                    requestCallBackData.message = "User is in another game. Please try again later !"
                } else {
                    requestCallBackData.message = "Unexpected error occurred. Please try again later !"
                }
            }

        } else {
            requestCallBackData.status = "error";
            requestCallBackData.message = "Unexpected error occurred !";
        }

        //send call back to requester
        socket.emit("challenge-request-callback", requestCallBackData);
    }

    function handleTheGameRequestResponse(socket, responseType, targetUserName, requesterUserName) {
        console.log("accept game request handler started " + targetUserName + " " + requesterUserName);

        connectionsPool = storageHelper.get("connections-pool");
        connectionsPoolArray = Array.from(connectionsPool);

        targetConnIndex = null;
        requesterConnIndex = null;

        responseCallbackData = {
            target_user: {
                name: targetUserName,
                message: ""
            },
            requester_user: {
                name: requesterUserName,
                message: ""
            },
            status: null,
            updated_conn_data: null
        };

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

        if (targetConnIndex === null || requesterConnIndex === null) {
            responseCallbackData.target_user.message = "This action cannot be completed ! Please try again later.";
            responseCallbackData.requester_user.message = "Challenge request failed ! Please try again later.";
            responseCallbackData.status = "failed";
        } else {

            if (connectionsPoolArray[targetConnIndex].active_game || connectionsPoolArray[requesterConnIndex].active_game) {
                //avoid the target from accepting other challanges when another active game is exist
                responseType = "unknown";
            }

            switch (responseType) {
                case "accept":
                    console.log("accept challenge request received");

                    //create a new room name
                    let room_name = "room-" + uuidv4();

                    let rooms = storageHelper.get("rooms");

                    //store the new room data to rooms set
                    let newRoomData = new RoomData({
                        name: room_name,
                        status: "initialized",
                        clients: [requesterUserName, targetUserName],
                        activeAmount: 0
                    });

                    rooms.add(newRoomData);
                    storageHelper.storeAKey("rooms", new Set(rooms));
                    //store the new room data to rooms set

                    // add active game data for the requester and the target
                    activeGameData = new ActiveGameData({
                        role: null,
                        requester: requesterUserName,
                        target: targetUserName,
                        status: "pending",
                        room_name: room_name
                    });

                    // deep copying to different new objects
                    activeGameDataRequester = JSON.parse(JSON.stringify(activeGameData));
                    activeGameDataRequester.role = "requester";

                    activeGameDataTarget = JSON.parse(JSON.stringify(activeGameData));
                    activeGameDataTarget.role = "target";

                    connectionsPoolArray[targetConnIndex].active_game = activeGameDataTarget;
                    connectionsPoolArray[requesterConnIndex].active_game = activeGameDataRequester;

                    // data will updated in the bottom if
                    responseCallbackData.target_user.message = "Challenge accepted successfully !";
                    responseCallbackData.requester_user.message = targetUserName + " accepted your challenge !";
                    responseCallbackData.status = "accept";
                    break;
                case "reject":
                    console.log("reject challenge request received");

                    responseCallbackData.target_user.message = "Challenge rejected successfully !";
                    responseCallbackData.requester_user.message = targetUserName + " reject your challenge !";
                    responseCallbackData.status = "reject";
                    break;
                case "unknown":
                    responseCallbackData.target_user.message = "User is in another game. Please try again later !";
                    responseCallbackData.requester_user.message = "User is in another game. Please try again later !";
                    responseCallbackData.status = "unknown";
                    break;
                default:
                    console.log("unknown challenge reponse type received");

                    responseCallbackData.target_user.message = "Unexpected error occurred ! Please try again later !";
                    responseCallbackData.requester_user.message = "Unexpected error occurred ! Please try again later !";
                    responseCallbackData.status = "default";
            }

            if (responseType === "accept" || responseType === "reject") {
                let requesterIndex = connectionsPoolArray[targetConnIndex].challenges.received.indexOf(requesterUserName);
                let targetIndex = connectionsPoolArray[requesterConnIndex].challenges.sent.indexOf(targetUserName);

                connectionsPoolArray[targetConnIndex].challenges.received.splice(requesterIndex, 1);
                connectionsPoolArray[requesterConnIndex].challenges.sent.splice(targetIndex, 1);

                storageHelper.storeAKey("connections-pool", new Set(connectionsPool));
            }
        }

        //send the response message to the target client and requester
        responseCallbackData.updated_conn_data = connectionsPoolArray[targetConnIndex];
        socket.emit("challenge-response-callback", responseCallbackData);

        if (requesterConnIndex !== null) {
            let requesterConnData = connectionsPoolArray[requesterConnIndex];

            responseCallbackData.updated_conn_data = requesterConnData;
            io.to(requesterConnData.connection_id).emit("challenge-response-callback", responseCallbackData);
        }
    }

    function joinToGameRoom(socket, userName, opponentUserName) {
        console.log("join to game room started "+userName+" "+opponentUserName);

        connectionsPool = storageHelper.get("connections-pool");
        connectionsPoolArray = Array.from(connectionsPool);

        let status = false;
        let message = "";

        let userIndex = null;
        let opponentIndex = null;

        for (let i = 0; i < connectionsPoolArray.length; i++) {

            if (connectionsPoolArray[i].user_name === userName) {
                userIndex = i;
            } else if (connectionsPoolArray[i].user_name === opponentUserName) {
                opponentIndex = i;
            }

            if (userIndex !== null && opponentIndex !== null) {
                break;
            }
        }

        if (userIndex !== null && opponentIndex !== null) {
            let conn = connectionsPoolArray[userIndex];

            let rooms = storageHelper.get("rooms");
            let roomsArray = Array.from(rooms);

            let roomIndex = null;

            for (let n = 0; n < roomsArray.length; n++) {
                if (roomsArray[n].name === conn.active_game.room_name) {
                    roomIndex = n;
                    break;
                }
            }

            if (roomIndex === null) {
                status = "error";
                message = "Cannot connect to the requested game ! Please try again later.";
                socket.emit("join-to-game-response", { "status": status, "message": message });
                return;
            }

            if (conn.active_game.status !== "pending") {
                status = "error";
                message = "Already in the game !";
                socket.emit("join-to-game-response", { "status": status, "message": message });
                return;
            }

            if (roomsArray[roomIndex].clients.includes(userName)) {
                //join to the room
                socket.join(conn.active_game.room_name);

                status = "success";
                message = "Successfully joined to the game !";
                messageForOpponent = userName + " joined to the game !";

                let gameStatus = null;

                // update rooms data
                roomsArray[roomIndex].activeAmount = roomsArray[roomIndex].activeAmount + 1;

                if (roomsArray[roomIndex].activeAmount === 2) {
                    console.log("room is ready and full");
                    gameStatus = "ready";

                    roomsArray[roomIndex].status = "in_use";
                    connectionsPoolArray[userIndex].active_game.status = "started";
                } else {
                    gameStatus = "waiting";

                    roomsArray[roomIndex].status = "created";
                    connectionsPoolArray[userIndex].active_game.status = "waiting";

                    // send the notification for other user
                }

                storageHelper.storeAKey("rooms", new Set(roomsArray));
                storageHelper.storeAKey("connections-pool", new Set(connectionsPool));

                socket.emit("join-to-game-response",
                    { "status": status, "message": message, "game_status": gameStatus });
                io.to(connectionsPoolArray[opponentIndex].connection_id).emit("join-to-game-response",
                    { "status": status, "message": messageForOpponent, "game_status": gameStatus });

                // trigger someone join event
                io.to(conn.active_game.room_name).emit("someone-joined-to-room",
                    { "game_status": gameStatus, "user_name": userName });
            } else {
                status = "error";
                message = "Permission issue occurred ! Please try again later.";
                socket.emit("join-to-game-response", { "status": status, "message": message });
            }
        } else {
            status = "error";
            message = "User data not found ! Please try again later.";
            socket.emit("join-to-game-response", { "status": status, "message": message });
        }

    }

    io.of("/").adapter.on("join-room", (room, id) => {
        console.log(`------------ socket ${id} has joined room ${room}`);
        io.to(room).emit("join-to-room-trigger", {});
    });

    io.of("/").adapter.on("create-room", (room) => {
        console.log(`room ${room} was created`);
    });

    io.of("/").adapter.on("leave-room", (room, id) => {
        console.log(`${id} is leaved the ${room}`);
    });

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