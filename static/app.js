import { log } from './utils.js'; // <-- Import log
import {
    renderAgents,
    selectAgent,
    handleSpawnAgentSubmit,
    initializeAgentListeners,
    initializeAgentModule,
    updateAgentsData,
    sendAgentCommand // <--- MAKE SURE THIS IS PRESENT
} from './agents.js';


const COLS = 4, ROWS = 4;
let gridBlocks = Array(COLS * ROWS).fill(null);
let agents = [];
export let mapMarkers = [];
let finishZonesData = []; // <-- NEW: To store zone data {id, x, y, width, height, label}
let agentElements = {}; // Existing agent DOM elements cache
let zoneElements = {}; // <-- NEW: Finish Zone DOM elements cache
let currentDraggedBlock = null;
let currentDraggedZone = null; // <-- NEW: To track dragged zone
let dragZoneOffsetX = 0; // <-- NEW: Offset for smooth zone dragging
let dragZoneOffsetY = 0; // <-- NEW: Offset for smooth zone dragging

let modalMode = 'edit_grid';
let pendingMarkerPlacement = null;
let editingBlockIdx = null;
let selectedAgentId = null;

const INITIAL_AGENT_X = 50;
const INITIAL_AGENT_Y = 50;

function setupPanelToggle() {
    const panel = document.getElementById('panel');
    const toggleButton = document.getElementById('toggle-panel-btn');

    if (!panel || !toggleButton) {
        log("WARN: Panel or toggle button not found. Cannot setup panel toggle.");
        return;
    }

    // Function to apply state (minimized or not)
    function applyPanelState(isMinimized) {
         if (isMinimized) {
             panel.classList.add('minimized');
             toggleButton.title = "Maximize Panel";
             // JS can change text directly if not using CSS ::before
             // toggleButton.textContent = "»";
         } else {
             panel.classList.remove('minimized');
             toggleButton.title = "Minimize Panel";
             // JS can change text directly if not using CSS ::before
             // toggleButton.textContent = "«";
         }
         // Save state to localStorage
         localStorage.setItem('panelMinimized', isMinimized ? 'true' : 'false');
    }

    // Add click listener
    toggleButton.addEventListener('click', () => {
        const currentlyMinimized = panel.classList.contains('minimized');
        applyPanelState(!currentlyMinimized); // Toggle the state
        log(`Panel ${!currentlyMinimized ? 'minimized' : 'maximized'}.`);
    });

    // Apply initial state from localStorage on load
    const savedState = localStorage.getItem('panelMinimized') === 'true';
    applyPanelState(savedState);
    log(`Panel toggle initialized. Initial state: ${savedState ? 'minimized' : 'maximized'}.`);

}

function setupThemeSwitcher() {
    const themeLink = document.getElementById('theme-style');
    const themeButton = document.getElementById('theme-switcher-btn');
    const themeNameSpan = document.getElementById('current-theme-name'); // Optional display

    // Define your theme files in order
    const themes = [
        { name: "Default (Green)", file: "style.css" },
        { name: "Holo-Interface", file: "style1.css" }, // Assuming style1 is Holo
        { name: "Blueprint", file: "style2.css" },     // Assuming style2 is Blueprint
        { name: "Minimalist", file: "style3.css" },      // Assuming style3 is Minimalist
        { name: "Fantasy", file: "style4.css" }      // Assuming style4 is Fantasy
        // Add more themes here if you create more files
    ];

    let currentThemeIndex = 0; // Start with the default (style.css)

    // Function to apply a theme by index
    function applyTheme(index) {
        if (!themes[index]) return; // Safety check

        const theme = themes[index];
        const newHref = `/static/${theme.file}`;

        if (themeLink) {
            themeLink.setAttribute('href', newHref);
            log(`Switched theme to: ${theme.name} (${theme.file})`); // Use your log function

            // Update optional display span
            if (themeNameSpan) {
                themeNameSpan.textContent = `Theme: ${theme.name}`;
            }

            // Save the current index to localStorage for persistence
            localStorage.setItem('selectedThemeIndex', index);
            currentThemeIndex = index;
        } else {
            console.error("Theme link element (#theme-style) not found!");
        }
    }

    // Load saved theme index on page load, default to 0
    const savedThemeIndex = parseInt(localStorage.getItem('selectedThemeIndex') || '0', 10);
    // Validate saved index
    if (savedThemeIndex >= 0 && savedThemeIndex < themes.length) {
         currentThemeIndex = savedThemeIndex;
    } else {
         currentThemeIndex = 0; // Default if saved index is invalid
    }
    // Apply the initial theme (saved or default)
    applyTheme(currentThemeIndex);


    // Add click listener to the button
    if (themeButton) {
        themeButton.addEventListener('click', () => {
            // Cycle to the next theme index
            let nextThemeIndex = (currentThemeIndex + 1) % themes.length;
            applyTheme(nextThemeIndex);
        });
        log("Theme switcher button listener attached.");
    } else {
        log("WARN: Theme switcher button not found.");
    }
}


/**
 * Checks if a point (agent position) is inside any of the given zones.
 * @param {number} agentX Agent's X coordinate.
 * @param {number} agentY Agent's Y coordinate.
 * @param {Array} zones Array of zone objects ({x, y, width, height}).
 * @returns {boolean} True if the agent is inside any zone, false otherwise.
 */
function isAgentInZones(agentX, agentY, zones) {
    if (!zones || zones.length === 0) return false;
    for (const zone of zones) {
        if (zone.x <= agentX && agentX < zone.x + zone.width &&
            zone.y <= agentY && agentY < zone.y + zone.height) {
            return true; // Agent is inside this zone
        }
    }
    return false; // Agent is not inside any of the specified zones
}



// --- Initialization ---
document.addEventListener('DOMContentLoaded', function() {
    // --- NEW: Initialize agent module FIRST, passing the log function ---
    initializeAgentModule(log);
    // --- END NEW ---

    log("DOM loaded - initializing application"); // Uses imported log

    // --- Listener Setup ---
    setupMainAreaDropTarget();
    setupMainAreaZoneDrop();
    initializeAgentListeners(); // Now safe to call, as agents.js has the logger
    initializeMarkerListeners();
    initializeGridListeners();
    initializeControlListeners(); // Ensure this uses the imported log if needed
    setupThemeSwitcher(); 
    setupPanelToggle();
    // --- Initial Render and Fetch ---
    renderGrid();
    fetchState();
    setInterval(fetchState, 3000);

    log("App initialized.");
});

// Modify the drop handler for the main area significantly
function setupMainAreaDropTarget() {
    const mainArea = document.getElementById('main-area');
    if (!mainArea) {
        console.error("ERROR: Main area not found.");
        log("CRITICAL ERROR: Main area element missing");
        return;
    }
    log("Setting up main area as drop target for confirmation modal");

    mainArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.stopPropagation();
        // Only allow drop if a block is actually being dragged
        if (currentDraggedBlock) {
             mainArea.classList.add('drag-over');
             e.dataTransfer.dropEffect = 'copy'; // Visual cue
        } else {
             e.dataTransfer.dropEffect = 'none';
        }
    });

    mainArea.addEventListener('dragleave', function(e) {
        mainArea.classList.remove('drag-over');
    });

    mainArea.addEventListener('drop', function(e) {
        e.preventDefault();
        e.stopPropagation();
        mainArea.classList.remove('drag-over');

        if (!currentDraggedBlock) {
            log("Drop ignored: No block data was being dragged.");
            return;
        }
        console.log("DROP DETECTED on main-area with block:", currentDraggedBlock);

        const rect = mainArea.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        log(`Block dropped at position relative to main-area: (${x.toFixed(1)}, ${y.toFixed(1)})`);

        // --- MODAL LOGIC ---
        // Store details needed AFTER modal confirmation
        pendingMarkerPlacement = {
            blockData: { ...currentDraggedBlock }, // Store a copy of the original data
            x: x,
            y: y
        };

        // Set modal mode
        modalMode = 'confirm_drop';

        // Populate modal with dropped block's data
        document.getElementById('modal-title').value = currentDraggedBlock.title || "";
        document.getElementById('modal-desc').value = currentDraggedBlock.description || "";
        // Optionally change button text
        document.getElementById('modal-save-button').textContent = 'Confirm Placement';
        document.getElementById('modal-header').textContent = 'Confirm Block Placement'; // Change header

        // Show the modal
        document.getElementById('modal-bg').style.display = 'flex';

        // Clear the dragged block *after* storing it in pendingMarkerPlacement
        currentDraggedBlock = null;
    });

    log("Main area drop handlers attached for modal confirmation.");
}

// NEW: Placeholder for other listener setups if needed
function initializeMarkerListeners() {
    // Currently, the marker click for interrogation is handled within initializeAgentListeners
    // We might add listeners here for just viewing marker info if needed later.
    // Also, add listener for marker delete button if not handled elsewhere.
    const markersContainer = document.getElementById('markers-on-ground');
     if (markersContainer) {
        markersContainer.addEventListener('click', function(e) {
            // Handle marker deletion click if not handled within agent logic
            if (e.target.classList.contains('delete-marker-button')) {
                 const markerElement = e.target.closest('.block-marker');
                 if(markerElement && markerElement.dataset.markerId) {
                     e.stopPropagation(); // Prevent other listeners
                     deleteMapMarker(markerElement.dataset.markerId);
                 }
             }
             // Interrogation click is handled in initializeAgentListeners
        });
        log("Marker delete listener attached.");
     }
}


function initializeGridListeners() {
    // Add listeners related *only* to the grid itself (block dragging handled separately)
   // Example: Clicking empty cells (already done within renderGrid attaching handleCellClick)
   log("Grid listeners initialized (cell clicks handled within renderGrid).");
   // Potentially add listeners for grid-level actions if any arise
}

function setupInteractionListeners() {
    const agentsContainer = document.getElementById('agents-on-ground');
    const mainArea = document.getElementById('main-area');
    const markersContainer = document.getElementById('markers-on-ground');

    // 1. Agent Selection/Deselection Listener (using event delegation on the container)
    if (agentsContainer) {
        agentsContainer.addEventListener('click', function(e) {
            // Find the closest agent container element that was clicked
            const agentContainer = e.target.closest('.agent-container');

            if (agentContainer) {
                // Clicked on an agent (or its button)
                // Prevent delete button click from selecting
                if (e.target.classList.contains('delete-agent-btn')) {
                    return; // Stop processing here if delete was clicked
                }
                const agentSpan = agentContainer.querySelector('.agent');
                const agentId = agentSpan?.dataset.agentId;
                if (agentId) {
                    selectAgent(agentId); // Select or toggle selection
                }
            } else {
                // Clicked on the background *within* the agentsContainer but not on an agent
                selectAgent(null); // Deselect
            }
        });
        log("Agent selection/deselection listener attached to agents-on-ground.");
    } else {
        console.error("Agent container 'agents-on-ground' not found!");
    }

   // 2. Movement Command & Deselection Listener (click on main area background)
   if (mainArea) {
    mainArea.addEventListener('click', function(e) {
        // Ignore clicks if the target is *part of* an agent or a marker
        if (e.target.closest('.agent-container') || e.target.closest('.block-marker')) {
            return; // Do nothing if click is on agent or marker
        }

        // If an agent IS selected, issue move command
        if (selectedAgentId) {
            const rect = mainArea.getBoundingClientRect();
            const targetX = e.clientX - rect.left;
            const targetY = e.clientY - rect.top;
            log(`Movement/Interact command for Agent <span class="math-inline">\{selectedAgentId\}\: Target \(</span>{targetX.toFixed(0)}, ${targetY.toFixed(0)})`);
            sendAgentCommand(selectedAgentId, 'move', { x: targetX, y: targetY });

            // --- CHANGE: Deselect after issuing move command --- (This part was already changed)
            // selectAgent(null); // Optional: Deselect after ordering a move? Decide based on desired UX.
                                 // Keeping agent selected might be better for consecutive commands.

        }
        // --- CHANGE: Always deselect if clicking background and not on agent/marker ---
        // This handles cases where the click is outside agentsContainer but still on mainArea
        else { // Only deselect if no agent was selected (avoids double-deselect)
            // --- CHANGE HERE: Add the log message before calling selectAgent ---
            log("Main area background click detected (not on agent/marker). Attempting deselection.");
            // --- END CHANGE ---
             selectAgent(null);
        }


    });
    log("Movement/Deselection listener attached to main area.");
} else {
    console.error("Main area element not found for movement/deselection listener!");
}
    // 3. Block Interrogation Listener (on markers container)
    if (markersContainer) {
        markersContainer.addEventListener('click', function(e) {
            const markerElement = e.target.closest('.block-marker');
            if (markerElement) {
                if (e.target.classList.contains('delete-marker-button')) return; // Ignore delete button click

                if (selectedAgentId) {
                    const markerId = markerElement.dataset.markerId;
                    const blockId = markerElement.dataset.blockId;
                    const blockTitle = markerElement.textContent.trim().replace(/×$/, ''); // Clean title text

                    if (!blockId) {
                        log(`Interrogation failed: Marker '${blockTitle}' (ID: ${markerId}) is missing the blockId data attribute.`);
                        alert(`Error: Cannot interrogate marker '${blockTitle}' because its Block ID is missing.`);
                        return;
                    }

                    // --- CHANGE HERE: Find marker coordinates ---
                    const markerData = mapMarkers.find(m => m.id === markerId);
                    if (!markerData) {
                        log(`Interrogation failed: Could not find marker data for ID ${markerId} in mapMarkers array.`);
                        alert(`Error: Internal data mismatch for marker ${markerId}.`);
                        return;
                    }
                    const targetX = markerData.x;
                    const targetY = markerData.y;
                    log(`Interrogation command for Agent ${selectedAgentId}: Interrogate marker '${blockTitle}' (MarkerID: ${markerId}, BlockID: ${blockId}) at (${targetX}, ${targetY})`);

                    // --- CHANGE HERE: Add x, y to the details sent ---
                    sendAgentCommand(selectedAgentId, 'interrogate', {
                        markerId: markerId,
                        blockId: blockId,
                        x: targetX, // Send marker's x
                        y: targetY  // Send marker's y
                    });
                    // --- END CHANGE ---

                } else {
                    log("Marker clicked, but no agent selected.");
                }
            }
        });
        log("Block interrogation listener attached to markers-on-ground.");
    } else { console.error("Marker container 'markers-on-ground' not found!"); }
}

// --- NEW: Setup Control Panel Button Listeners ---
function initializeControlListeners() {
    log("Initializing control panel listeners...");
    // Use the NEW IDs from index.html
    const addBlockBtn = document.getElementById('add-block-btn');
    const saveBlocksBtn = document.getElementById('save-blocks-btn');
    const spawnAgentBtn = document.getElementById('spawn-agent-open-modal-btn'); // Button to OPEN modal

    // Modal Buttons
    const modalSaveBtn = document.getElementById('modal-save-button');
    const modalCancelBtn = document.getElementById('modal-cancel-button'); // Use ID

    const spawnModalSpawnBtn = document.getElementById('spawn-modal-spawn-button'); // Use ID
    const spawnModalCancelBtn = document.getElementById('spawn-modal-cancel-button'); // Use ID

    // Attach listeners using addEventListener
    if (addBlockBtn) { addBlockBtn.addEventListener('click', addBlockToFirstEmptyCell); log("Attached listener to Add Block button."); } else { log("WARN: Add Block button not found."); }
    if (saveBlocksBtn) { saveBlocksBtn.addEventListener('click', saveAllBlocks); log("Attached listener to Save All Blocks button."); } else { log("WARN: Save All Blocks button not found."); }
    if (spawnAgentBtn) {
         if (typeof showSpawnAgentModal === 'function') { spawnAgentBtn.addEventListener('click', showSpawnAgentModal); log("Attached listener to Spawn Agent button."); }
         else { console.error("showSpawnAgentModal function not found!"); }
    } else { log("WARN: Spawn Agent button not found."); }

    if (modalSaveBtn) { modalSaveBtn.addEventListener('click', saveModalBlock); log("Attached listener to Modal Save button."); } else { log("WARN: Modal Save button not found."); }
    if (modalCancelBtn) {
         if (typeof closeModal === 'function') { modalCancelBtn.addEventListener('click', closeModal); log("Attached listener to Modal Cancel button."); }
         else { console.error("closeModal function not found!"); }
    } else { log("WARN: Modal Cancel button not found."); }
    if (spawnModalSpawnBtn) { spawnModalSpawnBtn.addEventListener('click', handleSpawnAgentSubmit); log("Attached listener to Spawn Modal Spawn button."); } else { log("WARN: Spawn Modal Spawn button not found."); }
    if (spawnModalCancelBtn) {
         if (typeof hideSpawnAgentModal === 'function') { spawnModalCancelBtn.addEventListener('click', hideSpawnAgentModal); log("Attached listener to Spawn Modal Cancel button."); }
         else { console.error("hideSpawnAgentModal function not found!"); }
    } else { log("WARN: Spawn Modal Cancel button not found."); }
}

function saveModalBlock() {
    const currentTitle = document.getElementById('modal-title').value.trim();
    const currentDescription = document.getElementById('modal-desc').value.trim();

    if (!currentTitle) {
        alert("Title is required.");
        return;
    }

    if (modalMode === 'confirm_drop') {
        if (!pendingMarkerPlacement || !pendingMarkerPlacement.blockData) {
            console.error("Cannot save modal: Pending placement data is missing.");
            closeModal();
            return;
        }

        const originalBlock = pendingMarkerPlacement.blockData;
        const dropX = pendingMarkerPlacement.x;
        const dropY = pendingMarkerPlacement.y;

        // Create the marker data using the CURRENT details from the modal
        const finalMarkerData = {
            title: currentTitle,
            description: currentDescription,
            // Keep the original block_id from the dragged block for the marker's data attribute
            block_id: originalBlock.block_id // Use original block_id
        };

        // Check if data was actually changed compared to the original dragged block
        const isChanged = (currentTitle !== originalBlock.title) || (currentDescription !== originalBlock.description);

        // --- Logic for saving a NEW block to the grid IF changed ---
        if (isChanged) {
            log("Block details changed in modal. Saving as NEW block in grid.");
            // Find first empty slot in grid
            const targetIndex = gridBlocks.findIndex(b => !b);
            if (targetIndex === -1) {
                alert("Grid is full! Cannot add the modified block to the grid. Marker will still be placed.");
                // Continue to place marker, but cannot save the new block
            } else {
                 log(`Adding new block "${currentTitle}" to grid at index ${targetIndex}`);
                 // Create a NEW block object for the grid with null ID
                 gridBlocks[targetIndex] = {
                     title: currentTitle,
                     description: currentDescription,
                     block_id: null // Ensure it gets a new ID from backend
                 };
                 // Save the entire grid state (including the newly added block)
                 saveAllBlocks(); // Save immediately
            }
        } else {
             log("Block details confirmed without changes. Only placing marker.");
        }

        // **Always place the marker using the CONFIRMED (potentially edited) details**
        log(`Placing marker with confirmed details: "${finalMarkerData.title}" (Original Block ID: ${finalMarkerData.block_id})`);
        createMarker(finalMarkerData, dropX, dropY); // Use the confirmed/edited data

        // Cleanup after handling the drop confirmation
        pendingMarkerPlacement = null;

    } else if (modalMode === 'edit_grid') {
         // --- Logic for adding/editing directly in the grid ---
         if (editingBlockIdx !== null && editingBlockIdx >= 0 && editingBlockIdx < gridBlocks.length) {
             const existingBlock = gridBlocks[editingBlockIdx];
             const existingBlockId = existingBlock ? existingBlock.block_id : null;
             // Determine if it's an add (existingBlock is null) or an edit
             const isAdding = !existingBlock;
             const isChanged = existingBlock ? (currentTitle !== existingBlock.title || currentDescription !== existingBlock.description) : true; // Always true if adding

             if (isChanged) {
                  log(`Saving ${isAdding ? 'new' : 'changes to'} block at grid index ${editingBlockIdx}`);
                  gridBlocks[editingBlockIdx] = {
                      title: currentTitle,
                      description: currentDescription,
                      block_id: existingBlockId // Preserve ID if editing, null if adding
                  };
                  saveAllBlocks(); // Save changes
             } else {
                  log("No changes detected for grid block. Save skipped.");
             }
         } else {
              console.error("Save Modal Error: Mode is edit_grid but invalid editingBlockIdx:", editingBlockIdx);
         }
         // --- End of grid add/edit logic ---
    } else {
        console.error("Invalid modalMode:", modalMode);
    }

    closeModal(); // Close modal and reset state
}

// --- Block Persistence ---
function saveAllBlocks() {
    // Filter out nulls and prepare data for backend
    const blocksToSave = gridBlocks
        .map((block, index) => block ? { // Add index if needed by backend logic, though not strictly necessary with overwrite
            title: block.title || "Untitled",
            description: block.description || "",
            block_id: block.block_id || null, // Send null for new blocks
            // server_index: index // Send index if backend uses it
        } : null)
        .filter(Boolean); // Remove the nulls

    log(`Sending ${blocksToSave.length} blocks to backend for saving.`);
    fetch('/blocks', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ blocks: blocksToSave }) // Send the filtered array
    })
    .then(response => {
        if (!response.ok) {
             return response.text().then(text => { throw new Error(`HTTP error ${response.status}: ${text || 'Failed to save blocks'}`); });
        }
        return response.json();
    })
    .then(r => {
        log(`Saved ${r.count} blocks to backend.`);
        // IMPORTANT: Fetch state AFTER save completes to get updated block_ids
        fetchState();
    })
    .catch(error => {
        console.error('Error saving blocks:', error);
        log(`Error saving blocks: ${error.message}`);
        // Optionally alert the user
        alert(`Error saving blocks: ${error.message}`);
    });
}

// Modify closeModal to reset everything
function closeModal() {
    // Hide block editing modal
    document.getElementById('modal-bg').style.display = 'none';
    // Reset block editing state
    editingBlockIdx = null;
    modalMode = 'edit_grid';
    pendingMarkerPlacement = null;
    document.getElementById('modal-title').value = ""; // Clear modal fields
    document.getElementById('modal-desc').value = "";
    document.getElementById('modal-save-button').textContent = 'Save';
    document.getElementById('modal-header').textContent = 'Block Details';

    // Also explicitly hide the spawn agent modal if it was somehow left open
    hideSpawnAgentModal();
}

function handleCellClick(idx) {
    // Prevent opening modal if clicking on an existing block's delete button
    // (The stopPropagation in the delete button's click handler should handle this, but double-check)
    editingBlockIdx = idx; // Set index for modal save action
    modalMode = 'edit_grid'; // Explicitly set mode for direct grid interaction
    pendingMarkerPlacement = null; // Ensure this is null

    const block = gridBlocks[idx];
    document.getElementById('modal-title').value = block ? (block.title || "") : "";
    document.getElementById('modal-desc').value = block ? (block.description || "") : "";
    document.getElementById('modal-save-button').textContent = 'Save';
    document.getElementById('modal-header').textContent = block ? 'Edit Block Details' : 'Add New Block'; // Update header text
    document.getElementById('modal-bg').style.display = 'flex'; // Show the modal
}

// --- Marker Functions ---
function createMarker(blockData, x, y) { // Accept blockData object directly
    const markerContainer = document.getElementById('markers-on-ground'); // Target the new container
    if (!markerContainer) {
        console.error("Marker container 'markers-on-ground' not found!");
        return;
    }

    // Generate a unique ID for the marker itself
    const markerId = 'marker-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);

    // Store marker data
    const newMarker = {
        // Store the block data *as received* (could be edited data from modal)
        blockData: {
            title: blockData.title,
            description: blockData.description,
            block_id: blockData.block_id // This is the ID of the *original* block dragged or the saved grid block
        },
        x: x,
        y: y,
        id: markerId // The unique ID for this specific marker instance on the map
    };
    mapMarkers.push(newMarker);
    log(`Stored marker data: ID=${markerId}, Title="${blockData.title}", Linked BlockID=${blockData.block_id}`);

    // Render all markers (including the new one)
    renderMapMarkers(); // Update the display
}

// --- Grid Functions ---
function renderGrid() {
    log("--- renderGrid called ---"); // Log when the function starts

    const gridDiv = document.getElementById('grid');
    if (!gridDiv) {
        console.error("Grid element not found!");
        return;
    }

    gridDiv.innerHTML = ''; // Clear existing grid
    let blockRenderCount = 0; // Counter for rendered blocks

    for (let i = 0; i < COLS * ROWS; i++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.index = i;
        // Add event listeners for drag/drop/click on the CELL
        cell.addEventListener('dragover', handleDragOver);
        cell.addEventListener('dragleave', handleDragLeave);
        cell.addEventListener('drop', handleDropOnGrid);
        cell.addEventListener('click', () => handleCellClick(i)); // Allow clicking empty cells

        const block = gridBlocks[i]; // Get block data for this index
        if (block) {
            // *** NEW: Log block being rendered ***
            log(`renderGrid: Rendering block at index ${i}: Title='${block.title}', ID='${block.block_id || 'N/A'}'`);
            blockRenderCount++; // Increment counter
            // *** END NEW Log ***

            const blockElem = document.createElement('div');
            blockElem.className = 'block'; // Class for the block itself
            blockElem.textContent = block.title || 'Unnamed';
            blockElem.title = block.description || ''; // Tooltip for description
            blockElem.dataset.index = i;
            blockElem.dataset.blockId = block.block_id || ''; // Add block_id for reference

            // Make the block draggable
            blockElem.draggable = true;
            blockElem.addEventListener('dragstart', handleBlockDragStart);
            blockElem.addEventListener('dragend', handleBlockDragEnd);

            // Add Delete Button
            const deleteSpan = document.createElement('span');
            deleteSpan.className = 'delete-button delete-grid-block-button';
            deleteSpan.innerHTML = '&times;';
            deleteSpan.title = 'Delete this block';
            deleteSpan.onclick = (e) => {
                e.stopPropagation();
                deleteGridBlock(i);
            };
            blockElem.appendChild(deleteSpan);

            cell.appendChild(blockElem); // Add block element to cell
        } else {
             // Optionally log empty cells being created (can be verbose)
             // log(`renderGrid: Creating empty cell at index ${i}`);
        }
        gridDiv.appendChild(cell); // Add cell to grid
    }

    // *** NEW: Log final grid HTML ***
    log(`--- renderGrid finished. Rendered ${blockRenderCount} blocks. Final grid HTML:`);
    console.log(gridDiv.innerHTML); // Log the raw HTML content of the grid
    // *** END NEW Log ***

}

function deleteGridBlock(index) {
    if (index < 0 || index >= gridBlocks.length || !gridBlocks[index]) {
        console.warn(`Attempted to delete non-existent grid block at index ${index}`);
        return;
    }

    const blockTitle = gridBlocks[index].title || 'this block';
    // Use confirm() for simple confirmation
    if (window.confirm(`Are you sure you want to delete the block "${blockTitle}" from the grid?`)) {
        log(`Deleting grid block at index ${index}: ${blockTitle}`);
        gridBlocks[index] = null; // Remove from local array
        renderGrid(); // Update display immediately
        saveAllBlocks(); // Persist the change to the backend
    } else {
        log("Grid block deletion cancelled.");
    }
}

// Add dragover/leave/drop handlers for grid cells
function handleDragOver(e) {
    e.preventDefault(); // Necessary to allow drop
    if(e.currentTarget.classList.contains('cell')) {
        // Allow dropping only if the cell is empty and we are dragging a block
        const targetIndex = parseInt(e.currentTarget.dataset.index);
        // Check if currentDraggedBlock exists and if the target cell in gridBlocks is empty
        if (currentDraggedBlock && targetIndex >= 0 && targetIndex < gridBlocks.length && gridBlocks[targetIndex] === null) {
             e.currentTarget.classList.add('drag-over');
             e.dataTransfer.dropEffect = 'move'; // Indicate moving within the grid
        } else {
            e.dataTransfer.dropEffect = 'none'; // Indicate drop is not allowed here
        }
    }
}

function handleDragLeave(e) {
    if(e.currentTarget.classList.contains('cell')) {
        e.currentTarget.classList.remove('drag-over');
    }
}

function handleDropOnGrid(e) {
    e.preventDefault();
    e.stopPropagation(); // Prevent drop from bubbling further (e.g., to main area)
    if(e.currentTarget.classList.contains('cell')) {
        e.currentTarget.classList.remove('drag-over'); // Clean up visual cue
    }

    const targetIndex = parseInt(e.currentTarget.dataset.index);

    // Ensure we are dragging a block and target cell is valid & empty
    if (currentDraggedBlock && targetIndex !== null && targetIndex >= 0 && targetIndex < gridBlocks.length && gridBlocks[targetIndex] === null) {
        // Find the original index from the stored drag data
        let sourceIndex = -1;
        try {
           // Retrieve the index stored during dragstart
           sourceIndex = parseInt(e.dataTransfer.getData('text/plain'));
        } catch (err) {
            console.warn("Could not parse source index from drag data.", err);
        }

        if (sourceIndex >= 0 && sourceIndex < gridBlocks.length && gridBlocks[sourceIndex]) {
             // Check if source and target are different
             if(sourceIndex !== targetIndex) {
                 log(`Moving block from grid index ${sourceIndex} to ${targetIndex}`);
                 gridBlocks[targetIndex] = { ...gridBlocks[sourceIndex] }; // Copy data to target
                 gridBlocks[sourceIndex] = null; // Clear original cell
                 renderGrid(); // Update UI
                 saveAllBlocks(); // Persist changes
             } else {
                 log("Drop on same grid cell ignored.");
             }
        } else {
             console.warn("Drop on grid failed: Could not determine valid source index or source block missing.");
        }
        // Clear dragged block data *only after successful processing* or if source is invalid
        currentDraggedBlock = null;

    } else if (currentDraggedBlock) {
         log("Drop on grid cancelled: Target cell occupied, invalid index, or not dragging a block.");
         // Important: Still need to clear currentDraggedBlock if the drop fails here
         // because the dragend event might not reliably clear it if the drop target wasn't valid.
         currentDraggedBlock = null;
    } else {
         // If something else was dropped, ignore it
         log("Non-block element dropped on grid, ignoring.");
    }
}

// Ensure handleCellClick is present (allows adding block to empty cell via modal)
// function handleCellClick(idx) { ... } // Already defined above
export function renderMapMarkers() {
    const markerContainer = document.getElementById('markers-on-ground');
    if (!markerContainer) {
        console.error("Marker container 'markers-on-ground' not found for rendering!");
        return;
    }

    markerContainer.innerHTML = ''; // Clear existing markers before re-rendering

    mapMarkers.forEach(markerData => {
        // Validate marker data minimally
        if (!markerData || !markerData.id || !markerData.blockData) {
            console.warn("Skipping rendering invalid marker data:", markerData);
            return;
        }

        const marker = document.createElement('div');
        marker.id = markerData.id; // Use the unique marker instance ID
        marker.className = 'block-marker visual-marker'; // Apply styling classes
        marker.textContent = markerData.blockData.title || "Untitled Marker";
        marker.title = markerData.blockData.description || ""; // Tooltip

        // Apply position
        marker.style.position = 'absolute';
        // Ensure x and y are numbers, provide defaults if necessary
        const posX = typeof markerData.x === 'number' ? markerData.x : 0;
        const posY = typeof markerData.y === 'number' ? markerData.y : 0;
        marker.style.left = `${posX}px`;
        marker.style.top = `${posY}px`;

        // Store relevant data attributes
        // Use the block_id from the *marker's data* which links back to the original grid block
        marker.dataset.blockId = markerData.blockData.block_id || '';
        marker.dataset.markerId = markerData.id; // The ID of this marker DOM element

        // Add Delete Button for the marker
        const deleteSpan = document.createElement('span');
        deleteSpan.className = 'delete-button delete-marker-button';
        deleteSpan.innerHTML = '&times;';
        deleteSpan.title = 'Delete this marker';
        deleteSpan.onclick = (e) => {
            e.stopPropagation(); // Prevent marker click handler
            deleteMapMarker(markerData.id); // Call delete function with the marker's unique ID
        };
        marker.appendChild(deleteSpan);

        markerContainer.appendChild(marker);
    });
    // log(`Rendered ${mapMarkers.length} markers on the map.`); // Reduce log noise
}

// --- New function to delete a marker from the map ---
export function deleteMapMarker(markerId) {
    if (!markerId) {
        console.warn("Attempted to delete marker with invalid ID.");
        return;
    }

    const markerIndex = mapMarkers.findIndex(m => m.id === markerId);

    if (markerIndex === -1) {
        console.warn(`Attempted to delete non-existent marker with ID ${markerId}`);
        return;
    }

    const markerTitle = mapMarkers[markerIndex].blockData.title || 'this marker';
    // if (confirm(`Are you sure you want to delete the marker "${markerTitle}"?`)) {
         log(`Deleting marker ${markerId}: ${markerTitle}`);
         mapMarkers.splice(markerIndex, 1); // Remove from the array
         renderMapMarkers(); // Re-render markers to remove it visually
    //     // No backend call needed as markers are client-side only currently
    // } else {
    //     log("Marker deletion cancelled.");
    // }
}

function handleBlockDragStart(e) {
    // Ensure the target is the block element itself
    if (!e.target.classList.contains('block')) return;

    const index = parseInt(e.target.dataset.index);
    // Ensure we get the data from gridBlocks and the index is valid
    if (index >= 0 && index < gridBlocks.length && gridBlocks[index]) {
        currentDraggedBlock = { ...gridBlocks[index] }; // Store a copy of the block data
        // Log the block_id being dragged
        log(`Dragging block: "${currentDraggedBlock.title}" (ID: ${currentDraggedBlock.block_id || 'New'}, Index: ${index})`);

        e.target.classList.add('dragging');
        // Store the source index reliably
        e.dataTransfer.setData('text/plain', index.toString());
        e.dataTransfer.effectAllowed = 'copyMove'; // Allow both copy (to map) and move (in grid)
    } else {
        console.error("Drag Start Error: Invalid or empty source block index", index, e.target);
        e.preventDefault(); // Prevent dragging if data is missing
        currentDraggedBlock = null;
    }
}

function handleBlockDragEnd(e) {
    // This event fires after the drop event (successful or not)
    e.target.classList.remove('dragging'); // Clean up dragging class
    log("Drag ended.");
    // It's generally safer to clear currentDraggedBlock in the drop handlers
    // because dragend fires even if the drop was cancelled or invalid.
    // However, if drop handlers fail to clear it, uncommenting this might help,
    // but could also interfere if drop is asynchronous (which it isn't here).
    // currentDraggedBlock = null;
}


export function fetchState() {
    fetch('/state')
        .then(response => {
            if (!response.ok) { throw new Error(`HTTP error ${response.status}`); }
            return response.json();
         })
         .then(data => {
            const agentsData = data.agents || [];
            const zonesData = data.zones || [];

            // Update Blocks (existing logic)
            if (!currentDraggedBlock) { updateBlocksFromServerData(data.blocks || []); }
            else { log("Skipping grid update during block drag."); }

            // Update Agents via agents.js (existing logic)
            updateAgentsData(agentsData); // Pass fetched data to agent module
            renderAgents(); // Call imported render function

            // Update Zones (existing logic)
             // Separate finish zones and dropoff zones for clarity if needed
             const finishZones = zonesData.filter(z => z.type !== 'dropoff');
             // const dropoffZones = zonesData.filter(z => z.type === 'dropoff'); // Not needed right now

            if (Array.isArray(zonesData)) { // Use combined data for rendering
                if (!currentDraggedZone) {
                    finishZonesData = zonesData; // Store combined data for rendering
                    renderFinishZones();
                } else { log("Skipping zone update during zone drag."); }
            } else { log("No zone data received from server."); }

            // Update Markers (existing logic)
             renderMapMarkers(); // Render markers based on current mapMarkers array

            // --- Developer Agent Completion Logic (Existing - Check/Keep) ---
            agentsData.forEach(agent => {
                if (agent && agent.state === "finished_work" && agent.completed_marker_id) {
                    log(`Detected DEV agent ${agent.agent_id} finished work on marker ${agent.completed_marker_id}. Triggering completion.`);
                    log(`   - Deleting marker: ${agent.completed_marker_id}`);
                    deleteMapMarker(agent.completed_marker_id); // Assumes available globally or imported
                    log(`   - Sending 'complete_and_move' command to agent ${agent.agent_id}`);
                    sendAgentCommand(agent.agent_id, 'complete_and_move', {}); // Assumes available (imported from agents.js)
                }
                // --- *** NEW: QA Agent Completion Logic *** ---
                else if (agent && agent.agent_type === 'qa' && agent.state === "finished_qa_work") {
                     log(`Detected QA agent ${agent.agent_id} finished QA work. Triggering completion.`);
                     log(`   - Sending 'complete_qa_and_move' command to QA agent ${agent.agent_id}`);
                     sendAgentCommand(agent.agent_id, 'complete_qa_and_move', {}); // Call the new backend endpoint
                 }
                // --- *** END QA Agent Completion Logic *** ---
            });
             // --- *** END Developer/QA Completion Logic *** ---


             // --- *** NEW: QA Initiation Logic *** ---
             // Find ONE idle QA agent
             const idleQaAgent = agentsData.find(agent =>
                 agent && agent.agent_type === 'qa' && agent.state === 'idle'
             );

             if (idleQaAgent) {
                 // Find ONE idle Developer agent that is located within a "finish" zone (not dropoff)
                 const idleDevInFinishZone = agentsData.find(agent =>
                     agent &&
                     agent.agent_type === 'developer' &&
                     agent.state === 'idle' &&
                     isAgentInZones(agent.x, agent.y, finishZones) // Use helper function
                 );

                 if (idleDevInFinishZone) {
                     log(`Found idle QA agent ${idleQaAgent.agent_id} and idle Developer ${idleDevInFinishZone.agent_id} in a finish zone. Initiating QA.`);

                     // Send command to backend to start QA
                     const payload = { developer_agent_id: idleDevInFinishZone.agent_id };
                     fetch(`/agents/${idleQaAgent.agent_id}/start_qa`, {
                         method: 'POST',
                         headers: {'Content-Type': 'application/json'},
                         body: JSON.stringify(payload)
                     })
                     .then(response => {
                         if (!response.ok) {
                             // Log error but don't necessarily stop interval/further checks
                             response.text().then(text => log(`ERROR starting QA for ${idleQaAgent.agent_id} on ${idleDevInFinishZone.agent_id}: ${response.status} ${text}`));
                             // Potentially mark agents as 'error' locally? Or just let backend handle state? For now, just log.
                             // If QA agent is now busy, the next fetchState won't pick it again.
                         } else {
                             log(`Successfully sent start_qa command for QA ${idleQaAgent.agent_id} on Dev ${idleDevInFinishZone.agent_id}.`);
                             // Optimistically update local state? Risky, better wait for next fetchState.
                         }
                     })
                     .catch(error => {
                         log(`Network ERROR starting QA for ${idleQaAgent.agent_id} on ${idleDevInFinishZone.agent_id}: ${error}`);
                     });

                     // IMPORTANT: We only trigger ONE QA task per fetchState cycle to prevent multiple QA agents grabbing the same developer.
                     // The logic implicitly handles this by finding the *first* match and then exiting this block.
                 } else {
                     // log("Found idle QA agent, but no idle developers in finish zones."); // Can be noisy
                 }
             } else {
                  // log("No idle QA agents found."); // Can be noisy
             }
             // --- *** END QA Initiation Logic *** ---

        })
        .catch(error => {
            // (existing error handling)
            console.error("Error fetching state:", error);
            log(`Error fetching state: ${error.message}`);
            if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
                log("Network Error: Unable to connect to the server. Is it running?");
            }
        });
} // End of fetchState function

// --- State Management ---
// export function fetchState() {
//     fetch('/state')
//         .then(response => {
//             if (!response.ok) { throw new Error(`HTTP error ${response.status}`); }
//             return response.json();
//          })
//          .then(data => {
//             // Update Blocks (existing logic)
//             if (!currentDraggedBlock) { updateBlocksFromServerData(data.blocks || []); }
//             else { log("Skipping grid update during block drag."); }

//             // Update Agents via agents.js (existing logic)
//             updateAgentsData(data.agents || []);
//             renderAgents(); // Call imported render function

//             // Update Zones (existing logic)
//             if (Array.isArray(data.zones)) {
//                 if (!currentDraggedZone) {
//                     finishZonesData = data.zones;
//                     renderFinishZones();
//                 } else { log("Skipping zone update during zone drag."); }
//             } else { log("No zone data received from server."); }

//             // Update Markers (existing logic)
//              renderMapMarkers(); // Render markers based on current mapMarkers array

//             // --- *** NEW LOGIC: Check for finished agents *** ---
//             const agentsData = data.agents || []; // Use the fetched agent data
//             agentsData.forEach(agent => {
//                 if (agent && agent.state === "finished_work" && agent.completed_marker_id) {
//                     log(`Detected agent ${agent.agent_id} finished work on marker ${agent.completed_marker_id}. Triggering completion.`);

//                     // 1. Delete the corresponding marker
//                     log(`   - Deleting marker: ${agent.completed_marker_id}`);
//                     deleteMapMarker(agent.completed_marker_id); // Assumes deleteMapMarker is available in this scope (it's exported)

//                     // 2. Send command to backend to finalize and move
//                     log(`   - Sending 'complete_and_move' command to agent ${agent.agent_id}`);
//                     sendAgentCommand(agent.agent_id, 'complete_and_move', {}); // sendAgentCommand imported from agents.js

//                     // Note: The backend will update the agent's state back to 'idle' and change its position.
//                     // The *next* fetchState call will reflect this updated state and position visually.
//                 }
//             });
//             // --- *** END NEW LOGIC *** ---

//         })
//         .catch(error => {
//             // (existing error handling)
//             console.error("Error fetching state:", error);
//             log(`Error fetching state: ${error.message}`);
//             if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
//                 log("Network Error: Unable to connect to the server. Is it running?");
//             }
//         });
// } // End of fetchState function

function updateBlocksFromServerData(blocksData) {
    log("--- updateBlocksFromServerData called ---"); // Log start

    // Create a new array for grid blocks based on server data
    const newGrid = Array(COLS * ROWS).fill(null);

    // Check if blocksData is an array and log it
    if (!Array.isArray(blocksData)) {
        console.error("Received invalid blocks data from server:", blocksData);
        log("Error: Received invalid blocks data from server (expected array).");
        blocksData = []; // Use empty array to avoid errors
    } else {
         // *** NEW: Log the raw data received ***
         log(`Received blocksData from server (${blocksData.length} items):`);
         console.log(JSON.stringify(blocksData)); // Log the actual data as a string
         // *** END NEW Log ***
    }

    let blocksProcessedCount = 0;
    // Fill the new grid based on server_index or sequential order
    blocksData.forEach((block, serverOrderIndex) => {
        // Basic validation of the block object itself
        if (!block || typeof block !== 'object') {
            log(`Skipping invalid block data item at serverOrderIndex ${serverOrderIndex}: Not an object.`);
            return; // Skip this item
        }

        // Prefer server_index if provided and valid, otherwise use order
        const index = (typeof block.server_index === 'number' && block.server_index >= 0 && block.server_index < newGrid.length)
                      ? block.server_index
                      : serverOrderIndex; // Fallback to order in array

        // *** NEW: Log details about the block being processed ***
        log(`Processing block: Title='${block.title}', ID='${block.block_id}', server_index=${block.server_index}, Target Grid Index=${index}`);
        // *** END NEW Log ***

        if (index >= 0 && index < newGrid.length) {
             // Basic validation of block structure needed for rendering
            if(block.block_id && block.title !== undefined) {
                 // *** NEW: Log placement into newGrid ***
                 log(`Placing block ID ${block.block_id} into newGrid at index ${index}.`);
                 // *** END NEW Log ***
                 newGrid[index] = block;
                 blocksProcessedCount++;
            } else {
                // Log why it wasn't placed
                log(`--> Block at Target Grid Index ${index} is invalid or missing required fields (block_id, title). Skipping placement.`);
                console.warn(`Invalid block data received from server at index ${index}:`, block);
            }
        } else {
             // Log out-of-bounds index
             log(`--> Block index ${index} from server is out of bounds for grid size ${newGrid.length}. Skipping placement.`);
             console.warn(`Block index ${index} from server is out of bounds.`);
        }
    });

    log(`Finished processing ${blocksData.length} server blocks. Placed ${blocksProcessedCount} blocks into newGrid.`);

    // Compare old and new grid to see if update is needed
    const oldGridString = JSON.stringify(gridBlocks);
    const newGridString = JSON.stringify(newGrid);

     // *** NEW: Log the comparison strings ***
     log(`Comparing grids:\nOld: ${oldGridString}\nNew: ${newGridString}`);
     // *** END NEW Log ***


    if (oldGridString !== newGridString) {
        log("Grid state differs. Updating global gridBlocks and calling renderGrid.");
        gridBlocks = newGrid; // Update the global variable
        renderGrid(); // Re-render the grid UI
    } else {
        log("Grid state matches server, no update needed.");
    }
    log("--- updateBlocksFromServerData finished ---"); // Log end
}

// --- NEW: Render Finish Zones ---
function renderFinishZones() {
    const container = document.getElementById('main-area'); // Or a dedicated zone container
    if (!container) { console.error("Cannot render zones: Main area not found."); return; }

    const currentZoneIds = new Set();

    finishZonesData.forEach(zoneData => {
        if (!zoneData || !zoneData.id) return; // Basic validation
        currentZoneIds.add(zoneData.id);

        let zoneElement = zoneElements[zoneData.id];

        if (!zoneElement) {
            // Create the zone element if it doesn't exist
            zoneElement = document.createElement('div');
            zoneElement.id = zoneData.id;
            zoneElement.className = 'finish-zone'; // Use class for styling
            zoneElement.draggable = true; // Make it draggable
            zoneElement.style.position = 'absolute'; // Ensure positioning context

            // Add drag listeners
            zoneElement.addEventListener('dragstart', handleZoneDragStart);
            zoneElement.addEventListener('dragend', handleZoneDragEnd);
            // Note: dragover and drop are handled by the main-area listener

            container.appendChild(zoneElement);
            zoneElements[zoneData.id] = zoneElement; // Cache the element
            log(`Created finish zone element: ${zoneData.id}`);
        }

        // --- Apply type-specific class ---
        zoneElement.classList.remove('dropoff-zone'); // Remove specific class first
        if (zoneData.type === 'dropoff') {
            zoneElement.classList.add('dropoff-zone');
        } else {
            // Optional: Add a default class for finish zones if needed for specific overrides
            // zoneElement.classList.add('default-finish-zone');
        }
        // --- End Apply type-specific class ---

        // Update position, size, and content
        zoneElement.style.left = `${zoneData.x}px`;
        zoneElement.style.top = `${zoneData.y}px`;
        zoneElement.style.width = `${zoneData.width}px`;
        zoneElement.style.height = `${zoneData.height}px`;
        zoneElement.textContent = zoneData.label || zoneData.id; // Display label or ID
        zoneElement.title = `Zone: ${zoneData.label || zoneData.id}\nPos: (${zoneData.x.toFixed(0)}, ${zoneData.y.toFixed(0)})`;
    });

    // Remove zone elements that are no longer in the data
    for (const zoneId in zoneElements) {
        if (!currentZoneIds.has(zoneId)) {
            zoneElements[zoneId]?.remove();
            log(`Removed finish zone element: ${zoneId}`);
            delete zoneElements[zoneId];
        }
    }
}

// --- NEW: Setup Main Area for Zone Drag Over/Drop ---
function setupMainAreaZoneDrop() {
    const mainArea = document.getElementById('main-area');
    if (!mainArea) return;

    // Prevent default behavior to allow dropping zones
    mainArea.addEventListener('dragover', function(e) {
        // Only allow drop if dragging a zone
        if (currentDraggedZone) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            // Optional: update visual position during drag (can be jerky)
            // updateDraggedZonePosition(e.clientX, e.clientY);
        }
    });

    // Handle the drop event (final position calculation)
    mainArea.addEventListener('drop', function(e) {
        if (currentDraggedZone) {
            e.preventDefault();
            updateDraggedZonePosition(e.clientX, e.clientY, true); // Final update
            currentDraggedZone = null; // Clear dragged zone state
        }
        // Important: Don't handle block drops here if setupMainAreaDropTarget does it
    });
}

// --- NEW: Update zone position during/after drag ---
function updateDraggedZonePosition(clientX, clientY, isFinalDrop = false) {
    if (!currentDraggedZone) return;

    const mainAreaRect = document.getElementById('main-area').getBoundingClientRect();
    // Calculate position relative to main-area, considering initial click offset
    const newX = clientX - mainAreaRect.left - dragZoneOffsetX;
    const newY = clientY - mainAreaRect.top - dragZoneOffsetY;

    // Update the visual element directly for smoother feedback (optional)
    const zoneElement = zoneElements[currentDraggedZone.id];
    if (zoneElement) {
        zoneElement.style.left = `${newX}px`;
        zoneElement.style.top = `${newY}px`;
    }

    // If it's the final drop, update the data and save
    if (isFinalDrop) {
        const zoneData = finishZonesData.find(z => z.id === currentDraggedZone.id);
        if (zoneData) {
            zoneData.x = newX;
            zoneData.y = newY;
            log(`Zone ${zoneData.id} dropped at (${newX.toFixed(0)}, ${newY.toFixed(0)})`);
            saveZoneLayout(); // Save the new layout to backend
        }
        // Clear the dragging state visual if needed (handleZoneDragEnd also does this)
         if(zoneElement) zoneElement.classList.remove('dragging');
         currentDraggedZone = null; // Ensure cleared after drop
    }
}

// --- NEW: Zone Drag Handlers ---
function handleZoneDragStart(e) {
    if (!e.target.classList.contains('finish-zone')) return;
    const zoneId = e.target.id;
    const zoneData = finishZonesData.find(z => z.id === zoneId);
    if (!zoneData) return;

    currentDraggedZone = zoneData; // Store the data of the zone being dragged
    dragZoneOffsetX = e.offsetX; // Record click position within the element
    dragZoneOffsetY = e.offsetY;

    // Set data (can be minimal, just indicates dragging)
    e.dataTransfer.setData('text/plain', zoneId);
    e.dataTransfer.effectAllowed = 'move';

    e.target.classList.add('dragging'); // Add styling class
    log(`Dragging zone: ${zoneId}`);

    // Optional: Hide original element slightly? (Can cause flicker)
    // setTimeout(() => { e.target.style.opacity = '0.5'; }, 0);
}

function handleZoneDragEnd(e) {
    if (!e.target.classList.contains('finish-zone')) return;

    // This function primarily cleans up visuals if drop occurs outside valid area
    e.target.classList.remove('dragging');
    e.target.style.opacity = '1'; // Reset opacity if changed

    // The actual position update and saving happens in the 'drop' handler
    // on the main-area OR in updateDraggedZonePosition if called on drop.
    // We reset the global dragging state here as a fallback.
    if (currentDraggedZone && currentDraggedZone.id === e.target.id) {
         // If drop didn't happen on main-area, updateDraggedZonePosition wasn't called
         // We might need to snap back or handle differently? For now, just clear state.
         log(`Drag ended for zone: ${e.target.id}. Final position set by drop handler.`);
    }
    // Clear tracked zone if not already cleared by drop
    // currentDraggedZone = null; // Drop handler should clear this
}

// --- NEW: Function to Save Zone Layout ---
function saveZoneLayout() {
    log(`Sending ${finishZonesData.length} zone positions to backend.`);
    fetch('/zones', { // Target the new backend endpoint
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ zones: finishZonesData }) // Send the current zone data
    })
    .then(response => {
        if (!response.ok) {
             return response.text().then(text => { throw new Error(`HTTP error ${response.status}: ${text || 'Failed to save zones'}`); });
        }
        return response.json();
    })
    .then(r => {
        log(`Saved zone layout: ${r.message}`);
        // No need to fetchState immediately, positions are already updated locally.
        // fetchState(); // Fetching might overwrite if save was slow? Generally okay.
    })
    .catch(error => {
        console.error('Error saving zone layout:', error);
        log(`Error saving zone layout: ${error.message}`);
        alert(`Error saving zone positions: ${error.message}`);
    });
}

// --- FIX: Correct function name in addBlockToFirstEmptyCell ---
function addBlockToFirstEmptyCell() {
    const index = gridBlocks.findIndex(block => !block); // Find first null slot
    if (index === -1) {
        alert("No empty cells available in the grid!");
        log("Cannot add block: Grid is full.");
        return;
    }

    log(`Adding new default block to grid at index ${index}`);
    // Create a simple default block
    gridBlocks[index] = {
        title: "New Block " + (index + 1),
        description: "Added via button at " + new Date().toLocaleTimeString(),
        block_id: null // Ensure it gets a new ID from the backend
    };

    renderGrid(); // Update the grid display immediately
    saveAllBlocks(); // Call the correct save function
}



