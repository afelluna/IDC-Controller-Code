import logger from "../config/logger";
import ResponseHandler from "../middleware/responseHandler";
import config from "../config/config";
import fsExtra from "fs-extra";
import path from "path";

const lineByLine      = require('n-readlines');
const fs              = require('fs');
var rp 				  = require('request-promise');

export default class FirstAlarmUpload{
	to: any;
	directory: string;
	
	node_token: string;
	URL: string;

	constructor(node_token: string){
		this.node_token = node_token;
		
		this.directory 	= config.UPLOAD_STORAGE_DIR+config.LOGS_FIRST_ALARM_DIR+"/";
		this.URL 		= config.URL_FIRSTALARM;

		if (config.UPLOAD_FIRSTALARM) {
			console.log("UPLOADING FIRSTALARM ENABLE");
			this.uploadFiles();
		}else{
			console.log("UPLOADING FIRSTALARM DISABLED");
		}
		
	}

	startUploadTO(){
		this.to = setTimeout(() => {
			this.uploadFiles();
		}, 5000);
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
		        logger.debug('Unable to scan first alarm directory: ' + err);
	 			return false;
		    } 	

		    files.sort();

		    let filesLen = files.length;

		    if (filesLen) {

		   		let filePath = this.directory+ files[0];

				var options = {
				    method: 'POST',
				    uri: this.URL,
				    formData: {
				    	node_token: this.node_token,
				        eventId: files[0]
				    },
				    //json: true,
				    headers: {
				         'content-type': 'multipart/form-data'  // Is set automatically
				    },
				    resolveWithFullResponse: true,
				    json: true 
				};
				 
				rp(options).then((res:any) => {

					console.log(res.body);

					if (res.statusCode == 200) {
				  		fsExtra.remove(filePath);	
				  		this.execStopStartTO();
			  			
			  		}else{
			  			this.execStopStartTO(); 	
			  		} 		

				}).catch((err : any) => {
					logger.error("ERROR UPLOADING FIRST ALARM"+err);

					this.execStopStartTO();	
				});
				
		    }else{
		    	
		    	this.execStopStartTO();
		    }
	    
		});
	}
	

}