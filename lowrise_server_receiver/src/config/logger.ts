import { createLogger, transports, format } from "winston";
import config from "./config";


const msgFormat = format.combine(format.timestamp(), format.json());

const logConfigFile = {
	'transports': [
		new transports.File({
			filename: 'logs/info-log.log',
			level: "info",
			format: msgFormat
		}),
		new transports.File({
			filename: 'logs/debug-log.log',
			level: "debug",
			format: msgFormat
		}),
		new transports.File({
			filename: 'logs/error-log.log',
			level: "error",
			format: msgFormat
		})
	]
}

const logConfigConsole = {
	'transports': [
		new transports.Console({
			level: "info",
			format: msgFormat
		}),
		new transports.Console({
			level: "debug",
			format: msgFormat
		}),
		new transports.Console({
			level: "error",
			format: msgFormat
		})
	]
}


const logConfig = config.ENV == "development" ? logConfigConsole : logConfigFile

const logger = createLogger(logConfig);

export default logger;