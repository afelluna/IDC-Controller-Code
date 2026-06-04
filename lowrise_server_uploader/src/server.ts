import app from "./app";
import config from "./config/config";

import PerminUpload from "./classes/PerminUpload";

import EventUpload from "./classes/EventUpload";

import FirstAlarmUpload from "./classes/FirstAlarmUpload";
import EventMaxUpload from "./classes/EventMaxUpload";

import Database from "./database/mysqldatabase";

const db = new Database();

new PerminUpload(config.TOKEN);
//new EventUpload(config.TOKEN);
new FirstAlarmUpload(config.TOKEN);
new EventMaxUpload(config.TOKEN);

const io = app.get('socketio');
const server = app.get('server');

server.listen(config.PORT, () => {
	console.log("Server Running on "+config.HOST+" port "+config.PORT);
	console.log("Environment "+config.ENV+" mode");
})