import { Request, Response, NextFunction } from "express";
import mtz from "moment-timezone";
import Database from "../database/mysqldatabase";
import logger from "../config/logger";
import ResponseHandler from "../middleware/responseHandler";
import config from "../config/config";
import fsExtra from "fs-extra";
const admzip = require('adm-zip');

var archiver = require('archiver');
var zip = archiver('zip');




//const fsExtra     = require('fs-extra'); //FOR MOVING FILES
import path from "path";

const lineByLine      = require('n-readlines');
const fs              = require('fs');
const responseHandler = new ResponseHandler(); 
const date            = mtz().tz('Asia/Manila').format('YYYY-MM-DD HH:mm:ss');
const db              = new Database();
const checkDiskSpace  = require('check-disk-space');
var bytes             = require('bytes');

var os = require('os');

let linuxPlat = false;

if (os.platform() !== "win32") {
  linuxPlat = true;
 
}

export class ConfigController{

  public sql: string = "";
  public param: any = [];
  public result: any;
  public newResult: any;

  constructor() {
      
  }

  public async getSensorConfig(req: Request, res: Response, next: NextFunction){
    try {
      
        
      this.result = await db.query("SELECT * FROM config_tbl LIMIT 1");

      responseHandler.sendResponse(res, "Successfuly fetch sensor config", 200, false, this.result[0]);

    } catch (err){
      logger.info("Error fetch sensor config "+err);
      next(err)
    }
  }

  conf: any;

  public async mysqltest(req: Request, res: Response, next: NextFunction){
   
    try {
      //const { type } = req.body;

      //let result = await db.query("SELECT * FROM config_tbl");

      const connection = db.connection();
      
      connection.beginTransaction((err: any) => {
        if (err) { next(err) }

        connection.query('SELECT * FROM config_tbl LIMIT 1', (err: any, result: any, fields: any) => {
          if (err) { return connection.rollback(() => { next(err) }) }
          
          connection.commit((err: any) => {
              if (err) { connection.rollback(() => { next(err) }) }
             

              responseHandler.sendResponse(res, "Upload event file success", 200, false, result);
            })
          
        })
      })

    } catch (err) {
      logger.info(err);
      next(err)
    }
 
  } 

   public async loginUser(req: Request, res: Response, next: NextFunction){
    try {

      const { username, password } = req.body;

      let sql = "SELECT * FROM config_tbl WHERE admin_def_username = ? AND admin_def_pass = ?";
      let param = [username, password];

      db.query(sql, param).then((result: any) => {


        if (result.length >= 1) {

          responseHandler.sendResponse(res, "Successfuly Login", 200, false);  

        }else{
          responseHandler.sendResponse(res, "Invalid Account Login", 200, true);  
        }


      }).catch(err => {
        responseHandler.sendResponse(res, "Failed to query account ", 200, true); 
      });

    } catch (err){
      logger.info("Error login "+err);
      next(err)
    }
  }  

  public async changePass(req: Request, res: Response, next: NextFunction){
    try {

      const { newpassword } = req.body;

      let sql = "UPDATE config_tbl SET admin_def_pass = ?";
      let param = [newpassword];

      db.query(sql, param).then((result: any) => {

       responseHandler.sendResponse(res, "Successfuly change password Login", 200, false);

      }).catch(err => {
        responseHandler.sendResponse(res, "Failed to change password account ", 200, true); 
      });

    } catch (err){
      logger.info("Error login "+err);
      next(err)
    }
  }  

   public async updateIntensity(req: Request, res: Response, next: NextFunction){
    try {

      const { warning, warrant, xthold, ythold, zthold } = req.body;

      let sql = "UPDATE config_tbl SET warning = ?, warrant = ?, xthold = ?, ythold = ?, zthold = ?";

      let param = [warning, warrant, xthold, ythold, zthold];

      db.query(sql, param).then(result => {
        responseHandler.sendResponse(res, "Successfuly update intensity info", 200, false); 
      }).catch(err => {
        responseHandler.sendResponse(res, "Error update intensity info", 200, true); 
      });

 
    } catch (err){
      logger.info("Error fetch intensity config "+err);
      next(err)
    }
  }  

  public async getDiskSpace(req: Request, res: Response, next: NextFunction){
    try {

      let dir = process.cwd();

      if (linuxPlat) {
        if (config.STORAGE) {
          dir = config.UPLOAD_STORAGE_DIR;
        }else{
          dir = "/";
        }
      }
	console.log("OS platform "+os.platform());
	console.log("OS type "+linuxPlat);
	console.log("Directory path "+dir);

      checkDiskSpace(dir).then((diskSpace: any) => {
      
        
        let percent = (diskSpace.free / diskSpace.size) * 100;

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

        //console.log("CHECK diskSpace "+ JSON.stringify(result));

        responseHandler.sendResponse(res, "Successfuly fetch storage info", 200, false, result); 

      }).catch((err: any) => {
        logger.info("Error checking disk space: " + err);
        // Return dummy data on failure to prevent crash
        responseHandler.sendResponse(res, "Failed to fetch storage info", 200, true, {
          storage: false,
          free: "0B",
          size: "0B",
          freeByte: 0,
          sizeByte: 0,
          percent: 0,
          status: "bg-danger"
        });
      });

    } catch (err){
      logger.info("Error fetch storage info "+err);
      next(err)
    }
  }  

  public async calibrate(req: any, res: Response, next: NextFunction){

    try {

      const io = req.app.get('socketio'); 

      io.emit("calibratesensor", "Calibrating Sensor ..");

      responseHandler.sendResponse(res, "Calibrating Sensor Please wait ...", 200, false);
     
    } catch (err){
      logger.info("Error upload file "+err);
      next(err)
    }
  }


  public async availableHour(req: Request, res: Response, next: NextFunction){
    const { startDate } = req.params;

    let startTimestamp = this.getTimePath(startDate);
    let startYear = startTimestamp['year'];
    let startMonth = startTimestamp['month'];
    let startDay = startTimestamp['days'];

    let filepath = config.UPLOAD_STORAGE_DIR+config.LOGS_DIR+"/"+startYear+"/"+startMonth+"/"+startDay+"/";

    fs.readdir(filepath, (err: any, files: any) =>{
      if (err) {
        //IFF ERROR ACCUR RERUN
        responseHandler.sendResponse(res, 'Unable to scan '+filepath+' directory: ' + err, 200, true);
      }else{
        files.sort();
      
        let filesLen = files.length;

        //IF THERES IS EVENTS DIR FETCH FIRST EVENT ONLY
        if (filesLen) {
          responseHandler.sendResponse(res, "Available hours to download", 200, false, files);
        }else{
          responseHandler.sendResponse(res, 'No available hours', 200, true);
        }
      }   

      
    })  
  }  


  public async backUp(req: Request, res: Response, next: NextFunction){
    try {

      const { startDate, hour } = req.params;
      console.log("Request download zip file "+hour);

      let startTimestamp = this.getTimePath(startDate);
      let startYear = startTimestamp['year'];
      let startMonth = startTimestamp['month'];
      let startDay = startTimestamp['days'];
 
      var zip = new admzip();
      var outputFilePath = startDate+'.zip';

      let filepath = config.UPLOAD_STORAGE_DIR+config.LOGS_DIR+"/"+startYear+"/"+startMonth+"/"+startDay+"/";


      let timeToBackUp: any = [];

      fs.readdir(filepath, (err: any, files: any) =>{
        if (err) {
          //IFF ERROR ACCUR RERUN
          responseHandler.sendResponse(res, 'Unable to scan '+filepath+' directory: ' + err, 200, true);
          //logger.debug('Unable to scan '+filepath+' directory: ' + err);
        }   

        files.sort();
                      
        let filesLen = files.length;

        if (filesLen) {

          res.download(filepath+"/"+hour+"/"+hour+".log", (err) => {
            if(err){
              console.error(err.message);
            }
        //   responseHandler.sendResponse(res, "Upload event file success", 200, false, 
        //     { startYear : startYear, startMonth: startMonth, startDay: startDay, 
        //     });
          });

        
                 // create a file to s  tream archive data to.
          // const output = fs.createWriteStream(outputFilePath);
          // const archive = archiver('zip', {
          //   zlib: { level: 9 } // Sets the compression level.
          // });

          
          // // listen for all archive data to be written
          // // 'close' event is fired only when a file descriptor is involved
          // output.on('close', function() {
          //   console.log(archive.pointer() + ' total bytes');
          //   console.log('archiver has been finalized and the output file descriptor has closed.');

          //   res.download(outputFilePath, (err) => {
          //     if(err){
          //       console.error(err.message);
          //     }
          // //   responseHandler.sendResponse(res, "Upload event file success", 200, false, 
          // //     { startYear : startYear, startMonth: startMonth, startDay: startDay, 
          // //     });
          //   });
          // });

          // // This event is fired when the data source is drained no matter what was the data source.
          // // It is not part of this library but rather from the NodeJS Stream API.
          // // @see: https://nodejs.org/api/stream.html#stream_event_end
          // output.on('end', function() {
          //   console.log('Data has been drained');
          // });

          // // good practice to catch warnings (ie stat failures and other non-blocking errors)
          // archive.on('warning', function(err: any) {
          //   if (err.code === 'ENOENT') {
          //     // log warning
          //   } else {
          //     // throw error
          //     throw err;
          //   }
          // });

          // // good practice to catch this error explicitly
          // archive.on('error', function(err: any) {
          //   throw err;
          // });

          // // pipe archive data to the file
          // archive.pipe(output);


          // // // append files from a sub-directory, putting its contents at the root of archive
          // // archive.directory('subdir/', false);

          // for(let x = 0; x < timeToBackUp.length; x ++){

          //   console.log(timeToBackUp[x]);
          //   archive.file(filepath+timeToBackUp[x]+"/combined.log");
          // }

          

          // // finalize the archive (ie we are done appending files but streams have to finish yet)
          // // 'close', 'end' or 'finish' may be fired right after calling this method so register to them beforehand
          // archive.finalize();




          
        }else{
          responseHandler.sendResponse(res, "No time to backup", 200, false, 
          { startYear : startYear, startMonth: startMonth, startDay: startDay, 
          });
        }

      });


      



      //       // create a file to stream archive data to.
      // const output = fs.createWriteStream(outputFilePath);
      // const archive = archiver('zip', {
      //   zlib: { level: 9 } // Sets the compression level.
      // });



      // // listen for all archive data to be written
      // // 'close' event is fired only when a file descriptor is involved
      // output.on('close', function() {
      //   console.log(archive.pointer() + ' total bytes');
      //   console.log('archiver has been finalized and the output file descriptor has closed.');

      //   res.download(outputFilePath, (err) => {
      //     if(err){
      //       console.error(err.message);
      //     }
      // //   responseHandler.sendResponse(res, "Upload event file success", 200, false, 
      // //     { startYear : startYear, startMonth: startMonth, startDay: startDay, 
      // //     });
      //   });
      // });

      // // This event is fired when the data source is drained no matter what was the data source.
      // // It is not part of this library but rather from the NodeJS Stream API.
      // // @see: https://nodejs.org/api/stream.html#stream_event_end
      // output.on('end', function() {
      //   console.log('Data has been drained');
      // });

      // // good practice to catch warnings (ie stat failures and other non-blocking errors)
      // archive.on('warning', function(err: any) {
      //   if (err.code === 'ENOENT') {
      //     // log warning
      //   } else {
      //     // throw error
      //     throw err;
      //   }
      // });

      // // good practice to catch this error explicitly
      // archive.on('error', function(err: any) {
      //   throw err;
      // });

      // // pipe archive data to the file
      // archive.pipe(output);





      // // append a file from stream
      // // const file1 = "test.txt";
      // // archive.append(fs.createReadStream(file1), { name: 'file1.txt' });

      // // // append a file from string
      // // archive.append('string cheese!', { name: 'file2.txt' });

      // // // append a file from buffer
      // // const buffer3 = Buffer.from('buff it!');
      // // archive.append(buffer3, { name: 'file3.txt' });

      // // // append a file
      // // archive.file('file1.txt', { name: 'file4.txt' });

      // // // append files from a sub-directory and naming it `new-subdir` within the archive
      // archive.directory(filepath, false);

      // // // append files from a sub-directory, putting its contents at the root of archive
      // // archive.directory('subdir/', false);

      // // // append files from a glob pattern
      // // archive.glob('file*.txt', {cwd:__dirname});

      // // finalize the archive (ie we are done appending files but streams have to finish yet)
      // // 'close', 'end' or 'finish' may be fired right after calling this method so register to them beforehand
      // archive.finalize();


    
      // console.log(filepath);
      // // zip.addLocalFolder(filepath);
      // zip.addLocalFolder(filepath);



      // fs.writeFileSync(outputFilePath, zip.toBuffer());

      // res.download(outputFilePath, (err) => {
      //   if(err){
      //   console.error(err.message);
      //   }
      // });



      // fs.readdir(filepath, (err: any, files: any) =>{
      //   if (err) {
      //     //IFF ERROR ACCUR RERUN

      //     responseHandler.sendResponse(res, 'Unable to scan '+filepath+' directory: ' + err, 200, true);
      //     //logger.debug('Unable to scan '+filepath+' directory: ' + err);
      //   }   


       

      //   responseHandler.sendResponse(res, "Upload event file success", 200, false, 
      //     { startYear : startYear, startMonth: startMonth, startDay: startDay, 
      //     });



      // });


      
      
    } catch (err){
      logger.info("Error fetch intensity config "+err);
      next(err)
    }
  }  


  public getTimePath(paramDate: any){
    let date = new Date(paramDate); // FILE NAME CONSIST OF PARSEINTO INT get only 13 digits

    let year   = date.getFullYear();
    let month  = date.getMonth()+1;
    // let days   = this.addZero(date.getDate());
    let days   = date.getDate();
    //let hours  = "h"+date.getHours();
    //let hours  = getHoursWithZero(date);
    let hours  = this.addZero(date.getHours());

    let min    = this.addZero(date.getMinutes());
    let sec    = this.addZero(date.getSeconds());

    return {
        created_at: year +"-"+month+"-"+days+" "+hours+":"+min+":"+sec,
        timePath: year+"/"+month+"/"+days+"/"+hours+"/",
        year: year,
        month: month,
        days: days,
        hours: hours,
        min: min,
        sec: sec
    };
  }

  public addZero(i: any) {
    if (i < 10) {
        i = "0" + i;
    }
    return i;
  }

}
