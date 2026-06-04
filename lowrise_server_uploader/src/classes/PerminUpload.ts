import logger from "../config/logger";
import ResponseHandler from "../middleware/responseHandler";
import config from "../config/config";
import fsExtra from "fs-extra";
import path from "path";

const lineByLine      = require('n-readlines');
const fs              = require('fs');
var rp 				  = require('request-promise');

export default class PerminUpload{
	to: any;
	directory: string;
	
	node_token: string;
	URL: string;

	constructor(node_token: string){
		this.node_token = node_token;
		
		this.directory = config.UPLOAD_STORAGE_DIR+config.LOGS_PER_MIN_DIR+"/";
		this.URL 		= config.URL_PERMIN;

		if (config.UPLOAD_PERMIN) {
			console.log("UPLOADING PERMIN ENABLE");
			this.uploadFiles();
		}else{
			console.log("UPLOADING PERMIN DISABLED");
		}
		
	}

	startUploadTO(){
		this.to = setTimeout(() => {
			this.uploadFiles();
		}, config.PERMIN*1000);
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
		        logger.debug('Unable to scan permin directory: ' + err);
	 			return false;
		    } 	

		    files.sort();

		    let filesLen = files.length;

		    if (filesLen) {

		    	let filePath = this.directory+files[0];

				var options = {
				    method: 'POST',
				    uri: this.URL,
				    formData: {
				    	node_token: this.node_token,
				        
				        file: {
				            value: fs.createReadStream(filePath),
				            options: {
				                //filename: 'test.jpg',
				                // contentType: 'image/jpg'
				            }
				        }
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
				  			
			  			fs.unlink(filePath, (err: any) => {
			              if (err) { logger.error("Error unlinking permin upload"+err); }
			            	
			              this.execStopStartTO();

			            });
			  		}else{
			  			this.execStopStartTO(); 	
			  		} 		

				}).catch((err : any) => {
					logger.error("ERROR UPLOADING PERMIN "+err);

					this.execStopStartTO();	
				});
				
		    }else{
		    	
		    	this.execStopStartTO();
		    }
	    
		});
	}
	

}