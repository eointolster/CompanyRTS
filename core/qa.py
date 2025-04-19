import random
from pathlib import Path
from .utils import log_agent_step

def qa_review(agent_dir: Path) -> tuple[str, str | None]:
    """
    Simulate QA review, with PASS or SUGGESTION.
    """
    suggestion = "[Suggestion] Add more content/detail to the main file."
    pass_file = agent_dir / "pass.txt"
    suggestion_file = agent_dir / "suggestion.txt"

    if random.random() < 0.66:
        # PASS
        pass_file.write_text("PASS")
        if suggestion_file.exists():
            suggestion_file.unlink()
        log_agent_step(agent_dir, "QA", "QA PASS")
        return "PASS", None
    else:
        # SUGGESTION
        suggestion_file.write_text(suggestion)
        if pass_file.exists():
            pass_file.unlink()
        log_agent_step(agent_dir, "QA", suggestion)
        return "SUGGESTION", suggestion