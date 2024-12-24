// -- Main Game Variables --
let score = 0;
let clickPower = 1;   // how many points per click
let autoPoints = 0;   // how many points added automatically per second

// Upgrade costs (initial values)
let costU1 = 10;
let costU2 = 100;
let costU3 = 50;
let costU4 = 200;
let costU5 = 1000;

// DOM Elements
const tabClicker = document.getElementById('tabClicker');
const tabUpgrades = document.getElementById('tabUpgrades');
const screenClicker = document.getElementById('screenClicker');
const screenUpgrades = document.getElementById('screenUpgrades');
const scoreElement = document.getElementById('score');
const clickButton = document.getElementById('clickButton');
const autoPointsLabel = document.getElementById('autoPointsLabel');
const capybaraImg = document.getElementById('capybara');

// Pose Exercise
const screenExercise = document.getElementById('screenExercise');
const finishExerciseBtn = document.getElementById('finishExerciseBtn');
const squatCountElem = document.getElementById('squatCount');
const videoElement = document.getElementById('exerciseCamera');
const canvas = document.createElement('canvas'); // Canvas for drawing pose landmarks
const ctx = canvas.getContext('2d');

// Add the canvas overlay to the DOM
videoElement.parentNode.insertBefore(canvas, videoElement.nextSibling);
canvas.style.position = "absolute";
canvas.style.top = videoElement.offsetTop + "px";
canvas.style.left = videoElement.offsetLeft + "px";
canvas.style.zIndex = "1";
canvas.style.pointerEvents = "none";

let squatCount = 0;
let isSquatting = false;
const squatGoal = 10;
let pose;   // Mediapipe Pose instance
let poseActive = false; // Track if we're actively sending frames to Pose

// Initialize canvas size
function resizeCanvas() {
  canvas.width = videoElement.videoWidth;
  canvas.height = videoElement.videoHeight;
}
videoElement.addEventListener('loadeddata', resizeCanvas);
window.addEventListener('resize', resizeCanvas);

// Clicker main button -> Instead of +score, open exercise
clickButton.addEventListener('click', () => {
  // Show exercise screen, hide main
  screenClicker.classList.remove('active');
  screenExercise.classList.add('active');
  startPoseExercise();
});

// -- Pose Exercise Logic --

async function startPoseExercise() {
  squatCount = 0;
  isSquatting = false;
  squatCountElem.textContent = squatCount;

  // Create a new Pose instance
  if (!pose) {
    pose = new Pose({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
    });

    // Set Pose options
    pose.setOptions({
      selfieMode: true,
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    // Attach the onResults callback
    pose.onResults(onPoseResults);
  }

  // Start the camera
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    videoElement.srcObject = stream;
    videoElement.play();
  } catch (error) {
    alert("Unable to access the camera.");
    console.error(error);
    finishExercise();
    return;
  }

  // Start sending frames to Pose
  poseActive = true;
  videoElement.addEventListener('loadeddata', sendVideoFrame);
}

function sendVideoFrame() {
  if (!poseActive) return;
  pose.send({ image: videoElement });
  requestAnimationFrame(sendVideoFrame);
}

function onPoseResults(results) {
  if (!results.poseLandmarks) return;

  // Clear the canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw landmarks
  drawLandmarks(results.poseLandmarks);

  // Squat detection logic
  const leftHip = results.poseLandmarks[23];
  const leftKnee = results.poseLandmarks[25];
  if (!leftHip || !leftKnee) return;

  const diff = leftHip.y - leftKnee.y;

  if (!isSquatting && diff < 0.05) {
    isSquatting = true; // User is squatting
  }
  if (isSquatting && diff > 0.15) {
    isSquatting = false; // Squat completed
    squatCount++;
    squatCountElem.textContent = squatCount;

    if (squatCount >= squatGoal) {
      finishExercise();
    }
  }
}

function drawLandmarks(landmarks) {
  ctx.fillStyle = "red";
  ctx.strokeStyle = "green";
  ctx.lineWidth = 2;

  // Draw circles for landmarks
  landmarks.forEach((landmark) => {
    ctx.beginPath();
    const x = landmark.x * canvas.width;
    const y = landmark.y * canvas.height;
    ctx.arc(x, y, 5, 0, 2 * Math.PI);
    ctx.fill();
  });

  // Draw lines connecting landmarks (e.g., skeleton)
  const connections = [
    [11, 12], [12, 24], [24, 26], [26, 28], // Right leg
    [11, 23], [23, 25], [25, 27]           // Left leg
  ];
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

function finishExercise() {
  // Stop camera and pose
  stopPoseExercise();

  // Reward user if they reached 10
  if (squatCount >= squatGoal) {
    score += 10; // Reward example
    updateScoreUI();
  }

  // Return to main screen
  screenExercise.classList.remove('active');
  screenClicker.classList.add('active');
}

function stopPoseExercise() {
  poseActive = false;
  const tracks = videoElement.srcObject?.getTracks();
  if (tracks) {
    tracks.forEach((track) => track.stop());
  }
  videoElement.srcObject = null;
}

// Manual finish button
finishExerciseBtn.addEventListener('click', () => {
  finishExercise();
});

// -- Update UI Functions --
function updateScoreUI() {
  scoreElement.textContent = `Score: ${score}`;
}
