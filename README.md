# CompanyRTS – Multi-Agent Block Workflow Simulator

## Overview

CompanyRTS is a workflow simulation platform where multiple agents (developers and QA) collaborate to complete coding and testing tasks. The backend is built with Flask and supports agent management, block/task management, zone layout, and integration with LLM services (OpenAI, Gemini, Anthropic) for code generation and automated QA.

## Features

- **Agent Management:** Spawn, move, and delete agents (developer or QA). Each agent has its own state and position.
- **Block Management:** Create, update, and delete task blocks. Each block represents a coding or testing task.
- **Zone Layout:** Define and update finish zones and drop-off zones for agent workflows. Zones are stored in `output/layout/zones.json`.
- **Automated Workflow:** Agents can be assigned to blocks, perform work (code generation or QA), and move to appropriate zones upon completion.
- **LLM Integration:** Supports multiple LLM providers for code and QA automation.
- **Frontend Integration:** Static files in `static/` and main UI in `templates/index.html`.

## Project Structure

```
.
├── app.py                # Main Flask backend, API endpoints
├── developer_agent.py    # Developer agent logic (code generation, movement)
├── qa_agent.py           # QA agent logic (testing, validation, movement)
├── llm_service.py        # LLM service integration (OpenAI, Gemini, Anthropic)
├── core/
│   ├── agent.py          # Agent utilities
│   ├── blocks.py         # Block utilities
│   ├── qa.py             # QA utilities
│   └── utils.py          # Shared utilities
├── static/               # Frontend JS/CSS
├── templates/
│   └── index.html        # Main UI
├── output/
│   ├── agents/           # Agent data
│   ├── blocks/           # Block data
│   ├── final_zips/       # QA output archives
│   └── layout/           # Zone layouts (zones.json)
├── .env                  # API keys for LLMs
└── README.md             # (This file)
```

## Quick Start

1. **Install Python 3.10+ and pip**
2. **Install dependencies:**
   ```bash
   pip install flask
   ```
3. **Create a `.env` file with your API keys:**
   ```
   GOOGLE_API_KEY=your_google_key
   OPENAI_API_KEY=your_openai_key
   ANTHROPIC_API_KEY=your_anthropic_key
   ```
4. **Run the server:**
   ```bash
   python app.py
   ```
5. **Open your browser at:**  
   [http://localhost:5000](http://localhost:5000)

## API Endpoints

- `GET /state` – Get current state (blocks, agents, zones)
- `POST /agents` – Spawn a new agent (developer or QA)
- `DELETE /agents/<agent_id>` – Delete an agent
- `POST /agents/<agent_id>/move` – Move an agent to a new position
- `POST /agents/<agent_id>/interrogate` – Assign a block to a developer agent and start work
- `POST /agents/<agent_id>/complete_and_move` – Move developer agent to a finish zone after work
- `POST /agents/<agent_id>/start_qa` – Assign a developer's completed task to a QA agent
- `POST /agents/<agent_id>/complete_qa_and_move` – Move QA agent to a drop-off zone after QA
- `GET/POST /blocks` – List or save blocks
- `POST /zones` – Save updated zone positions

## Notes

- **Do not use Flask's built-in server for production.** Use Gunicorn or Uvicorn for deployment.
- **Background work is handled via threads.** Agent state is updated asynchronously.
- **Zone layout is customizable** via the frontend or by editing `output/layout/zones.json`.

## License

This project is licensed under the [MIT License](LICENSE).
