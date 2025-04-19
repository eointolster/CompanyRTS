
# import os
# import json
# import logging
# import shutil
# import asyncio
# import re
# from pathlib import Path
# from datetime import datetime
# from llm_service import LLMService

# # ───── Config & Globals ─────

# OUTPUT = Path("output")
# AGENTS = OUTPUT / "agents"
# LLM = LLMService()

# # Ensure directories exist
# AGENTS.mkdir(parents=True, exist_ok=True)
# logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

# # ───── Helper Functions ─────

# async def _generate(llm_type, prompt, model=None):
#     """Wrapper around LLMService.generate to simplify calls."""
#     return await LLM.generate(llm_type, prompt, model_name=model)

# def _write_log(logs_dir: Path, name: str, content: str):
#     """Write detailed logs for debugging."""
#     path = logs_dir / f"{name}_{datetime.now():%Y%m%d_%H%M%S}.txt"
#     path.write_text(content, encoding="utf-8")
#     logging.debug(f"Wrote log: {path}")

# def _set_state(info_file: Path, state: str, **fields):
#     """Atomically update agent_info.json with new state and optional extras."""
#     data = json.loads(info_file.read_text())
#     data.update(state=state, **fields)
#     info_file.write_text(json.dumps(data, indent=2))

# # ───── Pipeline Steps ─────

# def analyze_task(task_title: str, task_desc: str, agent_id: str, logs_dir: Path) -> str:
#     prompt = f"""
# As an expert software architect, analyze:

# Title: {task_title}
# Description: {task_desc}

# Address:
# 1. Project type
# 2. Key features
# 3. Tech components
# 4. Interaction patterns
# 5. Potential enhancements
# """
#     try:
#         return asyncio.run(_generate("anthropic", prompt))
#     except Exception as e:
#         _write_log(logs_dir, "analysis_error", f"{e}\nPrompt:\n{prompt}")
#         return f"Basic analysis: {task_desc}"

# def plan_files(task_title: str, task_desc: str, analysis: str, agent_id: str, logs_dir: Path):
#     prompt = f"""
# As an expert dev, plan files for:

# Title: {task_title}
# Desc: {task_desc}
# Analysis: {analysis}

# FORMAT:
# ARCHITECTURE:
# [Your text]

# FILES:
# 1. name.ext - purpose
# 2. ...
# """
#     resp = ""
#     try:
#         resp = asyncio.run(_generate("anthropic", prompt))
#         # extract filenames with descriptions
#         files = []
#         descs = {}
#         for m in re.finditer(r'^\s*\d+\.\s*([\w.-]+\.\w+)\s*-\s*(.+)$', resp, re.M):
#             fn, ds = m.groups()
#             files.append(fn)
#             descs[fn] = ds
#         if not files:
#             raise ValueError("No files parsed")
#         return list(dict.fromkeys(files)), descs
#     except Exception as e:
#         _write_log(logs_dir, "planning_error", f"{e}\nResponse:\n{resp}\nPrompt:\n{prompt}")
#         # fallback
#         default = (["index.html","styles.css","script.js"]
#                    if "web" in task_title.lower() else ["main.py","README.md"])
#         return default, {f:"Fallback file" for f in default}

# def generate_files(filenames, descs, files_dir: Path, logs_dir: Path, task_title: str, task_desc: str, agent_id: str):
#     generated = {}
#     for fn in filenames:
#         ext = Path(fn).suffix
#         guidance = {
#             ".html": "Use semantic HTML5, link CSS/JS correctly.",
#             ".css": "Include responsive media queries.",
#             ".js":  "Use modern JS, proper event handling.",
#             ".py":  "Follow PEP8, include docstrings."
#         }.get(ext, "")
#         prompt = f"""
# You are an expert developer. Create {fn} for:
# Task: {task_title}
# Desc: {task_desc}
# Purpose: {descs.get(fn,"")}
# {guidance}

# RETURN ONLY RAW CONTENT.
# """
#         try:
#             content = asyncio.run(_generate("anthropic", prompt))
#             # strip markdown fences
#             if content.startswith("```"):
#                 content = re.sub(r"^```[\w]*\n|```$", "", content)
#             (files_dir/Path(fn).parent).mkdir(parents=True, exist_ok=True)
#             (files_dir/fn).write_text(content, encoding="utf-8")
#             generated[fn] = content
#             logging.info(f"[{agent_id}] Created {fn}")
#         except Exception as e:
#             _write_log(logs_dir, f"gen_err_{fn}", f"{e}\nPrompt:\n{prompt}")
#     return generated

# def validate_integration(generated, task_title, task_desc, files_dir: Path, logs_dir: Path, agent_id: str):
#     if len(generated) < 2:
#         return
#     # pick up to 5 files
#     samples = list(generated.items())[:5]
#     snippet = "\n\n".join(f"--- {n} ---\n{c}" for n,c in samples)
#     prompt = f"""
# As a QA Engineer, validate integration:

# Task: {task_title}
# Desc: {task_desc}

# Files:
# {snippet}

# Check:
# 1. Paths/links
# 2. Missing calls
# 3. Naming consistency

# If issues, REWRITE each affected file. Otherwise output NO_ISSUES.
# """
#     try:
#         resp = asyncio.run(_generate("anthropic", prompt))
#         if "NO_ISSUES" in resp:
#             return
#         # parse fixes
#         for m in re.finditer(r"---\s*FIX_START\s*(\S+)\s*---\s*(.*?)---\s*FIX_END", resp, re.S):
#             fn, fixed = m.groups()
#             (files_dir/fn).write_text(fixed.strip(), encoding="utf-8")
#             logging.info(f"[{agent_id}] Fixed integration in {fn}")
#     except Exception as e:
#         _write_log(logs_dir, "validation_error", str(e))

# def generate_readme(generated, files_dir: Path, task_title: str, task_desc: str, agent_id: str):
#     if "README.md" in generated or not generated:
#         return
#     prompt = f"""
# Create a README.md:

# Title: {task_title}
# Desc: {task_desc}
# Files: {', '.join(generated.keys())}

# Include overview, install, usage, file structure.
# """
#     try:
#         content = asyncio.run(_generate("anthropic", prompt))
#         (files_dir/"README.md").write_text(content, encoding="utf-8")
#         logging.info(f"[{agent_id}] Created README.md")
#     except Exception as e:
#         logging.warning(f"[{agent_id}] README step failed: {e}")

# # ───── Main Worker ─────

# def perform_agent_work_and_move(agent_id, agent_dir, task_info, block_id, marker_id):
#     """
#     1. analyze
#     2. plan
#     3. generate
#     4. validate
#     5. readme
#     6. update state
#     """
#     info_file = agent_dir/"agent_info.json"
#     files_dir = agent_dir/"files"; logs_dir = agent_dir/"logs"
#     files_dir.mkdir(exist_ok=True); logs_dir.mkdir(exist_ok=True)

#     title = task_info.get("title",""); desc = task_info.get("description","")
#     try:
#         logging.info(f"[{agent_id}] Starting work on {block_id}")
#         analysis = analyze_task(title, desc, agent_id, logs_dir)
#         files, descs = plan_files(title, desc, analysis, agent_id, logs_dir)
#         gen = generate_files(files, descs, files_dir, logs_dir, title, desc, agent_id)
#         validate_integration(gen, title, desc, files_dir, logs_dir, agent_id)
#         generate_readme(gen, files_dir, title, desc, agent_id)
#         _set_state(info_file, "finished_work", completed_marker_id=marker_id)
#         logging.info(f"[{agent_id}] Finished work on {block_id}")
#     except Exception as e:
#         logging.exception(f"[{agent_id}] Critical error")
#         _set_state(info_file, "error", error=str(e))




# """
# developer_agent.py

# Refactored developer agent workflow with:
# - Modular helper functions (analysis, planning, generation, validation)
# - Structured state updates via agent_info.json
# - Centralized logging setup
# - Type hints and docstrings
# """


# import json
# import logging
# import threading
# import time
# import asyncio
# from pathlib import Path
# from typing import Dict, Any, List, Tuple

# from llm_service import LLMService
# from core.agent import AGENTS_DIR, STATE_FILENAME
# from core.blocks import read_block

# # Configure logger
# logger = logging.getLogger(__name__)
# logger.setLevel(logging.INFO)
# handler = logging.StreamHandler()
# handler.setFormatter(logging.Formatter("%(asctime)s - %(levelname)s - %(name)s - %(message)s"))
# logger.addHandler(handler)

# # LLM service instance
# llm_service = LLMService()


# def update_agent_state(agent_dir: Path, state: str, marker_id: str = None) -> None:
#     """
#     Update the agent_info.json file with a new state and optional marker.
#     """
#     info_file = agent_dir / STATE_FILENAME
#     if not info_file.exists():
#         logger.warning(f"State file missing for agent at {agent_dir}")
#         return
#     data = json.loads(info_file.read_text(encoding='utf-8'))
#     data['state'] = state
#     if marker_id is not None:
#         data['completed_marker_id'] = marker_id
#     data['timestamp'] = int(time.time())
#     info_file.write_text(json.dumps(data, indent=2), encoding='utf-8')


# def perform_agent_work_and_move(
#     agent_id: str,
#     agent_dir: Path,
#     task_info: Dict[str, Any],
#     block_id: str,
#     marker_id: str
# ) -> None:
#     """
#     Background thread: runs the full developer agent workflow.
#     Steps:
#       1. Analyze task
#       2. Plan filenames
#       3. Generate files
#       4. Validate integration
#       5. Update state to 'finished_work'
#     """
#     try:
#         logger.info(f"[{agent_id}] Starting work for block {block_id}")

#         # Step 1: Analyze
#         analysis = analyze_task(agent_id, task_info)

#         # Step 2: Plan
#         files_to_create, descriptions = plan_files(task_info['title'], analysis)

#         # Step 3: Generate
#         generated = generate_files(agent_dir, agent_id, task_info, files_to_create, descriptions)

#         # Step 4: Validate
#         validate_integration(agent_id, generated)

#         # Step 5: Update state
#         update_agent_state(agent_dir, 'finished_work', marker_id)
#         logger.info(f"[{agent_id}] Work completed for block {block_id}")

#     except Exception as e:
#         logger.exception(f"[{agent_id}] Critical error during work: {e}")
#         update_agent_state(agent_dir, 'error')


# async def llm_call(prompt: str, llm_type: str = 'anthropic') -> str:
#     """Helper to run LLM generate in async context."""
#     return await llm_service.generate(llm_type=llm_type, prompt=prompt)


# def analyze_task(agent_id: str, task_info: Dict[str, Any]) -> str:
#     """
#     Run a task analysis via LLM and return analysis text.
#     """
#     title = task_info.get('title', '')
#     desc = task_info.get('description', '')
#     prompt = (
#         f"As a software architect, analyze this task:\n"
#         f"Title: {title}\nDescription: {desc}\n"
#         "List project type, components, and potential enhancements."
#     )
#     result = asyncio.run(llm_call(prompt, llm_type='anthropic'))
#     logger.info(f"[{agent_id}] Analysis done ({len(result)} chars)")
#     return result


# def plan_files(title: str, analysis: str) -> Tuple[List[str], Dict[str,str]]:
#     """
#     Decide which files to create and their descriptions based on title/analysis.
#     """
#     t = title.lower()
#     if 'script' in t or 'python' in t:
#         files = ['main.py']
#         descs = {'main.py': 'Main Python script'}
#     elif 'website' in t or 'webpage' in t:
#         files = ['index.html', 'styles.css', 'script.js']
#         descs = {
#             'index.html': 'HTML entrypoint',
#             'styles.css': 'Stylesheet',
#             'script.js': 'Client-side JS'
#         }
#     elif 'arduino' in t:
#         files = ['sketch.ino']
#         descs = {'sketch.ino': 'Arduino sketch'}
#     else:
#         files = ['output.txt']
#         descs = {'output.txt': 'Generic output'}
#     logger.info(f"Planned files: {files}")
#     return files, descs


# def generate_files(
#     agent_dir: Path,
#     agent_id: str,
#     task_info: Dict[str, Any],
#     files: List[str],
#     descs: Dict[str,str]
# ) -> List[Path]:
#     """
#     Generate each file sequentially via LLM and write to disk.
#     Returns list of file paths.
#     """
#     out_paths: List[Path] = []
#     files_dir = agent_dir / 'files'
#     files_dir.mkdir(parents=True, exist_ok=True)

#     for fname in files:
#         description = descs.get(fname, '')
#         prompt = (
#             f"Generate file {fname} for task '{task_info['title']}': {task_info['description']}\n"
#             f"Purpose: {description}\nProduce only the raw content."
#         )
#         content = asyncio.run(llm_call(prompt))
#         path = files_dir / fname
#         path.write_text(content, encoding='utf-8')
#         out_paths.append(path)
#         logger.info(f"[{agent_id}] Generated {fname} ({len(content)} chars)")

#     return out_paths


# def validate_integration(agent_id: str, file_paths: List[Path]) -> None:
#     """
#     Optionally validate integration between generated files via LLM.
#     Currently a stub.
#     """
#     # Placeholder: aggregate small subset and call LLM to spot mismatches
#     logger.info(f"[{agent_id}] Validation stub for {len(file_paths)} files")


# # If this module is run directly, you can test a single call
# if __name__ == '__main__':
#     logging.basicConfig(level=logging.INFO)
#     # Example test invocation
#     dummy_dir = AGENTS_DIR / 'agent_test'
#     task = {'block_id':'blk','title':'Test script','description':'Print hello'}
#     perform_agent_work_and_move('test', dummy_dir, task, 'blk', 'mkr')




# ///////////////////////////////////////
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
llm_service = LLMService()
def perform_agent_work_and_move(agent_id, agent_dir, task_info, block_id, marker_id):
    """
    Runs in a background thread. Uses an enhanced multi-step LLM process:
    1. Analyze task requirements
    2. Plan files with strict format enforcement
    3. Generate each file sequentially with specialized guidance
    4. Validate integration between files
    5. Update agent state
    """
    agent_info_file = agent_dir / "agent_info.json"
    agent_files_dir = agent_dir / "files"
    agent_logs_dir = agent_dir / "logs"
    agent_files_dir.mkdir(exist_ok=True)
    agent_logs_dir.mkdir(exist_ok=True)

    task_title = task_info.get("title", "Untitled Task")
    task_description = task_info.get("description", "")
    generated_files_content = {}

    try:
        logging.info(f"[{agent_id}] Starting enhanced work for Block {block_id} (Marker: {marker_id})")

        # --- Step 1: Task Analysis ---
        logging.info(f"[{agent_id}] Step 1: Analyzing task requirements...")
        analysis_prompt = f"""
        As an expert software architect, analyze this task:
        
        Task Title: {task_title}
        Task Description: {task_description}
        
        Analyze the task by addressing:
        1. What type of project is this? (web app, game, script, API, etc.)
        2. Key features and requirements
        3. Technical components needed
        4. User interaction patterns
        5. Potential enhancements
        
        Be thorough in your analysis.
        """
        
        try:
            task_analysis = asyncio.run(llm_service.generate(
                llm_type='anthropic', prompt=analysis_prompt
            ))
            if task_analysis.startswith("Error:"):
                raise ValueError(f"LLM Analysis Error: {task_analysis}")
            logging.info(f"[{agent_id}] Task analysis completed")
            
        except Exception as analysis_err:
            logging.error(f"[{agent_id}] Error during task analysis: {analysis_err}", exc_info=True)
            (agent_logs_dir / "task_analysis_error.txt").write_text(
                f"Error: {analysis_err}\nPrompt:\n{analysis_prompt}\n"
                f"Response:\n{task_analysis if 'task_analysis' in locals() else 'N/A'}"
            )
            # Default analysis for recovery
            task_analysis = f"Implementation for: {task_title}. Requirements: {task_description}"

        # --- Step 2: Planning Files (with strict format enforcement) ---
        logging.info(f"[{agent_id}] Step 2: Planning files with strict format...")
        
        planning_prompt = f"""
        As an expert developer, plan the implementation for:
        
        Task Title: {task_title}
        Task Description: {task_description}
        
        Analysis: {task_analysis}
        
        Your response must follow this EXACT format:
        
        ARCHITECTURE:
        [Brief architecture description]
        
        FILES:
        1. filename1.ext - [purpose]
        2. filename2.ext - [purpose]
        [and so on]
        
        CRITICAL RULES:
        - In the FILES section, list ONLY filenames with extensions and brief descriptions
        - Each filename must be on its own line prefixed by a number
        - Each filename must include a valid extension
        - Do NOT include explanatory text like "You need to create:" or "The files are:"
        - Format each entry exactly as: NUMBER. FILENAME.EXT - DESCRIPTION
        """
        
        try:
            planning_response = asyncio.run(llm_service.generate(
                llm_type='anthropic', prompt=planning_prompt
            ))
            
            if planning_response.startswith("Error:"):
                raise ValueError(f"LLM Planning Error: {planning_response}")
            
            # Parse architecture and files sections
            architecture_section = ""
            files_section = ""
            
            if "ARCHITECTURE:" in planning_response and "FILES:" in planning_response:
                parts = planning_response.split("FILES:", 1)
                architecture_section = parts[0].replace("ARCHITECTURE:", "").strip()
                files_section = parts[1].strip()
            else:
                # Fallback if format is unexpected
                files_section = planning_response
            
            # Log raw response for debugging
            logging.debug(f"[{agent_id}] Raw planning response: {planning_response[:200]}...")
            logging.debug(f"[{agent_id}] Extracted files section: {files_section[:200]}...")
            
            # --- ROBUST FILENAME EXTRACTION ---
            filenames_to_create = []
            file_descriptions = {}
            
            # Method 1: Extract using pattern "NUMBER. FILENAME - DESCRIPTION"
            numbered_file_pattern = re.compile(r'^\s*\d+\.\s*([\w.-]+\.[a-zA-Z0-9]+)\s*-\s*(.*)$', re.MULTILINE)
            for match in numbered_file_pattern.finditer(files_section):
                raw_filename = match.group(1).strip()
                description = match.group(2).strip()
                
                # Sanitize filename
                clean_filename = raw_filename.strip().strip('\'"')
                clean_filename = re.sub(r'[\s\n\r\\/*?:"<>|]', '_', clean_filename)
                clean_filename = clean_filename.lstrip('./\\')
                
                if clean_filename and '.' in clean_filename:
                    filenames_to_create.append(clean_filename)
                    file_descriptions[clean_filename] = description
            
            # Method 2: Extract any strings that look like filenames with extensions
            if not filenames_to_create:
                logging.warning(f"[{agent_id}] Primary filename extraction failed, using fallback method")
                filename_pattern = re.compile(r'\b([\w.-]+\.[a-zA-Z0-9]+)\b')
                for match in filename_pattern.finditer(files_section):
                    raw_filename = match.group(1).strip()
                    
                    # Sanitize filename
                    clean_filename = raw_filename.strip().strip('\'"')
                    clean_filename = re.sub(r'[\s\n\r\\/*?:"<>|]', '_', clean_filename)
                    clean_filename = clean_filename.lstrip('./\\')
                    
                    if clean_filename and '.' in clean_filename:
                        filenames_to_create.append(clean_filename)
                        
                        # Try to extract description from line containing this filename
                        description = ""
                        for line in files_section.split('\n'):
                            if raw_filename in line and '-' in line:
                                parts = line.split('-', 1)
                                if len(parts) > 1:
                                    description = parts[1].strip()
                                    break
                        
                        file_descriptions[clean_filename] = description or "Implementation file"
            
            # Method 3: Emergency fallback - parse comma-separated list
            if not filenames_to_create:
                logging.warning(f"[{agent_id}] Secondary filename extraction failed, using emergency fallback")
                fallback_prompt = f"""
                Based on the task: "{task_title}: {task_description}"
                
                List ONLY the filenames needed (with extensions) as a comma-separated list.
                For example: index.html, styles.css, script.js
                
                Do not include any other text in your response.
                """
                
                fallback_response = asyncio.run(llm_service.generate(
                    llm_type='anthropic', prompt=fallback_prompt
                ))
                
                for name in fallback_response.split(','):
                    clean_name = name.strip().strip('\'"')
                    clean_name = re.sub(r'[\s\n\r\\/*?:"<>|]', '_', clean_name)
                    clean_name = clean_name.lstrip('./\\')
                    
                    if clean_name and '.' in clean_name:
                        filenames_to_create.append(clean_name)
                        file_descriptions[clean_name] = "Implementation file"
            
            # Final validation - ensure we have valid files to create
            filenames_to_create = list(dict.fromkeys(filenames_to_create))  # Remove duplicates
            
            if not filenames_to_create:
                # Last resort - create default files based on task keywords
                logging.warning(f"[{agent_id}] All extraction methods failed, creating default files")
                
                if any(kw in task_title.lower() + task_description.lower() 
                       for kw in ['web', 'website', 'html', 'page']):
                    filenames_to_create = ['index.html', 'styles.css', 'script.js']
                elif any(kw in task_title.lower() + task_description.lower() 
                         for kw in ['python', 'script', 'automation']):
                    filenames_to_create = ['main.py', 'README.md']
                else:
                    filenames_to_create = ['main.txt', 'README.md']
                
                file_descriptions = {f: "Default implementation file" for f in filenames_to_create}
            
            logging.info(f"[{agent_id}] Final planned files: {filenames_to_create}")
            
        except Exception as planning_err:
            logging.error(f"[{agent_id}] Error during file planning: {planning_err}", exc_info=True)
            (agent_logs_dir / "planning_error.txt").write_text(
                f"Error: {planning_err}\nPrompt:\n{planning_prompt}\n"
                f"Response:\n{planning_response if 'planning_response' in locals() else 'N/A'}"
            )
            
            # Emergency fallback file planning
            filenames_to_create = ['index.html', 'styles.css', 'script.js'] if 'web' in task_title.lower() else ['main.py', 'README.md']
            file_descriptions = {f: "Emergency fallback file" for f in filenames_to_create}
            architecture_section = f"Emergency implementation for {task_title}"
        
        # Optional: Clear previous files
        for item in agent_files_dir.glob('*'):
            if item.is_file():
                logging.debug(f"[{agent_id}] Clearing old file: {item.name}")
                item.unlink()
        
        # --- Step 3: Determine optimal file generation order ---
        logging.info(f"[{agent_id}] Step 3: Determining optimal file generation order...")
        
        # Smart file priority ordering
        file_generation_order = []
        
        # Config files first
        config_patterns = ['.config', '.json', '.yaml', '.yml', '.toml', '.ini', 'config', 'settings']
        for filename in filenames_to_create:
            if any(pattern in filename.lower() for pattern in config_patterns) and filename not in file_generation_order:
                file_generation_order.append(filename)
        
        # HTML files before CSS and JS
        html_files = [f for f in filenames_to_create if f.lower().endswith(('.html', '.htm')) and f not in file_generation_order]
        file_generation_order.extend(html_files)
        
        # CSS files before JS
        css_files = [f for f in filenames_to_create if f.lower().endswith('.css') and f not in file_generation_order]
        file_generation_order.extend(css_files)
        
        # Core/main files next
        core_patterns = ['main', 'app', 'index', 'core', 'engine']
        for filename in filenames_to_create:
            if any(pattern in filename.lower() for pattern in core_patterns) and filename not in file_generation_order:
                file_generation_order.append(filename)
        
        # Add remaining files
        for filename in filenames_to_create:
            if filename not in file_generation_order:
                file_generation_order.append(filename)
        
        logging.info(f"[{agent_id}] Optimized generation order: {file_generation_order}")
        
        # --- Step 4: Generate Files Sequentially ---
        logging.info(f"[{agent_id}] Step 4: Generating {len(file_generation_order)} files...")
        
        for filename in file_generation_order:
            logging.info(f"[{agent_id}] Generating file: {filename}...")
            
            # Final validation before generation
            if not re.match(r'^[\w./_-]+$', filename):
                logging.warning(f"[{agent_id}] Filename '{filename}' contains invalid characters. Skipping.")
                continue
            
            file_extension = os.path.splitext(filename)[1].lower() if '.' in filename else ''
            file_description = file_descriptions.get(filename, "")
            
            # Select relevant context files (at most 5)
            relevant_files = {}
            
            # First priority: Files with same extension
            for ctx_filename, ctx_content in generated_files_content.items():
                if os.path.splitext(ctx_filename)[1].lower() == file_extension:
                    relevant_files[ctx_filename] = ctx_content
                    if len(relevant_files) >= 3:
                        break
                        
            # Second priority: Include HTML for JS/CSS files and vice versa
            if file_extension in ['.js', '.css'] and len(relevant_files) < 5:
                for ctx_filename, ctx_content in generated_files_content.items():
                    if ctx_filename.lower().endswith(('.html', '.htm')) and ctx_filename not in relevant_files:
                        relevant_files[ctx_filename] = ctx_content
                        if len(relevant_files) >= 5:
                            break
                            
            elif file_extension in ['.html', '.htm'] and len(relevant_files) < 5:
                for ctx_filename, ctx_content in generated_files_content.items():
                    if ctx_filename.lower().endswith(('.js', '.css')) and ctx_filename not in relevant_files:
                        relevant_files[ctx_filename] = ctx_content
                        if len(relevant_files) >= 5:
                            break
            
            # Build context from relevant files
            context_str = ""
            if relevant_files:
                context_str = "Existing project files for context:\n\n"
                for ctx_filename, ctx_content in relevant_files.items():
                    context_str += f"--- BEGIN {ctx_filename} ---\n{ctx_content}\n--- END {ctx_filename} ---\n\n"
            
            # File type-specific guidance
            file_type_guidance = ""
            if file_extension in ['.html', '.htm']:
                file_type_guidance = """
                HTML Guidelines:
                - Use proper DOCTYPE, html, head, and body tags
                - Include viewport meta tag for responsive design
                - Link to CSS files with correct relative paths
                - Reference JS files with correct relative paths
                - Use semantic HTML5 elements where appropriate
                - Ensure forms have proper action and method attributes
                - Include complete, functional implementation
                """
            elif file_extension == '.css':
                file_type_guidance = """
                CSS Guidelines:
                - Include responsive design with media queries
                - Use consistent class naming convention
                - Organize by component/section
                - Define appropriate hover/active states
                - Include complete, well-commented styles
                """
            elif file_extension in ['.js', '.jsx', '.ts', '.tsx']:
                file_type_guidance = """
                JavaScript Guidelines:
                - Include proper event handling
                - Use modern JS syntax and best practices
                - Implement proper form validation if needed
                - Ensure correct element selectors 
                - Handle errors appropriately
                - Use correct relative paths for any resources
                - Implement all required functionality completely
                """
            elif file_extension == '.py':
                file_type_guidance = """
                Python Guidelines:
                - Follow PEP 8 style
                - Include proper imports
                - Add docstrings and comments
                - Handle exceptions appropriately
                - Implement complete functionality
                """
            
            # Create specialized prompt for file generation
            generation_prompt = f"""
            You are an expert developer implementing a {file_extension} file for:
            
            Task: {task_title}
            Description: {task_description}
            
            File to create: {filename}
            Purpose: {file_description}
            
            {file_type_guidance}
            
            {context_str}
            
            IMPORTANT:
            1. Generate COMPLETE, PRODUCTION-READY code for {filename}
            2. Ensure proper integration with other project files
            3. Include appropriate comments
            4. Use CORRECT RELATIVE PATHS when linking to other files
            5. Implement ALL required functionality
            6. Do not include placeholders or TODOs
            
            RESPOND WITH ONLY THE RAW FILE CONTENT.
            No markdown formatting, no ```code blocks```, no explanations.
            """
            
            try:
                file_content = asyncio.run(llm_service.generate(
                    llm_type='anthropic', prompt=generation_prompt
                ))
                
                if file_content.startswith("Error:"):
                    raise ValueError(f"LLM Generation Error: {file_content}")
                
                # Remove markdown code block formatting if present
                if file_content.startswith("```") and "```" in file_content[3:]:
                    # Handle code blocks with or without language specification
                    if file_content.endswith("```"):
                        # Complete code block with closing ticks
                        content_lines = file_content.split('\n')
                        if len(content_lines) >= 2:
                            # Skip first line (opening ticks) and last line (closing ticks)
                            file_content = '\n'.join(content_lines[1:-1])
                    else:
                        # Code block without proper closing or with text after
                        parts = file_content.split("```", 2)
                        if len(parts) >= 3:
                            file_content = parts[1].strip()
                            # If the second part is just a language identifier with no content
                            if not file_content or len(file_content.split('\n', 1)) <= 1:
                                file_content = parts[2].strip()
                
                # Ensure directory exists for nested paths
                if '/' in filename:
                    dir_path = agent_files_dir / os.path.dirname(filename)
                    dir_path.mkdir(parents=True, exist_ok=True)
                
                # Write the file
                file_path = agent_files_dir / filename
                with open(file_path, "w", encoding='utf-8') as f:
                    f.write(file_content)
                
                logging.info(f"[{agent_id}] Successfully created file: {filename}")
                generated_files_content[filename] = file_content
                
            except Exception as gen_err:
                logging.error(f"[{agent_id}] Error generating file {filename}: {gen_err}", exc_info=True)
                (agent_logs_dir / f"generation_error_{filename}.txt").write_text(
                    f"Error: {gen_err}\nPrompt:\n{generation_prompt}\n"
                    f"Response:\n{file_content if 'file_content' in locals() else 'N/A'}"
                )
                
                # Recovery attempt with simpler prompt
                try:
                    logging.info(f"[{agent_id}] Attempting recovery generation for {filename}...")
                    recovery_prompt = f"""
                    Generate ONLY the content for file {filename} for a project that implements:
                    {task_title}: {task_description}
                    
                    Return ONLY the raw file content with no explanations or markdown formatting.
                    """
                    
                    recovery_content = asyncio.run(llm_service.generate(
                        llm_type='anthropic', prompt=recovery_prompt
                    ))
                    
                    if not recovery_content.startswith("Error:"):
                        # Remove markdown if present
                        if recovery_content.startswith("```") and "```" in recovery_content[3:]:
                            if recovery_content.endswith("```"):
                                content_lines = recovery_content.split('\n')
                                recovery_content = '\n'.join(content_lines[1:-1])
                            else:
                                parts = recovery_content.split("```", 2)
                                if len(parts) >= 3:
                                    recovery_content = parts[1].strip() or parts[2].strip()
                        
                        # Write the recovery file
                        file_path = agent_files_dir / filename
                        with open(file_path, "w", encoding='utf-8') as f:
                            f.write(recovery_content)
                        
                        logging.info(f"[{agent_id}] Recovery successful for {filename}")
                        generated_files_content[filename] = recovery_content
                    
                except Exception as recovery_err:
                    logging.error(f"[{agent_id}] Recovery generation also failed: {recovery_err}", exc_info=True)
                    # Continue with other files
        
        # --- Step 5: Validate integration between files ---
        if len(generated_files_content) > 1:
            logging.info(f"[{agent_id}] Step 5: Validating integration between files...")
            
            # Select representative files for validation (max 3-5 to keep context size manageable)
            validation_files = {}
            
            # Priority for web files when present
            for ext in ['.html', '.htm', '.js', '.css']:
                for fname, content in generated_files_content.items():
                    if fname.lower().endswith(ext) and len(validation_files) < 5:
                        validation_files[fname] = content
            
            # Add main implementation files if needed
            if len(validation_files) < 3:
                for pattern in ['main', 'index', 'app']:
                    for fname, content in generated_files_content.items():
                        if pattern in fname.lower() and fname not in validation_files and len(validation_files) < 5:
                            validation_files[fname] = content
            
            # Build validation context
            validation_context = ""
            for fname, content in validation_files.items():
                validation_context += f"--- {fname} ---\n{content}\n\n"
            
            # Create list of all files for reference
            all_files_list = "\n".join([f"- {fname}" for fname in generated_files_content.keys()])
            
            validation_prompt = f"""
            As a QA engineer, validate the integration between these files:
            
            Task: {task_title}
            Description: {task_description}
            
            All project files:
            {all_files_list}
            
            Selected file contents for review:
            {validation_context}
            
            Check for:
            1. Incorrect file paths or references between files
            2. Missing functionality
            3. Inconsistent naming conventions
            4. Integration issues between components
            
            For each issue, specify the affected file(s) and exact problem.
            If no issues are found, state "No integration issues found."
            """
            
            try:
                validation_response = asyncio.run(llm_service.generate(
                    llm_type='anthropic', prompt=validation_prompt
                ))
                
                logging.info(f"[{agent_id}] Integration validation completed")
                
                # Fix integration issues if found
                if "No integration issues found" not in validation_response and not validation_response.startswith("Error:"):
                    logging.info(f"[{agent_id}] Fixing integration issues...")
                    
                    # Extract files that need fixes
                    files_to_fix = set()
                    for filename in generated_files_content.keys():
                        if filename in validation_response:
                            files_to_fix.add(filename)
                    
                    # Fix each file
                    for filename in files_to_fix:
                        original_content = generated_files_content[filename]
                        
                        fix_prompt = f"""
                        Fix this file to resolve integration issues:
                        
                        File: {filename}
                        
                        Current content:
                        {original_content}
                        
                        Issues identified:
                        {validation_response}
                        
                        Return ONLY the fixed file content with no explanations.
                        """
                        
                        try:
                            fixed_content = asyncio.run(llm_service.generate(
                                llm_type='anthropic', prompt=fix_prompt
                            ))
                            
                            if not fixed_content.startswith("Error:"):
                                # Remove markdown if present
                                if fixed_content.startswith("```") and "```" in fixed_content[3:]:
                                    if fixed_content.endswith("```"):
                                        content_lines = fixed_content.split('\n')
                                        fixed_content = '\n'.join(content_lines[1:-1])
                                    else:
                                        parts = fixed_content.split("```", 2)
                                        if len(parts) >= 3:
                                            fixed_content = parts[1].strip() or parts[2].strip()
                                
                                # Write the fixed file
                                file_path = agent_files_dir / filename
                                with open(file_path, "w", encoding='utf-8') as f:
                                    f.write(fixed_content)
                                
                                logging.info(f"[{agent_id}] Fixed integration issues in: {filename}")
                                generated_files_content[filename] = fixed_content
                            
                        except Exception as fix_err:
                            logging.error(f"[{agent_id}] Error fixing {filename}: {fix_err}", exc_info=True)
                            # Continue with other files
                
            except Exception as validation_err:
                logging.error(f"[{agent_id}] Validation error: {validation_err}", exc_info=True)
                # Continue even if validation fails
        
        # --- Step 6: Generate README.md if needed ---
        if "README.md" not in generated_files_content and len(generated_files_content) > 0:
            logging.info(f"[{agent_id}] Step 6: Generating README.md...")
            
            readme_prompt = f"""
            Create a README.md file for this project:
            
            Project: {task_title}
            Description: {task_description}
            
            Files included:
            {', '.join(generated_files_content.keys())}
            
            Include:
            1. Project title and overview
            2. Features and functionality
            3. Installation/setup instructions
            4. Usage guide
            5. File structure explanation
            
            Format as a well-structured Markdown document.
            """
            
            try:
                readme_content = asyncio.run(llm_service.generate(
                    llm_type='anthropic', prompt=readme_prompt
                ))
                
                if not readme_content.startswith("Error:"):
                    # Save README.md
                    readme_path = agent_files_dir / "README.md"
                    with open(readme_path, "w", encoding='utf-8') as f:
                        f.write(readme_content)
                    
                    logging.info(f"[{agent_id}] Successfully created README.md")
                    generated_files_content["README.md"] = readme_content
                
            except Exception as readme_err:
                logging.error(f"[{agent_id}] Error generating README: {readme_err}", exc_info=True)
                # Continue without README if it fails
        
        # --- Step 7: Signal completion ---
        logging.info(f"[{agent_id}] Successfully completed work for Block {block_id}")
        
        if agent_info_file.exists():
            with open(agent_info_file, "r+") as f:
                agent_data = json.load(f)
                agent_data["state"] = "finished_work"
                agent_data["completed_marker_id"] = marker_id
                f.seek(0)
                json.dump(agent_data, f, indent=2)
                f.truncate()
            logging.info(f"[{agent_id}] Agent state updated to 'finished_work'")
        else:
            logging.error(f"[{agent_id}] Agent info file missing! Cannot update state.")
            
    except Exception as e:
        # General error handling for the whole process
        logging.error(f"[{agent_id}] Critical error during work: {e}", exc_info=True)
        if agent_info_file.exists():
            try:
                with open(agent_info_file, "r+") as f:
                    agent_data = json.load(f)
                    agent_data["state"] = "error"
                    agent_data["assigned_block_id"] = block_id
                    agent_data["source_block_title"] = f"Error processing: {task_title}"
                    agent_data["completed_marker_id"] = None
                    f.seek(0)
                    json.dump(agent_data, f, indent=2)
                    f.truncate()
                logging.info(f"[{agent_id}] Agent state set to 'error'")
            except Exception as e_update:
                logging.error(f"[{agent_id}] Failed to update agent state to error: {e_update}")