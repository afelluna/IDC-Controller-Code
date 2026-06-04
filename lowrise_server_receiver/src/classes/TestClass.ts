import logger from "../config/logger";
import ResponseHandler from "../middleware/responseHandler";
import config from "../config/config";
import fsExtra from "fs-extra";
import path from "path";
import request from "request";

const lineByLine      = require('n-readlines');
const fs              = require('fs');
//const request 		  = require('request');

var rp = require('request-promise');

export default class TestClass{
	
	constructor(){
		this.init();
	}

	init(){
		var options = {
		    method: 'GET',
		    uri: 'http://localhost:3000/getSensorConfig',
		    // formData: {
		    //     // Like <input type="text" name="name">
		    //     name: 'Jenn',
		    //     // Like <input type="file" name="file">
		    //     file: {
		    //         value: fs.createReadStream('test/test.jpg'),
		    //         options: {
		    //             filename: 'test.jpg',
		    //             contentType: 'image/jpg'
		    //         }
		    //     }
		    // },
		    // headers: {
		    //     /* 'content-type': 'multipart/form-data' */ // Is set automatically
		    // }
		};
		 
		// rp(options)
		    // .then(function (body: any) {
		    //     console.log(body);
		    // })
		    // .catch(function (err: any) {
		    //     console.log(err);
		    // });

		let promises = [rp(options), rp(options)];
		
		Promise.all(promises).then((results) => {
			console.log(results);
		}).catch((err) => {
			console.log(err);
		});
	}

}