// -- Main Game Variables --
let score = 0;
let clickPower = 1;   // Points per click
let autoPoints = 0;   // Points added automatically per second

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
canvas.style.top = "0";
canvas.style.left = "0";
canvas.style.zIndex = "1";
canvas.style.pointerEvents = "none";

let squatCount = 0;
let isSquatting = false;
const squatGoal = 10;
let pose;   // MediaPipe Pose instance
let poseActive = false;
let lastFrameTime = 0;

// Resize canvas to match video feed and limit size
function resizeCanvas() {
  const containerWidth = window.innerWidth * 0.9; // 90% of screen width
  const containerHeight = window.innerHeight * 0.6; // 60% of screen height

  videoElement.style.width = `${containerWidth}px`;
  videoElement.style.height = `${containerHeight}px`;

  canvas.width = videoElement.videoWidth;
  canvas.height = videoElement.videoHeight;

  canvas.style.width = `${containerWidth}px`;
  canvas.style.height = `${containerHeight}px`;
}
videoElement.addEventListener('loadeddata', resizeCanvas);
window.addEventListener('resize', resizeCanvas);

// -- Start Exercise Logic --
async function startPoseExercise() {
  squatCount = 0;
  isSquatting = false;
  squatCountElem.textContent = squatCount;

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

// -- Send Video Frames to Pose --
function sendVideoFrame() {
  if (!poseActive) return;

  const now = performance.now();
  if (now - lastFrameTime >= 100) { // Throttle to 10 FPS
    lastFrameTime = now;
    pose.send({ image: videoElement });
  }

  requestAnimationFrame(sendVideoFrame);
}

// -- Handle Pose Results --
function onPoseResults(results) {
  if (!results.poseLandmarks) return;

  // Clear the canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw landmarks and connections
  drawLandmarks(results.poseLandmarks);
  drawConnections(results.poseLandmarks);

  // Squat detection
  const leftHip = results.poseLandmarks[23]; // Left hip
  const leftKnee = results.poseLandmarks[25]; // Left knee
  const leftAnkle = results.poseLandmarks[27]; // Left ankle

  if (!leftHip || !leftKnee || !leftAnkle) return;

  const hipKneeDistance = Math.abs(leftHip.y - leftKnee.y);
  const kneeAnkleDistance = Math.abs(leftKnee.y - leftAnkle.y);

  // Adjust thresholds for better squat detection
  if (!isSquatting && hipKneeDistance < 0.1 && kneeAnkleDistance > 0.1) {
    isSquatting = true; // User is "down"
  }
  if (isSquatting && hipKneeDistance > 0.15) {
    isSquatting = false; // User has "stood up"
    squatCount++;
    squatCountElem.textContent = squatCount;

    if (squatCount >= squatGoal) {
      finishExercise();
    }
  }
}

// -- Draw Landmarks --
function drawLandmarks(landmarks) {
  ctx.fillStyle = "red";

  const pointSize = Math.max(3, Math.min(canvas.width, canvas.height) * 0.01); // Dynamically scale point size

  landmarks.forEach((landmark) => {
    ctx.beginPath();
    ctx.arc(
      landmark.x * canvas.width,
      landmark.y * canvas.height,
      pointSize, // Use dynamic point size
      0,
      2 * Math.PI
    );
    ctx.fill();
  });
}

// -- Draw Connections --
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

// -- Finish Exercise --
function finishExercise() {
  poseActive = false;
  const tracks = videoElement.srcObject?.getTracks();
  if (tracks) {
    tracks.forEach((track) => track.stop());
  }
  videoElement.srcObject = null;

  // Reward the user
  alert(`Exercise complete! You did ${squatCount} squats!`);
}

// Button to finish exercise manually
finishExerciseBtn.addEventListener('click', finishExercise);

// Start exercise when clicking "Click" button
clickButton.addEventListener('click', () => {
  screenClicker.classList.remove('active');
  screenExercise.classList.add('active');
  startPoseExercise();
});
