import logger from "../config/logger";
import ResponseHandler from "../middleware/responseHandler";
import config from "../config/config";
import fsExtra from "fs-extra";
import path from "path";

const lineByLine      = require('n-readlines');
const fs              = require('fs');
var rp 				  = require('request-promise');

export default class EventUpload{
	to: any;
	directory: string;
	node_token: string;
	URL: string;

	constructor(node_token: string){
		this.node_token = node_token;
		this.directory = config.UPLOAD_STORAGE_DIR+config.LOGS_EVENT_DIR+"/";
		this.URL = config.URL_EVENT;
		
		if (config.UPLOAD_EVENT) {
			console.log("UPLOADING EVENT ENABLE");
			this.uploadFiles();
		}else{
			console.log("UPLOADING EVENT DISABLED");
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

	createRequest(eventIdDir: string, filePath: string){
		var options = {
		    method: 'POST',
		    uri: this.URL,
		    formData: {
		    	node_token: this.node_token,
		        eventId: eventIdDir,
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
		};
		 
		return rp(options);

	}

	uploadFiles(){	

		// READ EVENT DIRETORY
		fs.readdir(this.directory, (err: any, files: any) =>{
		    if (err) {
		    	//IFF ERROR ACCUR RERUN
		        logger.debug('Unable to scan event directory: ' + err);
		        this.execStopStartTO();
	 			return false;
		    } 	

		    files.sort();
		    
		    let filesLen = files.length;

		    //IF THERES IS EVENTS DIR FETCH FIRST EVENT ONLY
		    if (filesLen) {

		    	//UPLOAD ALL FIRST EVENT ALL FILES
		    	let eventIdDir 		= files[0];
		    	let firstEventDir 	= this.directory+eventIdDir;

		    	
		    	//READ THE FIRST EVENT FOLDER
		    	fs.readdir(firstEventDir, (err: any, files: any) =>{
				    if (err) {

				    	//IF ERROR ACCUR RERUN FROM THE TOP
			            this.execStopStartTO();
				        logger.debug('Unable to scan Sub Event directory: ' + err);
			 			return false;
				    }else{
				    
				    	//IF EVENTS DIRECTOR IS EMPY RETURN AGAIN FROM THE TOP UNTIL CONTENT COME
				    	if (!files.length) {
				    		console.log("directory appears to be empty");

				           	this.execStopStartTO();
							return false;
				    	}else{

				    		//MASS SEND ALL LOG FILES OF EVENT
				       		files.sort();

				       		console.log("SEND ALL EVENT LOGS");

				       		let filesLen = files.length;

				       		let promises = [];

				       		//LOOP THEN CREATE REQUEST TO UPLOAD ALL LOGS FILE

				       		for(let x = 0; x < filesLen; x++){ // Use forloop so we can use break

						    	let filePath = firstEventDir+"/"+files[x];

								promises.push(this.createRequest(eventIdDir, filePath));

							}//FOR LOOP

							//CREATE UPLOADED DIR FIRST
							let uploadedEventDir = config.UPLOAD_STORAGE_DIR+config.LOGS_UPLOADED_EVENT_DIR+"/"+eventIdDir+"/";


							fs.mkdir(uploadedEventDir, { recursive: true }, (err: any) => { 
						  		if (err) { 
						  			logger.debug('ERROR cant create uploadedDir ' + err);
									this.execStopStartTO();
						  		}
						  			
						  		console.log("Uploaded Folder succesfuly created "+uploadedEventDir);
						  	});

						
							//W8 ALL REQUEST IF ALL DONE
							Promise.all(promises).then((results) => {

								//AFTER REQUEST ALL DONE CREATE NEW PROMISE TO MOVE FILES

								let promises2 = [];
								
								for(let i = 0; i < results.length; i++){

									let body = results[i]["body"];

									let error = body.error;

									if (!error) {
										// code...
										let orig_filename = body["data"]["orig_filename"];
										
										promises2.push(this.moveEvents(eventIdDir, orig_filename, uploadedEventDir));
																			
									}
								}

								// THEN WAIT TO MOVE ALL FILES INTO UPLOADED EVENT DIR
								Promise.all(promises2).then((results) => {
									
									//AFTER MOVING ALL FILES INTO UPLOADED READ THE EVENT DIR AND REMOVE IF EMPTY
									fs.readdir(firstEventDir, (err: any, files: any) =>{
									    if (err) {
								            logger.debug('Reading event dir again ' + err);
											this.execStopStartTO();
									    }else{
							    			//IF DIRECTORY CONTENT IS EMPY REMOVE FOLDER EVENT
							    			if (!files.length) {

							    					
							    				console.log("Remove events folder directory appears to be empty");
							    			}

							    			this.execStopStartTO();
							    		}
							    	});

								}).catch((err) => {
									console.log(err);

									//IF ERROR MOVING RERUN FROM THE TOP

									logger.debug('Promise 2 http ' + err);
									this.execStopStartTO();
								});
								
							}).catch((err) => {
								logger.debug('Promise 1 http ' + err);

								this.execStopStartTO();
							});
						  
						}//ELSE HAS LENGTH
					}
				})	
		    }else{
		    	console.log("EVENTS directory appears to be empty");
		    	this.execStopStartTO();
		    }
		})	
	}//UPLOAD FILES FUNCTION

	moveEvents(eventIdDir: string, orig_filename: string, uploadedEventDir: string){
		return new Promise((res, rej) => {
			fsExtra.move(config.UPLOAD_STORAGE_DIR+config.LOGS_EVENT_DIR+"/"+eventIdDir
				+"/"+orig_filename, uploadedEventDir + orig_filename, function(err: any){
     			
     			if (err) {
     				fs.unlink(uploadedEventDir + orig_filename, (err: any) => {

     					console.log("Unlinkfile already exists");
			            if (err) { logger.error("Error unlinking upload"+err); }	
			        });

			        rej(err);
     			}else{
     				res(true);
     			}
      		});

		});
							    
	}
}