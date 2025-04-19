from flask import Flask, request, jsonify, send_from_directory
from pathlib import Path
import uuid, os, json
import logging
import shutil
import time      # <-- Import time
import threading # <-- Import threading
import random    # <-- Import random for zone selection
from llm_service import LLMService
# ... (existing imports like agent_do_analysis, read_block) ...
from core.agent import agent_do_analysis
from core.blocks import read_block
import asyncio
import re

from developer_agent import perform_agent_work_and_move
from qa_agent import perform_qa_work

BASE_OUTPUT = Path("output")
BLOCKS_DIR = BASE_OUTPUT / "blocks"
BLOCKS_DIR.mkdir(parents=True, exist_ok=True)
AGENTS_DIR = Path("output") / "agents"
AGENTS_DIR.mkdir(parents=True, exist_ok=True)

LAYOUT_DIR = BASE_OUTPUT / "layout"
LAYOUT_DIR.mkdir(parents=True, exist_ok=True)
ZONES_FILE = LAYOUT_DIR / "zones.json"

INITIAL_AGENT_X = 50
INITIAL_AGENT_Y = 50

# --- Define Finish Zones (Example Coordinates) ---
# Store as a list of dictionaries. Add more zones as needed.
DEFAULT_FINISH_ZONES = [
    {"id": "finish-zone-1", "x": 50,  "y": 50, "width": 100, "height": 100, "label": "Zone 1"},
    {"id": "finish-zone-2", "x": 200, "y": 50, "width": 100, "height": 100, "label": "Zone 2"},
    {"id": "finish-zone-3", "x": 350, "y": 50, "width": 100, "height": 100, "label": "Zone 3"},
    {"id": "finish-zone-4", "x": 500, "y": 50, "width": 100, "height": 100, "label": "Zone 4"},
    {"id": "finish-zone-5", "x": 650, "y": 50, "width": 100, "height": 100, "label": "Zone 5"},
    {"id": "finish-zone-6", "x": 800, "y": 50, "width": 100, "height": 100, "label": "Zone 6"},
]
# --- ---

app = Flask(__name__)
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
llm_service = LLMService()

# --- Helper Functions for Zone Layout ---
def load_zone_positions():
    """Loads zone positions from the JSON file or returns defaults."""
    if ZONES_FILE.exists():
        try:
            with open(ZONES_FILE, "r") as f:
                zones = json.load(f)
                # Basic validation (e.g., check if it's a list)
                if isinstance(zones, list):
                    logging.info(f"Loaded {len(zones)} zones from {ZONES_FILE}")
                    return zones
                else:
                    logging.warning(f"Invalid format in {ZONES_FILE}. Using defaults.")
                    return DEFAULT_FINISH_ZONES
        except Exception as e:
            logging.error(f"Error reading {ZONES_FILE}: {e}. Using defaults.")
            return DEFAULT_FINISH_ZONES
    else:
        logging.info("Zones file not found. Using default positions.")
        return DEFAULT_FINISH_ZONES

def save_zone_positions(zones_data):
    """Saves the provided zone data list to the JSON file."""
    try:
        with open(ZONES_FILE, "w") as f:
            json.dump(zones_data, f, indent=2)
        logging.info(f"Saved {len(zones_data)} zones to {ZONES_FILE}")
        return True
    except Exception as e:
        logging.error(f"Error writing to {ZONES_FILE}: {e}")
        return False


# --- Static File Routes (Existing) ---
@app.route("/")
def index():
    return send_from_directory("templates", "index.html")

@app.route("/static/<path:filename>")
def static_files(filename):
    return send_from_directory("static", filename)

# --- Agent Routes (Modified /interrogate) ---
@app.route("/agents", methods=["GET"])
def list_agents():
    # ... (existing list_agents code) ...
    agents = []
    for agent_dir in AGENTS_DIR.glob("agent_*"):
        if agent_dir.is_dir():
            agent_id = agent_dir.name
            agent_info_file = agent_dir / "agent_info.json"
            agent_data = {
                "agent_id": agent_id, "name": "Agent " + agent_id[-6:],
                "state": "unknown", "assigned_block_id": None,
                "source_block_title": None, "x": INITIAL_AGENT_X, "y": INITIAL_AGENT_Y
            }
            if agent_info_file.exists():
                try:
                    with open(agent_info_file, "r") as f: info = json.load(f)
                    agent_data.update(info)
                    agent_data["x"] = agent_data.get("x", INITIAL_AGENT_X)
                    agent_data["y"] = agent_data.get("y", INITIAL_AGENT_Y)
                except Exception as e:
                    logging.warning(f"Could not read or parse agent info for {agent_id}: {e}")
            agents.append(agent_data)
    return jsonify(agents)


@app.route("/agents", methods=["POST"])
def spawn_agent():
    """
    Spawns a new agent (developer or qa) and saves its initial info.
    Expects JSON payload with optional llm_type, llm_model, and agent_type.
    """
    agent_id = f"agent_{uuid.uuid4().hex[:6]}"
    agent_dir = AGENTS_DIR / agent_id
    try:
        # Create the agent's directory
        agent_dir.mkdir(parents=True, exist_ok=True)
    except Exception as e:
        logging.error(f"Failed to create directory for agent {agent_id}: {e}")
        return jsonify({"error": "Failed to create agent directory"}), 500

    # Get data from the POST request body
    request_data = request.json or {}
    llm_type = request_data.get("llm_type")
    llm_model = request_data.get("llm_model")

    # --- Get agent_type, default to 'developer' ---
    agent_type = request_data.get("agent_type", "developer").lower() # Ensure lowercase
    if agent_type not in ["developer", "qa"]:
        logging.warning(f"Received invalid agent_type '{agent_type}'. Defaulting to 'developer'.")
        agent_type = "developer"
    # --- END Get agent_type ---

    # --- Set default name based on type ---
    default_name = f"{agent_type.capitalize()}_{agent_id[-4:]}"
    agent_name = request_data.get("name", default_name)
    # --- END Set default name ---

    # Agent data structure to be saved
    agent = {
        "agent_id": agent_id,
        "name": agent_name,
        "state": "idle", # Agents always start idle
        "x": INITIAL_AGENT_X,
        "y": INITIAL_AGENT_Y,
        "llm_config": { "type": llm_type, "model": llm_model },
        "agent_type": agent_type # <-- Save agent type
        # Other fields like assigned_block_id, completed_marker_id will be added later
    }

    # Path to the agent's specific information file
    agent_info_file = agent_dir / "agent_info.json"

    try:
        # Write the agent data to its JSON file
        with open(agent_info_file, "w") as f:
            json.dump(agent, f, indent=2)

        # Log successful spawning including the type
        logging.info(
            f"Agent {agent_id} (Type: {agent_type}) spawned at ({agent['x']}, {agent['y']}) "
            f"with LLM type: {llm_type or 'N/A'}"
        )
    except Exception as e:
         # Log error if saving fails
         logging.error(f"Failed to write agent info for {agent_id}: {e}")
         # Attempt to clean up directory if file write failed? Optional.
         # try: shutil.rmtree(agent_dir) except Exception: pass
         return jsonify({"error": "Failed to save agent info"}), 500

    # Return the created agent data in the response
    return jsonify(agent), 201 # 201 Created status code is appropriate


@app.route("/agents/<agent_id>", methods=["DELETE"])
def delete_agent(agent_id):
     # ... (existing delete_agent code) ...
    if not agent_id or not agent_id.startswith("agent_"): return jsonify({"error": "Invalid agent ID format"}), 400
    agent_dir = AGENTS_DIR / agent_id
    if agent_dir.is_dir():
        try:
            shutil.rmtree(agent_dir)
            logging.info(f"Agent {agent_id} deleted successfully.")
            return jsonify({"message": f"Agent {agent_id} deleted"}), 200
        except Exception as e:
            logging.error(f"Failed to delete agent directory {agent_dir}: {e}")
            return jsonify({"error": f"Failed to delete agent {agent_id}"}), 500
    else:
        logging.warning(f"Agent {agent_id} not found for deletion.")
        return jsonify({"error": "Agent not found"}), 404


@app.route("/agents/<agent_id>/move", methods=["POST"])
def move_agent(agent_id):
    # ... (existing move_agent code - No change needed here) ...
    if not agent_id or not agent_id.startswith("agent_"): return jsonify({"error": "Invalid agent ID format"}), 400
    agent_dir = AGENTS_DIR / agent_id
    agent_info_file = agent_dir / "agent_info.json"
    if not agent_info_file.is_file(): return jsonify({"error": "Agent info file not found"}), 404
    data = request.json
    target_x = data.get("x"); target_y = data.get("y")
    if target_x is None or target_y is None: return jsonify({"error": "Missing target coordinates (x, y)"}), 400
    try:
        with open(agent_info_file, "r") as f: agent_data = json.load(f)
        agent_data["x"] = float(target_x); agent_data["y"] = float(target_y); agent_data["state"] = "idle" # Set state to idle on manual move
        with open(agent_info_file, "w") as f: json.dump(agent_data, f, indent=2)
        logging.info(f"Agent {agent_id} MOVED to ({agent_data['x']:.1f}, {agent_data['y']:.1f})")
        return jsonify({"message": f"Move command processed", "new_x": agent_data["x"], "new_y": agent_data["y"]}), 200
    except Exception as e:
        logging.error(f"Error processing move command for {agent_id}: {e}")
        return jsonify({"error": "Failed to process move command"}), 500


# --- *** MODIFIED: interrogate_block route uses threading *** ---
@app.route("/agents/<agent_id>/interrogate", methods=["POST"])
# ... interrogate_block (uses loaded FINISH_ZONES now indirectly via the thread call)...
# Note: The interrogate route itself doesn't need the zones, but the thread it starts does.
# We load zones once when getting state, assuming they don't change *during* a work cycle.
def interrogate_block(agent_id):
    # ... (previous implementation - check required args) ...
    if not agent_id or not agent_id.startswith("agent_"): return jsonify({"error": "Invalid agent ID format"}), 400
    agent_dir = AGENTS_DIR / agent_id
    agent_info_file = agent_dir / "agent_info.json"
    if not agent_info_file.is_file(): return jsonify({"error": "Agent info file not found"}), 404
    data = request.json
    marker_id = data.get("markerId"); block_id = data.get("blockId")
    target_x = data.get("x"); target_y = data.get("y")
    if not block_id or target_x is None or target_y is None:
        return jsonify({"error": "Missing blockId or target coordinates (x, y) in interrogate request"}), 400
    block_path = BLOCKS_DIR / f"{block_id}.json"
    if not block_path.is_file(): return jsonify({"error": f"Block data not found for ID {block_id}"}), 404

    try:
        block_data = read_block(block_path)
        task_title = block_data.get("title", "Unknown Task"); task_description = block_data.get("description", "")
        with open(agent_info_file, "r+") as f:
            agent_data = json.load(f)
            agent_data["state"] = "working"; agent_data["assigned_block_id"] = block_id
            agent_data["source_block_title"] = task_title
            try: agent_data["x"] = float(target_x); agent_data["y"] = float(target_y)
            except (TypeError, ValueError): logging.warning(f"Interrogate: Invalid coords ({target_x}, {target_y}). Initial move skipped.")
            f.seek(0); json.dump(agent_data, f, indent=2); f.truncate()
        logging.info(f"Agent {agent_id} state set 'working', moved to marker ({agent_data.get('x')}, {agent_data.get('y')}) for Block {block_id}")
        task_info = {"block_id": block_id, "title": task_title, "description": task_description, "agent_id": agent_id}

        # Pass the *currently loaded* zone data to the thread
        current_zones = load_zone_positions() # Load fresh copy for the thread
        thread = threading.Thread(target=perform_agent_work_and_move, args=(agent_id, agent_dir, task_info, block_id, marker_id), daemon=True) # Pass marker_id
        thread.start()
        logging.info(f"Started background work thread for Agent {agent_id}, Block {block_id}")
        return jsonify({"message": f"Interrogation started...", "agent_state": "working"}), 200
    except Exception as e:
        logging.exception(f"Error processing interrogate command for Agent {agent_id}, Block {block_id}: {e}")
        # Minimal revert attempt
        try:
             with open(agent_info_file, "r+") as f:
                 agent_data = json.load(f)
                 if agent_data.get("state") == "working" and agent_data.get("assigned_block_id") == block_id:
                     agent_data["state"] = "error"; agent_data["source_block_title"] = f"Error starting work on {block_id}"
                     f.seek(0); json.dump(agent_data, f, indent=2); f.truncate()
        except Exception: pass
        return jsonify({"error": f"Failed to start interrogate process: {e}"}), 500

# --- *** END MODIFIED Route *** ---

# @app.route("/agents/<agent_id>/complete_and_move", methods=["POST"])
# def complete_and_move_agent(agent_id):
#     """
#     Triggered by the frontend after detecting 'finished_work' state.
#     Moves the agent to an *unoccupied* finish zone and resets state to idle.
#     """
#     agent_info_file = AGENTS_DIR / agent_id / "agent_info.json" # Correct path construction
#     if not agent_id or not agent_id.startswith("agent_"): return jsonify({"error": "Invalid agent ID format"}), 400
#     if not agent_info_file.is_file(): return jsonify({"error": "Agent info file not found"}), 404

#     try:
#         # --- Find Empty Finish Zone ---
#         target_finish_x, target_finish_y = None, None
#         selected_zone_id_log = "N/A"

#         # 1. Get all other agent positions
#         all_agents_positions = []
#         for other_agent_dir in AGENTS_DIR.glob("agent_*"):
#             other_agent_id = other_agent_dir.name
#             if other_agent_id == agent_id: continue # Skip self
#             other_info_file = other_agent_dir / "agent_info.json"
#             if other_info_file.exists():
#                 try:
#                     with open(other_info_file, "r") as f_other: info = json.load(f_other)
#                     if info.get("x") is not None and info.get("y") is not None:
#                          all_agents_positions.append({"id": other_agent_id, "x": info["x"], "y": info["y"]})
#                 except Exception: pass # Ignore errors reading other agents

#         # 2. Load zones
#         finish_zones = load_zone_positions()

#         if not finish_zones:
#             logging.warning(f"[{agent_id}-CompleteMove] No finish zones defined.")
#         else:
#             # 3. Identify occupied zones
#             occupied_zone_ids = set()
#             for zone in finish_zones:
#                 zone_x, zone_y, zone_w, zone_h = zone['x'], zone['y'], zone['width'], zone['height']
#                 for other_agent_pos in all_agents_positions:
#                     agent_x, agent_y = other_agent_pos["x"], other_agent_pos["y"]
#                     if (zone_x <= agent_x < zone_x + zone_w) and \
#                        (zone_y <= agent_y < zone_y + zone_h):
#                         occupied_zone_ids.add(zone['id'])
#                         logging.debug(f"[{agent_id}-CompleteMove] Zone {zone['id']} occupied by agent {other_agent_pos['id']}")
#                         break # Zone is occupied

#             # 4. Filter for empty zones
#             empty_zones = [zone for zone in finish_zones if zone['id'] not in occupied_zone_ids]

#             # 5. Select target zone
#             if empty_zones:
#                 selected_zone = random.choice(empty_zones)
#                 selected_zone_id_log = selected_zone['id']
#                 target_finish_x = selected_zone['x'] + selected_zone['width'] / 2
#                 target_finish_y = selected_zone['y'] + selected_zone['height'] / 2
#                 logging.info(f"[{agent_id}-CompleteMove] Found {len(empty_zones)} empty zones. Selected '{selected_zone_id_log}'. Target: ({target_finish_x:.0f}, {target_finish_y:.0f})")
#             else:
#                 logging.warning(f"[{agent_id}-CompleteMove] All {len(finish_zones)} finish zones are occupied. Agent will remain at current location.")
#                 # target_finish_x, target_finish_y remain None

#         # --- Update agent state and position ---
#         with open(agent_info_file, "r+") as f:
#             agent_data = json.load(f)
#             if agent_data.get("state") != "finished_work":
#                 logging.warning(f"[{agent_id}-CompleteMove] Agent was not in 'finished_work' state (was '{agent_data.get('state')}'). Proceeding anyway.")

#             agent_data["state"] = "idle"
#             agent_data["assigned_block_id"] = None
#             agent_data["source_block_title"] = None
#             agent_data["completed_marker_id"] = None

#             current_x, current_y = agent_data.get("x"), agent_data.get("y") # Get current pos for logging/fallback
#             if target_finish_x is not None and target_finish_y is not None:
#                 agent_data["x"] = target_finish_x
#                 agent_data["y"] = target_finish_y
#                 final_pos_log = f"zone '{selected_zone_id_log}' ({target_finish_x:.0f}, {target_finish_y:.0f})"
#             else:
#                  # Position remains unchanged if no empty zone found
#                  final_pos_log = f"previous location ({current_x:.0f}, {current_y:.0f}) as no empty zone was available"

#             f.seek(0)
#             json.dump(agent_data, f, indent=2)
#             f.truncate()

#         logging.info(f"[{agent_id}-CompleteMove] Agent state set to 'idle' and moved to {final_pos_log}.")

#         return jsonify({
#             "message": f"Agent {agent_id} moved to {final_pos_log} and set to idle.",
#             "new_state": "idle",
#             "new_x": agent_data.get("x"),
#             "new_y": agent_data.get("y")
#         }), 200

#     except Exception as e:
#         logging.error(f"[{agent_id}-CompleteMove] Error completing move: {e}", exc_info=True)
#         # Attempt to set state to error
#         try:
#             with open(agent_info_file, "r+") as f:
#                 agent_data = json.load(f); agent_data["state"] = "error"; agent_data["source_block_title"] = "Error during final move"
#                 agent_data["completed_marker_id"] = None; f.seek(0); json.dump(agent_data, f, indent=2); f.truncate()
#         except Exception: pass
#         return jsonify({"error": "Failed to complete agent move"}), 500
@app.route("/agents/<agent_id>/complete_and_move", methods=["POST"])
def complete_and_move_agent(agent_id):
    """
    Triggered by the frontend after detecting 'finished_work' state.
    Moves the agent to an *unoccupied* finish zone (non-dropoff) and resets state to idle.
    """
    # Construct the path to the agent's information file
    agent_info_file = AGENTS_DIR / agent_id / "agent_info.json" # Correct path construction

    # Validate agent ID format and check if the info file exists
    if not agent_id or not agent_id.startswith("agent_"):
        return jsonify({"error": "Invalid agent ID format"}), 400
    if not agent_info_file.is_file():
        return jsonify({"error": "Agent info file not found"}), 404

    try:
        # --- Find Empty Finish Zone ---
        target_finish_x, target_finish_y = None, None
        selected_zone_id_log = "N/A" # For logging which zone was chosen

        # 1. Get all other agent positions to check for zone occupancy
        all_agents_positions = []
        for other_agent_dir in AGENTS_DIR.glob("agent_*"):
            other_agent_id = other_agent_dir.name
            if other_agent_id == agent_id: continue # Skip checking against self
            other_info_file = other_agent_dir / "agent_info.json"
            if other_info_file.exists():
                try:
                    with open(other_info_file, "r") as f_other:
                        info = json.load(f_other)
                    # Ensure both x and y exist and are numbers before adding
                    if isinstance(info.get("x"), (int, float)) and isinstance(info.get("y"), (int, float)):
                        all_agents_positions.append({"id": other_agent_id, "x": info["x"], "y": info["y"]})
                    else:
                        # Log if an agent is skipped due to missing/invalid coordinates
                        logging.debug(f"Agent {other_agent_id} skipped (missing or invalid coordinates in info file).")
                except Exception as e:
                    # Log errors reading other agent files but continue
                    logging.warning(f"Error reading info file for agent {other_agent_id}: {e}")

        # 2. Load ALL zones and then filter for suitable 'finish' zones
        all_zones = load_zone_positions() # Assumes this function loads from zones.json or returns defaults

        # *** CORRECTION: Filter for zones NOT marked as 'dropoff' ***
        # This selects zones intended for developers (e.g., those without type 'dropoff' or with type 'finish')
        finish_zones = [zone for zone in all_zones if zone.get("type") != "dropoff"]
        # --- END CORRECTION ---

        # Check if any suitable finish zones were found after filtering
        if not finish_zones:
            logging.warning(f"[{agent_id}-CompleteMove] No suitable finish zones (non-dropoff) defined or found.")
        else:
            # 3. Identify occupied zones (using the FILTERED finish_zones list)
            occupied_zone_ids = set()
            for zone in finish_zones: # Iterate over the filtered list of potential finish zones
                # Basic validation for zone structure before accessing keys
                if not all(k in zone for k in ('id', 'x', 'y', 'width', 'height')):
                    logging.warning(f"[{agent_id}-CompleteMove] Skipping invalid zone data during occupancy check: {zone}")
                    continue

                zone_x, zone_y, zone_w, zone_h = zone['x'], zone['y'], zone['width'], zone['height']
                # Check if any *other* agent is inside this specific zone
                for other_agent_pos in all_agents_positions:
                    agent_x, agent_y = other_agent_pos["x"], other_agent_pos["y"]
                    # Check agent's center point against zone boundaries
                    if (zone_x <= agent_x < zone_x + zone_w) and \
                       (zone_y <= agent_y < zone_y + zone_h):
                        occupied_zone_ids.add(zone['id'])
                        logging.debug(f"[{agent_id}-CompleteMove] Finish Zone {zone['id']} occupied by agent {other_agent_pos['id']}")
                        break # This zone is occupied, no need to check other agents for it

            # 4. Filter for empty zones (from the already filtered finish_zones list)
            empty_zones = [zone for zone in finish_zones if zone['id'] not in occupied_zone_ids]

            # 5. Select target zone randomly from the empty ones
            if empty_zones:
                selected_zone = random.choice(empty_zones)
                selected_zone_id_log = selected_zone['id']
                # Calculate the center coordinates of the selected zone for the agent's destination
                target_finish_x = selected_zone['x'] + selected_zone['width'] / 2
                target_finish_y = selected_zone['y'] + selected_zone['height'] / 2
                logging.info(f"[{agent_id}-CompleteMove] Found {len(empty_zones)} empty finish zones. Selected '{selected_zone_id_log}'. Target: ({target_finish_x:.0f}, {target_finish_y:.0f})")
            else:
                # Log that all *suitable* finish zones are occupied
                logging.warning(f"[{agent_id}-CompleteMove] All {len(finish_zones)} suitable finish zones are occupied. Agent will remain at current location.")
                # target_finish_x, target_finish_y remain None, agent position won't change

        # --- Update agent state and position in its info file ---
        with open(agent_info_file, "r+") as f:
            agent_data = json.load(f)
            # Check current state, log if it wasn't 'finished_work' but proceed
            if agent_data.get("state") != "finished_work":
                logging.warning(f"[{agent_id}-CompleteMove] Agent was not in 'finished_work' state (was '{agent_data.get('state')}'). Proceeding anyway.")

            # Reset agent state and related fields
            agent_data["state"] = "idle"
            agent_data["assigned_block_id"] = None
            agent_data["source_block_title"] = None
            agent_data["completed_marker_id"] = None

            # Get current position for logging/fallback, ensure they are numbers
            current_x = agent_data.get("x") if isinstance(agent_data.get("x"), (int, float)) else INITIAL_AGENT_X
            current_y = agent_data.get("y") if isinstance(agent_data.get("y"), (int, float)) else INITIAL_AGENT_Y

            # Update position if a target zone was found
            if target_finish_x is not None and target_finish_y is not None:
                agent_data["x"] = target_finish_x
                agent_data["y"] = target_finish_y
                final_pos_log = f"finish zone '{selected_zone_id_log}' ({target_finish_x:.0f}, {target_finish_y:.0f})"
            else:
                 # Position remains unchanged if no empty suitable zone was found
                 final_pos_log = f"previous location ({current_x:.0f}, {current_y:.0f}) as no empty suitable zone was available"
                 # Ensure x and y fields exist even if not changing
                 agent_data["x"] = current_x
                 agent_data["y"] = current_y

            # Write the updated data back to the file
            f.seek(0) # Go to the beginning of the file
            json.dump(agent_data, f, indent=2) # Write updated JSON
            f.truncate() # Remove any trailing data if the new content is shorter

        # Log the final outcome
        logging.info(f"[{agent_id}-CompleteMove] Agent state set to 'idle' and moved to {final_pos_log}.")

        # Return success response
        return jsonify({
            "message": f"Agent {agent_id} moved to {final_pos_log} and set to idle.",
            "new_state": "idle",
            "new_x": agent_data.get("x"), # Return the final position
            "new_y": agent_data.get("y")
        }), 200

    # General exception handling for the entire process
    except Exception as e:
        logging.error(f"[{agent_id}-CompleteMove] Error completing move: {e}", exc_info=True) # Log traceback
        # Attempt to set the agent's state to 'error' as a fallback
        try:
            with open(agent_info_file, "r+") as f:
                agent_data = json.load(f)
                agent_data["state"] = "error"
                agent_data["source_block_title"] = "Error during final move" # Add error context
                agent_data["completed_marker_id"] = None # Clear marker ID on error
                f.seek(0)
                json.dump(agent_data, f, indent=2)
                f.truncate()
        except Exception as e_update:
             # Log if even updating the state to error fails
             logging.error(f"[{agent_id}-CompleteMove] Failed to update agent state to error after exception: {e_update}")
        # Return server error response
        return jsonify({"error": "Failed to complete agent move"}), 500

# --- Block Routes (Existing - No changes needed here) ---
@app.route("/blocks", methods=["GET"])
def list_blocks():
    # ... (existing list_blocks code) ...
    logging.info(f"--- list_blocks called ---")
    logging.info(f"Listing blocks in directory: {BLOCKS_DIR.resolve()}") # Log the absolute path being used
    blocks = []
    try: # Add try block for glob operation
        block_files = sorted(BLOCKS_DIR.glob("block_*.json"))
        found_filenames = [f.name for f in block_files]
        logging.info(f"Found {len(found_filenames)} file(s) matching 'block_*.json': {found_filenames}")
        for idx, f in enumerate(block_files): # Use enumerate for index
            try:
                with open(f, "r") as fp:
                    data = json.load(fp)
                    data['server_index'] = idx # Assign index based on sorted file list
                    blocks.append(data)
                    logging.info(f"Successfully read and added block: {f.name}")
            except Exception as e:
                logging.warning(f"Could not read block file {f.name}: {e}")
                continue
    except Exception as glob_e:
         logging.error(f"Error during directory glob operation in {BLOCKS_DIR.resolve()}: {glob_e}")
    logging.info(f"--- list_blocks finished. Returning {len(blocks)} block(s). ---")
    return jsonify(blocks)


@app.route("/blocks", methods=["POST"])
def save_blocks():
    # ... (existing save_blocks code) ...
    posted = request.json
    if not posted or "blocks" not in posted: return jsonify({"error": "Missing 'blocks' data"}), 400
    blocks_to_save = posted.get("blocks", [])
    saved_count = 0; existing_files = {f.name: f for f in BLOCKS_DIR.glob("block_*.json")}; saved_files = set()
    logging.info(f"Processing {len(blocks_to_save)} blocks for saving...")
    for idx, b_data in enumerate(blocks_to_save):
        block_id = b_data.get("block_id")
        if not block_id: block_id = f"block_{uuid.uuid4().hex[:6]}"; logging.info(f"Assigned new ID {block_id}")
        b_data["block_id"] = block_id; file_name = f"{block_id}.json"; block_path = BLOCKS_DIR / file_name; saved_files.add(file_name)
        try:
            with open(block_path, "w") as fp: json.dump(b_data.copy(), fp, indent=2)
            saved_count += 1
        except Exception as e: logging.error(f"Failed to save block {block_id}: {e}")
    files_to_delete = set(existing_files.keys()) - saved_files
    if files_to_delete:
        logging.info(f"Deleting {len(files_to_delete)} removed blocks: {', '.join(files_to_delete)}")
        for file_name in files_to_delete:
            try: existing_files[file_name].unlink()
            except Exception as e: logging.warning(f"Could not delete old block {file_name}: {e}")
    logging.info(f"Saved/updated {saved_count} blocks. Deleted {len(files_to_delete)} blocks.")
    return jsonify({"ok": True, "count": saved_count})


# --- State Route (Existing - No changes needed) ---
@app.route("/state", methods=["GET"])
def get_state():
    """Gets current state including blocks, agents, and finish zones."""
    blocks_response = list_blocks()
    agents_response = list_agents()
    # --- NEW: Load zones ---
    zones_data = load_zone_positions()
    # --- END NEW ---

    blocks_data = blocks_response.json if blocks_response and blocks_response.json is not None else []
    agents_data = agents_response.json if agents_response and agents_response.json is not None else []

    return jsonify({
        "blocks": blocks_data,
        "agents": agents_data,
        "zones": zones_data # Include zones in the state
        })

@app.route("/zones", methods=["POST"])
def update_zones():
    """Receives and saves the updated positions of finish zones."""
    data = request.json
    if not data or "zones" not in data or not isinstance(data["zones"], list):
        return jsonify({"error": "Invalid data format. Expected {'zones': [...]}"}), 400

    zones_to_save = data["zones"]
    # Optional: Add validation here to check if each zone has id, x, y, etc.
    if save_zone_positions(zones_to_save):
        return jsonify({"message": f"Saved {len(zones_to_save)} zone positions."}), 200
    else:
        return jsonify({"error": "Failed to save zone positions."}), 500




# --- NEW: QA Agent Initiation Endpoint ---
@app.route("/agents/<agent_id>/start_qa", methods=["POST"])
def start_qa_task(agent_id):
    """
    Assigns a completed developer task to an idle QA agent and starts the QA workflow.
    Expects {'developer_agent_id': '...'} in JSON payload.
    Calls the imported perform_qa_work function in a thread.
    """
    qa_agent_dir = AGENTS_DIR / agent_id
    qa_agent_info_file = qa_agent_dir / "agent_info.json"

    if not qa_agent_info_file.is_file():
        return jsonify({"error": "QA Agent info file not found"}), 404

    data = request.json
    developer_agent_id = data.get("developer_agent_id")
    if not developer_agent_id:
        return jsonify({"error": "Missing 'developer_agent_id' in request body"}), 400

    developer_agent_dir = AGENTS_DIR / developer_agent_id
    developer_agent_info_file = developer_agent_dir / "agent_info.json"

    if not developer_agent_info_file.is_file():
        return jsonify({"error": f"Developer Agent {developer_agent_id} info file not found"}), 404

    try:
        # --- Update QA Agent State ---
        with open(qa_agent_info_file, "r+") as f_qa:
            qa_agent_data = json.load(f_qa)
            if qa_agent_data.get("state") != "idle":
                return jsonify({"error": f"QA Agent {agent_id} is not idle (state: {qa_agent_data.get('state')})"}), 409 # Conflict
            if qa_agent_data.get("agent_type") != "qa":
                 return jsonify({"error": f"Agent {agent_id} is not a QA agent"}), 400

            qa_agent_data["state"] = "working_qa"
            qa_agent_data["assigned_developer_id"] = developer_agent_id
            qa_agent_data["source_block_title"] = f"QA for Dev {developer_agent_id}" # Set title context

            f_qa.seek(0); json.dump(qa_agent_data, f_qa, indent=2); f_qa.truncate()
        logging.info(f"QA Agent {agent_id} state set to 'working_qa', assigned to Developer {developer_agent_id}")

        # --- Update Developer Agent State ---
        developer_agent_x, developer_agent_y = None, None # For moving QA agent
        with open(developer_agent_info_file, "r+") as f_dev:
             dev_agent_data = json.load(f_dev)
             if dev_agent_data.get("state") != "idle": # Should be idle in a finish zone
                 logging.warning(f"Developer agent {developer_agent_id} was not in 'idle' state (was '{dev_agent_data.get('state')}') when QA started.")
                 # Allow proceeding, but log it. Could also return error 409.

             dev_agent_data["state"] = "under_qa" # Mark as being reviewed
             developer_agent_x = dev_agent_data.get("x") # Get dev agent position
             developer_agent_y = dev_agent_data.get("y")

             f_dev.seek(0); json.dump(dev_agent_data, f_dev, indent=2); f_dev.truncate()
        logging.info(f"Developer Agent {developer_agent_id} state set to 'under_qa'.")

        # --- Move QA agent to Developer's location (Optional visual step) ---
        if developer_agent_x is not None and developer_agent_y is not None:
             with open(qa_agent_info_file, "r+") as f_qa:
                 qa_agent_data = json.load(f_qa) # Reload to be safe
                 qa_agent_data["x"] = developer_agent_x
                 qa_agent_data["y"] = developer_agent_y
                 f_qa.seek(0); json.dump(qa_agent_data, f_qa, indent=2); f_qa.truncate()
             logging.info(f"Moved QA Agent {agent_id} to Developer {developer_agent_id}'s location ({developer_agent_x:.0f}, {developer_agent_y:.0f}).")

        # --- Start QA Background Thread using imported function ---
        thread = threading.Thread(
            target=perform_qa_work, # <-- Use imported function
            args=(agent_id, qa_agent_dir, developer_agent_id, str(developer_agent_dir)),
            daemon=True
        )
        thread.start()
        logging.info(f"Started background QA work thread for QA Agent {agent_id} on Developer {developer_agent_id}'s files.")

        return jsonify({
            "message": f"QA task started for agent {agent_id} on developer {developer_agent_id}.",
            "qa_agent_state": "working_qa",
            "developer_agent_state": "under_qa"
            }), 200

    except Exception as e:
        logging.exception(f"Error processing start_qa command for QA Agent {agent_id}, Developer {developer_agent_id}: {e}")
        # Minimal revert attempt (best effort)
        try:
             with open(qa_agent_info_file, "r+") as f_qa:
                 qa_data = json.load(f_qa); qa_data["state"] = "error"; qa_data["assigned_developer_id"] = developer_agent_id; f_qa.seek(0); json.dump(qa_data, f_qa, indent=2); f_qa.truncate()
        except Exception: pass
        try:
             with open(developer_agent_info_file, "r+") as f_dev:
                 dev_data = json.load(f_dev); dev_data["state"] = "idle"; f_dev.seek(0); json.dump(dev_data, f_dev, indent=2); f_dev.truncate() # Revert dev to idle maybe?
        except Exception: pass
        return jsonify({"error": f"Failed to start QA process: {e}"}), 500

# --- NEW: QA Agent Completion Endpoint ---
@app.route("/agents/<agent_id>/complete_qa_and_move", methods=["POST"])
def complete_qa_and_move_agent(agent_id):
    """
    Triggered by frontend after detecting 'finished_qa_work' state.
    Moves the QA agent to an *unoccupied* drop-off zone and resets state to idle.
    Also resets the corresponding Developer agent's state.
    """
    agent_info_file = AGENTS_DIR / agent_id / "agent_info.json"
    if not agent_id or not agent_id.startswith("agent_"): return jsonify({"error": "Invalid agent ID format"}), 400
    if not agent_info_file.is_file(): return jsonify({"error": "Agent info file not found"}), 404

    developer_agent_id_to_reset = None # Track which dev agent was associated

    try:
        # --- Update QA agent state and position ---
        with open(agent_info_file, "r+") as f:
            agent_data = json.load(f)
            if agent_data.get("state") != "finished_qa_work":
                logging.warning(f"[{agent_id}-CompleteQA] QA Agent was not in 'finished_qa_work' state (was '{agent_data.get('state')}'). Proceeding anyway.")

            # Get assigned dev ID *before* clearing it
            developer_agent_id_to_reset = agent_data.get("assigned_developer_id")

            agent_data["state"] = "idle"
            agent_data["assigned_developer_id"] = None # Clear assignment
            agent_data["source_block_title"] = None
            # Keep agent_data["output_zip_path"]

            # --- Find Empty Drop-off Zone ---
            target_dropoff_x, target_dropoff_y = None, None
            selected_zone_id_log = "N/A"

            # 1. Get all other agent positions
            all_agents_positions = []
            for other_agent_dir in AGENTS_DIR.glob("agent_*"):
                other_agent_id = other_agent_dir.name
                if other_agent_id == agent_id: continue
                other_info_file = other_agent_dir / "agent_info.json"
                if other_info_file.exists():
                    try:
                        with open(other_info_file, "r") as f_other: info = json.load(f_other)
                        if info.get("x") is not None and info.get("y") is not None:
                             all_agents_positions.append({"id": other_agent_id, "x": info["x"], "y": info["y"]})
                    except Exception: pass

            # 2. Load zones and filter for *dropoff* type
            all_zones = load_zone_positions()
            dropoff_zones = [zone for zone in all_zones if zone.get("type") == "dropoff"]

            if not dropoff_zones:
                logging.warning(f"[{agent_id}-CompleteQA] No drop-off zones defined.")
            else:
                # 3. Identify occupied dropoff zones
                occupied_dropoff_zone_ids = set()
                for zone in dropoff_zones:
                    zone_x, zone_y, zone_w, zone_h = zone['x'], zone['y'], zone['width'], zone['height']
                    for other_agent_pos in all_agents_positions:
                        agent_x, agent_y = other_agent_pos["x"], other_agent_pos["y"]
                        if (zone_x <= agent_x < zone_x + zone_w) and \
                           (zone_y <= agent_y < zone_y + zone_h):
                            occupied_dropoff_zone_ids.add(zone['id'])
                            logging.debug(f"[{agent_id}-CompleteQA] Drop-off zone {zone['id']} occupied by agent {other_agent_pos['id']}")
                            break

                # 4. Filter for empty dropoff zones
                empty_dropoff_zones = [zone for zone in dropoff_zones if zone['id'] not in occupied_dropoff_zone_ids]

                # 5. Select target dropoff zone
                if empty_dropoff_zones:
                    selected_zone = random.choice(empty_dropoff_zones)
                    selected_zone_id_log = selected_zone['id']
                    target_dropoff_x = selected_zone['x'] + selected_zone['width'] / 2
                    target_dropoff_y = selected_zone['y'] + selected_zone['height'] / 2
                    logging.info(f"[{agent_id}-CompleteQA] Found {len(empty_dropoff_zones)} empty drop-off zones. Selected '{selected_zone_id_log}'. Target: ({target_dropoff_x:.0f}, {target_dropoff_y:.0f})")
                else:
                    logging.warning(f"[{agent_id}-CompleteQA] All {len(dropoff_zones)} drop-off zones are occupied. QA Agent will remain at current location.")

            # Update agent position
            current_x, current_y = agent_data.get("x"), agent_data.get("y")
            if target_dropoff_x is not None and target_dropoff_y is not None:
                agent_data["x"] = target_dropoff_x
                agent_data["y"] = target_dropoff_y
                final_pos_log = f"drop-off zone '{selected_zone_id_log}' ({target_dropoff_x:.0f}, {target_dropoff_y:.0f})"
            else:
                 final_pos_log = f"previous location ({current_x:.0f}, {current_y:.0f}) as no empty drop-off zone was available"

            # Save changes to QA agent file
            f.seek(0)
            json.dump(agent_data, f, indent=2)
            f.truncate()

        logging.info(f"[{agent_id}-CompleteQA] QA Agent state set to 'idle' and moved to {final_pos_log}.")

        # --- Update original Developer agent state ---
        if developer_agent_id_to_reset:
            dev_agent_info_file = AGENTS_DIR / developer_agent_id_to_reset / "agent_info.json"
            if dev_agent_info_file.exists():
                try:
                    with open(dev_agent_info_file, "r+") as f_dev:
                        dev_data = json.load(f_dev)
                        if dev_data.get("state") == "under_qa":
                            dev_data["state"] = "idle" # Or "qa_complete"? Let's use idle.
                            dev_data["source_block_title"] = "QA Completed" # Update title
                            f_dev.seek(0); json.dump(dev_data, f_dev, indent=2); f_dev.truncate()
                            logging.info(f"[{agent_id}-CompleteQA] Reset Developer agent {developer_agent_id_to_reset} state to '{dev_data['state']}'.")
                        else:
                            logging.warning(f"[{agent_id}-CompleteQA] Developer agent {developer_agent_id_to_reset} was not in 'under_qa' state (was '{dev_data.get('state')}'). State not reset.")
                except Exception as dev_reset_err:
                     logging.error(f"[{agent_id}-CompleteQA] Error resetting state for developer agent {developer_agent_id_to_reset}: {dev_reset_err}")
            else:
                 logging.warning(f"[{agent_id}-CompleteQA] Could not find info file for developer agent {developer_agent_id_to_reset} to reset state.")
        else:
            logging.warning(f"[{agent_id}-CompleteQA] No developer agent ID was associated with this QA task completion. No developer state reset.")


        return jsonify({
            "message": f"QA Agent {agent_id} moved to {final_pos_log} and set to idle.",
            "new_state": "idle",
            "new_x": agent_data.get("x"),
            "new_y": agent_data.get("y")
        }), 200

    except Exception as e:
        logging.error(f"[{agent_id}-CompleteQA] Error completing QA move: {e}", exc_info=True)
        # Attempt to set state to error
        try:
            with open(agent_info_file, "r+") as f:
                agent_data = json.load(f); agent_data["state"] = "error"; agent_data["source_block_title"] = "Error during QA final move"
                f.seek(0); json.dump(agent_data, f, indent=2); f.truncate()
        except Exception: pass
        return jsonify({"error": "Failed to complete QA agent move"}), 500

# --- END Add ---



# --- Main Execution ---
if __name__ == "__main__":
    # Flask's default dev server is NOT ideal for threading used this way.
    # For development, this might work, but for production, consider a proper WSGI/ASGI server (like Gunicorn or Uvicorn+Hypercorn)
    # Also, Flask context might not be available in background threads easily.
    # For now, we pass needed data explicitly. Be mindful of shared state access.
    app.run(debug=True, host='0.0.0.0', port=5000, threaded=True) # Add threaded=True for basic multi-thread handling in dev server
