import * as Express from "express";

import { Request, Response, NextFunction } from "express";

import { check, body } from "express-validator";
import validate from "../middleware/validate";

import config from "../config/config";
import logger from "../config/logger";

import { UploadController } from "../controllers/UploadController";
import { ConfigController } from "../controllers/ConfigController";

import MulterUpload from "../config/multerupload";

const router = Express.Router();

let uploadCtrl = new UploadController();
let configCtrl = new ConfigController();





router.post('/uploadPermin', [
		check('node_name', 'node name is required').not().isEmpty(),
	], (req: Request, res: Response, next: NextFunction) => {

		validate(req, res, next);
	}, uploadCtrl.uploadPermin.bind(uploadCtrl));

router.post('/upload', [
		check('node_name', 'node name is required').not().isEmpty(),
	], (req: Request, res: Response, next: NextFunction) => {

		validate(req, res, next);
	}, uploadCtrl.firstAlarm.bind(uploadCtrl));


router.post('/uploadEvents', [
		check('node_name', 'node name is required').not().isEmpty(),
		check('eventId', 'eventId is required').not().isEmpty(),
	], (req: Request, res: Response, next: NextFunction) => {

		validate(req, res, next);
	}, uploadCtrl.uploadEvents.bind(uploadCtrl));

router.post('/uploadEventMax', [
		check('node_name', 'node name is required').not().isEmpty(),
		check('eventId', 'eventId is required').not().isEmpty(),
	], (req: Request, res: Response, next: NextFunction) => {

		validate(req, res, next);
	}, uploadCtrl.uploadEventMax.bind(uploadCtrl));

router.get('/getHistory', [
	], (req: Request, res: Response, next: NextFunction) => {
		validate(req, res, next);
	}, uploadCtrl.getHistory.bind(uploadCtrl));

router.get('/watchPerminDir', [
	], (req: Request, res: Response, next: NextFunction) => {
		validate(req, res, next);
	}, uploadCtrl.watchPerminDir.bind(uploadCtrl));

router.get('/getHistoryMax', [
	], (req: Request, res: Response, next: NextFunction) => {
		validate(req, res, next);
	}, uploadCtrl.getHistoryMax.bind(uploadCtrl));

router.get('/getAllHistoryMax', [
	], (req: Request, res: Response, next: NextFunction) => {
		validate(req, res, next);
	}, uploadCtrl.getAllHistoryMax.bind(uploadCtrl));


router.post('/getBefore', [
		check('eventId', 'eventId is required').not().isEmpty(),
		check('path', 'path is required').not().isEmpty(),
	], (req: Request, res: Response, next: NextFunction) => {

		validate(req, res, next);
	}, uploadCtrl.getBefore.bind(uploadCtrl));

router.post('/getAfter', [
		check('eventId', 'eventId is required').not().isEmpty(),
		check('path', 'path is required').not().isEmpty(),
	], (req: Request, res: Response, next: NextFunction) => {

		validate(req, res, next);
	}, uploadCtrl.getAfter.bind(uploadCtrl));

router.post('/getDuring', [
		check('eventId', 'eventId is required').not().isEmpty(),
		check('path', 'path is required').not().isEmpty(),
	], (req: Request, res: Response, next: NextFunction) => {

		validate(req, res, next);
	}, uploadCtrl.getDuring.bind(uploadCtrl));


router.get('/getSensorConfig', [
	], (req: Request, res: Response, next: NextFunction) => {
		validate(req, res, next);
	}, configCtrl.getSensorConfig.bind(configCtrl));


router.post('/updateIntensity', [
		check('warning', 'warning is required').not().isEmpty(),
		check('warrant', 'alert is required').not().isEmpty(),
		check('xthold', 'xthold is required').not().isEmpty(),
		check('ythold', 'ythold is required').not().isEmpty(),
		check('zthold', 'zthold is required').not().isEmpty(),
	], (req: Request, res: Response, next: NextFunction) => {
		validate(req, res, next);
	}, configCtrl.updateIntensity.bind(configCtrl));




router.post('/updateDeviceInfo', [
		check('device_name', 'device_name is required').not().isEmpty(),
		check('location', 'location is required').not().isEmpty(),
		check('latitude', 'latitude is required').isFloat(),
		check('longitude', 'longitude is required').isFloat(),
	], (req: Request, res: Response, next: NextFunction) => {
		validate(req, res, next);
	}, configCtrl.updateDeviceInfo.bind(configCtrl));


router.get('/getDiskSpace', [
	], (req: Request, res: Response, next: NextFunction) => {
		validate(req, res, next);
	}, configCtrl.getDiskSpace.bind(configCtrl));


router.post('/loginUser', [
	 	check('username', 'username is required').not().isEmpty(),
	 	check('password', 'password is required').not().isEmpty(),
	], (req: Request, res: Response, next: NextFunction) => {
		validate(req, res, next);
	}, configCtrl.loginUser.bind(configCtrl));

router.post('/changePass', [
	 	// check('username', 'username is required').not().isEmpty(),
	 	check('newpassword', 'password is required').not().isEmpty(),
	], (req: Request, res: Response, next: NextFunction) => {
		validate(req, res, next);
	}, configCtrl.changePass.bind(configCtrl));


router.post('/calibrate', [
	], (req: Request, res: Response, next: NextFunction) => {
		validate(req, res, next);
	}, configCtrl.calibrate.bind(configCtrl));


router.get('/backUp/:startDate/:hour', [
	// check('startDate', 'startDate is required').not().isEmpty(),
	// check('endDate', 'endDate is required').not().isEmpty(),
], (req: Request, res: Response, next: NextFunction) => {
	validate(req, res, next);
}, configCtrl.backUp.bind(configCtrl));


router.get('/availableHour/:startDate', [
	// check('startDate', 'startDate is required').not().isEmpty(),
	// check('endDate', 'endDate is required').not().isEmpty(),
], (req: Request, res: Response, next: NextFunction) => {
	validate(req, res, next);
}, configCtrl.availableHour.bind(configCtrl));


export default router;