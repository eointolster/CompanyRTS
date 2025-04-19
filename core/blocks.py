import json
import uuid
from pathlib import Path

BLOCKS_DIR = Path("output") / "blocks"
BLOCKS_DIR.mkdir(parents=True, exist_ok=True)

def create_block(title: str, description: str) -> Path:
    """
    Create a new task block in the gameboard.
    Returns the Path to the block JSON file.
    """
    block_id = f"block_{uuid.uuid4().hex[:6]}"
    block_data = {
        "block_id": block_id,
        "title": title,
        "description": description,
        "owner": "user",
        "status": "pending"
    }
    block_path = BLOCKS_DIR / f"{block_id}.json"
    with open(block_path, 'w') as f:
        json.dump(block_data, f, indent=2)
    return block_path

def get_all_blocks():
    """
    Returns a list of all blocks with their path and data.
    """
    blocks = []
    for item in BLOCKS_DIR.iterdir():
        if item.is_file() and item.suffix == '.json':
            try:
                with open(item, 'r') as f:
                    data = json.load(f)
                    blocks.append((item, data))
            except Exception:
                continue
    return blocks

def find_pending_block() -> Path | None:
    """
    Returns the Path to the first available pending block (else None).
    """
    for path, data in get_all_blocks():
        if data.get("status") == "pending":
            return path
    return None

def mark_block_taken(block_path: Path, agent_id: str):
    """
    Mark the block as taken by an agent (status and agent_id).
    """
    with open(block_path, 'r+') as f:
        data = json.load(f)
        data["status"] = "taken"
        data["agent_id"] = agent_id
        f.seek(0)
        json.dump(data, f, indent=2)
        f.truncate()

def read_block(block_path: Path):
    with open(block_path, 'r') as f:
        return json.load(f)