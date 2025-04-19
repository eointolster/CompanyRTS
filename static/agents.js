// CompanyRTS/static/agents.js
import { mapMarkers, fetchState, deleteMapMarker } from './app.js';
import { log } from './utils.js'; // Keep existing imports
// --- Agent Module State ---
// Moved from app.js - Manage agent state within this module
let agents = [];
let agentElements = {}; // Cache for DOM elements
let selectedAgentId = null;
const INITIAL_AGENT_X = 50; // Constants can be kept here or imported if needed elsewhere
const INITIAL_AGENT_Y = 50;


// --- Logger Dependency ---
let _log = console.log; // Default/fallback logger

// --- NEW: Initialization function for the module ---
export function initializeAgentModule(loggerFunction) {
    if (typeof loggerFunction === 'function') {
        _log = loggerFunction; // Use the logger passed from app.js
        _log("Agent module initialized with logger.");
    } else {
        console.error("Invalid logger function passed to initializeAgentModule. Using console.log as fallback.");
        _log = console.log; // Ensure _log is console.log if invalid arg passed
    }
}
// --- END NEW ---

// --- Dependencies (Functions imported from other modules - adjust paths if needed) ---
// We assume these will be available or imported properly in a full module setup
// For now, we'll assume functions like log, fetchState, deleteMapMarker are globally available
// or will be passed/imported later. `hideSpawnAgentModal` comes from ui.js.

// --- Core Agent Functions ---

// Export renderAgents so app.js can call it
export function renderAgents() {
    const container = document.getElementById('agents-on-ground');
    if (typeof _log !== 'function') _log = console.log;
    if (!container) { console.error("Agent container 'agents-on-ground' not found!"); return; }
    // Ensure local 'agents' array is used
    if (!Array.isArray(agents)) { console.error("Internal agents data is not an array:", agents); agents = []; }

    const currentAgentIds = new Set();
    agents.forEach(agent => {
        if (!agent || !agent.agent_id) { /* ... skip invalid ... */ return; }
        currentAgentIds.add(agent.agent_id);
        // Use local 'agentElements' cache
        let agentContainerElement = agentElements[agent.agent_id];
        const agentX = typeof agent.x === 'number' ? agent.x : INITIAL_AGENT_X;
        const agentY = typeof agent.y === 'number' ? agent.y : INITIAL_AGENT_Y;

        if (!agentContainerElement) {
            // Create elements (same logic as before)
            agentContainerElement = document.createElement('div');
            agentContainerElement.className = 'agent-container';
            agentContainerElement.style.position = 'absolute';
            const agentSpan = document.createElement('span');
            agentSpan.className = 'agent';
            agentSpan.dataset.agentId = agent.agent_id;
            const progressBar = document.createElement('div');
            progressBar.className = 'agent-progress';
            progressBar.style.display = 'none';
            const deleteButton = document.createElement('button');
            deleteButton.className = 'delete-agent-btn';
            deleteButton.textContent = 'X';
            // Call deleteAgent function (defined below in this file)
            deleteButton.onclick = () => deleteAgent(agent.agent_id);
            agentContainerElement.appendChild(agentSpan);
            agentContainerElement.appendChild(progressBar);
            agentContainerElement.appendChild(deleteButton);
            container.appendChild(agentContainerElement);
            // Use local 'agentElements' cache
            agentElements[agent.agent_id] = agentContainerElement;
            _log(`Created agent element container for ${agent.agent_id}`);
        }

        // Update position (same logic)
        _log(`Applying position to agent ${agent.agent_id}: X=${agentX}, Y=${agentY}`);
        agentContainerElement.style.left = `${agentX}px`;
        agentContainerElement.style.top = `${agentY}px`;

        // Update content, title, selection, progress bar (same logic)
        const agentSpan = agentContainerElement.querySelector('.agent');
        const progressBar = agentContainerElement.querySelector('.agent-progress');
        const deleteButton = agentContainerElement.querySelector('.delete-agent-btn');
        if (agentSpan) {
            const letter = agent.name ? agent.name[0].toUpperCase() : agent.agent_id.slice(-1).toUpperCase();
            agentSpan.textContent = letter;
            const agentState = agent.state || 'unknown';
            const agentType = agent.agent_type || 'developer'; // Get agent type
            const assignedBlock = agent.assigned_block_id ? ` (Block: ${agent.source_block_title || agent.assigned_block_id})` : '';
            agentSpan.title = `ID: ${agent.agent_id}\nType: ${agentType}\nName: ${agent.name || 'N/A'}\nState: <span class="math-inline">\{agentState\}</span>{assignedBlock}\nPos: (${agentX.toFixed(0)}, ${agentY.toFixed(0)})`;            // Use local selectedAgentId
            agentSpan.classList.toggle('selected', agent.agent_id === selectedAgentId);
            // Toggle selected class (existing)
            agentSpan.classList.toggle('selected', agent.agent_id === selectedAgentId);

            // --- NEW: Toggle QA agent class ---
            agentSpan.classList.toggle('qa-agent', agentType === 'qa');
            // --- END NEW ---


            if (progressBar) {
                progressBar.style.display = (agentState === 'working' || agentState === 'working_qa') ? 'block' : 'none';
            }
        }
        if(deleteButton) { deleteButton.title = `Delete Agent ${agent.agent_id}`; }
    });

    // Remove old agent elements (same logic, using local agentElements)
    for (const agentId in agentElements) {
        if (!currentAgentIds.has(agentId)) {
            agentElements[agentId]?.remove();
            log(`Removed agent element container for ${agentId}`);
            delete agentElements[agentId];
        }
    }
}

// Export selectAgent so listeners in app.js (or here) can call it
export function selectAgent(agentId) {
    // Uses local selectedAgentId
    const previouslySelected = selectedAgentId;
    if (selectedAgentId === agentId) {
        selectedAgentId = null; // Toggle off or deselect
    } else {
        selectedAgentId = agentId; // Select new agent
    }

    // Log only if selection changed state
    if (previouslySelected !== selectedAgentId) {
        _log(selectedAgentId ? `Agent selected: ${selectedAgentId}` : "Agent deselected."); // Use _log
        renderAgents();
   }
}

// Export sendAgentCommand (if called directly from elsewhere) or keep internal
// Let's keep it internal for now, called by listeners set up in this module
export function sendAgentCommand(agentId, command, details) {
    // Ensure _log is defined, default to console.log if not
    if (typeof _log !== 'function') {
        console.warn("_log function not found, defaulting to console.log");
        _log = console.log;
    }
    // Ensure fetchState and deleteMapMarker are checked for existence later
    // Assume fetchState and deleteMapMarker might be globally available or passed/imported differently

    const endpoint = `/agents/${agentId}/${command}`;
    const logContext = details && details.markerId ? ` (Marker: ${details.markerId})` : '';
    _log(`Sending command to ${endpoint}${logContext}: ${JSON.stringify(details)}`);

    // --- Fetch Options ---
    // Default options are for GET requests or commands that don't need a body
    const fetchOptions = {
        method: 'POST', // <--- CHANGE: Assume POST is needed for commands like 'move'
        headers: {
            'Content-Type': 'application/json', // <--- ADD: Specify we're sending JSON data
            // Add any other required headers, like Authorization if needed
            // 'Authorization': 'Bearer YOUR_TOKEN_HERE'
        },
        body: JSON.stringify(details) // <--- ADD: Send the details object as JSON string in the body
    };

    // --- Adjust options based on command if necessary ---
    // If some commands use GET and don't need a body, you might adjust here.
    // For example, if a 'getStatus' command existed and used GET:
    // if (command === 'getStatus') {
    //     fetchOptions.method = 'GET';
    //     delete fetchOptions.headers['Content-Type']; // GET requests shouldn't have Content-Type for body
    //     delete fetchOptions.body;
    // }
    // However, based on the 405 error for 'move', POST is the likely candidate.

    /**
 * Sends a command to a specific agent via the server API.
 *
 * @param {string} agentId - The ID of the agent to command.
 * @param {string} command - The command to send (e.g., 'move', 'interrogate').
 * @param {object} details - An object containing details for the command (e.g., target coordinates for 'move', markerId for 'interrogate').
 */
    // --- Perform the Fetch Request ---
    fetch(endpoint, fetchOptions)
        .then(response => {
            _log(`Received response for ${command} command for agent ${agentId}. Status: ${response.status}`);
            // Check if the response status is OK (e.g., 200-299)
            if (!response.ok) {
                // If not OK, throw an error to be caught by the .catch block
                // Try to get error message from response body if possible, otherwise use status text
                return response.text().then(text => { // Use .text() as error might not be JSON
                   throw new Error(`Server responded with status ${response.status} (${response.statusText}): ${text || 'No additional error message'}`);
                });
            }
            // If response is OK, parse the JSON body
            return response.json();
        })
        .then(data => {
            // --- Handle Successful Response ---
            _log(`Command '${command}' successful for agent ${agentId}: ${data.message || JSON.stringify(data) || 'OK'}`);

            // Specific logic after successful 'interrogate' command
            if (command === 'interrogate' && details && details.markerId) {
                _log(`Interrogation successfully STARTED for marker ${details.markerId}. Marker deletion should happen LATER.`);
                if (typeof deleteMapMarker === 'function') {
                    deleteMapMarker(details.markerId);
                } else {
                    console.error("deleteMapMarker function not found!");
                    _log("ERROR: deleteMapMarker function not found!"); // Also log with _log
                }
            }

            // Refresh state after commands that might change it
            if (command === 'move' || command === 'interrogate' || command === 'complete_and_move') { // Added complete_and_move here too
                if (typeof fetchState === 'function') {
                    _log("Refreshing state after successful command.");
                    fetchState();
                } else {
                    console.error("fetchState function not found!");
                    _log("ERROR: fetchState function not found!");
                }
            }
        })
        .catch(error => {
            // --- Handle Errors (Network or Server Errors) ---
            console.error(`Error sending command '${command}' for agent ${agentId}:`, error);
            // Log the error using _log as well
            _log(`ERROR sending command '${command}' for agent ${agentId}: ${error.message}`);
            // Show an alert to the user
            alert(`Failed to send command '${command}' to agent ${agentId}.\nError: ${error.message}`);
        });
}

// Keep deleteAgent internal, called by the button click handler setup in renderAgents
function deleteAgent(agentId) {
    // Uses _log and assumes fetchState is available
    if (typeof _log !== 'function') _log = console.log;
    if (!agentId) { console.error("Cannot delete agent: Invalid ID provided."); return; }
    _log(`Attempting to delete agent: ${agentId}`); // Use _log
    if (!window.confirm(`Are you sure you want to delete agent ${agentId}?`)) {
        _log("Agent deletion cancelled by user."); return; // Use _log
    }

    fetch(`/agents/${agentId}`, { method: 'DELETE' })
    .then(response => { /* ... */ return response.json(); })
    .then(data => {
        _log(`Agent ${agentId} deleted successfully: ${data.message}`); // Use _log
        if (selectedAgentId === agentId) {
            selectedAgentId = null;
            _log("Deselected the deleted agent."); // Use _log
        }
        if (typeof fetchState === 'function') { fetchState(); }
        else { console.error("fetchState function not found!"); }
    })
    .catch(error => { /* ... uses _log ... */
        console.error(`Error deleting agent ${agentId}:`, error);
        _log(`ERROR deleting agent ${agentId}: ${error.message}`); // Use _log
        alert(`Failed to delete agent: ${error.message}`);
    });
}

// Export handleSpawnAgentSubmit so the button in index.html can call it
export function handleSpawnAgentSubmit() {
    // Uses _log and assumes fetchState/hideSpawnAgentModal are available
    if (typeof _log !== 'function') _log = console.log; // Safety check for logger

    const providerSelect = document.getElementById('llm-provider-select');
    const modelInput = document.getElementById('llm-model-input');

    // Check if elements exist before accessing value
    if (!providerSelect || !modelInput) {
        _log("Error: Could not find LLM provider or model input elements in the DOM.");
        alert("Error: Could not find modal input fields.");
        return;
    }


    // --- NEW: Get QA Checkbox State ---
    const qaCheckbox = document.getElementById('spawn-agent-qa-checkbox');
    const isQaAgent = qaCheckbox ? qaCheckbox.checked : false;
    const agentType = isQaAgent ? 'qa' : 'developer';
    // --- END NEW ---
    const llmProvider = providerSelect.value;
    const llmModel = modelInput.value.trim() || null; // Send null if empty

    _log(`Spawning agent with LLM Provider: ${llmProvider || 'Default'}${llmModel ? `, Model: ${llmModel}` : ''}`);

    // Construct payload
    const payload = {
        llm_type: llmProvider || null, // Send null if no provider selected
        llm_model: llmModel,
        agent_type: agentType // <-- Send agent type
    };

    // --- Fetch Call with CORRECT options ---
    const fetchOptions = {
        method: 'POST', // Specify POST method
        headers: {
            'Content-Type': 'application/json' // Specify JSON content type
        },
        body: JSON.stringify(payload) // Include the data payload
    };
    _log("About to fetch /agents with options:", JSON.stringify(fetchOptions)); // Log options before fetch

    fetch('/agents', fetchOptions) // Use the full options object
    .then(response => {
        if (!response.ok) {
            // Try to parse error JSON, otherwise use status text
            return response.json().catch(() => null).then(err => {
                 throw new Error(err?.error || `HTTP error ${response.status}`);
            });
        }
        return response.json();
    })
    .then(data => {
        _log(`Agent spawned successfully: ${data.agent_id} (Provider: ${llmProvider || 'Default'})`);
        // Assumes hideSpawnAgentModal and fetchState are available
        if (typeof hideSpawnAgentModal === 'function') hideSpawnAgentModal();
        else console.error("hideSpawnAgentModal function not found!");
        if (typeof fetchState === 'function') fetchState();
        else console.error("fetchState function not found!");
    })
    .catch(error => {
        console.error("Error spawning agent:", error);
        _log(`Error spawning agent: ${error.message}`);
        // Display the specific error message from the fetch failure
        alert(`Failed to spawn agent: ${error.message}`);
    });
    // --- End Fetch Call ---
}

// --- NEW: Function to set up agent-related listeners ---
// Export this function so app.js can call it during initialization
export function initializeAgentListeners() {
    const agentsContainer = document.getElementById('agents-on-ground');
    const mainArea = document.getElementById('main-area');
    const markersContainer = document.getElementById('markers-on-ground');

    // 1. Agent Selection/Deselection Listener
    if (agentsContainer) {
        agentsContainer.addEventListener('click', function(e) {
            const agentContainer = e.target.closest('.agent-container');
            if (agentContainer) {
                if (e.target.classList.contains('delete-agent-btn')) return;
                const agentSpan = agentContainer.querySelector('.agent');
                const agentId = agentSpan?.dataset.agentId;
                if (agentId) { selectAgent(agentId); } // Calls selectAgent from this module
            } else {
                selectAgent(null); // Calls selectAgent from this module
            }
        });
        _log("Agent selection/deselection listener attached."); // Log moved here
    } else { console.error("Agent container 'agents-on-ground' not found!"); }

    // 2. Movement Command Listener (part of main area click)
    // Note: Deselection logic is also handled here
    if (mainArea) {
        mainArea.addEventListener('click', function(e) {
            if (e.target.closest('.agent-container') || e.target.closest('.block-marker') || e.target.closest('.finish-zone')) {
                 // Ignore clicks on agents, markers, or zones for movement/deselection purposes
                 return;
            }

            if (selectedAgentId) { // Check local selectedAgentId
                const rect = mainArea.getBoundingClientRect();
                const targetX = e.clientX - rect.left;
                const targetY = e.clientY - rect.top;
                _log(`Movement command for Agent ${selectedAgentId}: Target (${targetX.toFixed(0)}, ${targetY.toFixed(0)})`);
                // Calls sendAgentCommand from this module
                sendAgentCommand(selectedAgentId, 'move', { x: targetX, y: targetY });
            } else {
                // Deselection click
                _log("Main area background click detected (not on agent/marker/zone). Attempting deselection.");
                selectAgent(null); // Calls selectAgent from this module
            }
        });
         _log("Agent movement/deselection listener attached to main area."); // Log moved here
    } else { console.error("Main area element not found for movement/deselection listener!"); }

    // 3. Interrogation Command Listener (part of marker click)
    if (markersContainer) {
        markersContainer.addEventListener('click', function(e) {
            const markerElement = e.target.closest('.block-marker');
            if (markerElement) {
                if (e.target.classList.contains('delete-marker-button')) return;

                if (selectedAgentId) { // Check local selectedAgentId
                    const markerId = markerElement.dataset.markerId;
                    const blockId = markerElement.dataset.blockId;
                    const blockTitle = markerElement.textContent.trim().replace(/×$/, '');

                    if (!blockId) {
                        _log(`ERROR: Interrogation failed - blockId missing from marker element's dataset. MarkerID: ${markerId}`);
                        console.error("Interrogation failed - blockId missing from marker element:", markerElement); // Also log element for inspection
                        // Optionally alert the user:
                        // alert(`Error: Cannot interrogate marker - Block ID is missing.`);
                        return; // Still stop execution
                    }

                    // Assumes mapMarkers is globally available or imported
                    const markerData = typeof mapMarkers !== 'undefined' ? mapMarkers.find(m => m.id === markerId) : null;
                    if (!markerData) {
                        _log(`ERROR: Interrogation failed - markerData not found in mapMarkers array for markerId: ${markerId}`);
                        console.error("Interrogation failed - markerData not found for ID:", markerId, "Current mapMarkers:", mapMarkers); // Log array for inspection
                        // Optionally alert the user:
                        // alert(`Error: Internal data mismatch - cannot find details for marker ${markerId}.`);
                        return; // Still stop execution
                    }

                    const targetX = markerData.x;
                    const targetY = markerData.y;
                    _log(`Interrogation command for Agent ${selectedAgentId}: Interrogate marker '${blockTitle}' (MarkerID: ${markerId}, BlockID: ${blockId}) at (${targetX}, ${targetY})`);

                    // Calls sendAgentCommand from this module
                    sendAgentCommand(selectedAgentId, 'interrogate', {
                        markerId: markerId, blockId: blockId, x: targetX, y: targetY
                    });
                } else {
                    _log("Marker clicked, but no agent selected.");
                }
            }
        });
        _log("Agent interrogation listener attached to markers."); // Log moved here
    } else { console.error("Marker container 'markers-on-ground' not found!"); }
}

// --- NEW: Function to update the local 'agents' array ---
// Export this so fetchState in app.js can update the data managed here
export function updateAgentsData(newAgentsData) {
    if (Array.isArray(newAgentsData)) {
        agents = newAgentsData;
    } else {
        console.error("Invalid agent data received for update:", newAgentsData);
        agents = []; // Reset if data is invalid
    }
    // Note: renderAgents() is called separately after fetchState completes in app.js
}