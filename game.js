// Game constants
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Paddle
const paddle = {
    x: canvas.width / 2 - 50,
    y: canvas.height - 30,
    width: 100,
    height: 15,
    speed: 6,
    dx: 0
};

// Ball
const ball = {
    x: canvas.width / 2,
    y: canvas.height - 50,
    radius: 6,
    dx: 3,
    dy: -3,
    speed: 3
};

// Bricks
let bricks = [];
const brickRowCount = 5;
const brickColumnCount = 8;
const brickWidth = (canvas.width - 20) / brickColumnCount;
const brickHeight = 20;
const brickPadding = 2;
const brickOffsetTop = 30;
const brickOffsetLeft = 10;

// Game state
let score = 0;
let level = 1;
let lives = 3;
let gameActive = false;
let gameOver = false;

// Initialize bricks
function initBricks() {
    bricks = [];
    for (let c = 0; c < brickColumnCount; c++) {
        bricks[c] = [];
        for (let r = 0; r < brickRowCount; r++) {
            bricks[c][r] = {
                x: c * (brickWidth + brickPadding) + brickOffsetLeft,
                y: r * (brickHeight + brickPadding) + brickOffsetTop,
                width: brickWidth,
                height: brickHeight,
                status: 1
            };
        }
    }
}

// Draw functions
function drawPaddle() {
    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
    ctx.strokeStyle = '#2E7D32';
    ctx.lineWidth = 2;
    ctx.strokeRect(paddle.x, paddle.y, paddle.width, paddle.height);
}

function drawBall() {
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#FF9800';
    ctx.fill();
    ctx.strokeStyle = '#F57C00';
    ctx.lineWidth = 2;
    ctx.stroke();
}

function drawBricks() {
    for (let c = 0; c < brickColumnCount; c++) {
        for (let r = 0; r < brickRowCount; r++) {
            if (bricks[c][r].status === 1) {
                const brick = bricks[c][r];
                ctx.fillStyle = '#2196F3';
                ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
                ctx.strokeStyle = '#1565C0';
                ctx.lineWidth = 1;
                ctx.strokeRect(brick.x, brick.y, brick.width, brick.height);
            }
        }
    }
}

function drawStats() {
    ctx.fillStyle = '#333';
    ctx.font = '16px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${score}`, 10, canvas.height - 10);
    
    ctx.textAlign = 'center';
    ctx.fillText(`Level: ${level}`, canvas.width / 2, canvas.height - 10);
    
    ctx.textAlign = 'right';
    ctx.fillText(`Lives: ${lives}`, canvas.width - 10, canvas.height - 10);
}

function drawStartMessage() {
    if (!gameActive) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 32px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Press SPACE to Start', canvas.width / 2, canvas.height / 2);
    }
}

// Collision detection
function collisionDetection() {
    for (let c = 0; c < brickColumnCount; c++) {
        for (let r = 0; r < brickRowCount; r++) {
            if (bricks[c][r].status === 1) {
                const brick = bricks[c][r];
                if (
                    ball.x > brick.x &&
                    ball.x < brick.x + brick.width &&
                    ball.y > brick.y &&
                    ball.y < brick.y + brick.height
                ) {
                    ball.dy = -ball.dy;
                    bricks[c][r].status = 0;
                    score += 10;
                    updateStats();
                    
                    // Check if all bricks destroyed
                    let allDestroyed = true;
                    for (let i = 0; i < brickColumnCount; i++) {
                        for (let j = 0; j < brickRowCount; j++) {
                            if (bricks[i][j].status === 1) {
                                allDestroyed = false;
                                break;
                            }
                        }
                        if (!allDestroyed) break;
                    }
                    
                    if (allDestroyed) {
                        levelUp();
                    }
                }
            }
        }
    }
}

function levelUp() {
    level++;
    score += 100;
    lives = Math.min(lives + 1, 5);
    ball.speed = 3 + (level - 1) * 0.5;
    resetBall();
    initBricks();
    gameActive = false;
    updateStats();
}

// Ball collision with paddle
function checkPaddleCollision() {
    if (
        ball.x > paddle.x &&
        ball.x < paddle.x + paddle.width &&
        ball.y + ball.radius > paddle.y &&
        ball.y + ball.radius < paddle.y + paddle.height
    ) {
        ball.dy = -Math.abs(ball.dy);
        
        // Add spin based on where ball hits paddle
        const hitPos = (ball.x - (paddle.x + paddle.width / 2)) / (paddle.width / 2);
        ball.dx = hitPos * ball.speed * 1.5;
    }
}

// Update functions
function updatePaddle() {
    paddle.x += paddle.dx;
    
    // Boundary checking
    if (paddle.x < 0) paddle.x = 0;
    if (paddle.x + paddle.width > canvas.width) {
        paddle.x = canvas.width - paddle.width;
    }
}

function updateBall() {
    ball.x += ball.dx;
    ball.y += ball.dy;
    
    // Wall collisions
    if (ball.x - ball.radius < 0 || ball.x + ball.radius > canvas.width) {
        ball.dx = -ball.dx;
    }
    if (ball.y - ball.radius < 0) {
        ball.dy = -ball.dy;
    }
    
    // Bottom collision (lose life)
    if (ball.y - ball.radius > canvas.height) {
        lives--;
        updateStats();
        
        if (lives <= 0) {
            endGame(false);
        } else {
            resetBall();
        }
    }
}

function resetBall() {
    ball.x = paddle.x + paddle.width / 2;
    ball.y = paddle.height + 50;
    ball.dx = 0;
    ball.dy = 0;
    gameActive = false;
}

function updateStats() {
    document.getElementById('score').textContent = score;
    document.getElementById('level').textContent = level;
    document.getElementById('lives').textContent = lives;
}

// Game loop
function update() {
    if (gameActive) {
        updatePaddle();
        updateBall();
        checkPaddleCollision();
        collisionDetection();
    }
}

function draw() {
    // Clear canvas
    ctx.fillStyle = '#F5F5F5';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw game elements
    drawBricks();
    drawBall();
    drawPaddle();
    drawStats();
    drawStartMessage();
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Keyboard controls
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') {
        paddle.dx = -paddle.speed;
    } else if (e.key === 'ArrowRight') {
        paddle.dx = paddle.speed;
    } else if (e.key === ' ') {
        e.preventDefault();
        if (!gameActive) {
            gameActive = true;
            if (ball.dx === 0 && ball.dy === 0) {
                ball.dx = 3;
                ball.dy = -3;
            }
        }
    }
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        paddle.dx = 0;
    }
});

// Game over
function endGame(won) {
    gameOver = true;
    gameActive = false;
    
    const modal = document.getElementById('gameOverModal');
    const title = document.getElementById('gameOverTitle');
    const message = document.getElementById('gameOverMessage');
    const finalScore = document.getElementById('finalScore');
    
    if (won) {
        title.textContent = 'You Won!';
        message.textContent = `Congratulations! You completed all levels.`;
    } else {
        title.textContent = 'Game Over';
        message.textContent = `You ran out of lives. Game ended at Level ${level}.`;
    }
    
    finalScore.textContent = score;
    modal.classList.remove('hidden');
}

// Initialize and start
initBricks();
resetBall();
updateStats();
gameLoop();
