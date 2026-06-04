import config from "./config";
const fs  = require('fs');
import fsExtra from "fs-extra";
		
async function logsDir(){

	let basePath = config.UPLOAD_STORAGE_DIR;

	let paths = [config.LOGS_EVENT_DIR, config.LOGS_FIRST_ALARM_DIR, config.LOGS_UPLOADED_EVENT_MAX_DIR, config.LOGS_EVENT_MAX_DIR];


	try{
		if (config.EMPTY_DIR) {
			console.log("Removing Directories ...");

			for(var x = 0; x < paths.length; x++){

				let dir = basePath+paths[x];

				console.log(dir);
				
				if (fs.existsSync(dir)){
			    	fsExtra.removeSync(dir);
				}

			}

		}
	} catch (err){
      console.log("ERROR DELETING Directories", err);
    }
    
	
	

	//fsExtra.removeSync(basePath+paths[1]);
	
	for(var y = 0; y < paths.length; y++){

		let dir = basePath+paths[y];

		console.log(dir);
		
		if (!fs.existsSync(dir)){
	    	fs.mkdirSync(dir);
		}

	}

	
}

export { logsDir }