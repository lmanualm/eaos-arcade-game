const API_BASE_URL = (typeof window !== 'undefined' && window.API_BASE_URL) || '';
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreSpan = document.getElementById('score');
const gameOverDiv = document.getElementById('gameOver');

// Settings management
const settingsModal = document.getElementById('settingsModal');
const nicknameInput = document.getElementById('nicknameInput');
const soundToggle = document.getElementById('soundToggle');

// Default settings
let playerSettings = {
    playerId: 'default-player',
    nickname: 'Player',
    soundEnabled: true
};

// Get or create player ID (using session storage to persist across page reloads)
function getPlayerId() {
    let playerId = sessionStorage.getItem('playerId');
    if (!playerId) {
        playerId = 'player-' + Math.random().toString(36).substr(2, 9);
        sessionStorage.setItem('playerId', playerId);
    }
    return playerId;
}

// Load settings from backend API
async function loadSettings() {
    const playerId = getPlayerId();
    playerSettings.playerId = playerId;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/settings/${encodeURIComponent(playerId)}`);
        if (response.ok) {
            const data = await response.json();
            playerSettings = data;
            nicknameInput.value = playerSettings.nickname || 'Player';
            soundToggle.checked = playerSettings.soundEnabled !== false;
        } else {
            console.error('Failed to load settings from backend');
            setDefaultSettings();
        }
    } catch (err) {
        console.error('Error loading settings from backend:', err);
        setDefaultSettings();
    }
}

// Set default settings
function setDefaultSettings() {
    playerSettings.nickname = 'Player';
    playerSettings.soundEnabled = true;
    nicknameInput.value = playerSettings.nickname;
    soundToggle.checked = playerSettings.soundEnabled;
}

// Save settings to backend API
async function saveSettings() {
    playerSettings.nickname = nicknameInput.value || 'Player';
    playerSettings.soundEnabled = soundToggle.checked;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/settings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                playerId: playerSettings.playerId,
                nickname: playerSettings.nickname,
                soundEnabled: playerSettings.soundEnabled
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            playerSettings = data.settings;
            console.log('Settings saved successfully');
        } else {
            const error = await response.json();
            console.error('Failed to save settings:', error);
        }
    } catch (err) {
        console.error('Error saving settings:', err);
    }
    
    closeSettings();
}

// Open settings modal
function openSettings() {
    settingsModal.hidden = false;
    // Pause game if running
    const wasRunning = gameRunning;
    gameRunning = false;
    // Resume flag to restore after closing without saving
    settingsModal.dataset.wasRunning = wasRunning;
}

// Close settings modal without saving
function closeSettings() {
    settingsModal.hidden = true;
    // Restore game running state if it was running before
    if (settingsModal.dataset.wasRunning === 'true') {
        gameRunning = true;
    }
}

// Close modal when clicking outside the panel
settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
        closeSettings();
    }
});

// Prevent closing modal when clicking inside the panel
const settingsPanel = document.querySelector('.settings-panel');
if (settingsPanel) {
    settingsPanel.addEventListener('click', (e) => {
        e.stopPropagation();
    });
}

const W = 800;
const H = 600;
const PADDLE_W = 100;
const PADDLE_H = 14;
const PADDLE_Y = H - 40;
const BALL_R = 8;
const BRICK_ROWS = 5;
const BRICK_COLS = 8;
const BRICK_W = (W - (BRICK_COLS + 1) * 8) / BRICK_COLS;
const BRICK_H = 20;
const BRICK_TOP = 60;

let paddleX = (W - PADDLE_W) / 2;
let ballX = W / 2;
let ballY = PADDLE_Y - BALL_R - 2;
let ballDX = 4;
let ballDY = -4;
let score = 0;
let lives = 3;
let gameRunning = false;
let bricks = [];

const colors = ['#ff3333', '#ff8833', '#ffcc33', '#33cc33', '#3399ff'];

function initBricks() {
    bricks = [];
    for (let row = 0; row < BRICK_ROWS; row++) {
        bricks[row] = [];
        for (let col = 0; col < BRICK_COLS; col++) {
            bricks[row][col] = { alive: true };
        }
    }
}

function drawBricks() {
    for (let row = 0; row < BRICK_ROWS; row++) {
        for (let col = 0; col < BRICK_COLS; col++) {
            if (!bricks[row][col].alive) continue;
            const x = 8 + col * (BRICK_W + 8);
            const y = BRICK_TOP + row * (BRICK_H + 6);
            ctx.fillStyle = colors[row];
            ctx.fillRect(x, y, BRICK_W, BRICK_H);
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1;
            ctx.strokeRect(x, y, BRICK_W, BRICK_H);
        }
    }
}

function drawPaddle() {
    ctx.fillStyle = '#fff';
    ctx.fillRect(paddleX, PADDLE_Y, PADDLE_W, PADDLE_H);
}

function drawBall() {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(ballX, ballY, BALL_R, 0, Math.PI * 2);
    ctx.fill();
}

function draw() {
    ctx.clearRect(0, 0, W, H);
    drawBricks();
    drawPaddle();
    drawBall();
}

function update() {
    ballX += ballDX;
    ballY += ballDY;

    if (ballX - BALL_R <= 0 || ballX + BALL_R >= W) {
        ballDX = -ballDX;
    }
    if (ballY - BALL_R <= 0) {
        ballDY = -ballDY;
    }

    if (ballY + BALL_R >= H) {
        lives--;
        if (lives <= 0) {
            endGame();
            return;
        }
        resetBall();
    }

    if (
        ballY + BALL_R >= PADDLE_Y &&
        ballY + BALL_R <= PADDLE_Y + PADDLE_H &&
        ballX >= paddleX &&
        ballX <= paddleX + PADDLE_W
    ) {
        const hitPos = (ballX - paddleX) / PADDLE_W;
        const angle = (hitPos - 0.5) * Math.PI * 0.6;
        const speed = Math.sqrt(ballDX * ballDX + ballDY * ballDY);
        ballDX = Math.sin(angle) * speed;
        ballDY = -Math.abs(Math.cos(angle) * speed);
        ballY = PADDLE_Y - BALL_R;
    }

    for (let row = 0; row < BRICK_ROWS; row++) {
        for (let col = 0; col < BRICK_COLS; col++) {
            if (!bricks[row][col].alive) continue;
            const bx = 8 + col * (BRICK_W + 8);
            const by = BRICK_TOP + row * (BRICK_H + 6);

            let closestX = Math.max(bx, Math.min(ballX, bx + BRICK_W));
            let closestY = Math.max(by, Math.min(ballY, by + BRICK_H));
            let dx = ballX - closestX;
            let dy = ballY - closestY;

            if (dx * dx + dy * dy <= BALL_R * BALL_R) {
                bricks[row][col].alive = false;
                score += 10;
                scoreSpan.textContent = score;

                if (Math.abs(dx) > Math.abs(dy)) {
                    ballDX = -ballDX;
                } else {
                    ballDY = -ballDY;
                }

                if (allBricksGone()) {
                    gameRunning = false;
                    gameOverDiv.hidden = false;
                    gameOverDiv.textContent = 'YOU WIN!';
                    gameOverDiv.style.color = '#33ff33';
                }
                return;
            }
        }
    }
}

function allBricksGone() {
    for (let row = 0; row < BRICK_ROWS; row++) {
        for (let col = 0; col < BRICK_COLS; col++) {
            if (bricks[row][col].alive) return false;
        }
    }
    return true;
}

function resetBall() {
    ballX = W / 2;
    ballY = PADDLE_Y - BALL_R - 2;
    ballDX = 4 * (Math.random() > 0.5 ? 1 : -1);
    ballDY = -4;
    paddleX = (W - PADDLE_W) / 2;
}

function endGame() {
    gameRunning = false;
    gameOverDiv.hidden = false;
    gameOverDiv.textContent = 'GAME OVER';
    gameOverDiv.style.color = '#ff3333';
    
    // Submit score to leaderboard if score > 0
    if (score > 0) {
        submitScore();
    }
}

// Submit score to the leaderboard API
async function submitScore() {
    const playerName = playerSettings.nickname || 'Anonymous';
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/scores`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: playerName,
                score: score
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('Score submitted:', data);
            // Refresh leaderboard after submitting
            loadLeaderboard();
        } else {
            console.error('Failed to submit score');
        }
    } catch (err) {
        console.error('Error submitting score:', err);
    }
}

// Load and display leaderboard
async function loadLeaderboard() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/leaderboard`);
        if (response.ok) {
            const data = await response.json();
            displayLeaderboard(data.scores);
        } else {
            console.error('Failed to load leaderboard');
        }
    } catch (err) {
        console.error('Error loading leaderboard:', err);
    }
}

// Display leaderboard in the table
function displayLeaderboard(leaderboardScores) {
    const leaderboardList = document.getElementById('leaderboardList');
    if (!leaderboardList) return;
    
    leaderboardList.innerHTML = '';
    
    if (leaderboardScores.length === 0) {
        leaderboardList.innerHTML = '<div class="leaderboard-entry"><span colspan="3">No scores yet. Be the first!</span></div>';
        return;
    }
    
    leaderboardScores.forEach((entry, index) => {
        const entryDiv = document.createElement('div');
        entryDiv.className = 'leaderboard-entry';
        entryDiv.innerHTML = `
            <span class="rank">${index + 1}</span>
            <span class="player">${entry.name}</span>
            <span class="score">${entry.score}</span>
        `;
        leaderboardList.appendChild(entryDiv);
    });
}

function restart() {
    score = 0;
    lives = 3;
    scoreSpan.textContent = '0';
    gameOverDiv.hidden = true;
    initBricks();
    resetBall();
    gameRunning = true;
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') {
        paddleX = Math.max(0, paddleX - 20);
    } else if (e.key === 'ArrowRight') {
        paddleX = Math.min(W - PADDLE_W, paddleX + 20);
    } else if (e.key === ' ' && !gameRunning) {
        restart();
    }
});

function loop() {
    if (gameRunning) {
        update();
    }
    draw();

    if (!gameRunning && lives > 0 && allBricksGone()) {
        draw();
    }

    requestAnimationFrame(loop);
}

initBricks();
gameRunning = false;

// Load settings and leaderboard on page load
loadSettings();
loadLeaderboard();

loop();

// Navigation functions for landing page and game page
function startGame() {
    document.getElementById('landingPage').hidden = true;
    document.getElementById('gamePage').hidden = false;
    restart();
}

function backToLanding() {
    document.getElementById('gamePage').hidden = true;
    document.getElementById('landingPage').hidden = false;
    gameRunning = false;
    // Reload leaderboard when returning to landing
    loadLeaderboard();
}