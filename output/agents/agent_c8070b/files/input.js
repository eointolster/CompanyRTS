// input.js - Manages user interaction and control inputs for Rotation Balls

/**
 * InputManager handles all user interactions with the simulation
 * including UI sliders, buttons, and mouse/touch events
 */
class InputManager {
    /**
     * Initialize the input manager
     * @param {HTMLElement} canvas - The canvas element
     * @param {Object} config - The configuration object
     * @param {Function} resetBallsCallback - Callback to reset balls
     */
    constructor(canvas, config, resetBallsCallback) {
        this.canvas = canvas;
        this.config = config;
        this.resetBalls = resetBallsCallback;
        this.mousePosition = { x: 0, y: 0 };
        this.isMouseDown = false;
        this.isTouch = false;
        this.touches = [];
        this.activeForceFields = [];
        
        // Initialize UI controls
        this.initUIControls();
        
        // Initialize canvas interaction
        this.initCanvasInteraction();
        
        // Initialize keyboard shortcuts
        this.initKeyboardShortcuts();
    }
    
    /**
     * Initialize UI control event listeners
     */
    initUIControls() {
        // Get all UI controls
        this.rotationSpeedInput = document.getElementById('rotationSpeed');
        this.squareColorInput = document.getElementById('squareColor');
        this.ballCountInput = document.getElementById('ballCount');
        this.minSizeInput = document.getElementById('minSize');
        this.maxSizeInput = document.getElementById('maxSize');
        this.resetBallsButton = document.getElementById('resetBalls');
        this.gravityInput = document.getElementById('gravity');
        this.bounceInput = document.getElementById('bounce');
        this.frictionInput = document.getElementById('friction');
        
        // Set up event listeners for continuous inputs (sliders, color picker)
        this.rotationSpeedInput.addEventListener('input', this.handleRotationSpeed.bind(this));
        this.squareColorInput.addEventListener('input', this.handleSquareColor.bind(this));
        this.gravityInput.addEventListener('input', this.handleGravity.bind(this));
        this.bounceInput.addEventListener('input', this.handleBounce.bind(this));
        this.frictionInput.addEventListener('input', this.handleFriction.bind(this));
        
        // Set up event listeners for discrete inputs (number inputs, button)
        this.ballCountInput.addEventListener('change', this.handleBallCount.bind(this));
        this.minSizeInput.addEventListener('change', this.handleMinSize.bind(this));
        this.maxSizeInput.addEventListener('change', this.handleMaxSize.bind(this));
        this.resetBallsButton.addEventListener('click', this.handleResetBalls.bind(this));
        
        // Set up event listeners for input validation
        this.ballCountInput.addEventListener('input', this.validateNumericInput);
        this.minSizeInput.addEventListener('input', this.validateNumericInput);
        this.maxSizeInput.addEventListener('input', this.validateNumericInput);
    }
    
    /**
     * Initialize canvas interaction event listeners
     */
    initCanvasInteraction() {
        // Mouse events
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
        
        // Touch events for mobile
        this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
        this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this));
        this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
        this.canvas.addEventListener('touchcancel', this.handleTouchEnd.bind(this));
        
        // Prevent context menu on right click
        this.canvas.addEventListener('contextmenu', e => e.preventDefault());
    }
    
    /**
     * Initialize keyboard shortcuts
     */
    initKeyboardShortcuts() {
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
    }
    
    // ===== UI Control Handlers =====
    
    /**
     * Handle rotation speed slider changes
     */
    handleRotationSpeed() {
        this.config.rotationSpeed = parseFloat(this.rotationSpeedInput.value);
    }
    
    /**
     * Handle square color picker changes
     */
    handleSquareColor() {
        this.config.squareColor = this.squareColorInput.value;
    }
    
    /**
     * Handle gravity slider changes
     */
    handleGravity() {
        this.config.gravity = parseFloat(this.gravityInput.value);
    }
    
    /**
     * Handle bounce slider changes
     */
    handleBounce() {
        this.config.bounce = parseFloat(this.bounceInput.value);
    }
    
    /**
     * Handle friction slider changes
     */
    handleFriction() {
        this.config.friction = parseFloat(this.frictionInput.value);
    }
    
    /**
     * Handle ball count input changes
     */
    handleBallCount() {
        const value = parseInt(this.ballCountInput.value);
        this.config.ballCount = Math.max(1, Math.min(100, value));
        this.ballCountInput.value = this.config.ballCount;
        this.resetBalls();
    }
    
    /**
     * Handle minimum ball size input changes
     */
    handleMinSize() {
        let value = parseInt(this.minSizeInput.value);
        value = Math.max(5, Math.min(50, value));
        this.config.minSize = value;
        this.minSizeInput.value = value;
        
        // Ensure minSize <= maxSize
        if (this.config.minSize > this.config.maxSize) {
            this.config.maxSize = this.config.minSize;
            this.maxSizeInput.value = this.config.maxSize;
        }
        
        this.resetBalls();
    }
    
    /**
     * Handle maximum ball size input changes
     */
    handleMaxSize() {
        let value = parseInt(this.maxSizeInput.value);
        value = Math.max(10, Math.min(100, value));
        this.config.maxSize = value;
        this.maxSizeInput.value = value;
        
        // Ensure maxSize >= minSize
        if (this.config.maxSize < this.config.minSize) {
            this.config.minSize = this.config.maxSize;
            this.minSizeInput.value = this.config.minSize;
        }
        
        this.resetBalls();
    }
    
    /**
     * Handle reset balls button click
     */
    handleResetBalls() {
        this.resetBalls();
    }
    
    /**
     * Validate that input contains only numbers
     * @param {Event} e - Input event
     */
    validateNumericInput(e) {
        const value = e.target.value;
        if (value && !/^\d+$/.test(value)) {
            e.target.value = value.replace(/[^\d]/g, '');
        }
    }
    
    // ===== Canvas Interaction Handlers =====
    
    /**
     * Get canvas coordinates from a mouse event
     * @param {MouseEvent} e - Mouse event
     * @returns {Object} - Coordinates {x, y}
     */
    getCanvasCoordinates(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }
    
    /**
     * Handle mouse down event
     * @param {MouseEvent} e - Mouse event
     */
    handleMouseDown(e) {
        this.isMouseDown = true;
        this.mousePosition = this.getCanvasCoordinates(e);
        
        // Right click creates repulsion field, left click creates attraction field
        const isRightClick = e.button === 2;
        
        this.activeForceFields.push({
            position: {...this.mousePosition},
            strength: isRightClick ? -0.5 : 0.5,
            radius: 100,
            id: Date.now()
        });
    }
    
    /**
     * Handle mouse move event
     * @param {MouseEvent} e - Mouse event
     */
    handleMouseMove(e) {
        this.mousePosition = this.getCanvasCoordinates(e);
        
        // Update position of last force field if mouse is down
        if (this.isMouseDown && this.activeForceFields.length > 0) {
            const lastField = this.activeForceFields[this.activeForceFields.length - 1];
            lastField.position = {...this.mousePosition};
        }
    }
    
    /**
     * Handle mouse up event
     */
    handleMouseUp() {
        this.isMouseDown = false;
        // Remove the last force field
        if (this.activeForceFields.length > 0) {
            this.activeForceFields.pop();
        }
    }
    
    /**
     * Handle mouse leave event
     */
    handleMouseLeave() {
        this.isMouseDown = false;
        // Clear all force fields when mouse leaves canvas
        this.activeForceFields = [];
    }
    
    /**
     * Handle touch start event
     * @param {TouchEvent} e - Touch event
     */
    handleTouchStart(e) {
        e.preventDefault();
        this.isTouch = true;
        
        const rect = this.canvas.getBoundingClientRect();
        const touches = e.changedTouches;
        
        for (let i = 0; i < touches.length; i++) {
            const touch = touches[i];
            const position = {
                x: touch.clientX - rect.left,
                y: touch.clientY - rect.top
            };
            
            this.touches.push({
                id: touch.identifier,
                position: position
            });
            
            // Create force field for each touch
            this.activeForceFields.push({
                position: {...position},
                strength: 0.5, // All touch interactions create attraction
                radius: 100,
                id: touch.identifier
            });
        }
    }
    
    /**
     * Handle touch move event
     * @param {TouchEvent} e - Touch event
     */
    handleTouchMove(e) {
        e.preventDefault();
        const rect = this.canvas.getBoundingClientRect();
        const touches = e.changedTouches;
        
        for (let i = 0; i < touches.length; i++) {
            const touch = touches[i];
            const position = {
                x: touch.clientX - rect.left,
                y: touch.clientY - rect.top
            };
            
            // Update touch position
            const touchIndex = this.touches.findIndex(t => t.id === touch.identifier);
            if (touchIndex !== -1) {
                this.touches[touchIndex].position = position;
            }
            
            // Update force field position
            const fieldIndex = this.activeForceFields.findIndex(f => f.id === touch.identifier);
            if (fieldIndex !== -1) {
                this.activeForceFields[fieldIndex].position = {...position};
            }
        }
    }
    
    /**
     * Handle touch end event
     * @param {TouchEvent} e - Touch event
     */
    handleTouchEnd(e) {
        e.preventDefault();
        const touches = e.changedTouches;
        
        for (let i = 0; i < touches.length; i++) {
            const touch = touches[i];
            
            // Remove touch
            const touchIndex = this.touches.findIndex(t => t.id === touch.identifier);
            if (touchIndex !== -1) {
                this.touches.splice(touchIndex, 1);
            }
            
            // Remove force field
            const fieldIndex = this.activeForceFields.findIndex(f => f.id === touch.identifier);
            if (fieldIndex !== -1) {
                this.activeForceFields.splice(fieldIndex, 1);
            }
        }
        
        if (this.touches.length === 0) {
            this.isTouch = false;
        }
    }
    
    // ===== Keyboard Shortcuts =====
    
    /**
     * Handle keyboard shortcuts
     * @param {KeyboardEvent} e - Keyboard event
     */
    handleKeyDown(e) {
        switch (e.key) {
            case ' ':
                // Space key resets balls
                this.resetBalls();
                break;
            case 'r':
                // R key reverses gravity
                this.config.gravity = -this.config.gravity;
                this.gravityInput.value = this.config.gravity;
                break;
            case 'g':
                // G key toggles gravity (on/off)
                this.config.gravity = this.config.gravity === 0 ? 0.2 : 0;
                this.gravityInput.value = this.config.gravity;
                break;
            case 's':
                // S key stops rotation
                this.config.rotationSpeed = 0;
                this.rotationSpeedInput.value = 0;
                break;
        }
    }
    
    /**
     * Get active force fields for physics calculations
     * @returns {Array} - Array of active force fields
     */
    getForceFields() {
        return this.activeForceFields;
    }
    
    /**
     * Check if interactive mode is enabled (mouse down or touch active)
     * @returns {boolean} - True if interactive mode is active
     */
    isInteractive() {
        return this.isMouseDown || this.isTouch;
    }
}

// Export the InputManager for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = InputManager;
} else {
    // For browser environments without module support
    window.InputManager = InputManager;
}