// physics.js - Implements gravity, collision detection and response algorithms

/**
 * Physics engine for handling ball physics in rotating square environment
 */
class Physics {
    /**
     * Create a new physics engine
     */
    constructor() {
        // Pre-calculate some constants for optimization
        this.twoPi = Math.PI * 2;
    }

    /**
     * Apply gravity to a ball
     * @param {Object} ball - The ball to apply gravity to
     * @param {number} gravity - Gravity strength
     */
    applyGravity(ball, gravity) {
        ball.vy += gravity;
    }

    /**
     * Apply friction to a ball's velocity
     * @param {Object} ball - The ball to apply friction to
     * @param {number} friction - Friction coefficient (0-1)
     */
    applyFriction(ball, friction) {
        ball.vx *= friction;
        ball.vy *= friction;
    }

    /**
     * Move a ball based on its velocity
     * @param {Object} ball - The ball to move
     */
    moveBall(ball) {
        ball.x += ball.vx;
        ball.y += ball.vy;
    }

    /**
     * Check and handle collision between a ball and rotating square
     * @param {Object} ball - The ball to check for collisions
     * @param {number} angle - Rotation angle of the square
     * @param {Object} dimensions - Canvas dimensions
     * @param {number} bounce - Bounce coefficient (0-1)
     * @returns {boolean} - True if collision occurred
     */
    checkSquareCollision(ball, angle, dimensions, bounce) {
        const { width, height } = dimensions;
        const squareSize = Math.min(width, height) * 0.7;
        const squareHalfSize = squareSize / 2;
        const centerX = width / 2;
        const centerY = height / 2;
        
        // Get ball position relative to square center
        const relX = ball.x - centerX;
        const relY = ball.y - centerY;
        
        // Rotate ball position to align with square's coordinate system
        const rotatedX = relX * Math.cos(-angle) - relY * Math.sin(-angle);
        const rotatedY = relX * Math.sin(-angle) + relY * Math.cos(-angle);
        
        // Check if ball is outside square boundaries (adding ball radius)
        const edgeX = Math.abs(rotatedX) - squareHalfSize + ball.radius;
        const edgeY = Math.abs(rotatedY) - squareHalfSize + ball.radius;
        
        let collided = false;
        
        if (edgeX > 0) {
            // Transform velocity to square's coordinate system
            const rotatedVx = ball.vx * Math.cos(-angle) - ball.vy * Math.sin(-angle);
            const rotatedVy = ball.vx * Math.sin(-angle) + ball.vy * Math.cos(-angle);
            
            // Apply bounce in the rotated system
            const newRotatedVx = -rotatedVx * bounce;
            
            // Transform velocity back to world coordinates
            ball.vx = newRotatedVx * Math.cos(angle) - rotatedVy * Math.sin(angle);
            ball.vy = newRotatedVx * Math.sin(angle) + rotatedVy * Math.cos(angle);
            
            // Adjust position to prevent sticking
            ball.x = centerX + (Math.sign(rotatedX) * (squareHalfSize - ball.radius)) * Math.cos(angle) + rotatedY * Math.sin(angle);
            ball.y = centerY + (Math.sign(rotatedX) * (squareHalfSize - ball.radius)) * Math.sin(angle) - rotatedY * Math.cos(angle);
            
            collided = true;
        }
        
        if (edgeY > 0) {
            // Transform velocity to square's coordinate system
            const rotatedVx = ball.vx * Math.cos(-angle) - ball.vy * Math.sin(-angle);
            const rotatedVy = ball.vx * Math.sin(-angle) + ball.vy * Math.cos(-angle);
            
            // Apply bounce in the rotated system
            const newRotatedVy = -rotatedVy * bounce;
            
            // Transform velocity back to world coordinates
            ball.vx = rotatedVx * Math.cos(angle) - newRotatedVy * Math.sin(angle);
            ball.vy = rotatedVx * Math.sin(angle) + newRotatedVy * Math.cos(angle);
            
            // Adjust position to prevent sticking
            ball.x = centerX + rotatedX * Math.cos(angle) + (Math.sign(rotatedY) * (squareHalfSize - ball.radius)) * Math.sin(angle);
            ball.y = centerY + rotatedX * Math.sin(angle) - (Math.sign(rotatedY) * (squareHalfSize - ball.radius)) * Math.cos(angle);
            
            collided = true;
        }
        
        return collided;
    }

    /**
     * Check and handle collision between two balls
     * @param {Object} ball1 - First ball
     * @param {Object} ball2 - Second ball
     * @param {number} bounce - Bounce coefficient (0-1)
     * @returns {boolean} - True if collision occurred
     */
    checkBallCollision(ball1, ball2, bounce) {
        // Calculate distance between ball centers
        const dx = ball2.x - ball1.x;
        const dy = ball2.y - ball1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Check if balls are overlapping
        if (distance < ball1.radius + ball2.radius) {
            // Calculate collision vector
            const nx = dx / distance;
            const ny = dy / distance;
            
            // Calculate relative velocity
            const vx = ball2.vx - ball1.vx;
            const vy = ball2.vy - ball1.vy;
            
            // Calculate relative velocity along collision normal
            const relativeVelocity = vx * nx + vy * ny;
            
            // Do not resolve if balls are moving away from each other
            if (relativeVelocity > 0) return false;
            
            // Calculate impulse scalar (simplified for equal mass)
            const impulse = -(1 + bounce) * relativeVelocity / 2;
            
            // Apply impulse to balls
            ball1.vx -= impulse * nx;
            ball1.vy -= impulse * ny;
            ball2.vx += impulse * nx;
            ball2.vy += impulse * ny;
            
            // Move balls apart to prevent sticking
            const overlap = (ball1.radius + ball2.radius - distance) / 2;
            ball1.x -= overlap * nx;
            ball1.y -= overlap * ny;
            ball2.x += overlap * nx;
            ball2.y += overlap * ny;
            
            return true;
        }
        
        return false;
    }

    /**
     * Update physics for a single ball
     * @param {Object} ball - The ball to update
     * @param {Object} config - Physics configuration
     * @param {Object} dimensions - Canvas dimensions
     */
    updateBall(ball, config, dimensions) {
        // Apply gravity
        this.applyGravity(ball, config.gravity);
        
        // Apply friction
        this.applyFriction(ball, config.friction);
        
        // Move ball
        this.moveBall(ball);
        
        // Check for collision with square
        return this.checkSquareCollision(ball, config.angle, dimensions, config.bounce);
    }
    
    /**
     * Handle collisions between all balls
     * @param {Array} balls - Array of all balls
     * @param {number} bounce - Bounce coefficient (0-1)
     */
    handleBallCollisions(balls, bounce) {
        const collisions = [];
        
        // Check all possible ball pairs for collisions
        for (let i = 0; i < balls.length; i++) {
            for (let j = i + 1; j < balls.length; j++) {
                if (this.checkBallCollision(balls[i], balls[j], bounce)) {
                    collisions.push([i, j]);
                }
            }
        }
        
        return collisions;
    }
    
    /**
     * Calculate kinetic energy of the system
     * @param {Array} balls - Array of all balls
     * @returns {number} - Total kinetic energy
     */
    calculateSystemEnergy(balls) {
        let energy = 0;
        
        for (const ball of balls) {
            // Mass is proportional to radius^3 (volume)
            const mass = Math.pow(ball.radius, 3);
            const velocity = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
            
            // KE = 0.5 * m * v^2
            energy += 0.5 * mass * velocity * velocity;
        }
        
        return energy;
    }
    
    /**
     * Apply velocity damping to simulate air resistance
     * @param {Object} ball - The ball to apply air resistance to
     * @param {number} damping - Damping factor
     */
    applyAirResistance(ball, damping) {
        const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
        
        // Air resistance increases with velocity squared
        if (speed > 0.1) {
            const drag = damping * speed * speed;
            const dragRatio = Math.min(drag / speed, 1); // Ensure we don't reverse direction
            
            ball.vx -= ball.vx * dragRatio;
            ball.vy -= ball.vy * dragRatio;
        }
    }
    
    /**
     * Create a force field at a specific point
     * @param {Array} balls - Array of all balls
     * @param {Object} point - Point coordinates {x, y}
     * @param {number} strength - Force strength (positive attracts, negative repels)
     * @param {number} radius - Radius of effect
     */
    applyForceField(balls, point, strength, radius) {
        for (const ball of balls) {
            const dx = point.x - ball.x;
            const dy = point.y - ball.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < radius) {
                // Force decreases with square of distance
                const force = strength / Math.max(distance, 0.1);
                
                // Apply force
                ball.vx += (dx / distance) * force;
                ball.vy += (dy / distance) * force;
            }
        }
    }
}

// Export the Physics engine
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = Physics;
} else {
    window.Physics = Physics;
}