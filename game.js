const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreSpan = document.getElementById('score');
const gameOverDiv = document.getElementById('gameOver');

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
gameRunning = true;
loop();