const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set canvas size
canvas.width = 800;
canvas.height = 600;

// Load images
const backgroundImage = new Image();
backgroundImage.src = 'assets/img/space-bg.png';

const playerImage = new Image();
playerImage.src = 'assets/img/spaceship.png';

const asteroidImage = new Image();
asteroidImage.src = 'assets/img/asteroid.png';

// Game state
let gameRunning = false;
let score = 0;
let lives = 3;
let asteroids = [];
let bullets = [];
let gameLoop;
let backgroundY = 0;

// Player ship
const player = {
    x: canvas.width / 2,
    y: canvas.height - 100,
    width: 64, // Adjust based on your spaceship image size
    height: 64, // Adjust based on your spaceship image size
    speed: 5
};

// Game objects
class Asteroid {
    constructor() {
        this.width = 48; // Adjust based on your asteroid image size
        this.height = 48; // Adjust based on your asteroid image size
        this.x = Math.random() * (canvas.width - this.width);
        this.y = -this.height;
        this.speed = Math.random() * 2 + 1;
        this.rotation = 0;
        this.rotationSpeed = (Math.random() - 0.5) * 0.1;
    }

    update() {
        this.y += this.speed;
        this.rotation += this.rotationSpeed;
        return this.y > canvas.height;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x + this.width/2, this.y + this.height/2);
        ctx.rotate(this.rotation);
        ctx.drawImage(asteroidImage, -this.width/2, -this.height/2, this.width, this.height);
        ctx.restore();
    }
}

class Bullet {
    constructor(x, y) {
        this.width = 4;
        this.height = 10;
        this.x = x;
        this.y = y;
        this.speed = 7;
        this.color = '#fff';
    }

    update() {
        this.y -= this.speed;
        return this.y < 0;
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}

// Controls
const keys = {
    left: false,
    right: false,
    space: false
};

document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = true;
    if (e.key === 'ArrowRight' || e.key === 'd') keys.right = true;
    if (e.key === ' ') keys.space = true;
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = false;
    if (e.key === 'ArrowRight' || e.key === 'd') keys.right = false;
    if (e.key === ' ') keys.space = false;
});

// Scrolling background
function drawBackground() {
    ctx.drawImage(backgroundImage, 0, backgroundY, canvas.width, canvas.height);
    ctx.drawImage(backgroundImage, 0, backgroundY - canvas.height, canvas.width, canvas.height);
    
    backgroundY += 0.5;
    if (backgroundY >= canvas.height) {
        backgroundY = 0;
    }
}

// Game functions
function updatePlayer() {
    if (keys.left && player.x > 0) player.x -= player.speed;
    if (keys.right && player.x < canvas.width - player.width) player.x += player.speed;
    
    if (keys.space) {
        if (!player.lastShot || Date.now() - player.lastShot > 250) {
            bullets.push(new Bullet(player.x + player.width / 2 - 2, player.y));
            player.lastShot = Date.now();
        }
    }
}

function drawPlayer() {
    ctx.drawImage(playerImage, player.x, player.y, player.width, player.height);
}

function checkCollisions() {
    // Check bullet-asteroid collisions
    bullets.forEach((bullet, bulletIndex) => {
        asteroids.forEach((asteroid, asteroidIndex) => {
            if (bullet.x < asteroid.x + asteroid.width &&
                bullet.x + bullet.width > asteroid.x &&
                bullet.y < asteroid.y + asteroid.height &&
                bullet.y + bullet.height > asteroid.y) {
                bullets.splice(bulletIndex, 1);
                asteroids.splice(asteroidIndex, 1);
                score += 10;
                document.getElementById('scoreValue').textContent = score;
            }
        });
    });

    // Check player-asteroid collisions
    asteroids.forEach((asteroid, index) => {
        if (player.x < asteroid.x + asteroid.width - 20 &&
            player.x + player.width - 20 > asteroid.x &&
            player.y < asteroid.y + asteroid.height - 20 &&
            player.y + player.height - 20 > asteroid.y) {
            asteroids.splice(index, 1);
            lives--;
            document.getElementById('livesValue').textContent = lives;
            if (lives <= 0) {
                endGame();
            }
        }
    });
}

function spawnAsteroid() {
    if (Math.random() < 0.02) {
        asteroids.push(new Asteroid());
    }
}

function updateGame() {
    // Draw background
    drawBackground();

    // Update and draw game objects
    updatePlayer();
    drawPlayer();

    // Update bullets
    bullets = bullets.filter(bullet => !bullet.update());
    bullets.forEach(bullet => bullet.draw());

    // Update asteroids
    asteroids = asteroids.filter(asteroid => !asteroid.update());
    asteroids.forEach(asteroid => asteroid.draw());

    // Spawn new asteroids
    spawnAsteroid();

    // Check collisions
    checkCollisions();

    if (gameRunning) {
        requestAnimationFrame(updateGame);
    }
}

function startGame() {
    document.getElementById('menuScreen').classList.add('hidden');
    document.getElementById('gameOver').classList.add('hidden');
    document.getElementById('gameScreen').classList.remove('hidden');
    
    // Reset game state
    score = 0;
    lives = 3;
    asteroids = [];
    bullets = [];
    player.x = canvas.width / 2;
    
    document.getElementById('scoreValue').textContent = score;
    document.getElementById('livesValue').textContent = lives;
    
    gameRunning = true;
    updateGame();
}

function endGame() {
    gameRunning = false;
    document.getElementById('finalScore').textContent = score;
    document.getElementById('gameScreen').classList.add('hidden');
    document.getElementById('gameOver').classList.remove('hidden');
}

// Event listeners for buttons
document.getElementById('startButton').addEventListener('click', startGame);
document.getElementById('restartButton').addEventListener('click', startGame);

// Initial setup
document.getElementById('gameScreen').classList.add('hidden');
document.getElementById('gameOver').classList.add('hidden');