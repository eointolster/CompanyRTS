// app.js - Main application for Rotating Square with Gravity Balls

// Canvas setup
const canvas = document.getElementById('canvas');
if (!canvas) {
    throw new Error("Canvas element not found!");
}
const ctx = canvas.getContext('2d');
let width, height;

// Import classes from window object
const Ball = window.Ball;
const Container = window.Container;
const InputManager = window.InputManager;
// const Physics = window.Physics; // Not directly used in this revised structure
// const Renderer = window.Renderer; // Not directly used for core drawing in this structure

if (!Ball || !Container || !InputManager) {
    throw new Error("Required classes (Ball, Container, InputManager) not found. Check script loading order.");
}

// Get UI elements for initial config values
const rotationSpeedInput = document.getElementById('rotationSpeed');
const squareColorInput = document.getElementById('squareColor');
const ballCountInput = document.getElementById('ballCount');
const minSizeInput = document.getElementById('minSize');
const maxSizeInput = document.getElementById('maxSize');
const gravityInput = document.getElementById('gravity');
const bounceInput = document.getElementById('bounce');
const frictionInput = document.getElementById('friction');

// Add checks for UI elements
if (!rotationSpeedInput || !squareColorInput || !ballCountInput || !minSizeInput || !maxSizeInput || !gravityInput || !bounceInput || !frictionInput) {
    console.warn("One or more UI control elements are missing.");
}

// Configuration
let config = {
    rotationSpeed: rotationSpeedInput ? parseFloat(rotationSpeedInput.value) : 1,
    squareColor: squareColorInput ? squareColorInput.value : '#4CAF50',
    ballCount: ballCountInput ? parseInt(ballCountInput.value) : 20,
    minSize: minSizeInput ? parseInt(minSizeInput.value) : 10,
    maxSize: maxSizeInput ? parseInt(maxSizeInput.value) : 30,
    gravity: gravityInput ? parseFloat(gravityInput.value) : 0.2,
    bounce: bounceInput ? parseFloat(bounceInput.value) : 0.7,
    friction: frictionInput ? parseFloat(frictionInput.value) : 0.99,
    angle: 0 // This will be kept in sync with container.angle
};

// Core components
let container;
let inputManager;
let balls = [];

// Resize canvas function
function resizeCanvas() {
    width = Math.min(window.innerWidth - 40, 800);
    height = Math.min(window.innerHeight - 200, 600);
    canvas.width = width;
    canvas.height = height;
    if (container) {
        container.resize(width, height);
    }
}

// Create balls function
function createBalls() {
    balls = [];
    if (!container) return; // Need container dimensions

    // Ensure ball count, minSize, maxSize are valid numbers in config
    config.ballCount = Math.max(1, parseInt(config.ballCount) || 20);
    config.minSize = Math.max(1, parseInt(config.minSize) || 10);
    config.maxSize = Math.max(config.minSize, parseInt(config.maxSize) || 30);

    for (let i = 0; i < config.ballCount; i++) {
        // Pass config, width, height to Ball constructor
        balls.push(new Ball(config, width, height));
    }
}

// Main animation loop
function update() {
    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Update and draw container
    container.rotate(config.rotationSpeed);
    config.angle = container.angle; // Sync angle for ball collision logic if needed
    container.draw(ctx, config.squareColor);

    // Apply interactive force fields
    const forceFields = inputManager.getForceFields();
    balls.forEach(ball => {
        forceFields.forEach(field => {
            const dx = field.position.x - ball.x;
            const dy = field.position.y - ball.y;
            let distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < field.radius && distance > 0.1) { // Avoid division by zero or tiny distance
                const forceMagnitude = (field.strength * 100) / distance; // Scale strength
                const forceX = (dx / distance) * forceMagnitude;
                const forceY = (dy / distance) * forceMagnitude;
                ball.applyForce(forceX, forceY);
            } else if (distance <= 0.1 && field.strength < 0) { // Strong repulsion if too close
                 ball.applyForce(Math.random() -0.5 , Math.random() -0.5 ); // Push away randomly
            }
        });
        // Optional: Apply other forces like centrifugal force
        // container.applyCentrifugalForce(ball, config.rotationSpeed);
    });


    // Update and draw balls
    balls.forEach(ball => {
        ball.update(); // Includes gravity, friction, movement, and square collision checks
        ball.draw(ctx); // Use Ball's own draw method
    });

    // Handle ball-to-ball collisions
    for (let i = 0; i < balls.length; i++) {
        for (let j = i + 1; j < balls.length; j++) {
            balls[i].checkBallCollision(balls[j]);
        }
    }

    // Continue animation
    requestAnimationFrame(update);
}

// Initialize and start the application
function init() {
    // Resize canvas initially
    resizeCanvas();

    // Instantiate container
    container = new Container(width, height);

    // Instantiate InputManager - handles all UI listeners now
    // Pass the actual createBalls function as the callback
    inputManager = new InputManager(canvas, config, createBalls);

    // Initialize balls
    createBalls();

    // Start animation loop
    update();
}

// Set up event listeners
window.addEventListener('resize', resizeCanvas);

// Start the application when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    // DOMContentLoaded has already fired
    init();
}

// Export app functionality to window if needed (optional)
window.RotatingSquareApp = {
    init: init,
    createBalls: createBalls,
    update: update,
    config: config,
    balls: balls,
    container: container,
    inputManager: inputManager
};