import app from "./app";
import config from "./config/config";

import { useSocketServer } from "socket-controllers";

import { SocketEventController } from "./controllers/SocketEventController";

import WatchFileDir from "./classes/WatchFileDir";
let watchDir = new WatchFileDir(app);

import ClearHistory from "./classes/ClearHistory";

const io = app.get('socketio');
const server = app.get('server');

new ClearHistory();

server.listen(config.PORT, () => {
	console.log("Server Running on "+config.HOST+" port "+config.PORT);
	console.log("Environment "+config.ENV+" mode");

	//console.log();
})

useSocketServer(io, {
    controllers: [SocketEventController]
});


