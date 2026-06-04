import app from "../app";
import config from "../config/config";

const chokidar = require('chokidar');
const fs  = require('fs');

export default class WatchFileDir{
	
	private io: any;
	private app: any;

	constructor(app: any){
		this.app = app; 
		this.io = this.app.get('socketio');
		this.listDirToWatch();		

		//this.startRelaiInterval();
	}


	// relaiInterval: any;

	// relaiRunning: boolean = false;

	// counter: number = 1;

	// startRelaiInterval() {

	// 	this.relaiRunning = true;
	// 	this.relaiInterval = setInterval(() => {
			
	// 		if (this.counter > 7) {
	// 			this.stopRelaiInterval();
	// 			console.log("interval Stopped");

	// 			this.relaiRunning = false;
	// 		}

	// 		console.log(new Date);

	// 		console.log(this.counter);

	// 		this.counter++;

	// 	} , 1000);

	// }

	// stopRelaiInterval() {
	// 	if (this.relaiInterval) {
	// 		clearInterval(this.relaiInterval);
	// 	}
	// }

	listDirToWatch(){

		let basePath = config.UPLOAD_STORAGE_DIR;
		// let paths = [config.LOGS_EVENT_DIR, config.LOGS_FIRST_ALARM_DIR, config.LOGS_UPLOADED_EVENT_DIR];
		
		let paths = [config.LOGS_EVENT_MAX_DIR, config.LOGS_FIRST_ALARM_DIR, config.LOGS_UPLOADED_EVENT_MAX_DIR];

		for(let x = 0; x < paths.length; x++){
			fs.mkdir(basePath+paths[x], { recursive: true }, (err: any) => { 
		  		if (err) { 
		  			console.log("Cant create dir "+basePath+paths[x]);	
				}else{
					this.watchDir(basePath+paths[x]);
		  		}		
		  	});
		}

		fs.mkdir(basePath+config.LOGS_PER_MIN_DIR, { recursive: true }, (err: any) => { 
	  		if (err) { 
	  			console.log("Cant create dir "+basePath+config.LOGS_PER_MIN_DIR);	
			}else{
				this.watchDir(basePath+config.LOGS_PER_MIN_DIR, "dir_modified_permin");
	  		}		
	  	});



	}

	watchDir(path: string, type: string = "dir_modified"){
		const watcher = chokidar.watch(path, {
			  //ignored: /(^|[\/\\])\../, // ignore dotfiles
			  persistent: true,
			  ignoreInitial: true,
		});

		const log = console.log.bind(console);
		// Add event listeners.
		watcher
		  .on('add', (path: any) => {

		  	this.io.emit(type, "yes");

		  	log(`File ${path} has been added`);

		  } )
		  .on('change', (path: any) => log(`File ${path} has been changed`))
		  .on('unlink', (path: any) => {
	
		  	this.io.emit(type, "yes");

		  	log(`File ${path} has been removed`);
		  });
		 
		// More possible events.
		// watcher
		//   .on('addDir', (path: any) => {

		//   	setTimeout(() => {
		//   		this.io.emit("dir_modified", "yes");
		//   	}, 3000);
		  	

		//   	log(`Directory ${path} has been added`);
		//   })
		//   .on('unlinkDir', (path: any) => {
		//   	//this.io.emit("dir_modified", "yes");

		//   	setTimeout(() => {
		//   		this.io.emit("dir_modified", "yes");
		//   	}, 3000);
		  	
		//   	log(`Directory ${path} has been added`);
		//   })
		//   .on('error', (error: any) => log(`Watcher error: ${error}`))
		//   .on('ready', () => log("Initial "+path+" scan complete. Ready for changes"))
		//   .on('raw', (event: any, path: any, details: any) => { // internal
		//     //log('Raw event info:', event, path, details);
		//   });


		watcher.on('change', (path: any, stats: any) => {
		  if (stats) console.log(`File ${path} changed size to ${stats.size}`);
		});

	}
	
}