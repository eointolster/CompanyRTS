// utils.js - Utility functions for vector calculations, rotations, and other helpers

/**
 * Vector utilities for 2D calculations
 */
class Vector2D {
    /**
     * Create a new 2D vector
     * @param {number} x - X component
     * @param {number} y - Y component
     */
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    /**
     * Get the length (magnitude) of the vector
     * @returns {number} Vector length
     */
    length() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    /**
     * Normalize the vector to a unit vector
     * @returns {Vector2D} New normalized vector
     */
    normalize() {
        const len = this.length();
        if (len === 0) return new Vector2D(0, 0);
        return new Vector2D(this.x / len, this.y / len);
    }

    /**
     * Add another vector to this one
     * @param {Vector2D} v - Vector to add
     * @returns {Vector2D} New vector with sum
     */
    add(v) {
        return new Vector2D(this.x + v.x, this.y + v.y);
    }

    /**
     * Subtract another vector from this one
     * @param {Vector2D} v - Vector to subtract
     * @returns {Vector2D} New vector with difference
     */
    subtract(v) {
        return new Vector2D(this.x - v.x, this.y - v.y);
    }

    /**
     * Multiply vector by a scalar
     * @param {number} scalar - Scalar value
     * @returns {Vector2D} New scaled vector
     */
    multiply(scalar) {
        return new Vector2D(this.x * scalar, this.y * scalar);
    }

    /**
     * Calculate dot product with another vector
     * @param {Vector2D} v - The other vector
     * @returns {number} Dot product
     */
    dot(v) {
        return this.x * v.x + this.y * v.y;
    }

    /**
     * Rotate vector by angle
     * @param {number} angle - Angle in radians
     * @returns {Vector2D} New rotated vector
     */
    rotate(angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return new Vector2D(
            this.x * cos - this.y * sin,
            this.x * sin + this.y * cos
        );
    }

    /**
     * Get distance to another vector
     * @param {Vector2D} v - The other vector
     * @returns {number} Distance between vectors
     */
    distanceTo(v) {
        const dx = this.x - v.x;
        const dy = this.y - v.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Create a copy of this vector
     * @returns {Vector2D} New identical vector
     */
    clone() {
        return new Vector2D(this.x, this.y);
    }
}

/**
 * Class containing rotation-related utility functions
 */
class RotationUtils {
    /**
     * Convert degrees to radians
     * @param {number} degrees - Angle in degrees
     * @returns {number} Angle in radians
     */
    static degreesToRadians(degrees) {
        return degrees * Math.PI / 180;
    }

    /**
     * Convert radians to degrees
     * @param {number} radians - Angle in radians
     * @returns {number} Angle in degrees
     */
    static radiansToDegrees(radians) {
        return radians * 180 / Math.PI;
    }

    /**
     * Rotate a point around an origin
     * @param {Object} point - Point {x, y} to rotate
     * @param {Object} origin - Origin {x, y} to rotate around
     * @param {number} angle - Angle in radians
     * @returns {Object} Rotated point {x, y}
     */
    static rotatePointAround(point, origin, angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        
        // Translate point to origin
        const translatedX = point.x - origin.x;
        const translatedY = point.y - origin.y;
        
        // Rotate point
        const rotatedX = translatedX * cos - translatedY * sin;
        const rotatedY = translatedX * sin + translatedY * cos;
        
        // Translate point back
        return {
            x: rotatedX + origin.x,
            y: rotatedY + origin.y
        };
    }

    /**
     * Get angle between two points
     * @param {Object} p1 - First point {x, y}
     * @param {Object} p2 - Second point {x, y}
     * @returns {number} Angle in radians
     */
    static angleBetween(p1, p2) {
        return Math.atan2(p2.y - p1.y, p2.x - p1.x);
    }
}

/**
 * Utilities for color manipulation
 */
class ColorUtils {
    /**
     * Convert hex color to RGB components
     * @param {string} hex - Hex color string (with or without #)
     * @returns {Object} RGB components {r, g, b}
     */
    static hexToRgb(hex) {
        // Remove # if present
        hex = hex.replace(/^#/, '');
        
        // Parse the components
        const bigint = parseInt(hex, 16);
        const r = (bigint >> 16) & 255;
        const g = (bigint >> 8) & 255;
        const b = bigint & 255;
        
        return { r, g, b };
    }

    /**
     * Convert RGB components to hex color
     * @param {number} r - Red component (0-255)
     * @param {number} g - Green component (0-255)
     * @param {number} b - Blue component (0-255)
     * @returns {string} Hex color string with #
     */
    static rgbToHex(r, g, b) {
        return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    }

    /**
     * Convert hex color to rgba string
     * @param {string} hex - Hex color string
     * @param {number} alpha - Alpha value (0-1)
     * @returns {string} RGBA color string
     */
    static hexToRgba(hex, alpha = 1) {
        const { r, g, b } = this.hexToRgb(hex);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    /**
     * Convert HSL values to RGB
     * @param {number} h - Hue (0-360)
     * @param {number} s - Saturation (0-100)
     * @param {number} l - Lightness (0-100)
     * @returns {Object} RGB components {r, g, b}
     */
    static hslToRgb(h, s, l) {
        h /= 360;
        s /= 100;
        l /= 100;
        
        let r, g, b;
        
        if (s === 0) {
            r = g = b = l; // achromatic
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };
            
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }
        
        return {
            r: Math.round(r * 255),
            g: Math.round(g * 255),
            b: Math.round(b * 255)
        };
    }

    /**
     * Generate a random color
     * @param {boolean} asHex - Whether to return as hex
     * @returns {string} Random color as hex or hsl
     */
    static randomColor(asHex = false) {
        if (asHex) {
            return `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`;
        } else {
            return `hsl(${Math.random() * 360}, 70%, 60%)`;
        }
    }

    /**
     * Adjust the brightness of a color
     * @param {string} color - Hex color
     * @param {number} percent - Percent to adjust (-100 to 100)
     * @returns {string} Adjusted hex color
     */
    static adjustBrightness(color, percent) {
        const { r, g, b } = this.hexToRgb(color);
        
        const adjustedR = Math.max(0, Math.min(255, r + (percent / 100) * 255));
        const adjustedG = Math.max(0, Math.min(255, g + (percent / 100) * 255));
        const adjustedB = Math.max(0, Math.min(255, b + (percent / 100) * 255));
        
        return this.rgbToHex(
            Math.round(adjustedR),
            Math.round(adjustedG),
            Math.round(adjustedB)
        );
    }
}

/**
 * Math utilities specific to the balls and physics simulation
 */
class MathUtils {
    /**
     * Clamp a value between min and max
     * @param {number} value - Value to clamp
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} Clamped value
     */
    static clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    /**
     * Linear interpolation between two values
     * @param {number} a - First value
     * @param {number} b - Second value
     * @param {number} t - Interpolation factor (0-1)
     * @returns {number} Interpolated value
     */
    static lerp(a, b, t) {
        return a + (b - a) * t;
    }

    /**
     * Generate a random float between min and max
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} Random value
     */
    static randomFloat(min, max) {
        return Math.random() * (max - min) + min;
    }

    /**
     * Generate a random integer between min and max (inclusive)
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} Random integer
     */
    static randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    
    /**
     * Calculate the distance between two points
     * @param {number} x1 - First point x
     * @param {number} y1 - First point y
     * @param {number} x2 - Second point x
     * @param {number} y2 - Second point y
     * @returns {number} Distance
     */
    static distance(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    /**
     * Remap a value from one range to another
     * @param {number} value - Value to remap
     * @param {number} fromLow - Source range low
     * @param {number} fromHigh - Source range high
     * @param {number} toLow - Target range low
     * @param {number} toHigh - Target range high
     * @returns {number} Remapped value
     */
    static map(value, fromLow, fromHigh, toLow, toHigh) {
        return toLow + (toHigh - toLow) * (value - fromLow) / (fromHigh - fromLow);
    }
}

/**
 * Collision detection utilities
 */
class CollisionUtils {
    /**
     * Check if point is inside a rectangle
     * @param {Object} point - Point {x, y}
     * @param {Object} rect - Rectangle {x, y, width, height}
     * @returns {boolean} True if point is inside rectangle
     */
    static pointInRect(point, rect) {
        return point.x >= rect.x && 
               point.x <= rect.x + rect.width && 
               point.y >= rect.y && 
               point.y <= rect.y + rect.height;
    }
    
    /**
     * Check if point is inside a rotated rectangle
     * @param {Object} point - Point {x, y}
     * @param {Object} rect - Rectangle center {x, y, width, height}
     * @param {number} angle - Rectangle rotation in radians
     * @returns {boolean} True if point is inside rotated rectangle
     */
    static pointInRotatedRect(point, rect, angle) {
        // Translate point to origin
        const center = { x: rect.x + rect.width/2, y: rect.y + rect.height/2 };
        const translatedPoint = {
            x: point.x - center.x,
            y: point.y - center.y
        };
        
        // Rotate point to align with rectangle
        const rotatedPoint = {
            x: translatedPoint.x * Math.cos(-angle) - translatedPoint.y * Math.sin(-angle),
            y: translatedPoint.x * Math.sin(-angle) + translatedPoint.y * Math.cos(-angle)
        };
        
        // Check if point is inside axis-aligned rectangle
        return Math.abs(rotatedPoint.x) <= rect.width/2 && 
               Math.abs(rotatedPoint.y) <= rect.height/2;
    }
    
    /**
     * Check if circle intersects with rotated rectangle
     * @param {Object} circle - Circle {x, y, radius}
     * @param {Object} rect - Rectangle center {x, y, width, height}
     * @param {number} angle - Rectangle rotation in radians
     * @returns {boolean} True if circle intersects rectangle
     */
    static circleIntersectsRotatedRect(circle, rect, angle) {
        // Get rectangle center
        const center = { x: rect.x + rect.width/2, y: rect.y + rect.height/2 };
        
        // Translate circle position relative to rectangle center
        const relX = circle.x - center.x;
        const relY = circle.y - center.y;
        
        // Rotate circle position
        const rotatedX = relX * Math.cos(-angle) - relY * Math.sin(-angle);
        const rotatedY = relX * Math.sin(-angle) + relY * Math.cos(-angle);
        
        // Find closest point to circle within rectangle
        const closestX = MathUtils.clamp(rotatedX, -rect.width/2, rect.width/2);
        const closestY = MathUtils.clamp(rotatedY, -rect.height/2, rect.height/2);
        
        // Calculate distance between circle center and closest point
        const distance = MathUtils.distance(rotatedX, rotatedY, closestX, closestY);
        
        // Check if distance is less than circle radius
        return distance <= circle.radius;
    }
    
    /**
     * Check if two circles intersect
     * @param {Object} c1 - First circle {x, y, radius}
     * @param {Object} c2 - Second circle {x, y, radius}
     * @returns {boolean} True if circles intersect
     */
    static circlesIntersect(c1, c2) {
        const distance = MathUtils.distance(c1.x, c1.y, c2.x, c2.y);
        return distance < c1.radius + c2.radius;
    }
    
    /**
     * Calculate collision response for ball hitting a rotated edge
     * @param {Object} ball - Ball object {x, y, vx, vy, size}
     * @param {Object} normal - Normal vector {x, y}
     * @param {number} bounce - Bounce coefficient
     * @returns {Object} New velocity {vx, vy}
     */
    static calculateBounce(ball, normal, bounce) {
        // Calculate velocity vector
        const velocity = new Vector2D(ball.vx, ball.vy);
        
        // Calculate normalized normal vector
        const normalVec = new Vector2D(normal.x, normal.y).normalize();
        
        // Calculate reflection vector: v' = v - 2(v·n)n
        const dot = velocity.dot(normalVec);
        const reflectionX = velocity.x - 2 * dot * normalVec.x;
        const reflectionY = velocity.y - 2 * dot * normalVec.y;
        
        // Apply bounce factor
        return {
            vx: reflectionX * bounce,
            vy: reflectionY * bounce
        };
    }
}

/**
 * Animation and timing utilities
 */
class AnimationUtils {
    /**
     * Create a simple easing function
     * @param {string} type - Easing type: 'linear', 'easeIn', 'easeOut', 'easeInOut'
     * @returns {Function} Easing function that takes t (0-1) and returns eased value
     */
    static easing(type = 'linear') {
        switch (type) {
            case 'linear':
                return t => t;
            case 'easeIn':
                return t => t * t;
            case 'easeOut':
                return t => t * (2 - t);
            case 'easeInOut':
                return t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
            default:
                return t => t;
        }
    }
    
    /**
     * Request animation frame with fallback
     * @param {Function} callback - Animation callback function
     * @returns {number} Request ID
     */
    static requestAnimFrame(callback) {
        return (window.requestAnimationFrame ||
               window.webkitRequestAnimationFrame ||
               window.mozRequestAnimationFrame ||
               (callback => window.setTimeout(callback, 1000 / 60)))(callback);
    }
    
    /**
     * Cancel animation frame with fallback
     * @param {number} id - Request ID to cancel
     */
    static cancelAnimFrame(id) {
        (window.cancelAnimationFrame ||
         window.webkitCancelAnimationFrame ||
         window.mozCancelAnimationFrame ||
         window.clearTimeout)(id);
    }
    
    /**
     * Create a simple animation sequence
     * @param {number} duration - Animation duration in ms
     * @param {Function} onUpdate - Update function(progress)
     * @param {Function} onComplete - Completion callback
     * @param {string} easingType - Type of easing
     * @returns {Object} Animation controller with start, stop, pause methods
     */
    static animate(duration, onUpdate, onComplete, easingType = 'linear') {
        let startTime = null;
        let animReq = null;
        let paused = false;
        let pauseTime = 0;
        
        const easingFn = this.easing(easingType);
        
        const update = (timestamp) => {
            if (!startTime) startTime = timestamp;
            if (paused) return;
            
            const elapsed = timestamp - startTime - pauseTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = easingFn(progress);
            
            onUpdate(easedProgress);
            
            if (progress < 1) {
                animReq = AnimationUtils.requestAnimFrame(update);
            } else {
                if (onComplete) onComplete();
            }
        };
        
        return {
            start() {
                paused = false;
                animReq = AnimationUtils.requestAnimFrame(update);
                return this;
            },
            
            pause() {
                if (!paused) {
                    paused = true;
                    AnimationUtils.cancelAnimFrame(animReq);
                    pauseTime = performance.now() - startTime - pauseTime;
                }
                return this;
            },
            
            resume() {
                if (paused) {
                    paused = false;
                    animReq = AnimationUtils.requestAnimFrame(update);
                }
                return this;
            },
            
            stop() {
                AnimationUtils.cancelAnimFrame(animReq);
                startTime = null;
                pauseTime = 0;
                return this;
            }
        };
    }
}

/**
 * DOM manipulation utilities
 */
class DOMUtils {
    /**
     * Create a DOM element with attributes and children
     * @param {string} tag - HTML tag name
     * @param {Object} attrs - Attributes to set on element
     * @param {Array|Node|string} children - Child elements or text
     * @returns {HTMLElement} Created element
     */
    static createElement(tag, attrs = {}, children = []) {
        const element = document.createElement(tag);
        
        // Set attributes
        Object.entries(attrs).forEach(([key, value]) => {
            if (key === 'style' && typeof value === 'object') {
                Object.assign(element.style, value);
            } else if (key.startsWith('on') && typeof value === 'function') {
                element.addEventListener(key.slice(2).toLowerCase(), value);
            } else {
                element.setAttribute(key, value);
            }
        });
        
        // Add children
        if (Array.isArray(children)) {
            children.forEach(child => {
                if (child instanceof Node) {
                    element.appendChild(child);
                } else {
                    element.appendChild(document.createTextNode(String(child)));
                }
            });
        } else if (children instanceof Node) {
            element.appendChild(children);
        } else {
            element.textContent = String(children);
        }
        
        return element;
    }
    
    /**
     * Add multiple event listeners to an element
     * @param {HTMLElement} element - Element to add listeners to
     * @param {Object} events - Object with event names as keys and handlers as values
     */
    static addEventListeners(element, events) {
        Object.entries(events).forEach(([event, handler]) => {
            element.addEventListener(event, handler);
        });
    }
    
    /**
     * Remove multiple event listeners from an element
     * @param {HTMLElement} element - Element to remove listeners from
     * @param {Object} events - Object with event names as keys and handlers as values
     */
    static removeEventListeners(element, events) {
        Object.entries(events).forEach(([event, handler]) => {
            element.removeEventListener(event, handler);
        });
    }
}

// Export the utilities as ES modules
export { Vector2D, RotationUtils, ColorUtils, MathUtils, CollisionUtils, AnimationUtils, DOMUtils };