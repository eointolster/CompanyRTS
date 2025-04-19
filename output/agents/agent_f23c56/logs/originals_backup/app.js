// app.js - Main application for Rotating Square with Gravity Balls

// Canvas setup
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
let width, height;

// Resize canvas to fit window
function resizeCanvas() {
    width = Math.min(window.innerWidth - 40, 800);
    height = Math.min(window.innerHeight - 200, 600);
    canvas.width = width;
    canvas.height = height;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Get UI elements
const rotationSpeedInput = document.getElementById('rotationSpeed');
const squareColorInput = document.getElementById('squareColor');
const ballCountInput = document.getElementById('ballCount');
const minSizeInput = document.getElementById('minSize');
const maxSizeInput = document.getElementById('maxSize');
const resetBallsButton = document.getElementById('resetBalls');
const gravityInput = document.getElementById('gravity');
const bounceInput = document.getElementById('bounce');
const frictionInput = document.getElementById('friction');

// Configuration
let config = {
    rotationSpeed: parseFloat(rotationSpeedInput.value),
    squareColor: squareColorInput.value,
    ballCount: parseInt(ballCountInput.value),
    minSize: parseInt(minSizeInput.value),
    maxSize: parseInt(maxSizeInput.value),
    gravity: parseFloat(gravityInput.value),
    bounce: parseFloat(bounceInput.value),
    friction: parseFloat(frictionInput.value),
    angle: 0
};

// Update config when inputs change
rotationSpeedInput.addEventListener('input', () => config.rotationSpeed = parseFloat(rotationSpeedInput.value));
squareColorInput.addEventListener('input', () => config.squareColor = squareColorInput.value);
gravityInput.addEventListener('input', () => config.gravity = parseFloat(gravityInput.value));
bounceInput.addEventListener('input', () => config.bounce = parseFloat(bounceInput.value));
frictionInput.addEventListener('input', () => config.friction = parseFloat(frictionInput.value));

// Import classes if they exist in window object, otherwise use local implementations
const Ball = window.Ball || class Ball {
    constructor() {
        this.reset();
    }
    
    reset() {
        this.size = Math.random() * (config.maxSize - config.minSize) + config.minSize;
        this.x = Math.random() * (width - this.size * 2) + this.size;
        this.y = Math.random() * (height - this.size * 2) + this.size;
        this.vx = (Math.random() - 0.5) * 5;
        this.vy = (Math.random() - 0.5) * 5;
        this.color = `hsl(${Math.random() * 360}, 70%, 60%)`;
    }
    
    update() {
        // Apply gravity
        this.vy += config.gravity;
        
        // Apply friction
        this.vx *= config.friction;
        this.vy *= config.friction;
        
        // Move ball
        this.x += this.vx;
        this.y += this.vy;
        
        // Check collisions with square boundaries
        this.checkCollisions();
    }
    
    checkCollisions() {
        // Transform ball position to the square's coordinate system
        const angle = config.angle;
        const squareSize = Math.min(width, height) * 0.7;
        const squareHalfSize = squareSize / 2;
        const centerX = width / 2;
        const centerY = height / 2;
        
        // Get ball position relative to square center
        const relX = this.x - centerX;
        const relY = this.y - centerY;
        
        // Rotate ball position
        const rotatedX = relX * Math.cos(-angle) - relY * Math.sin(-angle);
        const rotatedY = relX * Math.sin(-angle) + relY * Math.cos(-angle);
        
        // Check collisions with square borders
        const edgeX = Math.abs(rotatedX) - squareHalfSize + this.size;
        const edgeY = Math.abs(rotatedY) - squareHalfSize + this.size;
        
        if (edgeX > 0) {
            // Transform velocity to square's coordinate system
            const rotatedVx = this.vx * Math.cos(-angle) - this.vy * Math.sin(-angle);
            const rotatedVy = this.vx * Math.sin(-angle) + this.vy * Math.cos(-angle);
            
            // Bounce in the rotated system
            const newRotatedVx = -rotatedVx * config.bounce;
            
            // Transform velocity back
            this.vx = newRotatedVx * Math.cos(angle) - rotatedVy * Math.sin(angle);
            this.vy = newRotatedVx * Math.sin(angle) + rotatedVy * Math.cos(angle);
            
            // Adjust position to prevent sticking
            this.x = centerX + (Math.sign(rotatedX) * (squareHalfSize - this.size)) * Math.cos(angle) + rotatedY * Math.sin(angle);
            this.y = centerY + (Math.sign(rotatedX) * (squareHalfSize - this.size)) * Math.sin(angle) - rotatedY * Math.cos(angle);
        }
        
        if (edgeY > 0) {
            // Transform velocity to square's coordinate system
            const rotatedVx = this.vx * Math.cos(-angle) - this.vy * Math.sin(-angle);
            const rotatedVy = this.vx * Math.sin(-angle) + this.vy * Math.cos(-angle);
            
            // Bounce in the rotated system
            const newRotatedVy = -rotatedVy * config.bounce;
            
            // Transform velocity back
            this.vx = rotatedVx * Math.cos(angle) - newRotatedVy * Math.sin(angle);
            this.vy = rotatedVx * Math.sin(angle) + newRotatedVy * Math.cos(angle);
            
            // Adjust position to prevent sticking
            this.x = centerX + rotatedX * Math.cos(angle) + (Math.sign(rotatedY) * (squareHalfSize - this.size)) * Math.sin(angle);
            this.y = centerY + rotatedX * Math.sin(angle) - (Math.sign(rotatedY) * (squareHalfSize - this.size)) * Math.cos(angle);
        }
    }
    
    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.closePath();
    }
};

// Use Physics class if it exists in window
const Physics = window.Physics || {
    applyGravity: function(ball) {
        ball.vy += config.gravity;
    },
    applyFriction: function(ball) {
        ball.vx *= config.friction;
        ball.vy *= config.friction;
    }
};

// Use Renderer class if it exists in window
const Renderer = window.Renderer || {
    drawBall: function(ball) {
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.size, 0, Math.PI * 2);
        ctx.fillStyle = ball.color;
        ctx.fill();
        ctx.closePath();
    },
    drawSquare: function() {
        const squareSize = Math.min(width, height) * 0.7;
        const centerX = width / 2;
        const centerY = height / 2;
        
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(config.angle);
        
        // Draw square
        ctx.strokeStyle = config.squareColor;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.rect(-squareSize / 2, -squareSize / 2, squareSize, squareSize);
        ctx.stroke();
        
        ctx.restore();
    }
};

// Create balls
let balls = [];

function createBalls() {
    balls = [];
    for (let i = 0; i < config.ballCount; i++) {
        balls.push(new Ball());
    }
}

// Event listeners for ball count and reset
ballCountInput.addEventListener('change', () => {
    config.ballCount = parseInt(ballCountInput.value);
    createBalls();
});

minSizeInput.addEventListener('change', () => {
    config.minSize = parseInt(minSizeInput.value);
    if (config.minSize > config.maxSize) {
        config.maxSize = config.minSize;
        maxSizeInput.value = config.maxSize;
    }
    createBalls();
});

maxSizeInput.addEventListener('change', () => {
    config.maxSize = parseInt(maxSizeInput.value);
    if (config.maxSize < config.minSize) {
        config.minSize = config.maxSize;
        minSizeInput.value = config.minSize;
    }
    createBalls();
});

resetBallsButton.addEventListener('click', createBalls);

// Main animation loop
function update() {
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Update rotation angle
    config.angle += config.rotationSpeed * 0.01;
    
    // Draw rotating square
    Renderer.drawSquare();
    
    // Update and draw balls
    balls.forEach(ball => {
        ball.update();
        Renderer.drawBall(ball);
    });
    
    // Continue animation
    requestAnimationFrame(update);
}

// Initialize and start the animation
function init() {
    // Initialize balls
    createBalls();
    
    // Start animation
    update();
}

// Export app functionality to window if needed
window.RotatingSquareApp = {
    init: init,
    createBalls: createBalls,
    update: update,
    config: config
};

// Start the application when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}