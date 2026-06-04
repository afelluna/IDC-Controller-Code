import { Request, Response, NextFunction } from 'express';

export default class ResponseHandler {
  public sendResponse(res: Response,  message: string, status: number, error: boolean, data: any = null) {
    res.status(status).send({
      "message": message,
      "error": error,
      data
    });
  }
    
  public catchErrors(res: Response, validationError: any) {
    res.status(422).send({
      success: false,
      errors: validationError.message,
    });
  }
}