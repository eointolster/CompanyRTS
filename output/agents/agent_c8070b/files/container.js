// container.js - Defines the rotating square container with transformation logic

/**
 * Container class representing the rotating square that contains balls
 */
class Container {
    /**
     * Creates a new container
     * @param {number} width - Canvas width
     * @param {number} height - Canvas height
     */
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.angle = 0;
        this.size = this.calculateSize();
        this.centerX = width / 2;
        this.centerY = height / 2;
    }

    /**
     * Calculate the size of the container based on canvas dimensions
     * @returns {number} - Container size
     */
    calculateSize() {
        return Math.min(this.width, this.height) * 0.7;
    }

    /**
     * Updates container dimensions when canvas is resized
     * @param {number} width - New canvas width
     * @param {number} height - New canvas height
     */
    resize(width, height) {
        this.width = width;
        this.height = height;
        this.size = this.calculateSize();
        this.centerX = width / 2;
        this.centerY = height / 2;
    }

    /**
     * Updates the rotation angle of the container
     * @param {number} rotationSpeed - Speed of rotation
     */
    rotate(rotationSpeed) {
        this.angle += rotationSpeed * 0.01;
        // Normalize angle to prevent floating point issues over time
        if (this.angle > Math.PI * 2) {
            this.angle -= Math.PI * 2;
        }
    }

    /**
     * Gets the dimensions needed for collision detection
     * @returns {Object} - Container dimensions
     */
    getDimensions() {
        return {
            size: this.size,
            halfSize: this.size / 2,
            centerX: this.centerX,
            centerY: this.centerY,
            angle: this.angle
        };
    }

    /**
     * Transforms a point from world space to container's local space
     * @param {number} x - X coordinate in world space
     * @param {number} y - Y coordinate in world space
     * @returns {Object} - Transformed coordinates in container's local space
     */
    worldToLocal(x, y) {
        // Translate point to container's center
        const relX = x - this.centerX;
        const relY = y - this.centerY;
        
        // Rotate point by negative container angle
        const rotatedX = relX * Math.cos(-this.angle) - relY * Math.sin(-this.angle);
        const rotatedY = relX * Math.sin(-this.angle) + relY * Math.cos(-this.angle);
        
        return { x: rotatedX, y: rotatedY };
    }

    /**
     * Transforms a point from container's local space to world space
     * @param {number} x - X coordinate in local space
     * @param {number} y - Y coordinate in local space
     * @returns {Object} - Transformed coordinates in world space
     */
    localToWorld(x, y) {
        // Rotate point by container angle
        const rotatedX = x * Math.cos(this.angle) - y * Math.sin(this.angle);
        const rotatedY = x * Math.sin(this.angle) + y * Math.cos(this.angle);
        
        // Translate point from container's center
        const worldX = rotatedX + this.centerX;
        const worldY = rotatedY + this.centerY;
        
        return { x: worldX, y: worldY };
    }

    /**
     * Transforms a velocity vector from world space to container's local space
     * @param {number} vx - X velocity in world space
     * @param {number} vy - Y velocity in world space
     * @returns {Object} - Transformed velocity in container's local space
     */
    worldToLocalVelocity(vx, vy) {
        // Rotate velocity vector by negative container angle
        const rotatedVx = vx * Math.cos(-this.angle) - vy * Math.sin(-this.angle);
        const rotatedVy = vx * Math.sin(-this.angle) + vy * Math.cos(-this.angle);
        
        return { vx: rotatedVx, vy: rotatedVy };
    }

    /**
     * Transforms a velocity vector from container's local space to world space
     * @param {number} vx - X velocity in local space
     * @param {number} vy - Y velocity in local space
     * @returns {Object} - Transformed velocity in world space
     */
    localToWorldVelocity(vx, vy) {
        // Rotate velocity vector by container angle
        const rotatedVx = vx * Math.cos(this.angle) - vy * Math.sin(this.angle);
        const rotatedVy = vx * Math.sin(this.angle) + vy * Math.cos(this.angle);
        
        return { vx: rotatedVx, vy: rotatedVy };
    }

    /**
     * Checks if a point is inside the container
     * @param {number} x - X coordinate in world space
     * @param {number} y - Y coordinate in world space
     * @param {number} radius - Radius to include in the check (for balls)
     * @returns {boolean} - True if the point is inside the container
     */
    containsPoint(x, y, radius = 0) {
        const localPoint = this.worldToLocal(x, y);
        const halfSize = this.size / 2;
        
        // Check if point (including radius) is inside the square
        return (
            Math.abs(localPoint.x) <= halfSize - radius &&
            Math.abs(localPoint.y) <= halfSize - radius
        );
    }

    /**
     * Calculates the nearest point on the container's border to a given point
     * @param {number} x - X coordinate in world space
     * @param {number} y - Y coordinate in world space
     * @returns {Object} - Nearest point on border in world space
     */
    getNearestBorderPoint(x, y) {
        const local = this.worldToLocal(x, y);
        const halfSize = this.size / 2;
        
        // Determine which side of the square is closest
        let nearestX = local.x;
        let nearestY = local.y;
        
        if (Math.abs(local.x) > halfSize) {
            nearestX = Math.sign(local.x) * halfSize;
        }
        
        if (Math.abs(local.y) > halfSize) {
            nearestY = Math.sign(local.y) * halfSize;
        }
        
        // Convert back to world coordinates
        return this.localToWorld(nearestX, nearestY);
    }

    /**
     * Detects and resolves collision between a ball and the container
     * @param {Object} ball - The ball to check for collision
     * @param {number} bounce - Bounce coefficient (0-1)
     * @returns {boolean} - True if collision occurred
     */
    resolveCollision(ball, bounce) {
        const halfSize = this.size / 2;
        
        // Transform ball position to container's local space
        const local = this.worldToLocal(ball.x, ball.y);
        
        // Check for collision with container boundaries
        const edgeX = Math.abs(local.x) - halfSize + ball.size;
        const edgeY = Math.abs(local.y) - halfSize + ball.size;
        
        let collided = false;
        
        if (edgeX > 0) {
            // Transform velocity to container's local space
            const localVel = this.worldToLocalVelocity(ball.vx, ball.vy);
            
            // Apply bounce in local space
            localVel.vx = -localVel.vx * bounce;
            
            // Transform velocity back to world space
            const worldVel = this.localToWorldVelocity(localVel.vx, localVel.vy);
            ball.vx = worldVel.vx;
            ball.vy = worldVel.vy;
            
            // Adjust position to prevent sticking
            const adjustedLocal = {
                x: Math.sign(local.x) * (halfSize - ball.size),
                y: local.y
            };
            
            const adjustedWorld = this.localToWorld(adjustedLocal.x, adjustedLocal.y);
            ball.x = adjustedWorld.x;
            ball.y = adjustedWorld.y;
            
            collided = true;
        }
        
        if (edgeY > 0) {
            // Transform velocity to container's local space
            const localVel = this.worldToLocalVelocity(ball.vx, ball.vy);
            
            // Apply bounce in local space
            localVel.vy = -localVel.vy * bounce;
            
            // Transform velocity back to world space
            const worldVel = this.localToWorldVelocity(localVel.vx, localVel.vy);
            ball.vx = worldVel.vx;
            ball.vy = worldVel.vy;
            
            // Adjust position to prevent sticking
            const adjustedLocal = {
                x: local.x,
                y: Math.sign(local.y) * (halfSize - ball.size)
            };
            
            const adjustedWorld = this.localToWorld(adjustedLocal.x, adjustedLocal.y);
            ball.x = adjustedWorld.x;
            ball.y = adjustedWorld.y;
            
            collided = true;
        }
        
        return collided;
    }

    /**
     * Apply centrifugal force to balls due to rotation
     * @param {Object} ball - The ball to apply force to
     * @param {number} rotationSpeed - Current rotation speed
     */
    applyCentrifugalForce(ball, rotationSpeed) {
        // Skip if rotation is too slow
        if (Math.abs(rotationSpeed) < 0.1) return;
        
        // Calculate distance from center
        const dx = ball.x - this.centerX;
        const dy = ball.y - this.centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Skip if ball is too close to center
        if (distance < 5) return;
        
        // Calculate normalized direction vector
        const dirX = dx / distance;
        const dirY = dy / distance;
        
        // Apply centrifugal force (proportional to rotation speed squared and distance)
        const force = rotationSpeed * rotationSpeed * 0.0002 * distance;
        ball.vx += dirX * force;
        ball.vy += dirY * force;
    }

    /**
     * Draws the container on the canvas
     * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
     * @param {string} color - Container color
     */
    draw(ctx, color) {
        const halfSize = this.size / 2;
        
        ctx.save();
        ctx.translate(this.centerX, this.centerY);
        ctx.rotate(this.angle);
        
        // Draw main square
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.rect(-halfSize, -halfSize, this.size, this.size);
        ctx.stroke();
        
        // Optional: Add inner border for visual effect
        ctx.strokeStyle = this.adjustColorBrightness(color, -30);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.rect(-halfSize + 6, -halfSize + 6, this.size - 12, this.size - 12);
        ctx.stroke();
        
        // Optional: Add corner indicators
        ctx.fillStyle = color;
        const cornerSize = 6;
        ctx.beginPath();
        ctx.arc(-halfSize, -halfSize, cornerSize, 0, Math.PI * 2);
        ctx.arc(halfSize, -halfSize, cornerSize, 0, Math.PI * 2);
        ctx.arc(halfSize, halfSize, cornerSize, 0, Math.PI * 2);
        ctx.arc(-halfSize, halfSize, cornerSize, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
    
    /**
     * Adjusts color brightness
     * @param {string} color - CSS color in hex format
     * @param {number} percent - Percentage to adjust brightness (-100 to 100)
     * @returns {string} - Adjusted color in hex format
     */
    adjustColorBrightness(color, percent) {
        let r = parseInt(color.substring(1, 3), 16);
        let g = parseInt(color.substring(3, 5), 16);
        let b = parseInt(color.substring(5, 7), 16);
        
        r = Math.max(0, Math.min(255, r + (percent / 100) * 255));
        g = Math.max(0, Math.min(255, g + (percent / 100) * 255));
        b = Math.max(0, Math.min(255, b + (percent / 100) * 255));
        
        return `#${Math.round(r).toString(16).padStart(2, '0')}${Math.round(g).toString(16).padStart(2, '0')}${Math.round(b).toString(16).padStart(2, '0')}`;
    }
}

// Export the Container class - fixed to work with both module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Container;
} else {
    window.Container = Container;
}