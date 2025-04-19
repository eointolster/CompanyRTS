# import os
# from pathlib import Path
# import re
# import time
# import logging

# # Set up a logger for file operations
# logger = logging.getLogger(__name__)
# if not logger.hasHandlers():
#     handler = logging.StreamHandler()
#     handler.setFormatter(logging.Formatter("%(asctime)s - %(levelname)s - %(name)s - %(message)s"))
#     logger.addHandler(handler)
#     logger.setLevel(logging.INFO)


# def safe_mkdir(dir_path: Path) -> None:
#     """
#     Create a directory (and parents) if it doesn't exist.
#     """
#     try:
#         dir_path.mkdir(parents=True, exist_ok=True)
#         logger.debug(f"Created directory: {dir_path}")
#     except Exception as e:
#         logger.error(f"Failed to create directory {dir_path}: {e}")


# def safe_write_text(file_path: Path, content: str, encoding: str = 'utf-8') -> None:
#     """
#     Atomically write text content to a file, creating parent dirs if needed.
#     """
#     try:
#         file_path.parent.mkdir(parents=True, exist_ok=True)
#         temp_path = file_path.with_suffix(file_path.suffix + '.tmp')
#         temp_path.write_text(content, encoding=encoding)
#         os.replace(temp_path, file_path)
#         logger.info(f"Wrote file: {file_path}")
#     except Exception as e:
#         logger.error(f"Failed to write file {file_path}: {e}")


# def safe_title_for_dir(title: str) -> str:
#     """
#     Sanitize a title string to be safe for use as a directory name.
#     """
#     sanitized = re.sub(r'[^a-zA-Z0-9_-]', '_', title.strip().replace(' ', '_'))
#     return sanitized.rstrip('_')


# def log_agent_step(agent_dir: Path, step: str, msg: str) -> None:
#     """
#     Write a timestamped log of an agent's step into the agent's logs directory.
#     """
#     try:
#         logs_dir = agent_dir / 'logs'
#         safe_mkdir(logs_dir)
#         timestamp = time.strftime('%Y%m%d_%H%M%S')
#         filename = f"step_{timestamp}_{step.replace(' ', '_').lower()}.txt"
#         path = logs_dir / filename
#         path.write_text(f"{time.ctime()}\n{step}: {msg}\n", encoding='utf-8')
#         logger.debug(f"Logged agent step to {path}")
#     except Exception as e:
#         logger.error(f"Failed to log agent step for {agent_dir} (step={step}): {e}")


import re
import time
import logging
from pathlib import Path
from typing import Any

# Module-level logger for utilities
debug_logger = logging.getLogger(__name__)
debug_logger.setLevel(logging.INFO)


def safe_mkdir(path: Path) -> None:
    """
    Ensure a directory exists, creating any necessary parent directories.
    """
    path.mkdir(parents=True, exist_ok=True)


def safe_title_for_dir(title: str) -> str:
    """
    Sanitize a string so it is safe for use as a file or directory name.
    Replaces invalid characters and spaces with underscores.
    """
    sanitized = re.sub(r'[^a-zA-Z0-9_-]', '_', title.strip().replace(' ', '_'))
    return sanitized.rstrip('_')


def log_agent_step(agent_dir: Path, step: str, msg: str) -> None:
    """
    Write a timestamped step log into the agent's logs directory.

    Log files are named stepNN_<step_slug>.txt in chronological order.
    """
    logs_dir = agent_dir / "logs"
    safe_mkdir(logs_dir)

    # Determine next file index
    existing = list(logs_dir.glob("step*_*.txt"))
    idx = len(existing) + 1

    # Create a filesystem-safe slug for the step name
    step_slug = re.sub(r'[^a-zA-Z0-9]', '_', step.lower())

    fname = logs_dir / f"step{idx:02d}_{step_slug}.txt"
    timestamp = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime())

    try:
        with open(fname, 'w', encoding='utf-8') as f:
            f.write(f"{timestamp} - {step}: {msg}\n")
    except Exception as e:
        debug_logger.error(f"Failed to write agent step log '{fname}': {e}")

# ///////////////////////////

# import os
# from pathlib import Path
# import re
# import time

# def safe_mkdir(dir: Path):
#     dir.mkdir(parents=True, exist_ok=True)

# def safe_title_for_dir(title: str) -> str:
#     # Sanitizes title as safe directory name
#     return re.sub(r'[^a-zA-Z0-9_-]', '_', title.replace(" ", "_")).rstrip('_')

# def log_agent_step(agent_dir: Path, step: str, msg: str):
#     logs_dir = agent_dir / "logs"
#     logs_dir.mkdir(exist_ok=True)
#     idx = len(list(logs_dir.glob("step*.txt"))) + 1
#     fname = logs_dir / f"step{idx:02d}_{step.lower()}.txt"
#     with open(fname, "w") as f:
#         f.write(f"{time.ctime()}\n{step}: {msg}\n")