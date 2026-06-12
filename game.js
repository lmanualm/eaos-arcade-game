const API_BASE_URL = (typeof window !== 'undefined' && window.API_BASE_URL) || '';
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreSpan = document.getElementById('score');
const livesSpan = document.getElementById('lives');
const gameOverDiv = document.getElementById('gameOver');

// Landing page background canvas for particles
const bgCanvas = document.getElementById('bgCanvas');
let bgCtx = null;
let particles = [];
let bgAnimationId = null;

function initBgCanvas() {
    if (!bgCanvas) return;
    bgCtx = bgCanvas.getContext('2d');
    resizeBgCanvas();
    createParticles();
    animateParticles();
    window.addEventListener('resize', resizeBgCanvas);
}

function resizeBgCanvas() {
    if (!bgCanvas) return;
    bgCanvas.width = window.innerWidth;
    bgCanvas.height = window.innerHeight;
}

function createParticles() {
    particles = [];
    const count = Math.min(80, Math.floor((bgCanvas.width * bgCanvas.height) / 15000));
    for (let i = 0; i < count; i++) {
        particles.push({
            x: Math.random() * bgCanvas.width,
            y: Math.random() * bgCanvas.height,
            r: Math.random() * 2 + 0.5,
            dx: (Math.random() - 0.5) * 0.5,
            dy: (Math.random() - 0.5) * 0.5,
            alpha: Math.random() * 0.5 + 0.2
        });
    }
}

function animateParticles() {
    if (!bgCtx || !bgCanvas) return;
    bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
    for (const p of particles) {
        p.x += p.dx;
        p.y += p.dy;
        if (p.x < 0) p.x = bgCanvas.width;
        if (p.x > bgCanvas.width) p.x = 0;
        if (p.y < 0) p.y = bgCanvas.height;
        if (p.y > bgCanvas.height) p.y = 0;
        bgCtx.beginPath();
        bgCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        bgCtx.fillStyle = `rgba(0, 212, 255, ${p.alpha})`;
        bgCtx.fill();
    }
    // Draw subtle connection lines between nearby particles
    for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
            const dx = particles[i].x - particles[j].x;
            const dy = particles[i].y - particles[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 120) {
                bgCtx.beginPath();
                bgCtx.moveTo(particles[i].x, particles[i].y);
                bgCtx.lineTo(particles[j].x, particles[j].y);
                bgCtx.strokeStyle = `rgba(0, 212, 255, ${0.06 * (1 - dist / 120)})`;
                bgCtx.lineWidth = 0.5;
                bgCtx.stroke();
            }
        }
    }
    bgAnimationId = requestAnimationFrame(animateParticles);
}

function stopBgAnimation() {
    if (bgAnimationId) {
        cancelAnimationFrame(bgAnimationId);
        bgAnimationId = null;
    }
}

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

// localStorage abstraction for settings fallback
const localStorageSettings = {
    _key(playerId) {
        return 'breakout-settings-' + playerId;
    },
    get(playerId) {
        try {
            const raw = localStorage.getItem(this._key(playerId));
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            console.warn('localStorageSettings.get error:', e);
            return null;
        }
    },
    save(playerId, settings) {
        try {
            localStorage.setItem(this._key(playerId), JSON.stringify(settings));
        } catch (e) {
            console.warn('localStorageSettings.save error:', e);
        }
    },
    clear(playerId) {
        try {
            localStorage.removeItem(this._key(playerId));
        } catch (e) {
            console.warn('localStorageSettings.clear error:', e);
        }
    }
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

// Update landing page player badge
function updateLandingPlayerName(name) {
    const landingPlayerName = document.getElementById('landingPlayerName');
    if (landingPlayerName && name) {
        landingPlayerName.textContent = name;
    }
}

// Load settings from backend API (falls back to localStorage abstraction)
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
            updateLandingPlayerName(playerSettings.nickname || 'Player');
            // Cache successfully loaded settings to localStorage for offline fallback
            localStorageSettings.save(playerId, playerSettings);
            return;
        }
    } catch (err) {
        console.error('Error loading settings from backend:', err);
    }

    // Backend failed or unavailable — fall back to localStorage abstraction
    const cached = localStorageSettings.get(playerId);
    if (cached) {
        playerSettings = cached;
        nicknameInput.value = playerSettings.nickname || 'Player';
        soundToggle.checked = playerSettings.soundEnabled !== false;
        updateLandingPlayerName(playerSettings.nickname || 'Player');
        console.log('Loaded settings from localStorage fallback');
    } else {
        console.warn('No cached settings in localStorage; using defaults');
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

// Save settings to backend API (also caches via localStorage abstraction)
async function saveSettings() {
    playerSettings.nickname = nicknameInput.value || 'Player';
    playerSettings.soundEnabled = soundToggle.checked;

    // Update landing page badge immediately so the player sees their new nickname
    updateLandingPlayerName(playerSettings.nickname);

    // Always cache locally first so fallback works even if API is down
    localStorageSettings.save(playerSettings.playerId, playerSettings);

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

// --------------------------------------------------------------
// Audio system (Web Audio API – no external assets required)
// --------------------------------------------------------------
let audioCtx = null;

function getAudioContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtx;
}

function playTone(freq, duration, type = 'square', volume = 0.05) {
    if (!playerSettings.soundEnabled) return;
    try {
        const ctx = getAudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(volume, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + duration);
    } catch (e) {
        // Audio is best-effort; never break the game for a sound issue
    }
}

function soundHitWall()    { playTone(220, 0.08, 'square', 0.04); }
function soundHitPaddle()  { playTone(440, 0.10, 'square', 0.05); }
function soundHitBrick()   { playTone(660, 0.12, 'square', 0.05); }
function soundLoseLife()   { playTone(150, 0.25, 'sawtooth', 0.06); }
function soundWin()        {
    [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => playTone(f, 0.15, 'square', 0.06), i * 90));
}
function soundGameOver()   {
    [300, 250, 200].forEach((f, i) => setTimeout(() => playTone(f, 0.25, 'sawtooth', 0.06), i * 120));
}

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
        soundHitWall();
    }
    if (ballY - BALL_R <= 0) {
        ballDY = -ballDY;
        soundHitWall();
    }

    if (ballY + BALL_R >= H) {
        lives--;
        if (livesSpan) livesSpan.textContent = lives;
        soundLoseLife();
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
        soundHitPaddle();
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
                soundHitBrick();

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
                    soundWin();
                    if (score > 0) {
                        submitScore();
                    }
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
    soundGameOver();

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
    const leaderboardList = document.getElementById('leaderboardList');
    const leaderboardError = document.getElementById('leaderboardError');

    if (leaderboardList) {
        leaderboardList.innerHTML = '<div class="leaderboard-loading">Loading scores…</div>';
        leaderboardList.setAttribute('aria-busy', 'true');
    }
    if (leaderboardError) leaderboardError.hidden = true;

    try {
        const response = await fetch(`${API_BASE_URL}/api/leaderboard`);
        if (response.ok) {
            const data = await response.json();
            displayLeaderboard(data.scores);
        } else {
            throw new Error(`HTTP ${response.status}`);
        }
    } catch (err) {
        console.error('Error loading leaderboard:', err);
        if (leaderboardList) {
            leaderboardList.innerHTML = '';
            leaderboardList.setAttribute('aria-busy', 'false');
        }
        if (leaderboardError) leaderboardError.hidden = false;
    }
}

// Display leaderboard in the table
function displayLeaderboard(leaderboardScores) {
    const leaderboardList = document.getElementById('leaderboardList');
    if (!leaderboardList) return;

    leaderboardList.setAttribute('aria-busy', 'false');
    leaderboardList.innerHTML = '';

    if (!leaderboardScores || leaderboardScores.length === 0) {
        leaderboardList.innerHTML = '<div class="leaderboard-entry"><span class="player" style="grid-column: span 3; text-align:center;">No scores yet. Be the first!</span></div>';
        return;
    }

    leaderboardScores.forEach((entry, index) => {
        const entryDiv = document.createElement('div');
        entryDiv.className = 'leaderboard-entry';
        entryDiv.innerHTML = `
            <span class="rank">${index + 1}</span>
            <span class="player">${escapeHtml(entry.name)}</span>
            <span class="score">${entry.score}</span>
        `;
        leaderboardList.appendChild(entryDiv);
    });
}

// Simple HTML escape helper to prevent XSS in leaderboard names
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function restart() {
    score = 0;
    lives = 3;
    scoreSpan.textContent = '0';
    if (livesSpan) livesSpan.textContent = lives;
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

// Resume AudioContext on first user interaction (required by modern browsers)
function resumeAudioContext() {
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
    }
}
document.addEventListener('click', resumeAudioContext, { once: true });
document.addEventListener('keydown', resumeAudioContext, { once: true });

// Touch controls for mobile
function initTouchControls() {
    const touchLeft = document.getElementById('touchLeft');
    const touchRight = document.getElementById('touchRight');
    const touchControls = document.getElementById('touchControls');
    if (!touchLeft || !touchRight) return;

    // Show touch controls on touch-capable devices
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
        touchControls.hidden = false;
    }

    let leftInterval = null;
    let rightInterval = null;

    function startMoving(direction) {
        if (direction === 'left') {
            if (leftInterval) return;
            leftInterval = setInterval(() => {
                paddleX = Math.max(0, paddleX - 12);
            }, 16);
        } else {
            if (rightInterval) return;
            rightInterval = setInterval(() => {
                paddleX = Math.min(W - PADDLE_W, paddleX + 12);
            }, 16);
        }
    }

    function stopMoving(direction) {
        if (direction === 'left' && leftInterval) {
            clearInterval(leftInterval);
            leftInterval = null;
        }
        if (direction === 'right' && rightInterval) {
            clearInterval(rightInterval);
            rightInterval = null;
        }
    }

    touchLeft.addEventListener('touchstart', (e) => { e.preventDefault(); startMoving('left'); });
    touchLeft.addEventListener('touchend', (e) => { e.preventDefault(); stopMoving('left'); });
    touchLeft.addEventListener('touchcancel', (e) => { e.preventDefault(); stopMoving('left'); });
    touchLeft.addEventListener('mousedown', (e) => { e.preventDefault(); startMoving('left'); });
    touchLeft.addEventListener('mouseup', (e) => { e.preventDefault(); stopMoving('left'); });
    touchLeft.addEventListener('mouseleave', (e) => { e.preventDefault(); stopMoving('left'); });

    touchRight.addEventListener('touchstart', (e) => { e.preventDefault(); startMoving('right'); });
    touchRight.addEventListener('touchend', (e) => { e.preventDefault(); stopMoving('right'); });
    touchRight.addEventListener('touchcancel', (e) => { e.preventDefault(); stopMoving('right'); });
    touchRight.addEventListener('mousedown', (e) => { e.preventDefault(); startMoving('right'); });
    touchRight.addEventListener('mouseup', (e) => { e.preventDefault(); stopMoving('right'); });
    touchRight.addEventListener('mouseleave', (e) => { e.preventDefault(); stopMoving('right'); });

    // Swipe / drag on canvas to move paddle
    let isDragging = false;

    canvas.addEventListener('touchstart', (e) => {
        isDragging = true;
        updatePaddleFromTouch(e.touches[0].clientX);
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        e.preventDefault();
        updatePaddleFromTouch(e.touches[0].clientX);
    }, { passive: false });

    canvas.addEventListener('touchend', () => { isDragging = false; });
    canvas.addEventListener('touchcancel', () => { isDragging = false; });

    function updatePaddleFromTouch(clientX) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = W / rect.width;
        const x = (clientX - rect.left) * scaleX;
        paddleX = Math.max(0, Math.min(W - PADDLE_W, x - PADDLE_W / 2));
    }
}

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
initBgCanvas();
initTouchControls();
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