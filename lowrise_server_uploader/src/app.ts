import express, {Application} from "express";

class App {

	public app: Application;

	constructor() {

		this.app = express();

		let server = require("http").Server(this.app);
		let io 	   = require("socket.io")(server);

		this.app.set("server", server);
		this.app.set("socketio", io);
	}

}

export default new App().app;