import json
import shutil
import time
from pathlib import Path
from .utils import safe_mkdir, log_agent_step

AGENTS_DIR = Path("output") / "agents"
AGENTS_DIR.mkdir(parents=True, exist_ok=True)

def spawn_agent(agent_id: str, block_data: dict):
    """
    Create new agent workspace and assign initial task info.
    """
    agent_dir = AGENTS_DIR / f"agent_{agent_id}"
    safe_mkdir(agent_dir)
    safe_mkdir(agent_dir / "files")
    safe_mkdir(agent_dir / "logs")

    # Create task.json from block
    task = {
        "block_id": block_data["block_id"],
        "title": block_data["title"],
        "description": block_data["description"],
        "agent_id": agent_id,
    }
    with open(agent_dir / "task.json", "w") as f:
        json.dump(task, f, indent=2)

    log_agent_step(agent_dir, "Pick up block", f"Picked up block {block_data['block_id']}")
    return agent_dir, task

def agent_do_analysis(agent_id: str, agent_dir: Path, task: dict):
    """
    Simulate agent analyzing the task and planning files to create.
    """
    a_path = agent_dir / "analysis.txt"
    analysis = f"Analysis for task: {task['title']}\n"
    analysis += f"To do '{task['description']}', I plan to generate files:\n"
    files = []
    file_content = ""

    title = task["title"].lower()
    if "script" in title or "python" in title:
        files = ["main.py"]
        file_content = "# Main script code\nprint('Hello Gameboard')"
    elif "website" in title or "webpage" in title:
        files = ["index.html", "styles.css", "script.js"]
    elif "arduino" in title:
        files = ["sketch.ino"]
        file_content = "// Arduino Sketch\ndigitalWrite(13, HIGH);"
    else:
        files = ["output.txt"]
        file_content = task["description"]

    for fname in files:
        analysis += f"- {fname}\n"

    with open(a_path, "w") as f:
        f.write(analysis)

    files_dir = agent_dir / "files"
    for f in files_dir.iterdir():
        f.unlink()
    for fname in files:
        with open(files_dir / fname, 'w') as f:
            f.write(file_content)

    log_agent_step(agent_dir, "Work", f"Generated files: {', '.join(files)}")

def agent_apply_suggestion(agent_dir: Path, suggestion: str):
    """
    Simulate modifying files per suggestion.
    """
    # In real app, LLM call and alter files
    analysis_path = agent_dir / "analysis.txt"
    with open(analysis_path, 'a') as f:
        f.write('\n[Improvement pass]\n' + suggestion + "\n")
    log_agent_step(agent_dir, "Modify", "Modified files per QA suggestion")

def agent_deliver(agent_id: str, agent_dir: Path, task: dict):
    """
    Move final files to output/final_output, clean up workspace.
    """
    from .utils import safe_title_for_dir
    final_name = f"{safe_title_for_dir(task['title'])}__{agent_id}"
    final_dir = Path("output") / "final_output" / final_name
    safe_mkdir(final_dir)
    # Copy task.json, files/, and logs/
    shutil.copy2(agent_dir / "task.json", final_dir / "final_task.json")
    files_src = agent_dir / "files"
    if files_src.exists():
        shutil.copytree(files_src, final_dir / "files", dirs_exist_ok=True)
    logs_src = agent_dir / "logs"
    if logs_src.exists():
        shutil.copytree(logs_src, final_dir / "logs", dirs_exist_ok=True)
    # Cleanup
    shutil.rmtree(agent_dir)
    return final_dir

# """
# agent.py

# Improved agent workspace management with:
# - Centralized constants
# - Type hints
# - Atomic workspace operations
# - Structured state file
# - Unified logging
# - Diff-and-patch in apply_suggestion
# """
# import json
# import logging
# import shutil
# import subprocess
# from pathlib import Path
# from typing import Tuple, Dict, Any
# import os
# from .utils import safe_mkdir, safe_title_for_dir

# # --- Constants ---
# BASE_OUTPUT = Path("output")
# AGENTS_DIR = BASE_OUTPUT / "agents"
# FINAL_OUTPUT_DIR = BASE_OUTPUT / "final_output"
# STATE_FILENAME = "agent_info.json"

# # Ensure directories exist
# AGENTS_DIR.mkdir(parents=True, exist_ok=True)
# FINAL_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# # Configure module-level logger
# logger = logging.getLogger(__name__)
# logger.setLevel(logging.INFO)

# ch = logging.StreamHandler()
# ch.setFormatter(logging.Formatter("%(asctime)s - %(levelname)s - %(name)s - %(message)s"))
# logger.addHandler(ch)


# def spawn_agent(agent_id: str, block_data: Dict[str, Any]) -> Tuple[Path, Dict[str, Any]]:
#     """
#     Create a new agent workspace, write task.json and initial state.
#     Returns (agent_dir, task_dict).
#     """
#     # Validate input
#     for key in ("block_id", "title", "description"):
#         if key not in block_data:
#             raise ValueError(f"Missing '{key}' in block_data")

#     agent_dir = AGENTS_DIR / f"agent_{agent_id}"
#     safe_mkdir(agent_dir)
#     safe_mkdir(agent_dir / "files")
#     safe_mkdir(agent_dir / "logs")

#     # Write task.json
#     task = {
#         "block_id": block_data["block_id"],
#         "title": block_data["title"],
#         "description": block_data["description"],
#         "agent_id": agent_id,
#     }
#     with open(agent_dir / "task.json", "w", encoding="utf-8") as f:
#         json.dump(task, f, indent=2)

#     # Write initial state
#     state = {
#         "agent_id": agent_id,
#         "state": "spawned",
#         "last_step": "spawn",
#         "timestamp": int(__import__('time').time())
#     }
#     with open(agent_dir / STATE_FILENAME, "w", encoding="utf-8") as f:
#         json.dump(state, f, indent=2)

#     logger.info(f"Spawned agent {agent_id} at {agent_dir}")
#     return agent_dir, task


# def agent_do_analysis(agent_id: str, agent_dir: Path, task: Dict[str, Any]) -> None:
#     """
#     Analyze task, plan files, and write initial file templates.
#     """
#     # Determine file plan
#     title = task["title"].lower()
#     if any(k in title for k in ("script", "python")):
#         files = ["main.py"]
#         template = "# Main script code\nprint('Hello World')\n"
#     elif any(k in title for k in ("website", "webpage")):
#         files = ["index.html", "styles.css", "script.js"]
#         template = {
#             "index.html": "<!DOCTYPE html>\n<html>...</html>",
#             "styles.css": "/* CSS styles */",
#             "script.js": "// JavaScript code"
#         }
#     elif "arduino" in title:
#         files = ["sketch.ino"]
#         template = "// Arduino sketch\ndigitalWrite(13, HIGH);\n"
#     else:
#         files = ["output.txt"]
#         template = task.get("description", "")

#     # Clean files directory
#     workspace = agent_dir / "files"
#     if workspace.exists():
#         shutil.rmtree(workspace)
#     safe_mkdir(workspace)

#     # Write files
#     for fname in files:
#         content = template[fname] if isinstance(template, dict) else template
#         (workspace / fname).write_text(content, encoding="utf-8")

#     # Update state
#     state_path = agent_dir / STATE_FILENAME
#     state = json.loads(state_path.read_text())
#     state.update({"state": "analysis_complete", "last_step": "analysis", "timestamp": int(__import__('time').time())})
#     state_path.write_text(json.dumps(state, indent=2))

#     logger.info(f"Agent {agent_id}: analysis complete, created {files}")


# def agent_apply_suggestion(agent_id: str, agent_dir: Path, diff: str) -> None:
#     """
#     Apply a unified-diff suggestion to the agent's files directory using patch.
#     """
#     patch_file = agent_dir / "logs" / f"suggestion_{agent_id}.diff"
#     patch_file.write_text(diff, encoding="utf-8")

#     try:
#         subprocess.run([
#             "patch", "-p0", "--directory", str(agent_dir / "files"), "--input", str(patch_file)
#         ], check=True, capture_output=True, text=True)
#         result = "patched"
#     except subprocess.CalledProcessError as e:
#         logger.error(f"Agent {agent_id}: patch failed: {e.stderr}")
#         result = "patch_error"

#     # Update state
#     state_path = agent_dir / STATE_FILENAME
#     state = json.loads(state_path.read_text())
#     state.update({"state": result, "last_step": "apply_suggestion", "timestamp": int(__import__('time').time())})
#     state_path.write_text(json.dumps(state, indent=2))

#     logger.info(f"Agent {agent_id}: applied suggestion, result={result}")


# def agent_deliver(agent_id: str, agent_dir: Path, task: Dict[str, Any]) -> Path:
#     """
#     Atomically move completed work to final_output and clean up.
#     Returns final directory path.
#     """
#     final_name = f"{safe_title_for_dir(task['title'])}__{agent_id}"
#     tmp_dir = FINAL_OUTPUT_DIR / f".tmp_{agent_id}"
#     target_dir = FINAL_OUTPUT_DIR / final_name

#     # Ensure clean temp
#     if tmp_dir.exists(): shutil.rmtree(tmp_dir)
#     safe_mkdir(tmp_dir)

#     # Copy contents
#     shutil.copy2(agent_dir / "task.json", tmp_dir / "final_task.json")
#     shutil.copytree(agent_dir / "files", tmp_dir / "files")
#     shutil.copytree(agent_dir / "logs", tmp_dir / "logs")

#     # Atomic replace
#     if target_dir.exists(): shutil.rmtree(target_dir)
#     os.replace(tmp_dir, target_dir)

#     # Cleanup agent workspace
#     shutil.rmtree(agent_dir)

#     logger.info(f"Agent {agent_id}: delivered output to {target_dir}")
#     return target_dir
