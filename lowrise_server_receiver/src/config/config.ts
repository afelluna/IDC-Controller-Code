import * as dotenv from "dotenv";
import {machineId, machineIdSync} from 'node-machine-id';

let id = machineIdSync();
console.log(id);

dotenv.config();

interface IDBConfig{
	host: string;
	port: number;
	name: string;
	username: string;
	password: string;
}

interface IConfig{
	DB: any;
	PORT: number;
	HOST: string;
	ENV: string;
	TEMPFILE: string;
	UPLOAD_STORAGE_DIR: string;
	LOGS_DIR: string;
	LOGS_EVENT_DIR: string;
	LOGS_UPLOADED_EVENT_DIR: string;
	LOGS_PER_MIN_DIR: string;
	LOGS_FIRST_ALARM_DIR: string;
	LOGS_EVENT_MAX_DIR: string;
	LOGS_UPLOADED_EVENT_MAX_DIR: string;

	STORAGE: boolean;
	MONTH_TO_DELETE: number;
	EMPTY_DIR: boolean;

	MACHINE_ID: string;
	
	GPIO:{
		buzz: string,
		green: string,
		yellow: string,
		red: string,
		btn1: string,
		btn2: string,
		btn3: string,
		relais_1: string,
		relais_trigger: string
	}

}

const env = process.env.NODE_ENV || 'development';

const dev: IDBConfig = {
	host: process.env.DEV_DB_HOST || 'localhost',
	port: parseInt(process.env.DEV_DB_PORT as string) || 27017,
	name: process.env.DEV_DB_DATABASE || 'database',
	username: process.env.DEV_DB_USERNAME || 'root',
	password: process.env.DEV_DB_PASSWORD || ''
 	
};

const test: IDBConfig = {
	host: process.env.TEST_DB_HOST || 'localhost',
	port: parseInt(process.env.TEST_DB_PORT as string) || 27017,
	name: process.env.TEST_DB_DATABASE || 'test_database',
	username: process.env.TEST_DB_USERNAME || 'root',
	password: process.env.TEST_DB_PASSWORD || ''
 	
};

const prod: IDBConfig = {
	host: process.env.PROD_DB_HOST || 'localhost',
	port: parseInt(process.env.PROD_DB_PORT as string) || 27017,
	name: process.env.PROD_DB_DATABASE || 'database',
	username: process.env.PROD_DB_USERNAME || 'root',
	password: process.env.PROD_DB_PASSWORD || ''
};

const config: IConfig = {
	DB: env == 'development' ? dev : env == 'testing' ? test : env == 'production' ? prod : {},
	PORT: parseInt(process.env.APP_PORT as string),
	HOST: process.env.APP_HOST as string,
	ENV: env,
	TEMPFILE: process.env.TEMPFILE as string,
	UPLOAD_STORAGE_DIR: process.env.UPLOAD_STORAGE_DIR as string,
	LOGS_UPLOADED_EVENT_DIR: process.env.LOGS_UPLOADED_EVENT_DIR as string,
	LOGS_EVENT_DIR: process.env.LOGS_EVENT_DIR as string,
	LOGS_FIRST_ALARM_DIR: process.env.LOGS_FIRST_ALARM_DIR as string,
	LOGS_PER_MIN_DIR: process.env.LOGS_PER_MIN_DIR as string,
	LOGS_DIR: process.env.LOGS_DIR as string,
	LOGS_EVENT_MAX_DIR: process.env.LOGS_EVENT_MAX_DIR as string,
	LOGS_UPLOADED_EVENT_MAX_DIR: process.env.LOGS_UPLOADED_EVENT_MAX_DIR as string,
	STORAGE: (process.env.STORAGE as string === "true"),
	EMPTY_DIR: (process.env.EMPTY_DIR as string === "true"),
	MACHINE_ID: id,
	MONTH_TO_DELETE: parseInt(process.env.MONTH_TO_DELETE as string),
	GPIO:{
		buzz: process.env.BUZZ_GPIO as string,
		green: process.env.GREEN_GPIO as string,
		yellow: process.env.YELLOW_GPIO as string,
		red: process.env.RED_GPIO as string,
		btn1: process.env.BTN1_GPIO as string,
		btn2: process.env.BTN2_GPIO as string,
		btn3: process.env.BTN3_GPIO as string,
		
		relais_1: process.env.RELAIS_1_GPIO as string,
		relais_trigger: process.env.RELAI_TRIGGER as string,
	}

};

export default config;