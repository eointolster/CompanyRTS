// renderer.js - Handles drawing of balls and rotating square on the canvas

/**
 * Renderer class to handle all drawing operations
 */
class Renderer {
    /**
     * Create a new renderer
     * @param {CanvasRenderingContext2D} ctx - The canvas 2D context
     */
    constructor(ctx) {
        this.ctx = ctx;
    }

    /**
     * Clears the entire canvas
     * @param {number} width - Canvas width
     * @param {number} height - Canvas height
     */
    clearCanvas(width, height) {
        this.ctx.clearRect(0, 0, width, height);
    }

    /**
     * Draws a rotating square
     * @param {number} width - Canvas width
     * @param {number} height - Canvas height
     * @param {Object} config - Configuration object containing angle and squareColor
     * @returns {number} - Size of the square for collision detection
     */
    drawSquare(width, height, config) {
        const squareSize = Math.min(width, height) * 0.7;
        const centerX = width / 2;
        const centerY = height / 2;
        
        this.ctx.save();
        this.ctx.translate(centerX, centerY);
        this.ctx.rotate(config.angle);
        
        // Draw square border
        this.ctx.strokeStyle = config.squareColor;
        this.ctx.lineWidth = 4;
        this.ctx.beginPath();
        this.ctx.rect(-squareSize / 2, -squareSize / 2, squareSize, squareSize);
        this.ctx.stroke();
        
        // Optional: Add some visual effects to the square
        this.ctx.strokeStyle = this.adjustColorBrightness(config.squareColor, -30);
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.rect(-squareSize / 2 + 6, -squareSize / 2 + 6, squareSize - 12, squareSize - 12);
        this.ctx.stroke();
        
        this.ctx.restore();
        
        return squareSize; // Return square size for collision detection
    }
    
    /**
     * Adjusts color brightness
     * @param {string} color - CSS color string
     * @param {number} percent - Percentage to adjust brightness (-100 to 100)
     * @returns {string} - Adjusted color
     */
    adjustColorBrightness(color, percent) {
        // Convert hex to RGB
        let r = parseInt(color.substring(1, 3), 16);
        let g = parseInt(color.substring(3, 5), 16);
        let b = parseInt(color.substring(5, 7), 16);
        
        // Adjust brightness
        r = Math.max(0, Math.min(255, r + (percent / 100) * 255));
        g = Math.max(0, Math.min(255, g + (percent / 100) * 255));
        b = Math.max(0, Math.min(255, b + (percent / 100) * 255));
        
        // Convert back to hex
        return `#${Math.round(r).toString(16).padStart(2, '0')}${Math.round(g).toString(16).padStart(2, '0')}${Math.round(b).toString(16).padStart(2, '0')}`;
    }
    
    /**
     * Draws a ball
     * @param {Object} ball - Ball object with position, size and color properties
     */
    drawBall(ball) {
        this.ctx.beginPath();
        this.ctx.arc(ball.x, ball.y, ball.size, 0, Math.PI * 2);
        this.ctx.fillStyle = ball.color;
        this.ctx.fill();
        
        // Add shading effect for 3D look
        const gradient = this.ctx.createRadialGradient(
            ball.x - ball.size * 0.3, 
            ball.y - ball.size * 0.3,
            0,
            ball.x,
            ball.y,
            ball.size
        );
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
        gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
        
        this.ctx.beginPath();
        this.ctx.arc(ball.x, ball.y, ball.size, 0, Math.PI * 2);
        this.ctx.fillStyle = gradient;
        this.ctx.fill();
        
        this.ctx.closePath();
    }
    
    /**
     * Draw a trail effect behind a ball
     * @param {Object} ball - Ball object with position, velocity, and size
     */
    drawBallTrail(ball) {
        // Only draw trails for fast-moving balls
        const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
        if (speed < 2) return;
        
        const trailLength = Math.min(10, Math.floor(speed * 1.5));
        
        for (let i = 1; i <= trailLength; i++) {
            const alpha = 0.7 * (1 - i / trailLength);
            const size = ball.size * (1 - i / (trailLength * 2));
            
            this.ctx.beginPath();
            this.ctx.arc(
                ball.x - (ball.vx * i * 0.5),
                ball.y - (ball.vy * i * 0.5),
                size,
                0,
                Math.PI * 2
            );
            
            const color = this.hexToRgba(ball.color, alpha);
            this.ctx.fillStyle = color;
            this.ctx.fill();
            this.ctx.closePath();
        }
    }
    
    /**
     * Converts hex color to rgba
     * @param {string} color - Hex color or HSL color string
     * @param {number} alpha - Alpha value
     * @returns {string} - rgba color string
     */
    hexToRgba(color, alpha) {
        if (color.startsWith('#')) {
            const r = parseInt(color.slice(1, 3), 16);
            const g = parseInt(color.slice(3, 5), 16);
            const b = parseInt(color.slice(5, 7), 16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        } else if (color.startsWith('hsl')) {
            // Extract h, s, l values from hsl string
            const [h, s, l] = color.match(/\d+/g).map(Number);
            // For simplicity, approximate rgb values
            return `hsla(${h}, ${s}%, ${l}%, ${alpha})`;
        }
        return color;
    }

    /**
     * Draws all balls
     * @param {Array} balls - Array of ball objects
     * @param {boolean} withTrails - Whether to draw trails
     */
    drawBalls(balls, withTrails = true) {
        balls.forEach(ball => {
            if (withTrails) {
                this.drawBallTrail(ball);
            }
            this.drawBall(ball);
        });
    }
    
    /**
     * Add visual effects when balls collide with walls
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} size - Size of the effect
     */
    drawCollisionEffect(x, y, size) {
        const particleCount = Math.floor(size / 2);
        
        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * size;
            const particleSize = Math.random() * 2 + 1;
            
            const particleX = x + Math.cos(angle) * distance;
            const particleY = y + Math.sin(angle) * distance;
            
            this.ctx.beginPath();
            this.ctx.arc(particleX, particleY, particleSize, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.5 + 0.2})`;
            this.ctx.fill();
            this.ctx.closePath();
        }
    }
    
    /**
     * Draw background effects
     * @param {number} width - Canvas width
     * @param {number} height - Canvas height
     * @param {number} time - Current animation time
     */
    drawBackground(width, height, time) {
        // Optional: Add subtle background effects
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
        this.ctx.fillRect(0, 0, width, height);
        
        // Draw subtle grid lines
        this.ctx.strokeStyle = 'rgba(30, 30, 30, 0.3)';
        this.ctx.lineWidth = 0.5;
        
        const gridSize = 30;
        
        for (let x = 0; x < width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, height);
            this.ctx.stroke();
        }
        
        for (let y = 0; y < height; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(width, y);
            this.ctx.stroke();
        }
    }
}

// Export the renderer class
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Renderer;
} else {
    window.Renderer = Renderer;
}