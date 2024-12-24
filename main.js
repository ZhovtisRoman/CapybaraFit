// -- Main Game Variables --
let score = 0;
let clickPower = 1;
let autoPoints = 0;

// DOM Elements
const screenClicker = document.getElementById('screenClicker');
const screenExercise = document.getElementById('screenExercise');
const clickButton = document.getElementById('clickButton');
const squatCountElem = document.getElementById('squatCount');
const videoElement = document.getElementById('exerciseCamera');
const finishExerciseBtn = document.getElementById('finishExerciseBtn');

// Create Canvas Overlay for Pose Indicators
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');

// Add the canvas overlay to the DOM
videoElement.parentNode.insertBefore(canvas, videoElement.nextSibling);
canvas.style.position = "absolute";
canvas.style.zIndex = "1";
canvas.style.pointerEvents = "none";

let squatCount = 0;
let isSquatting = false;
const squatGoal = 10;
let pose; // MediaPipe Pose instance
let poseActive = false;
let lastFrameTime = 0;

// Resize the canvas and video element dynamically for iPhone and PC
function resizeCanvas() {
  const container = document.getElementById('gameContainer');
  const containerWidth = container.clientWidth;
  const containerHeight = container.clientHeight;

  const videoHeight = containerHeight * 0.6;
  const videoWidth = containerWidth;

  videoElement.style.width = `${videoWidth}px`;
  videoElement.style.height = `${videoHeight}px`;

  canvas.width = videoElement.videoWidth;
  canvas.height = videoElement.videoHeight;

  canvas.style.width = videoElement.style.width;
  canvas.style.height = videoElement.style.height;
}
videoElement.addEventListener('loadeddata', resizeCanvas);
window.addEventListener('resize', resizeCanvas);

// Start Pose Exercise Logic
async function startPoseExercise() {
  squatCount = 0;
  isSquatting = false;
  updateSquatCount();

  if (!pose) {
    pose = new Pose({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
    });

    pose.setOptions({
      selfieMode: true,
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    pose.onResults(onPoseResults);
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    videoElement.srcObject = stream;
    videoElement.play();

    videoElement.addEventListener('loadeddata', () => {
      resizeCanvas();
      poseActive = true;
      sendVideoFrame();
    });
  } catch (error) {
    console.error("Camera access error:", error);
    alert("Unable to access the camera.");
  }
}

// Send Video Frames to Pose
function sendVideoFrame() {
  if (!poseActive) return;

  const now = performance.now();
  if (now - lastFrameTime >= 100) { // Throttle to 10 FPS
    lastFrameTime = now;
    pose.send({ image: videoElement });
  }

  requestAnimationFrame(sendVideoFrame);
}

// Handle Pose Results
function onPoseResults(results) {
  if (!results.poseLandmarks) return;

  // Clear the canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw landmarks and connections
  drawLandmarks(results.poseLandmarks);
  drawConnections(results.poseLandmarks);

  // Squat detection
  const leftHip = results.poseLandmarks[23];
  const leftKnee = results.poseLandmarks[25];
  const leftAnkle = results.poseLandmarks[27];

  if (!leftHip || !leftKnee || !leftAnkle) return;

  const hipKneeDistance = Math.abs(leftHip.y - leftKnee.y);
  const kneeAnkleDistance = Math.abs(leftKnee.y - leftAnkle.y);

  if (!isSquatting && hipKneeDistance < 0.1 && kneeAnkleDistance > 0.1) {
    isSquatting = true; // User is "down"
  }
  if (isSquatting && hipKneeDistance > 0.15) {
    isSquatting = false; // User has "stood up"
    squatCount++;
    updateSquatCount();

    if (squatCount >= squatGoal) {
      finishExercise();
    }
  }
}

// Update Squat Count Display
function updateSquatCount() {
  squatCountElem.textContent = `Squat Count: ${squatCount} / ${squatGoal}`;
}

// Draw Landmarks
function drawLandmarks(landmarks) {
  ctx.fillStyle = "red";

  const pointSize = Math.max(3, Math.min(canvas.width, canvas.height) * 0.01);

  landmarks.forEach((landmark) => {
    ctx.beginPath();
    ctx.arc(
      landmark.x * canvas.width,
      landmark.y * canvas.height,
      pointSize,
      0,
      2 * Math.PI
    );
    ctx.fill();
  });
}

// Draw Connections
function drawConnections(landmarks) {
  const connections = [
    [11, 12], [12, 24], [24, 26], [26, 28], // Right side
    [11, 23], [23, 25], [25, 27]           // Left side
  ];

  ctx.strokeStyle = "green";
  ctx.lineWidth = 2;

  connections.forEach(([startIdx, endIdx]) => {
    const start = landmarks[startIdx];
    const end = landmarks[endIdx];
    if (start && end) {
      ctx.beginPath();
      ctx.moveTo(start.x * canvas.width, start.y * canvas.height);
      ctx.lineTo(end.x * canvas.width, end.y * canvas.height);
      ctx.stroke();
    }
  });
}

// Finish Exercise
function finishExercise() {
  poseActive = false;
  const tracks = videoElement.srcObject?.getTracks();
  if (tracks) {
    tracks.forEach((track) => track.stop());
  }
  videoElement.srcObject = null;

  alert(`Exercise complete! You did ${squatCount} squats!`);
}

// Finish Exercise Button Handler
finishExerciseBtn.addEventListener('click', finishExercise);

// Start Exercise Button Handler
clickButton.addEventListener('click', () => {
  screenClicker.classList.remove('active');
  screenExercise.classList.add('active');
  startPoseExercise();
});
