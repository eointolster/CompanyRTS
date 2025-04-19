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
     * @returns {Object|null} RGB components {r, g, b} or null if invalid hex
     */
    static hexToRgb(hex) {
         if (!hex || typeof hex !== 'string') return null;
        // Remove # if present
        hex = hex.replace(/^#/, '');

        // Check for valid hex length
        if (hex.length !== 3 && hex.length !== 6) return null;

        // Expand shorthand hex (e.g., "03F" -> "0033FF")
        if (hex.length === 3) {
             hex = hex.split('').map(char => char + char).join('');
        }

        // Parse the components
        const bigint = parseInt(hex, 16);
        // Check if parsing was successful (not NaN)
        if (isNaN(bigint)) return null;

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
         // Clamp values to 0-255 and ensure they are integers
         r = Math.max(0, Math.min(255, Math.round(r)));
         g = Math.max(0, Math.min(255, Math.round(g)));
         b = Math.max(0, Math.min(255, Math.round(b)));

         // Convert each component to a 2-digit hex string
         const rHex = r.toString(16).padStart(2, '0');
         const gHex = g.toString(16).padStart(2, '0');
         const bHex = b.toString(16).padStart(2, '0');

        return `#${rHex}${gHex}${bHex}`;
    }

    /**
     * Convert hex color to rgba string
     * @param {string} hex - Hex color string
     * @param {number} alpha - Alpha value (0-1)
     * @returns {string|null} RGBA color string or null if hex is invalid
     */
    static hexToRgba(hex, alpha = 1) {
        const rgb = this.hexToRgb(hex);
        if (!rgb) return null; // Return null if hex was invalid
        // Clamp alpha
        alpha = Math.max(0, Math.min(1, alpha));
        return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
    }

    /**
     * Convert HSL values to RGB
     * @param {number} h - Hue (0-360)
     * @param {number} s - Saturation (0-100)
     * @param {number} l - Lightness (0-100)
     * @returns {Object} RGB components {r, g, b}
     */
    static hslToRgb(h, s, l) {
        // Clamp and normalize inputs
        h = (h % 360 + 360) % 360; // Ensure h is in [0, 360)
        s = Math.max(0, Math.min(100, s)) / 100;
        l = Math.max(0, Math.min(100, l)) / 100;

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
            const hNormalized = h / 360;

            r = hue2rgb(p, q, hNormalized + 1/3);
            g = hue2rgb(p, q, hNormalized);
            b = hue2rgb(p, q, hNormalized - 1/3);
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
            // Ensure 6 digits with padStart
            return `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`;
        } else {
            // Generate random HSL values within reasonable ranges
            const h = Math.random() * 360;
            const s = MathUtils.randomFloat(60, 80); // Saturation between 60% and 80%
            const l = MathUtils.randomFloat(50, 70); // Lightness between 50% and 70%
            return `hsl(${h.toFixed(0)}, ${s.toFixed(0)}%, ${l.toFixed(0)}%)`;
        }
    }

    /**
     * Adjust the brightness of a color
     * @param {string} color - Hex color string
     * @param {number} percent - Percent to adjust (-100 to 100)
     * @returns {string|null} Adjusted hex color string or null if input color invalid
     */
    static adjustBrightness(color, percent) {
        const rgb = this.hexToRgb(color);
        if (!rgb) return null; // Return null if hex was invalid

        const { r, g, b } = rgb;
        const factor = percent / 100;

        // Adjust each component, clamping between 0 and 255
        const adjustedR = Math.max(0, Math.min(255, r + factor * 255));
        const adjustedG = Math.max(0, Math.min(255, g + factor * 255));
        const adjustedB = Math.max(0, Math.min(255, b + factor * 255));

        return this.rgbToHex(adjustedR, adjustedG, adjustedB);
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
        // Clamp t to [0, 1]
        t = Math.max(0, Math.min(1, t));
        return a + (b - a) * t;
    }

    /**
     * Generate a random float between min and max (inclusive of min, exclusive of max)
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
        min = Math.ceil(min);
        max = Math.floor(max);
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
     * Calculate the squared distance between two points (faster than distance)
     * @param {number} x1 - First point x
     * @param {number} y1 - First point y
     * @param {number} x2 - Second point x
     * @param {number} y2 - Second point y
     * @returns {number} Squared distance
     */
    static distanceSq(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return dx * dx + dy * dy;
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
         // Avoid division by zero
         if (fromHigh === fromLow) {
              return (toLow + toHigh) / 2; // Return midpoint of target range or specific value
         }
        const t = (value - fromLow) / (fromHigh - fromLow);
        return toLow + (toHigh - toLow) * t;
    }
}

/**
 * Collision detection utilities (mostly unused if logic is within Ball/Container)
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
     * Check if point is inside a rotated rectangle (centered rectangle)
     * @param {Object} point - Point {x, y} in world space
     * @param {Object} rectCenter - Rectangle center {x, y}
     * @param {number} rectWidth - Rectangle width
     * @param {number} rectHeight - Rectangle height
     * @param {number} angle - Rectangle rotation in radians
     * @returns {boolean} True if point is inside rotated rectangle
     */
    static pointInRotatedRect(point, rectCenter, rectWidth, rectHeight, angle) {
        // Translate point relative to rectangle center
        const relX = point.x - rectCenter.x;
        const relY = point.y - rectCenter.y;

        // Rotate point backwards by rectangle angle
        const cos = Math.cos(-angle);
        const sin = Math.sin(-angle);
        const rotatedX = relX * cos - relY * sin;
        const rotatedY = relX * sin + relY * cos;

        // Check if rotated point is within axis-aligned bounds
        const halfWidth = rectWidth / 2;
        const halfHeight = rectHeight / 2;
        return Math.abs(rotatedX) <= halfWidth && Math.abs(rotatedY) <= halfHeight;
    }

    /**
     * Check if circle intersects with rotated rectangle (centered rectangle)
     * @param {Object} circle - Circle {x, y, radius}
     * @param {Object} rectCenter - Rectangle center {x, y}
     * @param {number} rectWidth - Rectangle width
     * @param {number} rectHeight - Rectangle height
     * @param {number} angle - Rectangle rotation in radians
     * @returns {boolean} True if circle intersects rectangle
     */
    static circleIntersectsRotatedRect(circle, rectCenter, rectWidth, rectHeight, angle) {
        // Translate circle position relative to rectangle center
        const relX = circle.x - rectCenter.x;
        const relY = circle.y - rectCenter.y;

        // Rotate circle position backwards by rectangle angle
        const cos = Math.cos(-angle);
        const sin = Math.sin(-angle);
        const rotatedX = relX * cos - relY * sin;
        const rotatedY = relX * sin + relY * cos;

        // Find the closest point on the rectangle (in its rotated frame) to the rotated circle center
        const halfWidth = rectWidth / 2;
        const halfHeight = rectHeight / 2;
        const closestX = MathUtils.clamp(rotatedX, -halfWidth, halfWidth);
        const closestY = MathUtils.clamp(rotatedY, -halfHeight, halfHeight);

        // Calculate the squared distance between the rotated circle center and this closest point
        const distanceSq = MathUtils.distanceSq(rotatedX, rotatedY, closestX, closestY);

        // Check if the distance is less than the circle's radius squared
        return distanceSq <= (circle.radius * circle.radius);
    }

    /**
     * Check if two circles intersect
     * @param {Object} c1 - First circle {x, y, radius}
     * @param {Object} c2 - Second circle {x, y, radius}
     * @returns {boolean} True if circles intersect
     */
    static circlesIntersect(c1, c2) {
        const distanceSq = MathUtils.distanceSq(c1.x, c1.y, c2.x, c2.y);
        const radiiSum = c1.radius + c2.radius;
        return distanceSq < (radiiSum * radiiSum);
    }

    /**
     * Calculate collision response for a ball hitting a static surface with a normal vector
     * @param {Object} ball - Ball object {vx, vy}
     * @param {Object} normal - Surface normal vector {x, y} (should be normalized)
     * @param {number} bounce - Bounce coefficient (restitution)
     * @returns {Object} New velocity {vx, vy}
     */
    static calculateBounce(ball, normal, bounce) {
        // Ensure normal is a unit vector
        const normalVec = new Vector2D(normal.x, normal.y).normalize();
        const velocity = new Vector2D(ball.vx, ball.vy);

        // Calculate velocity component along the normal: v_n = v · n
        const velocityNormal = velocity.dot(normalVec);

        // Calculate impulse magnitude: j = -(1 + bounce) * v_n
        // Note: This assumes the surface has infinite mass.
        const impulseMagnitude = -(1 + bounce) * velocityNormal;

        // Calculate change in velocity: dv = j * n (assuming ball mass = 1, otherwise dv = j * n / mass)
        const dv = normalVec.multiply(impulseMagnitude);

        // Calculate new velocity: v' = v + dv
        const newVelocity = velocity.add(dv);

        return {
            vx: newVelocity.x,
            vy: newVelocity.y
        };
    }
}

/**
 * Animation and timing utilities (Unused in current project)
 */
class AnimationUtils {
    /**
     * Create a simple easing function
     * @param {string} type - Easing type: 'linear', 'easeIn', 'easeOut', 'easeInOut', 'easeInQuad', 'easeOutQuad', 'easeInOutQuad'
     * @returns {Function} Easing function that takes t (0-1) and returns eased value
     */
    static easing(type = 'linear') {
        switch (type) {
            case 'linear':      return t => t;
            case 'easeInQuad':  return t => t * t;
            case 'easeOutQuad': return t => t * (2 - t);
            case 'easeInOutQuad': return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
            // Alias for simple quadratic easing
            case 'easeIn':      return t => t * t;
            case 'easeOut':     return t => t * (2 - t);
            case 'easeInOut':   return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
            default:            return t => t;
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
               (cb => window.setTimeout(cb, 1000 / 60)))(callback);
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
     * Create a simple animation sequence (Example Usage)
     * @param {number} duration - Animation duration in ms
     * @param {Function} onUpdate - Update function(progress) called each frame (progress 0 to 1)
     * @param {Function} [onComplete] - Optional completion callback
     * @param {string} [easingType='linear'] - Type of easing function to apply
     * @returns {Object} Animation controller with start, stop, pause, resume methods
     */
    static animate(duration, onUpdate, onComplete, easingType = 'linear') {
        let startTime = null;
        let animReq = null;
        let paused = false;
        let pauseStartTime = 0;
        let accumulatedPauseTime = 0;

        const easingFn = this.easing(easingType);

        const step = (timestamp) => {
            if (paused) {
                 animReq = AnimationUtils.requestAnimFrame(step); // Keep requesting frame even when paused to handle resume
                 return;
            }
            if (!startTime) {
                 startTime = timestamp;
            }

            const elapsed = timestamp - startTime - accumulatedPauseTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = easingFn(progress);

            try {
                 onUpdate(easedProgress);
            } catch (error) {
                 console.error("Error during animation update:", error);
                 this.stop(); // Stop animation on error
                 return;
            }


            if (progress < 1) {
                animReq = AnimationUtils.requestAnimFrame(step);
            } else {
                startTime = null; // Reset for potential restart
                accumulatedPauseTime = 0;
                if (onComplete) {
                     try { onComplete(); } catch (error) { console.error("Error during animation completion:", error); }
                }
            }
        };

        const controller = {
            start() {
                if (animReq) { // Prevent multiple starts
                     this.stop();
                }
                paused = false;
                startTime = null; // Reset start time
                accumulatedPauseTime = 0;
                animReq = AnimationUtils.requestAnimFrame(step);
                return this;
            },

            pause() {
                if (!paused && animReq) {
                    paused = true;
                    pauseStartTime = performance.now(); // Record when pause started
                    AnimationUtils.cancelAnimFrame(animReq); // Stop requesting new frames
                    animReq = null; // Clear request ID
                }
                return this;
            },

            resume() {
                if (paused) {
                    paused = false;
                    // Add the duration of the pause to the accumulated pause time
                    accumulatedPauseTime += performance.now() - pauseStartTime;
                    animReq = AnimationUtils.requestAnimFrame(step); // Restart the animation loop
                }
                return this;
            },

            stop() {
                 if (animReq) {
                      AnimationUtils.cancelAnimFrame(animReq);
                 }
                 animReq = null;
                 paused = false;
                 startTime = null;
                 accumulatedPauseTime = 0;
                 pauseStartTime = 0;
                 return this;
            },

            isRunning: () => !!animReq && !paused,
            isPaused: () => paused,
        };
        return controller;
    }
}

/**
 * DOM manipulation utilities (Unused in current project)
 */
class DOMUtils {
    /**
     * Create a DOM element with attributes and children
     * @param {string} tag - HTML tag name
     * @param {Object} [attrs={}] - Attributes to set on element (e.g., { id: 'myId', class: 'myClass', style: { color: 'red' }, 'data-value': 5 })
     * @param {Array|Node|string} [children=[]] - Child elements or text nodes to append
     * @returns {HTMLElement} Created element
     */
    static createElement(tag, attrs = {}, children = []) {
        const element = document.createElement(tag);

        // Set attributes
        for (const key in attrs) {
            if (Object.prototype.hasOwnProperty.call(attrs, key)) {
                const value = attrs[key];
                if (key === 'style' && typeof value === 'object') {
                    Object.assign(element.style, value);
                } else if (key === 'class' || key === 'className') {
                    if (Array.isArray(value)) {
                         element.className = value.join(' ');
                    } else if (typeof value === 'string') {
                         element.className = value;
                    }
                } else if (key.startsWith('on') && typeof value === 'function') {
                    element.addEventListener(key.slice(2).toLowerCase(), value);
                } else if (typeof value === 'boolean') {
                     if (value) {
                          element.setAttribute(key, ''); // Set boolean attributes like 'disabled'
                     }
                } else if (value != null) { // Set other attributes if value is not null/undefined
                    element.setAttribute(key, value);
                }
            }
        }


        // Add children
        const addChild = (child) => {
            if (child instanceof Node) {
                element.appendChild(child);
            } else if (child != null) { // Append non-null/undefined values as text nodes
                element.appendChild(document.createTextNode(String(child)));
            }
        };

        if (Array.isArray(children)) {
            children.forEach(addChild);
        } else {
            addChild(children); // Handle single child (Node or string)
        }

        return element;
    }

    /**
     * Add multiple event listeners to an element
     * @param {EventTarget} element - Element to add listeners to
     * @param {Object.<string, Function>} events - Object with event names as keys and handlers as values
     * @param {boolean|Object} [options] - Optional capture/passive options
     */
    static addEventListeners(element, events, options) {
        if (!element || !events) return;
        Object.entries(events).forEach(([event, handler]) => {
             if (typeof handler === 'function') {
                  element.addEventListener(event, handler, options);
             }
        });
    }

    /**
     * Remove multiple event listeners from an element
     * @param {EventTarget} element - Element to remove listeners from
     * @param {Object.<string, Function>} events - Object with event names as keys and handlers as values
     * @param {boolean|Object} [options] - Optional capture options (must match options used in addEventListener)
     */
    static removeEventListeners(element, events, options) {
         if (!element || !events) return;
        Object.entries(events).forEach(([event, handler]) => {
             if (typeof handler === 'function') {
                  element.removeEventListener(event, handler, options);
             }
        });
    }
}

// Export the utilities by attaching them to the window object for script tag usage
window.Vector2D = Vector2D;
window.RotationUtils = RotationUtils;
window.ColorUtils = ColorUtils;
window.MathUtils = MathUtils;
window.CollisionUtils = CollisionUtils;
window.AnimationUtils = AnimationUtils;
window.DOMUtils = DOMUtils;