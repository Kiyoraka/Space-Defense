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

// Load special attack animation images
const specialAttackImages = [];
for (let i = 1; i <= 7; i++) {
    const img = new Image();
    img.src = `assets/img/special-attack/SP-${i}.png`;
    img.onerror = function() {
        console.warn(`Failed to load special attack image: SP-${i}.png`);
    };
    specialAttackImages.push(img);
}

// Load background music
const backgroundMusic = new Audio('assets/sound/supernova.mp3');
backgroundMusic.loop = true;
backgroundMusic.volume = 0.3; // Set volume to 30%
backgroundMusic.onerror = function() {
    console.warn('Failed to load background music: supernova.mp3');
};

// Load special attack sound
const specialAttackSound = new Audio('assets/sound/Special-Attack.mp3');
specialAttackSound.volume = 0.5; // Set volume to 50%
specialAttackSound.onerror = function() {
    console.warn('Failed to load special attack sound: Special-Attack.mp3');
};

// Game state
let gameRunning = false;
let score = 0;
let lives = 3;
let asteroids = [];
let bullets = [];
let gameLoop;
let backgroundY = 0;

// Special attack system
let specialAttackAvailable = false;
let specialAttackPlaying = false;
let specialAttackFrame = 0;
let specialAttackFrameCounter = 0;
let lastSpecialAttackScore = 0; // Track when last special attack was used
const SPECIAL_ATTACK_FRAME_DELAY = 8; // frames between animation frames
const SPECIAL_ATTACK_SCORE_THRESHOLD = 100;

// Player ship
const player = {
    x: canvas.width / 2,
    y: canvas.height - 100,
    width: 60, // Adjust based on your spaceship image size
    height: 86, // Adjust based on your spaceship image size
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
        
        if (asteroidImage.complete && asteroidImage.naturalWidth > 0) {
            ctx.drawImage(asteroidImage, -this.width/2, -this.height/2, this.width, this.height);
        } else {
            // Fallback rectangle if image fails to load
            ctx.fillStyle = '#ff6b35';
            ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height);
        }
        
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
    if (backgroundImage.complete && backgroundImage.naturalWidth > 0) {
        ctx.drawImage(backgroundImage, 0, backgroundY, canvas.width, canvas.height);
        ctx.drawImage(backgroundImage, 0, backgroundY - canvas.height, canvas.width, canvas.height);
        
        backgroundY += 0.5;
        if (backgroundY >= canvas.height) {
            backgroundY = 0;
        }
    } else {
        // Fallback background color if image fails to load
        ctx.fillStyle = '#0a0a2a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
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
    if (playerImage.complete && playerImage.naturalWidth > 0) {
        ctx.drawImage(playerImage, player.x, player.y, player.width, player.height);
    } else {
        // Fallback rectangle if image fails to load
        ctx.fillStyle = '#4fc3f7';
        ctx.fillRect(player.x, player.y, player.width, player.height);
    }
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
                
                // Check if special attack should be enabled
                updateSpecialAttackAvailability();
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

function updateSpecialAttackAvailability() {
    const wasAvailable = specialAttackAvailable;
    // Check if player has gained 100 points since last special attack
    specialAttackAvailable = (score - lastSpecialAttackScore) >= SPECIAL_ATTACK_SCORE_THRESHOLD;
    
    const specialBtn = document.getElementById('specialBtn');
    if (specialAttackAvailable && !wasAvailable) {
        specialBtn.classList.remove('disabled');
        specialBtn.disabled = false;
    } else if (!specialAttackAvailable && wasAvailable) {
        specialBtn.classList.add('disabled');
        specialBtn.disabled = true;
    }
}

function triggerSpecialAttack() {
    if (!specialAttackAvailable || specialAttackPlaying) return;
    
    // Play special attack sound
    playSpecialAttackSound();
    
    // Start special attack animation
    specialAttackPlaying = true;
    specialAttackFrame = 0;
    specialAttackFrameCounter = 0;
    
    // Destroy all asteroids
    asteroids = [];
    
    // Reset special attack requirement - player needs another 100 points
    lastSpecialAttackScore = score;
    specialAttackAvailable = false;
    const specialBtn = document.getElementById('specialBtn');
    specialBtn.classList.add('disabled');
    specialBtn.disabled = true;
}

function updateSpecialAttack() {
    if (!specialAttackPlaying) return;
    
    specialAttackFrameCounter++;
    
    if (specialAttackFrameCounter >= SPECIAL_ATTACK_FRAME_DELAY) {
        specialAttackFrameCounter = 0;
        specialAttackFrame++;
        
        if (specialAttackFrame >= specialAttackImages.length) {
            specialAttackPlaying = false;
            specialAttackFrame = 0;
        }
    }
}

function drawSpecialAttack() {
    if (!specialAttackPlaying) return;
    
    const img = specialAttackImages[specialAttackFrame];
    if (img && img.complete && img.naturalWidth > 0) {
        // Resize and center the animation in the canvas
        const targetWidth = canvas.width * 0.8; // 80% of canvas width
        const targetHeight = canvas.height * 0.8; // 80% of canvas height
        
        // Maintain aspect ratio
        const imgAspect = img.naturalWidth / img.naturalHeight;
        const targetAspect = targetWidth / targetHeight;
        
        let drawWidth, drawHeight;
        if (imgAspect > targetAspect) {
            drawWidth = targetWidth;
            drawHeight = targetWidth / imgAspect;
        } else {
            drawHeight = targetHeight;
            drawWidth = targetHeight * imgAspect;
        }
        
        // Center the resized image
        const x = (canvas.width - drawWidth) / 2;
        const y = (canvas.height - drawHeight) / 2;
        
        ctx.drawImage(img, x, y, drawWidth, drawHeight);
    }
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

    // Update special attack animation
    updateSpecialAttack();
    
    // Draw special attack animation (on top of everything)
    drawSpecialAttack();

    if (gameRunning) {
        requestAnimationFrame(updateGame);
    }
}

function startGame() {
    document.getElementById('menuScreen').classList.add('hidden');
    document.getElementById('gameOver').classList.add('hidden');
    document.getElementById('gameScreen').classList.remove('hidden');
    document.getElementById('touchControls').classList.remove('hidden');
    
    // Start background music
    startBackgroundMusic();
    
    // Reset game state
    score = 0;
    lives = 3;
    asteroids = [];
    bullets = [];
    player.x = canvas.width / 2;
    
    // Reset special attack state
    specialAttackAvailable = false;
    specialAttackPlaying = false;
    specialAttackFrame = 0;
    lastSpecialAttackScore = 0; // Reset the score tracker
    const specialBtn = document.getElementById('specialBtn');
    specialBtn.classList.add('disabled');
    specialBtn.disabled = true;
    
    document.getElementById('scoreValue').textContent = score;
    document.getElementById('livesValue').textContent = lives;
    
    gameRunning = true;
    updateGame();
}

function endGame() {
    gameRunning = false;
    
    // Stop background music
    stopBackgroundMusic();
    
    document.getElementById('finalScore').textContent = score;
    document.getElementById('gameScreen').classList.add('hidden');
    document.getElementById('touchControls').classList.add('hidden');
    document.getElementById('gameOver').classList.remove('hidden');
}

// Audio control functions
function startBackgroundMusic() {
    if (!audioEnabled) {
        console.log('Audio not yet enabled, will start music after user interaction');
        return;
    }
    
    // Reset to beginning and play
    backgroundMusic.currentTime = 0;
    const playPromise = backgroundMusic.play();
    
    // Handle autoplay policy restrictions
    if (playPromise !== undefined) {
        playPromise.catch(error => {
            console.warn('Background music autoplay prevented:', error);
        });
    }
}

function stopBackgroundMusic() {
    backgroundMusic.pause();
    backgroundMusic.currentTime = 0;
}

function playSpecialAttackSound() {
    if (!audioEnabled) {
        console.log('Audio not enabled, special attack sound will be silent');
        return;
    }
    
    // Reset to beginning and play
    specialAttackSound.currentTime = 0;
    const playPromise = specialAttackSound.play();
    
    // Handle autoplay policy restrictions
    if (playPromise !== undefined) {
        playPromise.catch(error => {
            console.warn('Special attack sound autoplay prevented:', error);
        });
    }
}

// Touch controls for Smart TV
const touchControls = {
    moveLeft: false,
    moveRight: false,
    shoot: false
};

// Touch event handlers
function setupTouchControls() {
    const moveLeftBtn = document.getElementById('moveLeftBtn');
    const moveRightBtn = document.getElementById('moveRightBtn');
    const shootBtn = document.getElementById('shootBtn');

    // Movement controls
    moveLeftBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        touchControls.moveLeft = true;
        keys.left = true;
    });
    
    moveLeftBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        touchControls.moveLeft = false;
        keys.left = false;
    });

    moveRightBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        touchControls.moveRight = true;
        keys.right = true;
    });
    
    moveRightBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        touchControls.moveRight = false;
        keys.right = false;
    });

    // Shoot control
    shootBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        touchControls.shoot = true;
        keys.space = true;
    });
    
    shootBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        touchControls.shoot = false;
        keys.space = false;
    });

    // Special attack control
    const specialBtn = document.getElementById('specialBtn');
    specialBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        triggerSpecialAttack();
    });
    
    specialBtn.addEventListener('click', (e) => {
        e.preventDefault();
        triggerSpecialAttack();
    });

    // Also support mouse events for testing on desktop
    moveLeftBtn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        touchControls.moveLeft = true;
        keys.left = true;
    });
    
    moveLeftBtn.addEventListener('mouseup', (e) => {
        e.preventDefault();
        touchControls.moveLeft = false;
        keys.left = false;
    });

    moveRightBtn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        touchControls.moveRight = true;
        keys.right = true;
    });
    
    moveRightBtn.addEventListener('mouseup', (e) => {
        e.preventDefault();
        touchControls.moveRight = false;
        keys.right = false;
    });

    shootBtn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        touchControls.shoot = true;
        keys.space = true;
    });
    
    shootBtn.addEventListener('mouseup', (e) => {
        e.preventDefault();
        touchControls.shoot = false;
        keys.space = false;
    });

    // Special attack mouse events
    specialBtn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        triggerSpecialAttack();
    });

    // Prevent context menu on touch controls
    [moveLeftBtn, moveRightBtn, shootBtn, specialBtn].forEach(btn => {
        btn.addEventListener('contextmenu', (e) => e.preventDefault());
    });
}

// Enable audio on first user interaction
let audioEnabled = false;
function enableAudio() {
    if (!audioEnabled) {
        audioEnabled = true;
        console.log('Audio enabled by user interaction');
    }
}

// Event listeners for buttons
document.getElementById('startButton').addEventListener('click', () => {
    enableAudio();
    startGame();
});

document.getElementById('restartButton').addEventListener('click', () => {
    enableAudio();
    startGame();
});

// Initial setup
document.getElementById('gameScreen').classList.add('hidden');
document.getElementById('gameOver').classList.add('hidden');
document.getElementById('touchControls').classList.add('hidden');

// Initialize touch controls
setupTouchControls();