import { Request, Response, NextFunction } from "express";
import mtz from "moment-timezone";
import Database from "../database/mysqldatabase";
import logger from "../config/logger";
import ResponseHandler from "../middleware/responseHandler";
import config from "../config/config";
import fsExtra from "fs-extra";
import app from "../app";

//const fsExtra     = require('fs-extra'); //FOR MOVING FILES
import path from "path";

const lineByLine      = require('n-readlines');
const fs              = require('fs');
const responseHandler = new ResponseHandler();
const date            = mtz().tz('Asia/Manila').format('YYYY-MM-DD HH:mm:ss');
const db              = new Database();

export class UploadController{


  constructor() {

  }

  public getTimePath(){
    let date = new Date(); // FILE NAME CONSIST OF PARSEINTO INT get only 13 digits

    let year   = date.getFullYear();
    let month  = date.getMonth()+1;
    let days   = this.addZero(date.getDate());
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

  loopFileContent(liner: any){
    return new Promise((res, rej) => {
      let contentarray = [];
      let line;

      //LOOP FILES CONTENT
      while (line = liner.next()) {
        // console.log('Line ' + lineNumber + ': ' + line.toString('ascii'));
        //let data = line.toString('ascii').split(',');

        let data = line.toString().trim().split(',');

        contentarray.push(data);
      }

      res(contentarray);

    })
  }

  loopFileContentExpress(content: any){
    return new Promise((res, rej) => {
      let contentarray = [];

      for (let x = 0; x < content.length; x++) {
        let data = content[x].trim().split(',');

        contentarray.push(data);
      }

      res(contentarray);

    })
  }

  //NO USE
  public async upload(req: any, res: Response, next: NextFunction){

    try {

      if(!req.files){
        responseHandler.sendResponse(res, "No file uploaded", 200, true);
      }else{
        const { node_name } = req.body;

        let file = req.files?.file;

        if (file !== undefined) {
          let ip = req.ip;


          console.log(file);

          let contentString = file.data.toString('utf8').trim();

          let content = contentString.split("\n");


          this.loopFileContentExpress(content).then(res => {
             // get the io object ref
            const io = req.app.get('socketio');

            io.emit(node_name, JSON.stringify(res));

          });

          let timePath = this.getTimePath();

          let created_at = timePath['created_at'];

          let filepath = config.UPLOAD_STORAGE_DIR+config.LOGS_DIR+"/"+timePath['timePath'];

          if (config.STORAGE) {

            fs.mkdir(filepath, { recursive: true }, (err: any) => {
              if (err) {
                logger.debug('ERROR cant create uploadedDir '+filepath+""+ err);
                responseHandler.sendResponse(res, "File upload failed "+err, 200, true);

              }else{


                let hours = timePath['hours'];

                console.log(filepath+file.name);

                // open destination file for appending
                var w = fs.createWriteStream(filepath+hours+".log", {flags: 'a'});
                // open source file for reading


                fs.appendFile(filepath+hours+".log", contentString+"\n", function (err: any) {
                  if (err) throw err;
                  console.log('Saved!');

                  w.end();
                });


                // var r = fs.createReadStream(file.data.toString('base64'));

                w.on('close', function() {
                    console.log("done writing");
                });

                // r.pipe(w);


                responseHandler.sendResponse(res, "File upload success", 200, false);
                // file.mv(filepath+file.name, (err: any) => {

                //   if (err) {
                //     responseHandler.sendResponse(res, "File upload failed "+err, 200, true);
                //   }else{
                //     responseHandler.sendResponse(res, "File upload success", 200, false);
                //   }

                // });

              }
            });
          }else{
            responseHandler.sendResponse(res, "File upload success not stored", 200, false);
          }
        }
      }


    } catch (err){
      logger.info("Error upload file "+err);
      next(err)
    }
  }

  public async uploadPermin(req: any, res: Response, next: NextFunction){

    try {

      if(!req.files){
        responseHandler.sendResponse(res, "No file permin uploaded", 200, true);
      }else{
          const { node_name } = req.body;

          let file = req.files?.file;

          if (file !== undefined) {
            let ip = req.ip;

            let filepath = config.UPLOAD_STORAGE_DIR+config.LOGS_PER_MIN_DIR+"/";

            fs.mkdir(filepath, { recursive: true }, (err: any) => {
              if (err) {
                logger.debug('ERROR cant create uploadedDir '+filepath+""+ err);
                responseHandler.sendResponse(res, "File permin upload failed "+err, 200, true);

              }else{

                file.mv(filepath+file.name, (err: any) => {

                  if (err) {
                    responseHandler.sendResponse(res, "File permin upload failed "+err, 200, true);
                  }else{

                    //CHECK IF PERMIN UPLOAD IS MORE THAN 20 FILES

                    fs.readdir(filepath, (err: any, files: any) =>{
                      if (err) {
                        //IFF ERROR ACCUR RERUN
                         logger.debug('Unable to scan '+filepath+' directory: ' + err);
                      }

                      files.sort();

                      let filesLen = files.length;

                      //IF THERES IS EVENTS DIR FETCH FIRST EVENT ONLY
                      if (filesLen > 20) {

                        let clearFile = files.slice(0, 10);

                        for (let i = 0; i < clearFile.length; i++) {

                          fs.unlink(filepath + clearFile[i], (err: any) => {

                              if (err) { logger.error("Error unlinking permin upload"+err); }
                          });
                        }

                      }
                    })

                    responseHandler.sendResponse(res, "File permin upload success", 200, false);
                  }

                })

              }
            });
          }else{
            responseHandler.sendResponse(res, "File is undefined permin failed ", 200, true);
          }
      }





    } catch (err){
      logger.info("Error Permin upload file "+err);
      next(err)
    }
  }

  public async uploadEvents(req: any, res: Response, next: NextFunction){

    try {

      if(!req.files){
        responseHandler.sendResponse(res, "No event file uploaded", 200, true);
      }else{

        const { node_name, eventId } = req.body;


        let file = req.files?.file;

        if (file !== undefined) {
          let ip = req.ip;

          let filepath = config.UPLOAD_STORAGE_DIR+config.LOGS_EVENT_DIR+"/"+eventId+"/";

          fs.mkdir(filepath, { recursive: true }, (err: any) => {
            if (err) {
              logger.debug('ERROR cant create uploadedDir '+filepath+""+ err);
              responseHandler.sendResponse(res, "File upload failed "+err, 200, true);

            }else{

              file.mv(filepath+file.name, (err: any) => {

                if (err) {
                  responseHandler.sendResponse(res, "File event upload failed "+err, 200, true);
                }else{

                  let data = {
                    orig_filename: file.name
                  }

                  responseHandler.sendResponse(res, "File event upload success 1", 200, false, data);
                }

              })

            }
          });

        }else{
          responseHandler.sendResponse(res, "File is undefined event failed ", 200, true);
        }
      }


    } catch (err){
      logger.info("Error Event upload file "+err);
      next(err)
    }
  }

   getAbsValues(content: any){

    return new Promise((res, rej) => {

      let xVal = 0;
      let yVal = 0;
      let zVal = 0;
      let intentVal = 0;

      try{

        for (let x = 0; x < content.length; x++) {

          let data = content[x].trim().split(',');

          let timestamp    = parseInt(data[1]);
          let xvalIndex    = parseFloat(data[2]);
          let yvalIndex    = parseFloat(data[3]);
          let zvalIndex    = parseFloat(data[4]);
          let intentIndex  = parseInt(data[5]);

           // GET MAXIMUM INTENSITY ON FILE
          if (Math.abs(xvalIndex) > Math.abs(xVal)) {
            xVal = xvalIndex;
          }

          if (Math.abs(yvalIndex) > Math.abs(yVal)) {
            yVal = yvalIndex;
          }

          if (Math.abs(zvalIndex) > Math.abs(zVal)) {
            zVal = zvalIndex;
          }

          // GET MAXIMUM INTENSITY ON FILE
          if (intentIndex > intentVal) {
            intentVal = intentIndex;
          }

        }

        res([intentVal, xVal, yVal, zVal]);

      }catch(err){
        rej(err);
      }


    })
  }


  public async uploadEventMax(req: any, res: Response, next: NextFunction){

    try {

      if(!req.files){
        responseHandler.sendResponse(res, "No file  max event uploaded", 200, true);
      }else{
        const { node_name } = req.body;

        let file = req.files?.file;

        if (file !== undefined) {
          let ip = req.ip;

          let filepath = config.UPLOAD_STORAGE_DIR+config.LOGS_EVENT_MAX_DIR+"/";

          console.log(filepath);

          let content = file.data.toString('utf8').trim().split("\n");

          this.getAbsValues(content).then((result: any) => {

            fs.mkdir(filepath, { recursive: true }, (err: any) => {
              if (err) {
                logger.debug('ERROR cant create  max event '+filepath+""+ err);
                responseHandler.sendResponse(res, "File  max event upload failed "+err, 200, true);

              }else{

                file.mv(filepath+file.name, (err: any) => {

                  if (err) {
                    responseHandler.sendResponse(res, "File max event upload failed "+err, 400, true);
                  }else{

                    let io = app.get('socketio');

                    console.log("event_max-"+file.name.replace('.log', ''));

                    io.emit("event_max-"+file.name.replace('.log', ''), result);

                    responseHandler.sendResponse(res, "File  max event upload success", 200, false);
                  }

                })

              }
            });
          })


        }else{
          responseHandler.sendResponse(res, "File is undefined  max event failed ", 200, true);
        }
      }




    } catch (err){
      logger.info("Error  max event upload file "+err);
      next(err)
    }
  }


  public async firstAlarm(req: any, res: Response, next: NextFunction){

    const { node_name, eventId } = req.body;

    let firstAlarmPath = config.UPLOAD_STORAGE_DIR+"/"+config.LOGS_FIRST_ALARM_DIR+"/"+eventId;

    try {
      fs.mkdir(firstAlarmPath, { recursive: true }, (err: any) => {
        if (err) throw "Error make first alarm directory";

        let io = app.get('socketio');

        io.emit("newfirstalarm", eventId);

        console.log("First Alarm Success", node_name);

        responseHandler.sendResponse(res, "First alarm upload success", 200, false);

      });

    }catch(err){
      logger.info("Error first alarm event file "+err);
      next(err)
    }

  }

  pathsList: any = [];

  mapArray(array: any, fullpath: string, status: string){
    return array.map(function(val: any, index: any){

              return {
                "event_unique_id": val,
                "path": fullpath+"/"+val,
                "status": status,
                "intensity": 0,
                "timestamp": parseInt(val.substring(0,13))
              };
            });
  }

  fileCount: number = 6;

  unuploadedCount: number = 0;
  uploadedCount: number = 0;
  perminFileCount: number = 0;

  public async watchPerminDir(req: Request, res: Response, next: NextFunction){
    try {
      let basePath = config.UPLOAD_STORAGE_DIR;

      let paths = [config.LOGS_EVENT_DIR, config.LOGS_UPLOADED_EVENT_DIR, config.LOGS_PER_MIN_DIR];

      let perminFileCount = fs.readdirSync(basePath+paths[2]);

      this.perminFileCount = perminFileCount.length;

      let data = {

        "perminFileCount": this.perminFileCount
      }

      responseHandler.sendResponse(res, "History fetched", 200, false, data);

    } catch (err){
      logger.info("Error fetching history"+err);
      next(err)
    }
  }

  public async getHistory(req: Request, res: Response, next: NextFunction){
    try {
      let basePath = config.UPLOAD_STORAGE_DIR;

      let paths = [config.LOGS_EVENT_DIR, config.LOGS_UPLOADED_EVENT_DIR, config.LOGS_PER_MIN_DIR];

      const safeReaddir = (p: string): string[] => {
        try { return fs.readdirSync(p); } catch { return []; }
      };

      let perminFileCount = safeReaddir(basePath+paths[2]);

      this.perminFileCount = perminFileCount.length;

      let uploadedFile = safeReaddir(basePath+paths[1]);

      this.uploadedCount = uploadedFile.length;

      // Count unuploaded events up front so the total is always accurate.
      // (Previously this was only computed inside the paging branch below, so
      //  with >= fileCount uploaded events it kept returning a stale value.)
      let unuploadedFile = safeReaddir(basePath+paths[0]);

      this.unuploadedCount = unuploadedFile.length;

      uploadedFile.reverse();

      this.pathsList = this.mapArray(uploadedFile.slice(0, this.fileCount), basePath+paths[1], "uploaded");

      if (this.pathsList.length < this.fileCount) {

        let lengthToFetch = this.fileCount - this.pathsList.length;

        unuploadedFile.reverse();

        let concatEvent = this.mapArray(unuploadedFile.slice(0, lengthToFetch), basePath+paths[0], "unuploaded");

        for(let x = 0; x < concatEvent.length; x++){
          this.pathsList.push(concatEvent[x]);
        }

      }

      this.getPathDatas(this.pathsList, res, next);

    } catch (err){
      logger.info("Error fetching history"+err);
      next(err)
    }
  }

  async getPathDatas(paths: any, res: Response, next: NextFunction){
    console.log(paths);
    if (paths.length == 0) {
      responseHandler.sendResponse(res, "No History fetched", 200, true);
    }else{
      let counter = 0;
      let pathsLen = paths.length;

      for(var x = 0; x < pathsLen; x++){
        // console.log(paths[x]['path']);

        let path = paths[x]['path'];

        let xPath = x;

        fs.readdir(path,  (err: any, files: any,) =>{
          if (err) next(err)

          files.sort();

          let filesLen = files.length;

          for(var y = 0; y < files.length; y++){

            let intensity = this.readDataLog(path+"/"+files[y]);

            if (intensity > paths[xPath]["intensity"]) {
              paths[xPath]["intensity"] = intensity;
            }
          }

          counter++;

          if (counter == pathsLen) {

            let data = {
              "history": paths,
              "unuploadedCount": this.unuploadedCount,
              "uploadedCount": this.uploadedCount,
              "perminFileCount": this.perminFileCount,
              // True total event count (uploaded + unuploaded), independent of
              // the fileCount-capped `history` page used by the event table.
              "totalEvents": this.uploadedCount + this.unuploadedCount
            }

            responseHandler.sendResponse(res, "History fetched", 200, false, data);
          }

        });
      }
    }


  }

  readDataLog(path: string){

    //console.log(path);
    let liner = new lineByLine(path);
    let line;
    let intent = 0;

    // //LOOP FILES CONTENT
    while (line = liner.next()) {
      // console.log('Line ' + lineNumber + ': ' + line.toString('ascii'));
      let data = line.toString().trim().split(',');
      //console.log(data);

      let intentIndex = parseInt(data[5]);

      // GET MAXIMUM INTENSITY ON FILE
      if (intentIndex > intent) {
        intent = intentIndex;
      }
    }
    return intent;
  }


  cBeforeAfter: number = 22;

  public async getBefore(req: Request, res: Response, next: NextFunction){
    try {

      const { eventId, path } = req.body;

      let basePath = config.UPLOAD_STORAGE_DIR;

      let paths = [config.LOGS_EVENT_DIR];

      //let fullpath = basePath+paths[0]+"/"+eventId+"/";

      // let fullpath = path+"/";

      let fullpath = path+".log";


      console.log(fullpath);

      this.getPathDatasGraph(this.pathsList, fullpath, res, next);

      // fs.readdir(fullpath,  (err: any, files: any) =>{
      //   if (err) next(err)

      //   if (files) {

      //     files.sort();
      //     this.pathsList = files.slice(0, this.cBeforeAfter);


      //     //console.log(this.pathsList);
      //     this.getPathDatasGraph(this.pathsList, fullpath, res, next);

      //   }else{
      //      responseHandler.sendResponse(res, "before data fetched", 200, true);
      //   }

      // });

    } catch (err){
      logger.info("Error fetching history"+err);
      next(err)
    }
  }

  public async getDuring(req: Request, res: Response, next: NextFunction){
    try {

      const { eventId, path } = req.body;

      let basePath = config.UPLOAD_STORAGE_DIR;

      let paths = [config.LOGS_EVENT_DIR];

      //let fullpath = basePath+paths[0]+"/"+eventId+"/";

      let fullpath = path+"/";

      fs.readdir(fullpath,  (err: any, files: any) =>{
        if (err) next(err)

        if (files) {

          files.sort();
          //this.pathsList = files.slice(0, this.cBeforeAfter);

          this.pathsList = files.splice(this.cBeforeAfter);


          this.pathsList.reverse();


          this.pathsList = this.pathsList.slice(this.cBeforeAfter);

          this.pathsList.sort();



          this.getPathDatasGraph(this.pathsList, fullpath, res, next);

        }else{
           responseHandler.sendResponse(res, "During fetched", 200, true);
        }

      });

    } catch (err){
      logger.info("Error fetching history"+err);
      next(err)
    }
  }

  public async getAfter(req: Request, res: Response, next: NextFunction){
    try {

      const { eventId, path } = req.body;

      let basePath = config.UPLOAD_STORAGE_DIR;

      let paths = [config.LOGS_EVENT_DIR];

      //let fullpath = basePath+paths[0]+"/"+eventId+"/";

      let fullpath = path+"/";

      fs.readdir(fullpath,  (err: any, files: any) =>{
        if (err) next(err)


        if (files) {

          files.reverse();
          this.pathsList = files.slice(0, this.cBeforeAfter);

          this.pathsList.sort();

          this.getPathDatasGraph(this.pathsList, fullpath, res, next);

        }else{
           responseHandler.sendResponse(res, "After data fetched", 200, true);
        }

      });

    } catch (err){
      logger.info("Error fetching history"+err);
      next(err)
    }
  }

  data: any;

  async getPathDatasGraph(paths: any, fullpath: string, res: Response, next: NextFunction){

    let counter = 0;
    let pathsLen = paths.length;

    let totalIntent = 0;
    let totalX = 0;
    let totalY = 0;
    let totalZ = 0;

    let contentarray = [];

    let path = fullpath;

    let result = this.readDataLogGraph(path);



    this.data = result[4];

    for (var i = 0; i < this.data.length; ++i) {

      let timestamp = this.data[i][0];
      let xvalIndex = this.data[i][1];
      let yvalIndex = this.data[i][2];
      let zvalIndex = this.data[i][3];
      let intentIndex = this.data[i][4];

        // GET MAXIMUM INTENSITY ON FILE
      if (Math.abs(xvalIndex) > Math.abs(totalX)) {
        totalX = xvalIndex;
      }

      if (Math.abs(yvalIndex) > Math.abs(totalY)) {
        totalY = yvalIndex;
      }

      if (Math.abs(zvalIndex) > Math.abs(totalZ)) {
        totalZ = zvalIndex;
      }

      // GET MAXIMUM INTENSITY ON FILE
      if (intentIndex > totalIntent) {
        totalIntent = intentIndex;
      }

      contentarray.push([1, timestamp, xvalIndex, yvalIndex, zvalIndex, intentIndex]);
    }

    let data = {
      "pgaX": totalX,
      "pgaY": totalY,
      "pgaZ": totalZ,
      "intensity": totalIntent,
      "content": contentarray,
    }

    responseHandler.sendResponse(res, "History successfuly fetched", 200, false, data);
  }

  // async getPathDatasGraph(paths: any, fullpath: string, res: Response, next: NextFunction){

  //   let counter = 0;
  //   let pathsLen = paths.length;

  //   let totalIntent = 0;
  //   let totalX = 0;
  //   let totalY = 0;
  //   let totalZ = 0;

  //   let contentarray = [];

  //   for(var x = 0; x < pathsLen; x++){
  //     // console.log(paths[x]['path']);

  //     let path = fullpath+paths[x];

  //     let result = this.readDataLogGraph(path);

  //     this.data = result[4];

  //     for (var i = 0; i < this.data.length; ++i) {


  //       let timestamp = this.data[i][0];
  //       let xvalIndex = this.data[i][1];
  //       let yvalIndex = this.data[i][2];
  //       let zvalIndex = this.data[i][3];
  //       let intentIndex = this.data[i][4];

  //        // GET MAXIMUM INTENSITY ON FILE
  //       if (Math.abs(xvalIndex) > Math.abs(totalX)) {
  //         totalX = xvalIndex;
  //       }

  //       if (Math.abs(yvalIndex) > Math.abs(totalY)) {
  //         totalY = yvalIndex;
  //       }

  //       if (Math.abs(zvalIndex) > Math.abs(totalZ)) {
  //         totalZ = zvalIndex;
  //       }

  //       // GET MAXIMUM INTENSITY ON FILE
  //       if (intentIndex > totalIntent) {
  //         totalIntent = intentIndex;
  //       }

  //       contentarray.push([1, timestamp, xvalIndex, yvalIndex, zvalIndex, intentIndex]);
  //     }

  //   }

  //   let data = {
  //     "pgaX": totalX,
  //     "pgaY": totalY,
  //     "pgaZ": totalZ,
  //     "intensity": totalIntent,
  //     "content": contentarray,
  //   }

  //   responseHandler.sendResponse(res, "History successfuly fetched", 200, false, data);
  // }

  readDataLogGraph(path: string){
    let liner = new lineByLine(path);
    let line;
    let intent = 0;
    let x = 0;
    let y = 0;
    let z = 0;

    let contentarray = [];
    // //LOOP FILES CONTENT
    while (line = liner.next()) {
      // console.log('Line ' + lineNumber + ': ' + line.toString('ascii'));
      let data = line.toString().trim().split(',');

      let timestamp    = parseInt(data[1]);
      let xvalIndex    = parseFloat(data[2]);
      let yvalIndex    = parseFloat(data[3]);
      let zvalIndex    = parseFloat(data[4]);
      let intentIndex  = parseInt(data[5]);

       // GET MAXIMUM INTENSITY ON FILE
      if (Math.abs(xvalIndex) > Math.abs(x)) {
        x = xvalIndex;
      }

      if (Math.abs(yvalIndex) > Math.abs(y)) {
        y = yvalIndex;
      }

      if (Math.abs(zvalIndex) > Math.abs(z)) {
        z = zvalIndex;
      }

      // GET MAXIMUM INTENSITY ON FILE
      if (intentIndex > intent) {
        intent = intentIndex;
      }

      contentarray.push([
        timestamp,
        xvalIndex,
        yvalIndex,
        zvalIndex,
        intentIndex
      ]);
    }

    return [intent, x, y, z, contentarray];

  }



   //MAX AL
  public async getAllHistoryMax(req: Request, res: Response, next: NextFunction){
    try {
      let basePath = config.UPLOAD_STORAGE_DIR;

      let paths = [config.LOGS_EVENT_MAX_DIR, config.LOGS_UPLOADED_EVENT_MAX_DIR, config.LOGS_PER_MIN_DIR];

      let perminFileCount = fs.readdirSync(basePath+paths[2]);

      this.perminFileCount = perminFileCount.length;

      let uploadedFile = fs.readdirSync(basePath+paths[1]);

      this.uploadedCount = uploadedFile.length;

      uploadedFile.reverse();

      this.pathsList = this.mapArrayMax(uploadedFile, basePath+paths[1], "uploaded");

      if (this.pathsList.length < this.fileCount) {

        let lengthToFetch = this.fileCount - this.pathsList.length;

        let unuploadedFile = fs.readdirSync(basePath+paths[0]);

        this.unuploadedCount = unuploadedFile.length;

        unuploadedFile.reverse();

        let concatEvent = this.mapArrayMax(unuploadedFile, basePath+paths[0], "unuploaded");

        for(let x = 0; x < concatEvent.length; x++){
          this.pathsList.push(concatEvent[x]);
        }

      }

      this.getPathDatasMax(this.pathsList, res, next);

    } catch (err){
      logger.info("Error fetching history"+err);
      next(err)
    }
  }

  //MAX AL
  public async getHistoryMax(req: Request, res: Response, next: NextFunction){
    try {
      let basePath = config.UPLOAD_STORAGE_DIR;

      let paths = [config.LOGS_EVENT_MAX_DIR, config.LOGS_UPLOADED_EVENT_MAX_DIR, config.LOGS_PER_MIN_DIR];

      let perminFileCount = fs.readdirSync(basePath+paths[2]);

      this.perminFileCount = perminFileCount.length;

      let uploadedFile = fs.readdirSync(basePath+paths[1]);

      this.uploadedCount = uploadedFile.length;

      uploadedFile.reverse();

      this.pathsList = this.mapArrayMax(uploadedFile.slice(0, this.fileCount), basePath+paths[1], "uploaded");

      if (this.pathsList.length < this.fileCount) {

        let lengthToFetch = this.fileCount - this.pathsList.length;

        let unuploadedFile = fs.readdirSync(basePath+paths[0]);

        this.unuploadedCount = unuploadedFile.length;

        unuploadedFile.reverse();

        let concatEvent = this.mapArrayMax(unuploadedFile.slice(0, lengthToFetch), basePath+paths[0], "unuploaded");

        for(let x = 0; x < concatEvent.length; x++){
          this.pathsList.push(concatEvent[x]);
        }

      }


      this.getPathDatasMax(this.pathsList, res, next);

    } catch (err){
      logger.info("Error fetching history"+err);
      next(err)
    }
  }

  mapArrayMax(array: any, fullpath: string, status: string){
    return array.map(function(val: any, index: any){

      let file = val.replace('.log', '');

      return {
        "event_unique_id": file,
        "path": fullpath+"/"+val,
        "status": status,
        "intensity": 0,
        "timestamp": parseInt(val.substring(0,13))
      };
    });
  }

  async getPathDatasMax(paths: any, res: Response, next: NextFunction){

    if (paths.length == 0) {
      responseHandler.sendResponse(res, "No History fetched", 200, true);

      console.log("Path length == 0");
    }else{
      let counter = 0;
      let pathsLen = paths.length;

      for(var x = 0; x < pathsLen; x++){

        let path = paths[x]['path'];

        let intensity = this.readDataLogMax(path);

        if (intensity > paths[x]["intensity"]) {
          paths[x]["intensity"] = intensity;
        }

      }

      let data = {
        "history": paths,
        "unuploadedCount": this.unuploadedCount,
        "uploadedCount": this.uploadedCount,
        "perminFileCount": this.perminFileCount
      }

      responseHandler.sendResponse(res, "History fetched", 200, false, data);
    }


  }

  readDataLogMax(path: string){

    console.log(path);

    let liner = new lineByLine(path);
    let line;
    let intent = 0;

    // //LOOP FILES CONTENT
    while (line = liner.next()) {
      // console.log('Line ' + lineNumber + ': ' + line.toString('ascii'));
      let data = line.toString().trim().split(',');
      //console.log(data);

      let intentIndex = parseInt(data[5]);

      // GET MAXIMUM INTENSITY ON FILE
      if (intentIndex > intent) {
        intent = intentIndex;
      }
    }
    return intent;
  }

}
