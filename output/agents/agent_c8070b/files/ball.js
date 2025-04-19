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
        // Ensure config, width, height are provided
        if (!config || typeof width !== 'number' || typeof height !== 'number') {
             throw new Error("Ball constructor requires config, width, and height.");
        }
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
        // Ensure spawn position is valid even if width/height are small
        this.x = Math.random() * Math.max(0, this.width - this.size * 2) + this.size;
        this.y = Math.random() * Math.max(0, this.height - this.size * 2) + this.size;
        this.vx = (Math.random() - 0.5) * 5;
        this.vy = (Math.random() - 0.5) * 5;
        this.color = `hsl(${Math.random() * 360}, 70%, 60%)`;
        this.mass = Math.PI * Math.pow(this.size / 2, 2); // Mass proportional to area (or use volume: (4/3)*PI*r^3) -> Let's use size^2 for simplicity now
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
        this.shadowBlur = this.size * 0.5; // Not used in current draw, but kept for potential future use
    }

    /**
     * Update the ball's position and velocity
     */
    update() {
        // Update trail
        if (this.trailUpdateCounter++ % 3 === 0) {
            this.updateTrail();
        }

        // Apply gravity using config value
        this.vy += this.config.gravity;

        // Apply friction using config value
        this.vx *= this.config.friction;
        this.vy *= this.config.friction;

        // Move ball
        this.x += this.vx;
        this.y += this.vy;

        // Update rotation
        this.rotation += this.rotationSpeed;

        // Check collisions with square boundaries using config angle and dimensions from constructor
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
        // Use dimensions and angle from constructor/config
        const angle = this.config.angle;
        const squareSize = Math.min(this.width, this.height) * 0.7;
        const squareHalfSize = squareSize / 2;
        const centerX = this.width / 2;
        const centerY = this.height / 2;

        // Get ball position relative to square center
        const relX = this.x - centerX;
        const relY = this.y - centerY;

        // Rotate ball position to align with square's coordinate system
        const cosAngle = Math.cos(-angle);
        const sinAngle = Math.sin(-angle);
        const rotatedX = relX * cosAngle - relY * sinAngle;
        const rotatedY = relX * sinAngle + relY * cosAngle;

        // Store original velocities before potential modification
        const originalVx = this.vx;
        const originalVy = this.vy;
        const cosAngleInv = Math.cos(angle);
        const sinAngleInv = Math.sin(angle);

        // Check if ball is outside square boundaries (adding ball radius)
        const edgeX = Math.abs(rotatedX) - squareHalfSize + this.size;
        const edgeY = Math.abs(rotatedY) - squareHalfSize + this.size;

        let collided = false;

        if (edgeX > 0) {
            // Transform velocity to square's coordinate system
            const rotatedVx = originalVx * cosAngle - originalVy * sinAngle;
            const rotatedVy = originalVx * sinAngle + originalVy * cosAngle;

            // Apply bounce in the rotated system with restitution and config bounce
            const newRotatedVx = -rotatedVx * this.config.bounce * this.restitution;

            // Transform velocity back to world coordinates (using original rotatedVy)
            this.vx = newRotatedVx * cosAngleInv - rotatedVy * sinAngleInv;
            this.vy = newRotatedVx * sinAngleInv + rotatedVy * cosAngleInv;

            // Adjust position to prevent sticking (move back along the collision normal in rotated space)
            const overlapX = edgeX;
            const correctionX = Math.sign(rotatedX) * overlapX;
            const adjustedRotatedX = rotatedX - correctionX;

            // Transform corrected position back to world coordinates
            const adjustedWorld = {
                x: adjustedRotatedX * cosAngleInv - rotatedY * sinAngleInv + centerX,
                y: adjustedRotatedX * sinAngleInv + rotatedY * cosAngleInv + centerY
            };
            this.x = adjustedWorld.x;
            this.y = adjustedWorld.y;


            // Increase rotation speed when hitting wall
            this.rotationSpeed += (Math.random() - 0.5) * 0.05;

            collided = true;
        }
         // Re-evaluate relative position and velocity for Y check if X collision occurred
        const currentRelX = this.x - centerX;
        const currentRelY = this.y - centerY;
        const currentRotatedX = currentRelX * cosAngle - currentRelY * sinAngle;
        const currentRotatedY = currentRelX * sinAngle + currentRelY * cosAngle;
        const currentEdgeY = Math.abs(currentRotatedY) - squareHalfSize + this.size; // Recheck Y edge penetration

        if (currentEdgeY > 0) {
             // Use current velocities after potential X collision
             const currentVx = this.vx;
             const currentVy = this.vy;

            // Transform velocity to square's coordinate system
            const rotatedVx = currentVx * cosAngle - currentVy * sinAngle;
            const rotatedVy = currentVx * sinAngle + currentVy * cosAngle;

            // Apply bounce in the rotated system with restitution and config bounce
            const newRotatedVy = -rotatedVy * this.config.bounce * this.restitution;

            // Transform velocity back to world coordinates (using current rotatedVx)
            this.vx = rotatedVx * cosAngleInv - newRotatedVy * sinAngleInv;
            this.vy = rotatedVx * sinAngleInv + newRotatedVy * cosAngleInv;

            // Adjust position to prevent sticking (move back along the collision normal in rotated space)
            const overlapY = currentEdgeY;
            const correctionY = Math.sign(currentRotatedY) * overlapY;
            const adjustedRotatedY = currentRotatedY - correctionY;

            // Transform corrected position back to world coordinates
             const adjustedWorld = {
                 x: currentRotatedX * cosAngleInv - adjustedRotatedY * sinAngleInv + centerX,
                 y: currentRotatedX * sinAngleInv + adjustedRotatedY * cosAngleInv + centerY
             };
             this.x = adjustedWorld.x;
             this.y = adjustedWorld.y;


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
        const minDist = this.size + other.size;

        // Check if balls are overlapping
        if (distance < minDist && distance > 0.01) { // Add distance > 0.01 to avoid division by zero / NaN issues
            // Calculate collision normal vector (unit vector)
            const nx = dx / distance;
            const ny = dy / distance;

            // Calculate relative velocity
            const dvx = this.vx - other.vx;
            const dvy = this.vy - other.vy;

            // Calculate relative velocity along the normal direction
            const relativeVelocityNormal = dvx * nx + dvy * ny;

            // Do not resolve if balls are moving apart
            if (relativeVelocityNormal > 0) return false;

            // Calculate average restitution (or use min/max?)
            const restitution = (this.restitution + other.restitution) / 2 * this.config.bounce;

            // Calculate impulse scalar (correct formula using mass)
            const totalInverseMass = 1 / this.mass + 1 / other.mass;
            let impulseMagnitude = -(1 + restitution) * relativeVelocityNormal / totalInverseMass;

            // Apply impulse to velocities
            const impulseX = impulseMagnitude * nx;
            const impulseY = impulseMagnitude * ny;

            this.vx += impulseX / this.mass;
            this.vy += impulseY / this.mass;
            other.vx -= impulseX / other.mass;
            other.vy -= impulseY / other.mass;

            // Move balls apart to prevent sticking (positional correction)
            const overlap = minDist - distance;
            const correctionRatio1 = (1 / this.mass) / totalInverseMass;
            const correctionRatio2 = (1 / other.mass) / totalInverseMass;

            this.x -= overlap * nx * correctionRatio1;
            this.y -= overlap * ny * correctionRatio1;
            other.x += overlap * nx * correctionRatio2;
            other.y += overlap * ny * correctionRatio2;


            // Change rotation on collision (optional effect)
            this.rotationSpeed += (Math.random() - 0.5) * 0.1;
            other.rotationSpeed += (Math.random() - 0.5) * 0.1;

            return true;
        } else if (distance <= 0.01) {
            // Handle perfectly overlapping balls - nudge them apart slightly
             this.x += (Math.random() - 0.5) * 0.1;
             this.y += (Math.random() - 0.5) * 0.1;
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
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        // Use ellipse for a slightly skewed shadow
        ctx.ellipse(
            this.x + this.shadowOffset,
            this.y + this.shadowOffset,
            this.size, // x radius
            this.size * 0.9, // y radius (slightly squashed)
            0, // rotation
            0, // start angle
            Math.PI * 2 // end angle
        );
        ctx.fill();
        ctx.closePath();


        // Save context before drawing rotated elements
        ctx.save();
        ctx.translate(this.x, this.y); // Translate to ball center for rotation/pattern drawing

        // Draw main ball body (no translation needed here as arc center is already at x,y)
        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, Math.PI * 2); // Draw centered at (0,0) after translate
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.closePath();

        // Draw pattern on ball if enabled (rotation is applied here)
        if (this.pattern) {
             ctx.rotate(this.rotation); // Apply rotation for pattern
             this.drawPattern(ctx); // Pattern is drawn relative to (0,0)
             ctx.rotate(-this.rotation); // Rotate back if needed, or rely on restore
        }

        // Add highlight for 3D effect (drawn relative to 0,0)
        this.drawHighlight(ctx);

        // Restore context to remove translation/rotation
        ctx.restore();
    }


    /**
     * Draw the ball's trail
     * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
     */
    drawTrail(ctx) {
        // Draw trail points in reverse order so newest points appear on top
        for (let i = this.trail.length - 1; i >= 0; i--) {
            const point = this.trail[i];
            if (point.alpha > 0.01 && point.size > 0.1) { // Only draw visible points
                 ctx.beginPath();
                 ctx.arc(point.x, point.y, point.size, 0, Math.PI * 2);
                 // Ensure color format is rgba compatible
                 let baseColor = this.color;
                 if (baseColor.startsWith('#')) {
                      const r = parseInt(baseColor.slice(1, 3), 16);
                      const g = parseInt(baseColor.slice(3, 5), 16);
                      const b = parseInt(baseColor.slice(5, 7), 16);
                      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${point.alpha})`;
                 } else if (baseColor.startsWith('hsl')) {
                      // Assuming HSL format like hsl(H, S%, L%)
                      ctx.fillStyle = baseColor.replace('hsl', 'hsla').replace(')', `, ${point.alpha})`);
                 } else {
                      // Fallback for unknown color formats
                       ctx.fillStyle = `rgba(200, 200, 200, ${point.alpha})`;
                 }
                 ctx.fill();
                 ctx.closePath();
            }
        }
    }

    /**
     * Draw pattern on the ball
     * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
     */
    drawPattern(ctx) {
        // Assumes context is already translated to ball center and rotated
        ctx.fillStyle = this.patternColor;
        ctx.beginPath(); // Start path for pattern

        switch (this.patternType) {
            case 0: // Stripes
                 const stripeWidth = this.size / 3;
                 const halfStripe = stripeWidth / 2;
                 for (let i = -this.size; i < this.size; i += stripeWidth) {
                      // Use arc clipping to keep pattern within the ball circle
                      ctx.save();
                      ctx.arc(0, 0, this.size, 0, Math.PI * 2);
                      ctx.clip();
                      // Draw rectangle for stripe
                      ctx.rect(i - halfStripe, -this.size, stripeWidth, this.size * 2);
                      ctx.restore();
                 }
                break;
            case 1: // Circles
                for (let i = 0; i < 3; i++) {
                    const angle = (i / 3) * Math.PI * 2;
                    const pX = Math.cos(angle) * this.size * 0.5;
                    const pY = Math.sin(angle) * this.size * 0.5;

                    // Draw sub-circle
                    ctx.moveTo(pX + this.size * 0.25, pY); // Need moveTo before arc for separate circles
                    ctx.arc(pX, pY, this.size * 0.25, 0, Math.PI * 2);
                }
                break;
            case 2: // Spiral
                const spiralPoints = 32;
                const maxRadius = this.size * 0.9;
                const dotSize = this.size * 0.08;
                for (let i = 0; i < spiralPoints; i++) {
                     const angle = (i / spiralPoints) * Math.PI * 4; // Two full rotations
                     const radius = (i / spiralPoints) * maxRadius;
                     const pX = Math.cos(angle) * radius;
                     const pY = Math.sin(angle) * radius;

                     // Draw dot
                     ctx.moveTo(pX + dotSize, pY); // Need moveTo before arc
                     ctx.arc(pX, pY, dotSize, 0, Math.PI * 2);
                }
                break;
        }
        // Fill the combined path for the pattern
        ctx.fill();
        ctx.closePath(); // Close path after drawing all parts
    }


    /**
     * Draw highlight for 3D effect
     * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
     */
    drawHighlight(ctx) {
        // Assumes context is translated to ball center (0,0)
        // Add highlight
        const gradient = ctx.createRadialGradient(
            -this.size * 0.3, // Highlight offset relative to center
            -this.size * 0.3,
            0,                // Inner radius
            0,                // Gradient center x (relative to ball center)
            0,                // Gradient center y
            this.size          // Outer radius
        );
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.7)'); // Brighter start
        gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.2)'); // Faster falloff
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');   // Fully transparent end

        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
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
        // F = ma => a = F/m. Change in velocity (dv) = a * dt. Assume dt=1 for simplicity here.
        // Check if mass is valid to prevent division by zero
        if (this.mass > 0) {
            this.vx += forceX / this.mass;
            this.vy += forceY / this.mass;
        }
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
     * Create a collision effect (currently unused, logic moved to Renderer)
     * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     */
    createCollisionEffect(ctx, x, y) {
        // This logic might be better placed in the Renderer or called from Physics engine
        // console.log("Collision effect at", x, y); // Placeholder if needed
    }
}

// Export the Ball class for module systems or window global
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = Ball;
} else {
    window.Ball = Ball;
}