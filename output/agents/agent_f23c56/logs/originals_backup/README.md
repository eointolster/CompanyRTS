# RotationBalls

## Overview
RotationBalls is an interactive web animation that features a rotating square container filled with colorful balls of varying sizes. The balls respond to gravity and collide with the container walls as it rotates, creating mesmerizing visual effects. This project is built with vanilla JavaScript, with no external dependencies or libraries required.

## Features
- Dynamic rotating container with adjustable speed
- Physics-based ball movement with gravity effects
- Realistic collision detection and response
- Balls of varying sizes and colors
- Responsive design that works across different screen sizes
- Customizable parameters (ball count, rotation speed, gravity)
- Smooth animation with optimized rendering

## Installation

### Quick Setup
1. Clone the repository or download the source files
2. No build process or dependencies to install
3. Open `index.html` in any modern web browser

```bash
# If using git
git clone https://github.com/yourusername/rotationballs.git
cd rotationballs
# Then open index.html in your browser
```

## Usage

- **Start/Stop Rotation**: Click on the container to pause/resume rotation
- **Adjust Speed**: Use arrow keys to increase or decrease rotation speed
- **Reset**: Press 'R' key to reset the simulation
- **Add Balls**: Press spacebar to add more balls to the container

## Project Structure

```
rotationballs/
│
├── index.html         # Main HTML document
├── styles.css         # CSS styling for the application
├── app.js             # Main application entry point
├── renderer.js        # Handles canvas rendering and animation
├── physics.js         # Contains physics calculations and simulation
├── ball.js            # Ball class definition and behaviors
├── container.js       # Container class for the rotating square
├── utils.js           # Utility functions for calculations and helpers
├── input.js           # User input handling
└── favicon.ico        # Website favicon
```

### File Descriptions

- **index.html**: The main HTML file that sets up the canvas element and loads the JavaScript files.
- **styles.css**: Contains all styling for the application, including the container and interface elements.
- **app.js**: The main application that initializes the simulation and coordinates between components.
- **renderer.js**: Handles all canvas drawing operations and the animation loop.
- **physics.js**: Implements gravity, collision detection, and physics calculations.
- **ball.js**: Defines the Ball class with properties like position, velocity, size, and color.
- **container.js**: Manages the rotating square container and its interactions with the balls.
- **utils.js**: Contains utility functions for vector calculations, random generation, and other helpers.
- **input.js**: Manages keyboard and mouse inputs for controlling the simulation.

## Browser Compatibility

RotationBalls works on all modern browsers that support HTML5 Canvas:
- Chrome (recommended)
- Firefox
- Safari
- Edge

## License

This project is open source and available under the MIT License.

## Acknowledgments

This project was created as a demonstration of physics-based animations using vanilla JavaScript, without relying on external libraries.