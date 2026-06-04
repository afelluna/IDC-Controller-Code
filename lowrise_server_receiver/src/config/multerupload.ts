import multer from "multer";
import path from "path";

export default class MulterUpload{

	storage: any;

	constructor(directory: string) {
		this.storage = multer.diskStorage({
			destination: function (req, file, cb) {

				let tempFolder = directory;

				cb(null, tempFolder)
			},
			filename: function (req, file, cb) {

				let rand = Math.random().toString(36).substring(2, 7);
				let extension = path.extname(file.originalname);        
				let basename = file.originalname.replace(extension,'');
				let filename = basename +"_"+Date.now() +"_"+rand + extension;

				console.log(filename);

				cb(null, filename) //Appending extension
			}
		})
	}

	getConfig(){
		return multer({ storage: this.storage });
	}
	
}