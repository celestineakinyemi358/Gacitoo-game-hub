const gameBoard = document.getElementById('gameBoard');
const player = document.getElementById('player');
const scoreDisplay = document.getElementById('score');
const coinsDisplay = document.getElementById('coins');
const timeDisplay = document.getElementById('time');
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const pauseBtn = document.getElementById('pauseBtn');

let gameActive = false;
let gamePaused = false;
let playerX = 0;
let playerY = 0;
let score = 0;
let coins = 0;
let time = 0;
let difficulty = 'easy';
let obstaclesAvoided = 0;
let lastTime = 0;
let gameObjects = [];
let gameSpeed = 1;

const difficulties = {
    easy: { speed: 2, spawnRate: 0.015, spacing: 200 },
    normal: { speed: 3.5, spawnRate: 0.025, spacing: 150 },
    hard: { speed: 5, spawnRate: 0.035, spacing: 120 },
    insane: { speed: 7, spawnRate: 0.05, spacing: 100 }
};

const keyState = {};

window.addEventListener('keydown', (e) => {
    keyState[e.key.toUpperCase()] = true;
});

window.addEventListener('keyup', (e) => {
    keyState[e.key.toUpperCase()] = false;
});

function selectDifficulty(level) {
    difficulty = level;
    document.querySelectorAll('.difficulty-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
}

function startGame() {
    gameActive = true;
    gamePaused = false;
    score = 0;
    coins = 0;
    time = 0;
    obstaclesAvoided = 0;
    lastTime = 0;
    gameObjects = [];

    // Initialize player position after DOM is ready
    setTimeout(() => {
        playerX = gameBoard.clientWidth / 2;
        playerY = gameBoard.clientHeight - 80;
        updatePlayerPosition();
    }, 10);

    startScreen.style.display = 'none';
    gameOverScreen.classList.remove('active');
    gameBoard.classList.add('active');
    pauseBtn.style.display = 'inline-block';

    // Clear existing objects
    gameBoard.innerHTML = '<div class="player" id="player">🏃</div>';
    player = document.getElementById('player');

    updateHUD();
    requestAnimationFrame(gameLoop);
}

function gameLoop(currentTime) {
    if (!gameActive) return;

    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;

    if (!gamePaused) {
        update(deltaTime);
        render();
    }

    updateHUD();
    requestAnimationFrame(gameLoop);
}

function update(deltaTime) {
    // Update player position
    const moveSpeed = 300; // pixels per second
    const moveAmount = (moveSpeed * deltaTime) / 1000;

    if (keyState['ARROWLEFT'] || keyState['A']) {
        playerX -= moveAmount;
    }
    if (keyState['ARROWRIGHT'] || keyState['D']) {
        playerX += moveAmount;
    }

    // Keep player in bounds
    playerX = Math.max(0, Math.min(playerX, gameBoard.clientWidth - 40));
    updatePlayerPosition();

    // Update game objects
    const settings = difficulties[difficulty];
    const objectSpeed = settings.speed * 60; // pixels per second
    const moveAmountObj = (objectSpeed * deltaTime) / 1000;

    gameObjects.forEach(obj => {
        obj.y += moveAmountObj;
        obj.element.style.top = obj.y + 'px';
    });

    // Remove off-screen objects
    gameObjects = gameObjects.filter(obj => {
        if (obj.y > gameBoard.clientHeight + 50) {
            obj.element.remove();
            if (obj.type === 'obstacle') {
                obstaclesAvoided++;
            }
            return false;
        }
        return true;
    });

    // Spawn new objects
    if (Math.random() < settings.spawnRate) {
        if (Math.random() > 0.6) {
            spawnCoin();
        } else {
            spawnObstacle();
        }
    }

    // Check collisions
    checkCollisions();

    // Update score
    score += (deltaTime / 100); // Score increases over time
}

function render() {
    // Player position is already updated in update()
}

function spawnObstacle() {
    const obstacle = document.createElement('div');
    obstacle.className = 'obstacle';
    const randomX = Math.random() * (gameBoard.clientWidth - 60);

    obstacle.style.left = randomX + 'px';
    obstacle.style.top = '-60px';
    obstacle.innerHTML = '🚧';

    gameBoard.appendChild(obstacle);

    gameObjects.push({
        element: obstacle,
        x: randomX,
        y: -60,
        type: 'obstacle',
        width: 60,
        height: 60
    });
}

function spawnCoin() {
    const coin = document.createElement('div');
    coin.className = 'coin';
    const randomX = Math.random() * (gameBoard.clientWidth - 30);

    coin.style.left = randomX + 'px';
    coin.style.top = '-30px';
    coin.innerHTML = '💰';

    gameBoard.appendChild(coin);

    gameObjects.push({
        element: coin,
        x: randomX,
        y: -30,
        type: 'coin',
        width: 30,
        height: 30
    });
}

function checkCollisions() {
    const playerRect = {
        left: playerX,
        right: playerX + 40,
        top: playerY,
        bottom: playerY + 40
    };

    gameObjects.forEach(obj => {
        const objRect = {
            left: obj.x,
            right: obj.x + obj.width,
            top: obj.y,
            bottom: obj.y + obj.height
        };

        if (
            objRect.left < playerRect.right &&
            objRect.right > playerRect.left &&
            objRect.top < playerRect.bottom &&
            objRect.bottom > playerRect.top
        ) {
            if (obj.type === 'obstacle') {
                endGame();
            } else if (obj.type === 'coin') {
                coins++;
                score += 50;
                obj.element.remove();
                gameObjects = gameObjects.filter(o => o !== obj);
            }
        }
    });
}

function updatePlayerPosition() {
    if (player) {
        player.style.left = playerX + 'px';
        player.style.top = playerY + 'px';
    }
}

function updateHUD() {
    time = Math.floor(Date.now() / 100) % 10000;
    scoreDisplay.textContent = Math.floor(score);
    coinsDisplay.textContent = coins;
    timeDisplay.textContent = Math.floor(time / 10) + 's';
}

function togglePause() {
    gamePaused = !gamePaused;
    pauseBtn.textContent = gamePaused ? 'Resume' : 'Pause';
}

function endGame() {
    gameActive = false;
    pauseBtn.style.display = 'none';
    gameOverScreen.classList.add('active');
    document.getElementById('finalScore').textContent = Math.floor(score);
    document.getElementById('finalCoins').textContent = coins;
    document.getElementById('finalObstacles').textContent = obstaclesAvoided;

    // Save to leaderboard
    saveScore('Temple Run', Math.floor(score), difficulty, coins);
}

function restartGame() {
    startGame();
}

function goHome() {
    gameActive = false;
    window.location.href = '/HELLO%20WORLD/index.html';
}

function saveScore(game, score, difficulty, coins) {
    const leaderboard = JSON.parse(localStorage.getItem('leaderboard')) || [];
    leaderboard.push({
        game,
        score,
        difficulty,
        coins,
        date: new Date().toLocaleDateString()
    });
    leaderboard.sort((a, b) => b.score - a.score);
    localStorage.setItem('leaderboard', JSON.stringify(leaderboard.slice(0, 100)));
}
