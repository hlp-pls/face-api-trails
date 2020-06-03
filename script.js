var isMobile = {
    Android: function() {
        return navigator.userAgent.match(/Android/i);
    },
    BlackBerry: function() {
        return navigator.userAgent.match(/BlackBerry/i);
    },
    iOS: function() {
        return navigator.userAgent.match(/iPhone|iPad|iPod/i);
    },
    Opera: function() {
        return navigator.userAgent.match(/Opera Mini/i);
    },
    Windows: function() {
        return navigator.userAgent.match(/IEMobile/i) || navigator.userAgent.match(/WPDesktop/i);
    },
    any: function() {
        return (isMobile.Android() || isMobile.BlackBerry() || isMobile.iOS() || isMobile.Opera() || isMobile.Windows());
    }
};

let is_model_loaded = false;
let webcam;

var landmark_points;
var offset;

let cam_width;
let cam_height;
let scr_scale;

let instruction_DOM = document.getElementById("instructions");
let count_DOM = document.getElementById("countdown");
let record_DOM = document.getElementById("record");
let sound_DOM = document.getElementById("sound");
//let countdown = Number(count_DOM.innerText.toString());
//let countRate = (isMobile.any())? 15 : 20;
let predictRate = (isMobile.any())? 10 : 2;

let count = 0;
let predict_count = 0;
let stage = 0;
let ease = 0.2;
let dx,dy;

let osc;
let is_playing = false;
let play_count = 0;
let play_rate = 30;

function setup(){
	createCanvas(windowWidth,windowHeight);
	noFill();
	strokeWeight(2);
	strokeJoin(ROUND);
	strokeCap(ROUND);
	//frameRate(30);
	Promise.all([
	faceapi.nets.tinyFaceDetector.loadFromUri('models/'),
	faceapi.nets.faceLandmark68TinyNet.loadFromUri('models/'),
	//faceapi.nets.faceRecognition.loadFromUri('/models'),
	//faceapi.nets.faceExpressionNet.loadFromUri('/models')
	]).then(modelLoaded);
	webcam = createCapture(VIDEO);
	webcam.hide();

	osc = new p5.Oscillator('sine');
}

sound_DOM.addEventListener("click",initSound,false);
sound_DOM.addEventListener("touchend",initSound,false);

function initSound(){
	if(!is_playing){
		osc.start(0.1);
		is_playing = true;
		sound_DOM.innerText = "Sound ON."
	}else{
		osc.stop(0.1);
		is_playing = false;
		sound_DOM.innerText = "Sound OFF."
	}
}

function windowResized(){
	resizeCanvas(windowWidth,windowHeight);
}

function modelLoaded(){
	console.log("model loaded");
	is_model_loaded = true;
}

function draw(){
	//background(255,0.5);

	translate(width/2,height/2);
	scale(-1,1);
	
	if(width>height){
		cam_width = height * webcam.width/webcam.height;
		cam_height = height;

	}else{
		cam_width = width;
		cam_height = width * webcam.height/webcam.width;

	}

	if(width>cam_width){
		scr_scale = width/cam_width;
		cam_width *= scr_scale;
		cam_height *= scr_scale;
	}else if(height>cam_height){
		scr_scale = height/cam_height;
		cam_width *= scr_scale;
		cam_height *= scr_scale;
	}

	if(is_model_loaded){

		/*image(	webcam,
			-cam_width/2,
			-cam_height/2,
			cam_width,cam_height);*/


		countdown = Number(count_DOM.innerText.toString());

		predict_count++;

		if(predict_count>predictRate){
			predict();
			predict_count = 0;
		}
		

		if(landmark_points){

			/*
			count++;

			if(count>countRate){
				count = 0;
				if(countdown>0){
					//count_DOM.innerText = countdown - 1 + "";
				}
			}
			
			*/

			if(stage==0){
				dx = landmark_points[0]._x;
				dy = landmark_points[0]._y;
			}
				
			dx += (landmark_points[stage]._x - dx) * ease;
			dy += (landmark_points[stage]._y - dy) * ease;

			if(dist(dx,dy,landmark_points[stage]._x,landmark_points[stage]._y)<2.0){
				stage++;
				if(stage>=landmark_points.length){
					stage = 0;
				}
			}

			let ex = -cam_width/2+dx;
			let ey = -cam_height/2+dy;

			//ellipse(ex,ey,20,20);

			let min_x = ex;
			let min_y = ey;
			let max_x = ex;
			let max_y = ey;

			beginShape();
			for(let i=0; i<stage; i++){
				let x = -cam_width/2+landmark_points[i]._x;
				let y = -cam_height/2+landmark_points[i]._y;

				if(min_x>x){ min_x = x; }
				if(min_y>y){ min_y = y; }

				if(max_x<x){ max_x = x; }
				if(max_y<y){ max_y = y; }

				//ellipse(x,y,4,4);
				vertex(x,y);
			}
			vertex(ex,ey);
			endShape();
			
			//console.log(min_x,min_y,max_x,max_y);

			if(countdown>0){
				
			}else{
				//instruction_DOM.innerText = "Recording.";
			}

			if(max_x-min_x!=0 && max_y-min_y!=0 && is_playing && stage < landmark_points.length-1){
				//console.log(dx,dy);
				let freq = 400*(max_x-ex)/(max_x-min_x)+100;
				let d_to_next = dist(landmark_points[stage]._x,landmark_points[stage]._y,landmark_points[stage+1]._x,landmark_points[stage+1]._y);
				let d_curr = dist(dx,dy,landmark_points[stage]._x,landmark_points[stage]._y);
			  	let amp = 0.8*(d_curr)/(d_to_next)+0.2;
			  	//console.log(freq,max_x);
			  	osc.freq(freq, 0.1);
			    osc.amp(amp, 0.1);
			}
		}


		
	}
	//console.log(landmark_points);
}

record_DOM.addEventListener("click",record,false);
record_DOM.addEventListener("touchend",record,false);

function record(){
	record_DOM.innerText = "Recording not ready."; 
}

async function predict(){
	let input_size = 160;
	if(isMobile.any()) input_size = 128;
	const options = new faceapi.TinyFaceDetectorOptions({ inputSize: input_size })
	const video = document.getElementsByTagName('video')[0];
	const displaySize = { width: cam_width, height: cam_height };
	const detections = await faceapi.detectAllFaces(
			video,
			new faceapi.TinyFaceDetectorOptions(options)
		).withFaceLandmarks(true)
		//console.log(detections)
		//console.log(detections[0].landmarks)
		const resizedDetections = faceapi.resizeResults(detections,displaySize);
	if(resizedDetections&&resizedDetections[0]){
		landmark_points = resizedDetections[0].landmarks._positions;
		offset = resizedDetections[0].landmarks._shift;
			//console.log(resizedDetections[0].landmarks._shift);
	}
} 
