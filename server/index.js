const config = require('../config/config');

const server = () => {
    console.log("server init started");

    const httpServer = require("http").createServer();
    const io = require("socket.io")(httpServer, {
        cors: {
            origin: "http://localhost:3000",
        },
    });

    io.on("connection", (socket) => {
        console.log("new connection occurred " + socket.id);
    });

    //middleware for validate user name
    io.use((socket, next) => {
        const username = socket.handshake.auth.username;

        console.log("middelware started server index "+username);

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