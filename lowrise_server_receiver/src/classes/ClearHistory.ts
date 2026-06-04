import logger from "../config/logger";
import ResponseHandler from "../middleware/responseHandler";
import config from "../config/config";
import fsExtra from "fs-extra";
import path from "path";

const lineByLine      = require('n-readlines');
const fs              = require('fs');
var rp 				  = require('request-promise');
const checkDiskSpace  = require('check-disk-space');

var os = require('os');

var bytes             = require('bytes');
let linuxPlat = false;

if (os.platform() !== "win32") {
  linuxPlat = true;

}


export default class ClearHistory{
	to: any;
	directory: string;
	// node_token: string;
	// URL: string;

	constructor(){
		// this.node_token = node_token;

		this.directory 	= config.UPLOAD_STORAGE_DIR+config.LOGS_DIR+"/";
		// this.URL 		= config.URL_FIRSTALARM;

		if (config.STORAGE) {
			this.clearHistoryFolder();
		}else{
			console.log("UPLOADING FIRSTALARM DISABLED");
		}



	}

	startClearTO(){
		this.to = setTimeout(() => {
			this.clearHistoryFolder();
		}, 600000);
	}

	stopClearTO(){
		if (this.to) {
			clearTimeout(this.to);
		}
	}

	execStopStartTO(){
		this.stopClearTO();
		this.startClearTO();
	}


    //Check if storage is in critical 50% and clear first fodlers
  public clearHistoryFolder(){
        try {

          let dir = null;

          if (!linuxPlat) {
            dir = "C:\\NODESAPI\\lowrise_server_receiver";
          }else{
            if (config.STORAGE) {
              dir = config.UPLOAD_STORAGE_DIR;
            }else{
              dir = "/";
            }
          }

          checkDiskSpace(dir).then((diskSpace: any) => {
            let percent = (diskSpace.free / diskSpace.size) * 100;

            console.log(diskSpace.free +"-"+diskSpace.size);
            console.log(percent);

            let status = percent > 50 ? "bg-success" : percent < 50 && percent > 30 ?  "bg-warning" : percent < 30 ?  "bg-danger" : null;

            let result =   {
              storage: config.STORAGE,
              free: bytes(diskSpace.free),
              size: bytes(diskSpace.size),
              freeByte: diskSpace.free,
              sizeByte: diskSpace.size,
              percent: percent,
              status: status
            }

            if(percent < 50){
                //read log storage and check preview if there is preview year first
                this.readDirectoriesAndDelete();
            }else{
              console.log("More space left");
            }

          });

        } catch (err){
          logger.info("Error fetch storage info "+err);

        }
    }

    public readDirectoriesAndDelete(){
        fs.readdir(this.directory, (err: any, files: any) =>{
		    if (err) {
	          this.execStopStartTO();
		        logger.debug('Unable to scan first alarm directory: ' + err);
	 			    return false;
		    }
		    files.sort();
		    let filesLen = files.length;

        //Check first if there's year folder
		    if (filesLen > 1) {

          //Delete all previous year folder except current year
          for(let x = 0; x < filesLen-1; x++){

            fsExtra.remove(this.directory+ files[x])

            .then(() => {
                console.log('succesfully remove folder year '+files[x])
            })
            .catch(err => {
                console.error(err)
            })
          }

		    }else{
          //IF ONLY CURRENT YEAR CLEAR FOLDER ON PREV MONTH
          //READ LATEST FOLDER YEAR
          let latestDir = files[filesLen - 1];

		    	console.log(config.MONTH_TO_DELETE+" year only");

          this.clearPrevMonth(config.MONTH_TO_DELETE, this.directory+latestDir);
		    }

          this.execStopStartTO();
		  });
    }

    public clearPrevMonth(numberOfMonth:number = 2, yearDirPath: string){
      fs.readdir(yearDirPath, (err: any, files: any) =>{
		    if (err) {
	 			  return false;
		    }

		    // files.sort();
		    let filesLen = files.length;

        //SORT FOLDER NAME TO ASC
        files.sort(function(a: any, b: any){return a - b});
        console.log(files);


        //GET THE MONTH FOLDER AND REMOVE BASE ON THE NUMBER OF MONTH SETTING TO DELETE
        let monthToDelete = parseInt(files[files.length - 1]) - numberOfMonth;
        console.log(parseInt(files[files.length - 1]) - numberOfMonth);

        console.log("Last file "+files[files.length - 1]);

        //DELETE FOLDER
        console.log("Delete folder "+yearDirPath+"/"+monthToDelete);

        this.readMonthlyFolder(yearDirPath+"/"+monthToDelete);
		  });
    }

    public readMonthlyFolder(monthlyDirPath: string){

      fs.readdir(monthlyDirPath, (err: any, files: any) =>{
		    if (err) {
          // INFINITE LOOP UNTIL MONLTY FOLDER BEFORE IS EXISTED
	 			  return false;
		    }

        let filesLen = files.length;

        if(!filesLen){
          //FOLDER IS EMPTY REMOVE THIS MONTH FOLDER
          fsExtra.remove(monthlyDirPath);
        }else{

          //REMOVE DAILY FOLDER ONE BY ONE UNTIL FOLDER BECOME EMPTY

          //console.log(monthlyDirPath+ files[0]);
          fsExtra.remove(monthlyDirPath+"/"+ files[0])
          .then(() => {
              console.log('succesfully remove folder day '+files[0])
          })
          .catch(err => {
              console.error(err)
          })

        }
		  });
    }
}