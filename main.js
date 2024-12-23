// main.js

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

// Upgrades
const costU1Elem = document.getElementById('costU1');
const buyU1 = document.getElementById('buyU1');
const costU2Elem = document.getElementById('costU2');
const buyU2 = document.getElementById('buyU2');
const costU3Elem = document.getElementById('costU3');
const buyU3 = document.getElementById('buyU3');
const costU4Elem = document.getElementById('costU4');
const buyU4 = document.getElementById('buyU4');
const costU5Elem = document.getElementById('costU5');
const buyU5 = document.getElementById('buyU5');

// Pose Exercise
const screenExercise = document.getElementById('screenExercise');
const finishExerciseBtn = document.getElementById('finishExerciseBtn');
const squatCountElem = document.getElementById('squatCount');
const videoElement = document.getElementById('exerciseCamera');

let squatCount = 0;
let isSquatting = false;
const squatGoal = 10;
let pose;   // Mediapipe Pose instance
let poseActive = false; // track if we're actively sending frames to Pose

// Display initial costs
costU1Elem.textContent = costU1;
costU2Elem.textContent = costU2;
costU3Elem.textContent = costU3;
costU4Elem.textContent = costU4;
costU5Elem.textContent = costU5;

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

  // Create new Pose instance if not existing
  pose = new Pose.Pose({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
  });

  // Pose options
  pose.setOptions({
    selfieMode: true,
    modelComplexity: 1,
    smoothLandmarks: true,
    enableSegmentation: false,
    smoothSegmentation: false,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });

  pose.onResults(onPoseResults);

  // Get camera
  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  videoElement.srcObject = stream;
  videoElement.play();

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

  // Example: use left side (hip: 23, knee: 25)
  const leftHip = results.poseLandmarks[23];
  const leftKnee = results.poseLandmarks[25];
  if (!leftHip || !leftKnee) return;

  // Basic squat detection by Y-coord difference
  const diff = leftHip.y - leftKnee.y;
  // if diff < 0.05 => user is "down"
  // if diff > 0.15 => user is "up"

  if (!isSquatting && diff < 0.05) {
    // user went down
    isSquatting = true;
  }
  if (isSquatting && diff > 0.15) {
    // user came up => count 1
    squatCount++;
    squatCountElem.textContent = squatCount;
    isSquatting = false;

    if (squatCount >= squatGoal) {
      finishExercise();
    }
  }
}

function finishExercise() {
  // Stop camera and pose
  stopPoseExercise();

  // Reward user if they reached 10
  if (squatCount >= squatGoal) {
    // e.g. +10 points
    score += 10;
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

// -- Upgrades Logic --

buyU1.addEventListener('click', () => {
  if (score >= costU1) {
    score -= costU1;
    clickPower += 1;
    costU1 += 10;
    costU1Elem.textContent = costU1;
    updateScoreUI();

    buyU1.classList.add('upgradeEffect');
    setTimeout(() => buyU1.classList.remove('upgradeEffect'), 500);
  } else {
    alert(`Not enough points! Need at least ${costU1}.`);
  }
});

buyU2.addEventListener('click', () => {
  if (score >= costU2) {
    score -= costU2;
    clickPower *= 2;
    costU2 += 100;
    costU2Elem.textContent = costU2;
    updateScoreUI();
  } else {
    alert(`Not enough points! Need at least ${costU2}.`);
  }
});

buyU3.addEventListener('click', () => {
  if (score >= costU3) {
    score -= costU3;
    autoPoints += 1;
    costU3 += 50;
    costU3Elem.textContent = costU3;
    updateScoreUI();
    updateAutoPointsUI();
  } else {
    alert(`Not enough points! Need at least ${costU3}.`);
  }
});

buyU4.addEventListener('click', () => {
  if (score >= costU4) {
    score -= costU4;
    autoPoints += 5;
    costU4 += 200;
    costU4Elem.textContent = costU4;
    updateScoreUI();
    updateAutoPointsUI();
  } else {
    alert(`Not enough points! Need at least ${costU4}.`);
  }
});

buyU5.addEventListener('click', () => {
  if (score >= costU5) {
    score -= costU5;
    clickPower *= 2;
    autoPoints *= 2;
    costU5 += 1000;
    costU5Elem.textContent = costU5;
    updateScoreUI();
    updateAutoPointsUI();
  } else {
    alert(`Not enough points! Need at least ${costU5}.`);
  }
});

// -- Tab Switching Logic --
tabClicker.addEventListener('click', () => {
  screenClicker.classList.add('active');
  screenUpgrades.classList.remove('active');
});
tabUpgrades.addEventListener('click', () => {
  screenUpgrades.classList.add('active');
  screenClicker.classList.remove('active');
});

// -- Update UI Functions --
function updateScoreUI() {
  scoreElement.textContent = `Score: ${score}`;
}
function updateAutoPointsUI() {
  autoPointsLabel.textContent = `Auto Points/sec: ${autoPoints}`;
}

// -- Auto Points Loop --
setInterval(() => {
  if (autoPoints > 0) {
    score += autoPoints;
    updateScoreUI();
  }
}, 1000);
