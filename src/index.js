// Ensure we can use Node.js APIs
const fs = require('fs');
const dgram = require('dgram');

const imagePath = '/tmp/output.jpg';
const imageElement = document.getElementById('image');
let lastImageUpdateTime = 0; // Initialize to 0 to display the existing image on startup

const timeout = 5000; // ms

const imageUpdateInterval = 30; // ms - 30 fps
const oversampling_rate = 1; // sample at N times the update frequency
const fetchInterval = imageUpdateInterval / oversampling_rate;

let latestFrameBuffer = null;
let isRenderLoopRunning = false;

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

const vidPath = '/meet-brightsign.mp4'
const grafanaDashboardPath = '/d/argus-analytics-main/argus-people-analytics?orgId=1&from=now-1h&to=now&timezone=browser&var-datasource=prometheus&var-device=$__all&var-stream=$__all&refresh=5s&kiosk'

/*
--------------------------------------------------------------------------------------------------------------------------------
EDIT ABOVE FOR PRESENTATION CHANGES
--------------------------------------------------------------------------------------------------------------------------------
*/

function isXT5Device() {
  const params = new URLSearchParams(window.location.search);
  const model = params.get('model') || '';
  console.log('Detected device model:', model);
  return model.toUpperCase().startsWith('XT');
}

function main() {
  console.log('In Main - Remote Liftoff!');
  // Fetch the image fetchInterval times per second
  setInterval(fetchImage, fetchInterval);

  // Start the render loop using requestAnimationFrame
  startRenderLoop();

  // Set the video zone src to the VideoPath
  const videoZone = document.getElementById('video');
  videoZone.src = vidPath;

  if (isXT5Device()) {
    const grafanaUrl = 'http://localhost:3000' + grafanaDashboardPath;
    const grafanaContainer = document.getElementById('grafana-container');
    const grafanaIframe = document.getElementById('grafana-iframe');
    grafanaIframe.src = grafanaUrl;
    grafanaContainer.style.display = 'block';
    console.log('XT5 detected - Grafana dashboard enabled:', grafanaUrl);
  } else {
    console.log('Non-XT5 device - Grafana dashboard disabled');
  }

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

        if (data.length === 0) {
          return;
        }

        const base64Image = `data:image/jpeg;base64,${data.toString('base64')}`;
        const tempImage = new Image();
        tempImage.onload = () => {
          latestFrameBuffer = base64Image;
        };
        tempImage.onerror = () => {
          console.log('Failed to decode image, skipping frame');
        };
        tempImage.src = base64Image;
      });
    }
  });
}

function startRenderLoop() {
  if (!isRenderLoopRunning) {
    isRenderLoopRunning = true;
    renderLoop();
  }
}

function renderLoop() {
  if (latestFrameBuffer !== null) {
    imageElement.src = latestFrameBuffer;
  }

  requestAnimationFrame(renderLoop);
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

