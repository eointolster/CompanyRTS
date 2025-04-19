// ball.js - Defines the Ball class with properties and methods

/**
 * Ball class for creating and managing balls that respond to gravity
 * and interact with a rotating square.
 */
class Ball {
    /**
     * Create a new ball with random properties
     * @param {Object} config - Configuration object containing min/max size and other properties
     * @param {number} width - Canvas width
     * @param {number} height - Canvas height
     */
    constructor(config, width, height) {
        this.config = config;
        this.width = width;
        this.height = height;
        this.reset();
    }
    
    /**
     * Reset the ball with random properties
     */
    reset() {
        this.size = Math.random() * (this.config.maxSize - this.config.minSize) + this.config.minSize;
        this.x = Math.random() * (this.width - this.size * 2) + this.size;
        this.y = Math.random() * (this.height - this.size * 2) + this.size;
        this.vx = (Math.random() - 0.5) * 5;
        this.vy = (Math.random() - 0.5) * 5;
        this.color = `hsl(${Math.random() * 360}, 70%, 60%)`;
        this.mass = Math.pow(this.size, 3); // Mass proportional to volume
        this.restitution = 0.7 + (Math.random() * 0.3); // Slight variation in bounce
        this.rotationSpeed = (Math.random() - 0.5) * 0.2;
        this.rotation = 0;
        this.trail = [];
        this.maxTrailLength = 10;
        this.trailUpdateCounter = 0;
        
        // Create patterns on some balls
        this.pattern = Math.random() > 0.7;
        this.patternType = Math.floor(Math.random() * 3);
        this.patternColor = `hsl(${Math.random() * 360}, 70%, 40%)`;
        
        // Add a subtle shadow for 3D effect
        this.shadowOffset = this.size * 0.1;
        this.shadowBlur = this.size * 0.5;
    }
    
    /**
     * Update the ball's position and velocity
     */
    update() {
        // Update trail
        if (this.trailUpdateCounter++ % 3 === 0) {
            this.updateTrail();
        }
        
        // Apply gravity
        this.vy += this.config.gravity;
        
        // Apply friction
        this.vx *= this.config.friction;
        this.vy *= this.config.friction;
        
        // Move ball
        this.x += this.vx;
        this.y += this.vy;
        
        // Update rotation
        this.rotation += this.rotationSpeed;
        
        // Check collisions with square boundaries
        this.checkCollisions();
    }
    
    /**
     * Update the ball's trail for visual effect
     */
    updateTrail() {
        // Only add trail points for fast-moving balls
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (speed > 2) {
            this.trail.push({
                x: this.x,
                y: this.y,
                size: this.size * 0.8,
                alpha: 0.6
            });
            
            // Limit trail length
            if (this.trail.length > this.maxTrailLength) {
                this.trail.shift();
            }
            
            // Fade trail
            this.trail.forEach(point => {
                point.size *= 0.9;
                point.alpha *= 0.85;
            });
        } else if (this.trail.length > 0) {
            // Fade existing trail when ball slows down
            this.trail.forEach(point => {
                point.size *= 0.9;
                point.alpha *= 0.8;
            });
            
            // Remove faded trail points
            this.trail = this.trail.filter(point => point.alpha > 0.05);
        }
    }
    
    /**
     * Check and handle collisions with the rotating square
     */
    checkCollisions() {
        // Transform ball position to the square's coordinate system
        const angle = this.config.angle;
        const squareSize = Math.min(this.width, this.height) * 0.7;
        const squareHalfSize = squareSize / 2;
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        
        // Get ball position relative to square center
        const relX = this.x - centerX;
        const relY = this.y - centerY;
        
        // Rotate ball position to align with square's coordinate system
        const rotatedX = relX * Math.cos(-angle) - relY * Math.sin(-angle);
        const rotatedY = relX * Math.sin(-angle) + relY * Math.cos(-angle);
        
        // Check if ball is outside square boundaries (adding ball radius)
        const edgeX = Math.abs(rotatedX) - squareHalfSize + this.size;
        const edgeY = Math.abs(rotatedY) - squareHalfSize + this.size;
        
        // Flag to track if collision occurred
        let collided = false;
        
        if (edgeX > 0) {
            // Transform velocity to square's coordinate system
            const rotatedVx = this.vx * Math.cos(-angle) - this.vy * Math.sin(-angle);
            const rotatedVy = this.vx * Math.sin(-angle) + this.vy * Math.cos(-angle);
            
            // Apply bounce in the rotated system with restitution
            const newRotatedVx = -rotatedVx * this.config.bounce * this.restitution;
            
            // Transform velocity back to world coordinates
            this.vx = newRotatedVx * Math.cos(angle) - rotatedVy * Math.sin(angle);
            this.vy = newRotatedVx * Math.sin(angle) + rotatedVy * Math.cos(angle);
            
            // Adjust position to prevent sticking
            this.x = centerX + (Math.sign(rotatedX) * (squareHalfSize - this.size)) * Math.cos(angle) + rotatedY * Math.sin(angle);
            this.y = centerY + (Math.sign(rotatedX) * (squareHalfSize - this.size)) * Math.sin(angle) - rotatedY * Math.cos(angle);
            
            // Increase rotation speed when hitting wall
            this.rotationSpeed += (Math.random() - 0.5) * 0.05;
            
            collided = true;
        }
        
        if (edgeY > 0) {
            // Transform velocity to square's coordinate system
            const rotatedVx = this.vx * Math.cos(-angle) - this.vy * Math.sin(-angle);
            const rotatedVy = this.vx * Math.sin(-angle) + this.vy * Math.cos(-angle);
            
            // Apply bounce in the rotated system with restitution
            const newRotatedVy = -rotatedVy * this.config.bounce * this.restitution;
            
            // Transform velocity back to world coordinates
            this.vx = rotatedVx * Math.cos(angle) - newRotatedVy * Math.sin(angle);
            this.vy = rotatedVx * Math.sin(angle) + newRotatedVy * Math.cos(angle);
            
            // Adjust position to prevent sticking
            this.x = centerX + rotatedX * Math.cos(angle) + (Math.sign(rotatedY) * (squareHalfSize - this.size)) * Math.sin(angle);
            this.y = centerY + rotatedX * Math.sin(angle) - (Math.sign(rotatedY) * (squareHalfSize - this.size)) * Math.cos(angle);
            
            // Increase rotation speed when hitting wall
            this.rotationSpeed += (Math.random() - 0.5) * 0.05;
            
            collided = true;
        }
        
        return collided;
    }
    
    /**
     * Check collision with another ball
     * @param {Ball} other - Another ball to check collision with
     * @returns {boolean} - True if collision occurred
     */
    checkBallCollision(other) {
        // Calculate distance between ball centers
        const dx = other.x - this.x;
        const dy = other.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Check if balls are overlapping
        if (distance < this.size + other.size) {
            // Calculate collision vector
            const nx = dx / distance;
            const ny = dy / distance;
            
            // Calculate relative velocity
            const vx = other.vx - this.vx;
            const vy = other.vy - this.vy;
            
            // Calculate relative velocity along collision normal
            const relativeVelocity = vx * nx + vy * ny;
            
            // Do not resolve if balls are moving away from each other
            if (relativeVelocity > 0) return false;
            
            // Calculate impulse scalar (considering mass)
            const totalMass = this.mass + other.mass;
            const impulse = -(1 + this.config.bounce) * relativeVelocity / totalMass;
            
            // Apply impulse to balls based on their mass
            this.vx -= impulse * other.mass * nx;
            this.vy -= impulse * other.mass * ny;
            other.vx += impulse * this.mass * nx;
            other.vy += impulse * this.mass * ny;
            
            // Move balls apart to prevent sticking
            const overlap = (this.size + other.size - distance) / 2;
            const moveRatio1 = other.mass / totalMass;
            const moveRatio2 = this.mass / totalMass;
            
            this.x -= overlap * nx * moveRatio1;
            this.y -= overlap * ny * moveRatio1;
            other.x += overlap * nx * moveRatio2;
            other.y += overlap * ny * moveRatio2;
            
            // Change rotation on collision
            this.rotationSpeed += (Math.random() - 0.5) * 0.1;
            other.rotationSpeed += (Math.random() - 0.5) * 0.1;
            
            return true;
        }
        
        return false;
    }
    
    /**
     * Draw the ball on the canvas
     * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
     */
    draw(ctx) {
        // Draw trail if it exists
        this.drawTrail(ctx);
        
        // Draw shadow for 3D effect
        ctx.beginPath();
        ctx.arc(this.x + this.shadowOffset, this.y + this.shadowOffset, this.size, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fill();
        ctx.closePath();
        
        // Draw main ball
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.closePath();
        
        // Draw pattern on ball if enabled
        if (this.pattern) {
            this.drawPattern(ctx);
        }
        
        // Add highlight for 3D effect
        this.drawHighlight(ctx);
    }
    
    /**
     * Draw the ball's trail
     * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
     */
    drawTrail(ctx) {
        // Draw trail points in reverse order so newest points appear on top
        for (let i = this.trail.length - 1; i >= 0; i--) {
            const point = this.trail[i];
            ctx.beginPath();
            ctx.arc(point.x, point.y, point.size, 0, Math.PI * 2);
            ctx.fillStyle = `${this.color.slice(0, -1)}, ${point.alpha})`;
            ctx.fill();
            ctx.closePath();
        }
    }
    
    /**
     * Draw pattern on the ball
     * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
     */
    drawPattern(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        
        switch (this.patternType) {
            case 0: // Stripes
                for (let i = -this.size; i < this.size; i += this.size / 3) {
                    ctx.beginPath();
                    ctx.rect(i - this.size * 0.1, -this.size, this.size * 0.2, this.size * 2);
                    ctx.fillStyle = this.patternColor;
                    ctx.fill();
                    ctx.closePath();
                }
                break;
            case 1: // Circles
                for (let i = 0; i < 3; i++) {
                    const angle = (i / 3) * Math.PI * 2;
                    const pX = Math.cos(angle) * this.size * 0.5;
                    const pY = Math.sin(angle) * this.size * 0.5;
                    
                    ctx.beginPath();
                    ctx.arc(pX, pY, this.size * 0.25, 0, Math.PI * 2);
                    ctx.fillStyle = this.patternColor;
                    ctx.fill();
                    ctx.closePath();
                }
                break;
            case 2: // Spiral
                for (let i = 0; i < Math.PI * 4; i += Math.PI / 8) {
                    const radius = (i / (Math.PI * 4)) * this.size * 0.9;
                    const pX = Math.cos(i) * radius;
                    const pY = Math.sin(i) * radius;
                    
                    ctx.beginPath();
                    ctx.arc(pX, pY, this.size * 0.08, 0, Math.PI * 2);
                    ctx.fillStyle = this.patternColor;
                    ctx.fill();
                    ctx.closePath();
                }
                break;
        }
        
        ctx.restore();
    }
    
    /**
     * Draw highlight for 3D effect
     * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
     */
    drawHighlight(ctx) {
        // Add highlight
        const gradient = ctx.createRadialGradient(
            this.x - this.size * 0.3, 
            this.y - this.size * 0.3,
            0,
            this.x,
            this.y,
            this.size
        );
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
        gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.2)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.closePath();
    }
    
    /**
     * Apply force to the ball
     * @param {number} forceX - X component of force
     * @param {number} forceY - Y component of force
     */
    applyForce(forceX, forceY) {
        // F = ma, but since we're directly modifying velocity (which is acceleration over time)
        // and we consider mass, we divide by mass
        this.vx += forceX / this.mass;
        this.vy += forceY / this.mass;
    }
    
    /**
     * Calculate the ball's kinetic energy
     * @returns {number} - Kinetic energy value
     */
    getKineticEnergy() {
        const velocity = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        return 0.5 * this.mass * velocity * velocity;
    }
    
    /**
     * Create a collision effect 
     * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     */
    createCollisionEffect(ctx, x, y) {
        const particleCount = Math.floor(this.size / 2);
        
        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * this.size;
            const particleSize = Math.random() * 2 + 1;
            
            const particleX = x + Math.cos(angle) * distance;
            const particleY = y + Math.sin(angle) * distance;
            
            ctx.beginPath();
            ctx.arc(particleX, particleY, particleSize, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.5 + 0.2})`;
            ctx.fill();
            ctx.closePath();
        }
    }
}

// Export the Ball class for module systems
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = Ball;
} else {
    window.Ball = Ball;
}