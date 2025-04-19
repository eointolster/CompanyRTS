// physics.js - Implements gravity, collision detection and response algorithms

/**
 * Physics engine for handling ball physics in rotating square environment
 * Note: Much of this logic might be duplicated or better handled within Ball/Container classes
 * depending on the chosen architecture. This version assumes it might be used for specific tasks.
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
     * @param {Object} ball - The ball to apply gravity to (should have vy property)
     * @param {number} gravity - Gravity strength
     */
    applyGravity(ball, gravity) {
        if (ball && typeof ball.vy === 'number') {
            ball.vy += gravity;
        }
    }

    /**
     * Apply friction to a ball's velocity
     * @param {Object} ball - The ball to apply friction to (should have vx, vy)
     * @param {number} friction - Friction coefficient (0-1)
     */
    applyFriction(ball, friction) {
        if (ball && typeof ball.vx === 'number' && typeof ball.vy === 'number') {
            ball.vx *= friction;
            ball.vy *= friction;
        }
    }

    /**
     * Move a ball based on its velocity
     * @param {Object} ball - The ball to move (should have x, y, vx, vy)
     */
    moveBall(ball) {
        if (ball && typeof ball.x === 'number' && typeof ball.y === 'number' && typeof ball.vx === 'number' && typeof ball.vy === 'number') {
            ball.x += ball.vx;
            ball.y += ball.vy;
        }
    }

    /**
     * Check and handle collision between a ball and rotating square
     * NOTE: This duplicates logic likely present in Ball or Container. Use with caution.
     * Uses ball.size instead of ball.radius for consistency.
     * @param {Object} ball - The ball to check for collisions (needs x, y, vx, vy, size)
     * @param {number} angle - Rotation angle of the square
     * @param {Object} dimensions - Canvas dimensions { width, height }
     * @param {number} bounce - Bounce coefficient (0-1)
     * @param {number} restitution - Ball's own restitution factor (optional)
     * @returns {boolean} - True if collision occurred
     */
    checkSquareCollision(ball, angle, dimensions, bounce, restitution = 1.0) {
        if (!ball || !dimensions) return false;
        const { width, height } = dimensions;
        const squareSize = Math.min(width, height) * 0.7;
        const squareHalfSize = squareSize / 2;
        const centerX = width / 2;
        const centerY = height / 2;

        // Ensure ball has required properties
        if (typeof ball.x !== 'number' || typeof ball.y !== 'number' || typeof ball.vx !== 'number' || typeof ball.vy !== 'number' || typeof ball.size !== 'number') {
            console.error("Ball object missing required properties for collision check.");
            return false;
        }

        // Get ball position relative to square center
        const relX = ball.x - centerX;
        const relY = ball.y - centerY;

        // Rotate ball position to align with square's coordinate system
        const cosAngle = Math.cos(-angle);
        const sinAngle = Math.sin(-angle);
        const rotatedX = relX * cosAngle - relY * sinAngle;
        const rotatedY = relX * sinAngle + relY * cosAngle;

        // Store original velocities before potential modification
        const originalVx = ball.vx;
        const originalVy = ball.vy;
        const cosAngleInv = Math.cos(angle);
        const sinAngleInv = Math.sin(angle);


        // Check if ball is outside square boundaries (using ball.size)
        const edgeX = Math.abs(rotatedX) - squareHalfSize + ball.size;
        const edgeY = Math.abs(rotatedY) - squareHalfSize + ball.size;

        let collided = false;

        if (edgeX > 0) {
            // Transform velocity to square's coordinate system
            const rotatedVx = originalVx * cosAngle - originalVy * sinAngle;
            const rotatedVy = originalVx * sinAngle + originalVy * cosAngle;

            // Apply bounce in the rotated system
            const newRotatedVx = -rotatedVx * bounce * restitution;

            // Transform velocity back to world coordinates
            ball.vx = newRotatedVx * cosAngleInv - rotatedVy * sinAngleInv;
            ball.vy = newRotatedVx * sinAngleInv + rotatedVy * cosAngleInv;

            // Adjust position to prevent sticking
            const overlapX = edgeX;
            const correctionX = Math.sign(rotatedX) * overlapX;
            const adjustedRotatedX = rotatedX - correctionX;

            // Transform corrected position back to world coordinates
            const adjustedWorld = {
                x: adjustedRotatedX * cosAngleInv - rotatedY * sinAngleInv + centerX,
                y: adjustedRotatedX * sinAngleInv + rotatedY * cosAngleInv + centerY
            };
            ball.x = adjustedWorld.x;
            ball.y = adjustedWorld.y;

            collided = true;
        }

        // Re-evaluate relative position and velocity for Y check if X collision occurred
        const currentRelX = ball.x - centerX;
        const currentRelY = ball.y - centerY;
        const currentRotatedX = currentRelX * cosAngle - currentRelY * sinAngle;
        const currentRotatedY = currentRelX * sinAngle + currentRelY * cosAngle;
        const currentEdgeY = Math.abs(currentRotatedY) - squareHalfSize + ball.size;

        if (currentEdgeY > 0) {
             // Use current velocities after potential X collision
             const currentVx = ball.vx;
             const currentVy = ball.vy;

            // Transform velocity to square's coordinate system
            const rotatedVx = currentVx * cosAngle - currentVy * sinAngle;
            const rotatedVy = currentVx * sinAngle + currentVy * cosAngle;

            // Apply bounce in the rotated system
            const newRotatedVy = -rotatedVy * bounce * restitution;

            // Transform velocity back to world coordinates
            ball.vx = rotatedVx * cosAngleInv - newRotatedVy * sinAngleInv;
            ball.vy = rotatedVx * sinAngleInv + newRotatedVy * cosAngleInv;

            // Adjust position to prevent sticking
            const overlapY = currentEdgeY;
            const correctionY = Math.sign(currentRotatedY) * overlapY;
            const adjustedRotatedY = currentRotatedY - correctionY;

             // Transform corrected position back to world coordinates
              const adjustedWorld = {
                  x: currentRotatedX * cosAngleInv - adjustedRotatedY * sinAngleInv + centerX,
                  y: currentRotatedX * sinAngleInv + adjustedRotatedY * cosAngleInv + centerY
              };
              ball.x = adjustedWorld.x;
              ball.y = adjustedWorld.y;

            collided = true;
        }

        return collided;
    }


    /**
     * Check and handle collision between two balls
     * NOTE: Duplicates logic potentially in Ball class. Ensure consistency.
     * Uses ball.size and ball.mass.
     * @param {Object} ball1 - First ball (needs x, y, vx, vy, size, mass, restitution)
     * @param {Object} ball2 - Second ball (needs x, y, vx, vy, size, mass, restitution)
     * @param {number} bounce - Global bounce coefficient (can be combined with restitution)
     * @returns {boolean} - True if collision occurred
     */
    checkBallCollision(ball1, ball2, bounce) {
         // Ensure balls and properties exist
         if (!ball1 || !ball2 ||
             typeof ball1.x !== 'number' || typeof ball1.y !== 'number' || typeof ball1.vx !== 'number' || typeof ball1.vy !== 'number' || typeof ball1.size !== 'number' || typeof ball1.mass !== 'number' || typeof ball1.restitution !== 'number' ||
             typeof ball2.x !== 'number' || typeof ball2.y !== 'number' || typeof ball2.vx !== 'number' || typeof ball2.vy !== 'number' || typeof ball2.size !== 'number' || typeof ball2.mass !== 'number' || typeof ball2.restitution !== 'number') {
             console.error("Ball objects missing required properties for ball-ball collision check.");
             return false;
         }

        // Calculate distance between ball centers
        const dx = ball2.x - ball1.x;
        const dy = ball2.y - ball1.y;
        const distanceSquared = dx * dx + dy * dy; // Use squared distance first
        const minDist = ball1.size + ball2.size;
        const minDistSquared = minDist * minDist;

        // Check if balls are overlapping
        if (distanceSquared < minDistSquared && distanceSquared > 1e-6) { // Avoid overlap and zero distance
            const distance = Math.sqrt(distanceSquared);
             // Calculate collision normal vector (unit vector)
             const nx = dx / distance;
             const ny = dy / distance;

             // Calculate relative velocity
             const dvx = ball1.vx - ball2.vx;
             const dvy = ball1.vy - ball2.vy;

             // Calculate relative velocity along the normal direction
             const relativeVelocityNormal = dvx * nx + dvy * ny;

             // Do not resolve if balls are moving apart
             if (relativeVelocityNormal > 0) return false;

             // Calculate combined restitution
             const restitution = (ball1.restitution + ball2.restitution) / 2 * bounce;

             // Ensure masses are positive to avoid division by zero
             if (ball1.mass <= 0 || ball2.mass <= 0) {
                 console.warn("Ball mass is zero or negative, skipping collision resolution.");
                 return false;
             }
             const totalInverseMass = 1 / ball1.mass + 1 / ball2.mass;

             // Calculate impulse scalar
             let impulseMagnitude = -(1 + restitution) * relativeVelocityNormal / totalInverseMass;

             // Apply impulse to velocities
             const impulseX = impulseMagnitude * nx;
             const impulseY = impulseMagnitude * ny;

             ball1.vx += impulseX / ball1.mass;
             ball1.vy += impulseY / ball1.mass;
             ball2.vx -= impulseX / ball2.mass;
             ball2.vy -= impulseY / ball2.mass;

             // Move balls apart to prevent sticking (positional correction)
             const overlap = minDist - distance;
             const correctionRatio1 = (1 / ball1.mass) / totalInverseMass;
             const correctionRatio2 = (1 / ball2.mass) / totalInverseMass;

             ball1.x -= overlap * nx * correctionRatio1;
             ball1.y -= overlap * ny * correctionRatio1;
             ball2.x += overlap * nx * correctionRatio2;
             ball2.y += overlap * ny * correctionRatio2;

            return true;
         } else if (distanceSquared <= 1e-6) {
             // Handle perfectly overlapping balls - nudge them apart slightly
              ball1.x += (Math.random() - 0.5) * 0.1;
              ball1.y += (Math.random() - 0.5) * 0.1;
         }


        return false;
    }


    /**
     * Update physics for a single ball (combines gravity, friction, movement, square collision)
     * @param {Object} ball - The ball to update
     * @param {Object} config - Physics configuration (gravity, friction, angle, bounce)
     * @param {Object} dimensions - Canvas dimensions { width, height }
     * @returns {boolean} - True if collision with square occurred
     */
    updateBall(ball, config, dimensions) {
        if (!ball || !config || !dimensions) return false;

        // Apply gravity
        this.applyGravity(ball, config.gravity);

        // Apply friction
        this.applyFriction(ball, config.friction);

        // Move ball
        this.moveBall(ball);

        // Check for collision with square (using ball's restitution if available)
        const restitution = typeof ball.restitution === 'number' ? ball.restitution : 1.0;
        return this.checkSquareCollision(ball, config.angle, dimensions, config.bounce, restitution);
    }


    /**
     * Handle collisions between all balls in an array
     * @param {Array} balls - Array of all ball objects
     * @param {number} bounce - Global bounce coefficient
     * @returns {Array} - Array of pairs of indices that collided [[i, j], ...]
     */
    handleBallCollisions(balls, bounce) {
        const collisions = [];
        if (!balls) return collisions;

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
     * @param {Array} balls - Array of all balls (need vx, vy, mass)
     * @returns {number} - Total kinetic energy
     */
    calculateSystemEnergy(balls) {
        let energy = 0;
        if (!balls) return energy;

        for (const ball of balls) {
             if (ball && typeof ball.vx === 'number' && typeof ball.vy === 'number' && typeof ball.mass === 'number' && ball.mass > 0) {
                  const velocitySquared = ball.vx * ball.vx + ball.vy * ball.vy;
                  // KE = 0.5 * m * v^2
                  energy += 0.5 * ball.mass * velocitySquared;
             }
        }

        return energy;
    }


    /**
     * Apply velocity damping to simulate air resistance (Optional)
     * @param {Object} ball - The ball to apply air resistance to (needs vx, vy)
     * @param {number} damping - Damping factor (e.g., 0.001)
     */
    applyAirResistance(ball, damping) {
        if (!ball || typeof ball.vx !== 'number' || typeof ball.vy !== 'number') return;

        const speedSquared = ball.vx * ball.vx + ball.vy * ball.vy;
        const speed = Math.sqrt(speedSquared);

        // Air resistance increases with velocity squared, acts opposite to velocity
        if (speed > 0.01) { // Only apply if moving significantly
            const dragForceMagnitude = damping * speedSquared;
            const dragForceX = -ball.vx * (dragForceMagnitude / speed);
            const dragForceY = -ball.vy * (dragForceMagnitude / speed);

            // Apply drag force (assuming mass = 1 or incorporated into damping factor for simplicity)
            // a = F/m -> dv = F/m * dt. If dt=1, dv = F/m.
            // For simplicity, let's assume dv = F * damping_factor (where damping includes mass effect)
             // Check if mass is available
             if (typeof ball.mass === 'number' && ball.mass > 0) {
                  ball.vx += dragForceX / ball.mass;
                  ball.vy += dragForceY / ball.mass;
             } else {
                  // Fallback if mass is not available (less accurate)
                  ball.vx += dragForceX * 0.1; // Arbitrary factor
                  ball.vy += dragForceY * 0.1;
             }

        }
    }


    /**
     * Apply a force field (attraction/repulsion) to balls (Optional)
     * @param {Array} balls - Array of all balls (needs x, y, vx, vy, mass)
     * @param {Object} point - Point coordinates {x, y} of the force field center
     * @param {number} strength - Force strength (positive attracts, negative repels)
     * @param {number} radius - Radius of effect
     */
    applyForceField(balls, point, strength, radius) {
        if (!balls || !point || typeof point.x !== 'number' || typeof point.y !== 'number') return;
        const radiusSquared = radius * radius;

        for (const ball of balls) {
             if (!ball || typeof ball.x !== 'number' || typeof ball.y !== 'number' || typeof ball.vx !== 'number' || typeof ball.vy !== 'number' || typeof ball.mass !== 'number' || ball.mass <= 0) {
                  continue; // Skip invalid balls
             }

            const dx = point.x - ball.x;
            const dy = point.y - ball.y;
            const distanceSquared = dx * dx + dy * dy;

            if (distanceSquared < radiusSquared && distanceSquared > 1e-6) { // Within radius and not exactly at center
                const distance = Math.sqrt(distanceSquared);
                // Force decreases with distance (e.g., 1/d or 1/d^2)
                // Let's use F = strength / distance for simplicity
                const forceMagnitude = strength / distance;

                // Calculate force components
                const forceX = (dx / distance) * forceMagnitude;
                const forceY = (dy / distance) * forceMagnitude;

                // Apply force: a = F/m -> dv = (F/m) * dt. Assume dt=1.
                ball.vx += forceX / ball.mass;
                ball.vy += forceY / ball.mass;
            } else if (distanceSquared <= 1e-6 && strength < 0) {
                 // If exactly at center and repulsive, push away randomly
                 ball.vx += (Math.random() - 0.5) * Math.abs(strength) * 0.1 / ball.mass;
                 ball.vy += (Math.random() - 0.5) * Math.abs(strength) * 0.1 / ball.mass;
            }
        }
    }

}

// Export the Physics engine class
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = Physics;
} else {
    window.Physics = Physics;
}