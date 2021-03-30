import { io } from "socket.io-client";

//server url
const URL = "http://localhost:3100";
const socket = io(URL, { autoConnect: false });

socket.onAny((event, ...args) => {
  console.log(event, args);
});

export default socket;