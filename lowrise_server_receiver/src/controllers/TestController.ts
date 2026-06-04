import { Request, Response, NextFunction } from "express";
import mtz from "moment-timezone";
import Database from "../database/mysqldatabase";
import logger from "../config/logger";
import ResponseHandler from "../middleware/responseHandler";

const responseHandler = new ResponseHandler(); 

const date = mtz().tz('Asia/Manila').format('YYYY-MM-DD HH:mm:ss');

const db = new Database();

export default class TestController{
  constructor() {
    // super(ENV, Cart);
  }

  public async store(req: Request, res: Response, next: NextFunction){
    try {
      //const { type } = req.body;

      let result = await db.query("SELECT * FROM buildings");

      const connection = db.connection();
      
      connection.beginTransaction((err: any) => {
        if (err) { next(err) }

        connection.query('SELECT * FROM buildings LIMIT 1', (err: any, result: any, fields: any) => {
          if (err) { return connection.rollback(() => { next(err) }) }
          
          connection.commit((err: any) => {
              if (err) { connection.rollback(() => { next(err) }) }
             
              responseHandler.sendResponse(res, result, 200, false);
            })
          
        })
      })

    } catch (err) {
      logger.info(err);
      next(err)
    }
 
  }

  public async upload(req: Request, res: Response, next: NextFunction){
    try {
     
      responseHandler.sendResponse(res, "Upload test api success", 200, false);
    } catch (err){
      logger.info(err);
      next(err)
    }
  }
}