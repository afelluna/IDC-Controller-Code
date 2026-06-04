import * as dotenv from "dotenv";

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
	UPLOAD_STORAGE_DIR: string;
	LOGS_DIR: string;
	LOGS_EVENT_DIR: string;
	LOGS_UPLOADED_EVENT_DIR: string;
	LOGS_PER_MIN_DIR: string;
	LOGS_FIRST_ALARM_DIR: string;
	LOGS_EVENT_MAX_DIR: string;
	LOGS_UPLOADED_EVENT_MAX_DIR: string;

	UPLOAD_FIRSTALARM: boolean;
	UPLOAD_PERMIN: boolean;
	UPLOAD_EVENT: boolean;
	UPLOAD_EVENT_MAX: boolean;

	URL_FIRSTALARM: string;
	URL_PERMIN: string;
	URL_EVENT: string;
	URL_EVENT_MAX: string;

	TOKEN: string;
	PERMIN: number;
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
	UPLOAD_STORAGE_DIR: process.env.UPLOAD_STORAGE_DIR as string,

	LOGS_FIRST_ALARM_DIR: process.env.LOGS_FIRST_ALARM_DIR as string,
	LOGS_DIR: process.env.LOGS_DIR as string,
	LOGS_EVENT_DIR: process.env.LOGS_EVENT_DIR as string,
	LOGS_UPLOADED_EVENT_DIR: process.env.LOGS_UPLOADED_EVENT_DIR as string,
	LOGS_PER_MIN_DIR: process.env.LOGS_PER_MIN_DIR as string,
	LOGS_EVENT_MAX_DIR: process.env.LOGS_EVENT_MAX_DIR as string,
	LOGS_UPLOADED_EVENT_MAX_DIR: process.env.LOGS_UPLOADED_EVENT_MAX_DIR as string,

	URL_FIRSTALARM: (process.env.URL_FIRSTALARM as string),
	URL_PERMIN: (process.env.URL_PERMIN as string),
	URL_EVENT: (process.env.URL_EVENT as string),
	URL_EVENT_MAX: (process.env.URL_EVENT_MAX as string),

	UPLOAD_FIRSTALARM: (process.env.UPLOAD_FIRSTALARM as string === "true"),
	UPLOAD_PERMIN: (process.env.UPLOAD_PERMIN as string === "true"),
	UPLOAD_EVENT: (process.env.UPLOAD_EVENT as string === "true"),
	UPLOAD_EVENT_MAX: (process.env.UPLOAD_EVENT_MAX as string == "true"),
	
	TOKEN: (process.env.TOKEN as string),
	PERMIN:  parseInt(process.env.PERMIN as string),

};

export default config;