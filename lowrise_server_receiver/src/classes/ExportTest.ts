class Test{
	
	value: any;

	constructor(){
		this.startInterval();
	}

	startInterval(){
		setInterval(() => {
			this.value = Math.random();
			
		}, 5000);
	}
}
////
export default Test;