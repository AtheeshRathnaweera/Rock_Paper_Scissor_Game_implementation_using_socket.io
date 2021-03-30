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
        console.log("new connection occurred "+socket);
    });

    httpServer.listen(config.server_port);
}

module.exports = server;