// Ensure we can use Node.js APIs
const fs = require('fs');
const dgram = require('dgram');

const imagePath = '/tmp/output.jpg';
const imageElement = document.getElementById('image');
let lastImageUpdateTime = Date.now(); // Initialize to current time to display the first image

const timeout = 5000; // ms

const imageUpdateInterval = 30; // ms - 30 fps
const oversampling_rate = 1; // sample at N times the update frequency
const fetchInterval = imageUpdateInterval / oversampling_rate;

const udpPort = 5002;
const udpServer = dgram.createSocket('udp4');

// Variables to store the latest detected face count and attending face count
let total_faces = 'N/A';
let attending_faces = 'N/A';

/*
--------------------------------------------------------------------------------------------------------------------------------
EDIT BELOW FOR PRESENTATION CHANGES
--------------------------------------------------------------------------------------------------------------------------------
*/

const IMAGE_LOCATION_TOP = 50;
const image_location_top = IMAGE_LOCATION_TOP;
const image_location_left = 90;
const iframe_location_left = 25;
const vidPath = '/meet-brightsign.mp4'

/*
--------------------------------------------------------------------------------------------------------------------------------
EDIT ABOVE FOR PRESENTATION CHANGES
--------------------------------------------------------------------------------------------------------------------------------
*/

function main() {
  console.log('In Main - Remote Liftoff!');
  // Fetch the image fetchInterval times per second
  setInterval(fetchImage, fetchInterval);

  // Set the video zone src to the VideoPath
  const videoZone = document.getElementById('video');
  videoZone.src = vidPath;

  // Set the image location on the screen
  const imageContainer = document.getElementById('image-container');
  imageContainer.style.left = image_location_left + '%';
  imageContainer.style.top = image_location_top + '%';

  // Set the iframe location on the screen
  const iframeContainer = document.getElementById('iframe-container');
  iframeContainer.style.left = iframe_location_left + '%';
  iframeContainer.style.top = image_location_top + '%';

  // Bind the UDP server to the specified port
  udpServer.bind(udpPort, () => {
    console.log(`UDP server listening on port ${udpPort}`);
  });

  // Listen for UDP messages
  udpServer.on('message', (msg, rinfo) => {
    // Parse the incoming message
    handleUdpMessage(msg);
  });
}

window.onload = main;

// Functions
function fetchImage() {
  fs.stat(imagePath, (err, stats) => {
    if (err) {
      console.log('Error reading image file:', err);
      return;
    }

    if (stats.mtimeMs > lastImageUpdateTime) {
      lastImageUpdateTime = stats.mtimeMs;
      fs.readFile(imagePath, (err, data) => {
        if (err) {
          console.log('Error reading image file:', err);
          return;
        }

        const base64Image = `data:image/jpeg;base64,${data.toString('base64')}`;
        const tempImage = new Image();
        tempImage.onload = () => {
          imageElement.src = base64Image;
          imageElement.style.display = 'block';
        };
        tempImage.src = base64Image;
      });
    } else if (Date.now() - lastImageUpdateTime > timeout) {
      console.log('No image update in the last 5 seconds');
      lastImageUpdateTime = Date.now(); // reset
      imageElement.src = 'none';
      imageElement.style.display = 'none';
    }
  });
}

function handleUdpMessage(msg) {
  const message = msg.toString();
  console.log(`Received message: ${message}`);
  // Update the corresponding variable

  if (udpPort === 5000) {
    const [variable, value] = message.split(':');
    if (variable === 'session_last_0s') {
      sessionLast0s = value;
    } else if (variable === 'session_last_30s') {
      sessionLast30s = value;
    } else if (variable === 'session_last_5m') {
      sessionLast5m = value;
    }
  } else if (udpPort === 5001) {
    // Parse the JSON message
    const data = JSON.parse(message);
    // Validate the structure
    if (
      typeof data === 'object' &&
      'all_sessions_count' in data &&
      'sessions_last_0s' in data &&
      'sessions_last_30s' in data &&
      'sessions_last_5m' in data
    ) {
      // Update the variables
      sessionLast0s = data.sessions_last_0s;
      sessionLast30s = data.sessions_last_30s;
      sessionLast5m = data.sessions_last_5m;
    } else {
      console.log('Invalid JSON structure.');
    }
  } else if (udpPort === 5002) {
    // Parse the JSON message
    const data = JSON.parse(message);
    console.log(data);
    // Validate the structure
    if (
      typeof data === 'object' &&
      'faces_in_frame_total' in data &&
      'faces_attending' in data
    ) {
      // Update the variables
      total_faces = data.faces_in_frame_total;
      attending_faces = data.faces_attending;
    } else {
      console.log('Invalid JSON structure.');
    }
  }

}

