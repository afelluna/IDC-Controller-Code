import { OnConnect, SocketController, ConnectedSocket, OnDisconnect, MessageBody, OnMessage } from "socket-controllers";
import { Request, Response, NextFunction } from "express";
import mtz from "moment-timezone";
import Database from "../database/mysqldatabase";
import logger from "../config/logger";
import ResponseHandler from "../middleware/responseHandler";
import config from "../config/config";
import app from "../app";

import RpiModule from "../classes/RpiModule";

let rpiMod = new RpiModule(app);

const fs         = require('fs');

const responseHandler = new ResponseHandler();
const date            = mtz().tz('Asia/Manila').format('YYYY-MM-DD HH:mm:ss');
const db              = new Database();
// const rpiMod          = new RpiModule();

@SocketController()
export class SocketEventController{

  @OnConnect()
  connection(@ConnectedSocket() socket: any) {


    console.log("client connected");
  }

  @OnDisconnect()
  disconnect(@ConnectedSocket() socket: any) {
    console.log("client disconnected");
  }




  //WHEN NODE EMIT REQUEST SETTINGS
  @OnMessage("request_settings")
  request_settings(@ConnectedSocket() socket: any, @MessageBody() message: any = []) {
    //RESET GPIO LIGHT
    rpiMod.closeGPIO();
    console.log(message[0]+" Sensor is requesting for settings");

    this.nodeSettings().then((res: any) => {
      let data = res[0];

      let config = {
        "xthold": data['xthold'],
        "ythold": data['ythold'],
        "zthold": data['zthold'],
        "warning": data['warning'],
        "warrant": data['warrant'],
        "usep": data['usep'],
        "tafter": data['tafter'],
        "tbefore": data['tbefore'],
        "datetime": new Date()
      }

      socket.emit("fetch_settings", config);
    });

  }

  @OnMessage("firstalarm")
  firstalarm(@ConnectedSocket() socket: any, @MessageBody() message: any = []) {

    let firstAlarmPath = config.UPLOAD_STORAGE_DIR+"/"+config.LOGS_FIRST_ALARM_DIR+"/"+message[1];

    try {
      fs.mkdir(firstAlarmPath, { recursive: true }, (err: any) => {
        if (err) throw "Error make first alarm directory";

        let io = app.get('socketio');

        io.emit("newfirstalarm", message[1]);

        console.log("First Alarm Success", message[0]);
      });

    }catch(err){
      logger.info("Error first alarm event file "+err);
    }

  }

  @OnMessage("node")
  node(@ConnectedSocket() socket: any, @MessageBody() message: any = []) {

    let nodename = message[0];
    let data = message[1];
    let io = app.get('socketio');

    io.emit(nodename, data);
  }

  @OnMessage("light")
  light(@ConnectedSocket() socket: any, @MessageBody() message: any = []) {

    let color = message[0];

    console.log(color);

    rpiMod.setGpioLedVal(color);
  }

  @OnMessage("announcement")
  announcement(@ConnectedSocket() socket: any, @MessageBody() message: any = []) {
    console.log(message);
    let color = message[0];

    rpiMod.runPA(color);
  }

  public sql: string = "";
  public param: any = [];
  public result: any;
  public newResult: any;

  async nodeSettings(){

    this.sql = "SELECT * FROM config_tbl LIMIT 1";

    return await db.query(this.sql);

  }

  constructor() {
  }

}