import logger from "../config/logger";
import ResponseHandler from "../middleware/responseHandler";
import config from "../config/config";
import fsExtra from "fs-extra";
import path from "path";


const lineByLine      = require('n-readlines');
const fs              = require('fs');
var rp 				  = require('request-promise');


export default class EventMaxUpload{

	to: any;
	directory: string;

	node_token: string;
	URL: string;

	constructor(node_token: string){
		this.node_token = node_token;

		this.directory = config.UPLOAD_STORAGE_DIR+config.LOGS_EVENT_MAX_DIR+"/";
		this.URL 	   = config.URL_EVENT_MAX;

		if (config.UPLOAD_EVENT_MAX) {
			console.log("UPLOADING EventMaxUpload ENABLE");
			this.uploadFiles();
		}else{
			console.log("UPLOADING EventMaxUpload DISABLED");
		}

	}

	startUploadTO(){
		this.to = setTimeout(() => {
			this.uploadFiles();
		}, 50000);
	}

	stopUploadTO(){
		if (this.to) {
			clearTimeout(this.to);
		}
	}

	execStopStartTO(){
		this.stopUploadTO();
		this.startUploadTO();
	}

	uploadFiles(){
		fs.readdir(this.directory, (err: any, files: any) =>{
		    if (err) {
	            this.execStopStartTO();
		        logger.debug('Unable to scan event max directory: ' + err);
	 			return false;
		    }

		    files.sort();

		    let filesLen = files.length;

		    if (filesLen) {

		    	let filePath = this.directory+files[0];

				var options = {
				    method: 'POST',
				    uri: config.URL_EVENT_MAX,

				    formData: {
				    	node_token: config.TOKEN,
				        eventId: files[0].replace('.log', ''),
				        file: {
				            value: fs.createReadStream(filePath),
				            options: {
				                //filename: 'test.jpg',
				                // contentType: 'image/jpg'
				            }
				        }
				    },
				    headers: {
				         'content-type': 'multipart/form-data'  // Is set automatically
				    },
				    resolveWithFullResponse: true,
				    json: true,
				    timeout: 10000
				};

				rp(options).then((res:any) => {

					console.log(res.body);

					if (res.statusCode == 200) {

			            //CREATE UPLOADED DIR FIRST
						let uploadedEventMaxDir = config.UPLOAD_STORAGE_DIR+config.LOGS_UPLOADED_EVENT_MAX_DIR+"/";

						fs.mkdir(uploadedEventMaxDir, { recursive: true }, (err: any) => {
					  		if (err) {
					  			logger.debug('ERROR cant create uploadedMaxDir ' + err);
								this.execStopStartTO();
					  		}

					 		fsExtra.move(filePath, uploadedEventMaxDir + files[0], { overwrite: true }, (err: any) => {

				     			if (err) logger.debug('ERROR cant create uploadedDir ' + err);

				     			this.execStopStartTO();
				      		});
					  	});

			  		}else{
			  			this.execStopStartTO();
			  		}

				}).catch((err : any) => {
					logger.error("ERROR UPLOADING EVENT MAX "+err);

					this.execStopStartTO();
				});

		    }else{

		    	this.execStopStartTO();
		    }

		});
	}

}
