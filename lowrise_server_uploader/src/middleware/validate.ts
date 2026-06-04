import { validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

export default (req: Request, res: Response, next: NextFunction) => {
	let errors = validationResult(req);

	if (!errors.isEmpty()) {
		return res.status(400).json({ message: 'Invalid parameters', stack: errors.array().map(obj => { return obj.msg }) });
	} else {
		next();
	}
}