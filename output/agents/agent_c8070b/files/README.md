# RotationBalls

## Overview
RotationBalls is an interactive web animation that features a rotating square container filled with colorful balls of varying sizes. The balls respond to gravity and collide with the container walls and each other as the container rotates. This project is built with vanilla JavaScript, with no external dependencies or libraries required.

## Features
- Dynamic rotating container with adjustable speed
- Physics-based ball movement with gravity and friction effects
- Realistic collision detection and response between balls and container walls
- Balls of varying sizes, colors, and masses
- Interactive force fields (click/touch and drag on canvas to attract/repel balls)
- Responsive design that adapts to different screen sizes
- Customizable parameters via UI controls (rotation speed, color, ball count, ball size, gravity, bounce, friction)
- Visual effects like ball trails, patterns, highlights, and shadows
- Keyboard shortcuts for common actions

## Installation

### Quick Setup
1. Clone the repository or download the source files.
2. No build process or dependencies to install.
3. Open `index.html` in any modern web browser.

```bash
# If using git
git clone https://github.com/yourusername/rotationballs.git
cd rotationballs
# Then open index.html in your browser
```
*(Note: Replace `yourusername` with the actual repository path if applicable)*

## Usage

- **Adjust Parameters**: Use the sliders and input fields in the control panel below the canvas to change simulation parameters like rotation speed, gravity, number of balls, etc.
- **Reset Balls**: Click the "Reset Balls" button or press the `Space` key to generate a new set of balls based on the current settings.
- **Interactive Forces**:
    - **Left-Click and Drag** on the canvas to create an attractive force field that pulls balls towards your cursor.
    - **Right-Click and Drag** on the canvas to create a repulsive force field that pushes balls away from your cursor.
    - **Touch and Drag** on touch-enabled devices to create an attractive force field.
- **Keyboard Shortcuts**:
    - `Space`: Reset balls.
    - `R`: Reverse gravity direction.
    - `G`: Toggle gravity on/off (sets gravity to 0 or restores previous value).
    - `S`: Stop container rotation (sets rotation speed to 0).

## Project Structure

```
rotationballs/
│
├── index.html         # Main HTML document (includes embedded CSS)
├── app.js             # Main application logic, simulation loop, component coordination
├── ball.js            # Ball class definition (properties, update, collision, drawing)
├── container.js       # Container class for the rotating square (properties, transformations, drawing)
├── input.js           # Handles UI controls, mouse/touch interaction, keyboard shortcuts
├── physics.js         # Contains physics helper functions (gravity, friction, collisions - some overlap with other classes)
├── renderer.js        # Handles drawing operations (square, balls, effects - some overlap/unused)
├── utils.js           # Utility functions for math, vectors, colors, etc.
└── favicon.ico        # Website favicon (binary file)
```

### File Descriptions

- **index.html**: The main HTML file that sets up the canvas element, UI controls, and loads the JavaScript files. Contains embedded CSS styles.
- **app.js**: The main application script that initializes the simulation, manages the animation loop, and coordinates interactions between different components (Container, Balls, InputManager).
- **ball.js**: Defines the `Ball` class, including its physical properties (position, velocity, mass, size, color, restitution), update logic (movement, gravity, friction), collision detection/response (ball-square and ball-ball), and drawing methods (including patterns, trails, highlights).
- **container.js**: Defines the `Container` class representing the rotating square. Manages its state (size, position, angle), provides coordinate transformation methods, and includes drawing logic for the square itself.
- **input.js**: Defines the `InputManager` class, responsible for handling all user input: binding UI controls (sliders, buttons) to the configuration, processing mouse and touch events on the canvas for interactive forces, and managing keyboard shortcuts.
- **physics.js**: Provides a collection of physics-related functions, such as applying gravity and friction, and performing collision detection (ball-square, ball-ball). Note: Some logic here might overlap with methods within the `Ball` and `Container` classes.
- **renderer.js**: Defines a `Renderer` class intended for drawing elements onto the canvas. Note: In the current structure, much of the drawing is handled directly by the `Ball` and `Container` classes' own `draw` methods.
- **utils.js**: Contains various utility classes and functions for common tasks like vector math (`Vector2D`), rotation calculations (`RotationUtils`), color manipulation (`ColorUtils`), general math helpers (`MathUtils`), and potentially collision/animation/DOM utilities (though not all may be actively used).

## Browser Compatibility

RotationBalls works on all modern browsers that support HTML5 Canvas and ES6 JavaScript:
- Chrome (recommended)
- Firefox
- Safari
- Edge

## License

This project is open source and available under the MIT License.

## Acknowledgments

This project serves as a demonstration of physics-based animations and component interaction using vanilla JavaScript, without relying on external libraries.