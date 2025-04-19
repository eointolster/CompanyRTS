/**
 * ui.js - UI Helper Functions
 * Contains functions for managing specific UI elements like modals.
 */

/**
 * Shows the agent spawn configuration modal.
 */
function showSpawnAgentModal() {
    const modal = document.getElementById('spawn-agent-modal-bg');
    if (modal) {
        // Reset form fields if needed
        document.getElementById('llm-provider-select').selectedIndex = 0; // Reset dropdown
        document.getElementById('llm-model-input').value = ''; // Clear model input
        modal.style.display = 'flex';
        console.log("Showing spawn agent modal.");
    } else {
        console.error("Spawn agent modal background element not found!");
    }
}

/**
 * Hides the agent spawn configuration modal.
 */
function hideSpawnAgentModal() {
    const modal = document.getElementById('spawn-agent-modal-bg');
    if (modal) {
        modal.style.display = 'none';
        console.log("Hiding spawn agent modal.");
    } else {
        console.error("Spawn agent modal background element not found!");
    }
}

// If using ES6 Modules, you would add:
// export { showSpawnAgentModal, hideSpawnAgentModal };
// And import them in app.js like:
// import { showSpawnAgentModal, hideSpawnAgentModal } from './ui.js';