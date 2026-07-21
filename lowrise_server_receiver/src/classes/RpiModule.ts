import logger from "../config/logger";
import config from "../config/config";

var os = require('os');

var exec = require('child_process').exec;

let Gpio: any;
let OMXPlayer: any;
let linuxPlat = false;



// var rpi_gpio_buttons = require('rpi-gpio-buttons');





if (os.platform() !== "win32") {
	linuxPlat = true;
	Gpio = require('onoff').Gpio;
	OMXPlayer = require('node-omxplayer');
}

console.log("Platform: " + os.platform());
console.log("Architecture: " + os.arch());

// Create shutdown function
function shutdown(callback: any) {
	exec('shutdown -r now', function (error: any, stdout: any, stderr: any) { callback(stdout); });
}



export default class RpiModule {

	buzz: any;
	green: any;
	yellow: any;
	red: any;

	// Tracks active alert status to prevent restarting audio mid-loop
	currentStatus: string = "";
	private pendingStatus: string = "";
	private audioDebounceTimer: any = null;

	// Priority weights: Higher numbers override lower numbers during rapid batch events
	private statusPriority: Record<string, number> = {
		"green": 1,
		"yellow": 2,
		"yellowred": 3
	};

	btn1: any;
	btn2: any;
	btn3: any;

	relais_1: any;
	relais_trigger: any;

	player: any;

	app: any;
	// buttons = rpi_gpio_buttons([20, 19, 16], { mode: rpi_gpio_buttons.MODE_BCM });


	lngPressCaliCount: number = 0;
	lngPressCali: boolean = false;
	lngPressCaliInter: any;



	constructor(app: any = null) {

		this.app = app;

		if (linuxPlat) {
			this.buzz = new Gpio(config.GPIO.buzz, 'out');
			this.green = new Gpio(config.GPIO.green, 'out');
			this.yellow = new Gpio(config.GPIO.yellow, 'out');
			this.red = new Gpio(config.GPIO.red, 'out');

			this.btn1 = new Gpio(config.GPIO.btn1, 'in', 'rising');
			this.btn2 = new Gpio(config.GPIO.btn2, 'in', 'both', { debounceTimeout: 500 });

			this.btn3 = new Gpio(config.GPIO.btn3, 'in', 'both', { debounceTimeout: 500 });

			this.relais_1 = new Gpio(config.GPIO.relais_1, 'out');
			this.relais_trigger = config.GPIO.relais_trigger;

			//this.player = OMXPlayer();


			//OFF RELAI
			this.relais_1.writeSync(this.relais_trigger == 'low' ? 1 : 0);


			this.btn2.watch((err: any, value: any) => { //Watch for hardware interrupts on pushButton GPIO, specify callback function
				if (err) { //if an error
					console.error('There was an error', err); //output error message to console
					return;
				}

				if (value) {
					//CHECK AND REST LONG PRESS EVENT

					this.startLngPressCalibration();
				} else {
					this.lngPressCalibrationCount = 0;
					this.stopLngPressCalibration();
				}


			});


			this.btn3.watch((err: any, value: any) => { //Watch for hardware interrupts on pushButton GPIO, specify callback function
				if (err) { //if an error
					console.error('There was an error', err); //output error message to console
					return;
				}


				if (value) {
					//CHECK AND REST LONG PRESS EVENT

					this.startLngPressCaliCount();
				} else {
					this.lngPressCaliCount = 0;
					this.stopLngPressCaliCount();
				}


			});


			//this.startLngPressCaliCount();
		}

	}


	lngPressCalibrationCount: number = 0;
	lngPressCalibration: boolean = false;
	lngPressCalibrationInter: any;



	startLngPressCalibration() {

		this.lngPressCalibrationInter = setInterval(() => {

			if (this.lngPressCalibrationCount > 4 && !this.lngPressCalibration) {

				this.lngPressCalibration = true;

				//USE CALIBRATION

				console.log("PLease calibrate");

				const io = this.app.get('socketio');

				io.emit("calibratesensor", "Calibrating Sensor ..");

				this.lngPressCalibrationCount = 0;

				setTimeout(() => {

					this.lngPressCalibration = false;

					console.log("Back to false " + this.lngPressCalibration);
				}, 60000);

				this.stopLngPressCalibration();

			} else {

				this.lngPressCalibrationCount++;

				console.log("Increment " + this.lngPressCalibrationCount);
			}



		}, 1000);

	}

	stopLngPressCalibration() {
		if (this.lngPressCalibrationInter) {
			clearInterval(this.lngPressCalibrationInter);
		}
	}


	startLngPressCaliCount() {


		this.lngPressCaliInter = setInterval(() => {

			if (this.lngPressCaliCount > 4 && !this.lngPressCali) {

				this.lngPressCali = true;

				//USE CALIBRATION

				//console.log("PLease calibrate");


				//const io = this.app.get('socketio');

				//io.emit("calibratesensor", "Calibrating Sensor ..");


				console.log("Rebooting rpi");

				exec('sudo reboot now', function (error: any, stdout: any, stderr: any) {

				});

				// // Reboot computer
				// shutdown(function(output: any){
				// 	console.log(output);
				// });


				// this.lngPressCaliCount = 0;

				// setTimeout(() => {

				// 	this.lngPressCali = false;

				// 	console.log("Back to false "+this.lngPressCali);
				// }, 60000);



				// this.stopLngPressCaliCount();

			} else {

				this.lngPressCaliCount++;

				console.log("Increment " + this.lngPressCaliCount);
			}



		}, 1000);

	}

	stopLngPressCaliCount() {
		if (this.lngPressCaliInter) {
			clearInterval(this.lngPressCaliInter);
		}
	}


	test() {
		setTimeout(() => {
			//omxplayer
			//this.player.newSource("assets/pa-green.mp3", 'both', false, 0, true);

			setTimeout(() => {
				//this.player.quit();
				this.test();
			}, 5000)


		}, 7000);
	}

	relaiInterval: any;

	relaiRunning: boolean = false;

	counter: number = 1;

	startRelaiInterval() {

		this.relaiRunning = true;
		this.relaiInterval = setInterval(() => {

			if (this.counter > 7) {
				this.stopRelaiInterval();
				console.log("interval Stopped");

				this.relaiRunning = false;
				this.counter = 1;

				this.relais_1.writeSync(this.relais_trigger == 'low' ? 1 : 0);
			}

			console.log(new Date);
			console.log(this.counter);

			this.counter++;

		}, 1000);

	}

	stopRelaiInterval() {
		if (this.relaiInterval) {
			clearInterval(this.relaiInterval);
		}
	}


	setGpioLedVal(gpio: string) {
		if (linuxPlat) {
			this.runPA(gpio);

			if (gpio == "green") {
				this.green.writeSync(1);
			} else if (gpio == "yellow") {
				this.green.writeSync(0);
				this.yellow.writeSync(1);
				this.buzz.writeSync(1);

				if (!this.relaiRunning) {

					this.relais_1.writeSync(this.relais_trigger == 'low' ? 0 : 1);
					this.startRelaiInterval();
				}

			} else if (gpio == "yellowred") {
				this.green.writeSync(0);
				this.yellow.writeSync(1);
				this.red.writeSync(1);
				this.buzz.writeSync(1);
			} else {
				this.green.writeSync(0);
				this.yellow.writeSync(0);
				this.red.writeSync(0);
				this.buzz.writeSync(0);
			}

		} else {
			console.log("Can't run gpio led");
		}

	}

	closeGPIO() {
		if (linuxPlat) {
			this.green.writeSync(0); // Turn LED off
			this.yellow.writeSync(0); // Turn LED off
			this.red.writeSync(0); // Turn LED off
			this.buzz.writeSync(0);
		} else {
			console.log("Can't close gpio led");
		}

	}

	unexportOnClose() { //function to run when exiting program
		if (linuxPlat) {
			this.closeGPIO();
			this.green.unexport(); // Unexport Button GPIO to free resources
			this.yellow.unexport();
			this.red.unexport();
			this.buzz.unexport();
			this.btn1.unexport();
			this.btn2.unexport();
			this.btn3.unexport();

		} else {
			console.log("Can't unexportOnClose");
		}

		process.exit(0);
	};


	runPA(data: string) {
		if (!data) return;

		const currentPendingPriority = this.statusPriority[this.pendingStatus] || 0;
		const incomingPriority = this.statusPriority[data] || 0;

		// Higher priority status overrides lower priority status in the same batch window.
		if (incomingPriority >= currentPendingPriority) {
			this.pendingStatus = data;
		}

		// Debounce window: Wait 150ms for rapid simultaneous triggers to finish firing.
		if (this.audioDebounceTimer) {
			clearTimeout(this.audioDebounceTimer);
		}

		this.audioDebounceTimer = setTimeout(() => {
			this.executeAudioTransition(this.pendingStatus);
			this.pendingStatus = "";
		}, 150);
	}

	private executeAudioTransition(targetStatus: string) {
		if (!targetStatus || targetStatus === this.currentStatus) {
			return;
		}

		this.currentStatus = targetStatus;

		let source = "";
		let loopFlag = "";

		if (targetStatus == "green") {
			source = "pa-green.mp3";
			loopFlag = ""; // Plays once
		} else if (targetStatus == "yellow") {
			source = "pa-yellow.mp3";
			loopFlag = "--loop -1"; // Loops continuously during warning
		} else if (targetStatus == "yellowred") {
			source = "pa-red.mp3";
			loopFlag = "--loop -1"; // Loops continuously during red alert
		}

		if (linuxPlat) {
			if (source) {
				exec(`pkill mpg123 > /dev/null 2>&1; mpg123 ${loopFlag} assets/${source} > /dev/null 2>&1 &`);
			} else {
				exec(`pkill mpg123 > /dev/null 2>&1 &`);
			}
		}

		console.log("Audio alert status settled and transitioned to:", targetStatus);
	}
}
