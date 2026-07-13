# Universal AI Agent Connector 🔗

![Universal AI Connector UI](frontend/public/window.svg)

A standalone, completely universal AI integration and orchestration platform. Build dynamic multi-agent pipelines linking *any* open API, custom webhook, or 3rd-party SaaS using natural language payload translation!

## Features 🚀

- **Universal Agent Registry**: Instantly register any API on the web as an execution node. Supports custom Auth headers and schema hints.
- **Dynamic Payload Mapping**: Instead of manually writing data mappers, this platform uses LiteLLM to dynamically map and translate the JSON payload from one API into the exact format requested by the next API.
- **Pipeline Builder**: A clean linear UI to visually construct and execute API sequences.
- **Asynchronous Execution Engine**: Robust background engine powered by FastAPI and SQLAlchemy that gracefully handles API timeouts, polling, and payload errors.

## Tech Stack 🛠️

**Backend**
- Python 3.12+
- FastAPI & Uvicorn (REST API & Background Workers)
- SQLite & SQLAlchemy (Database)
- LiteLLM (Universal LLM Router for Payload Translation)
- HTTPX (Async HTTP execution)

**Frontend**
- Next.js 15
- React 19
- Tailwind CSS
- Fetch API (Polling Engine)

## Setup Instructions 💻

### 1. Start the Backend
```bash
cd backend
python -m venv venv

# On Windows
.\venv\Scripts\activate

# On Mac/Linux
source venv/bin/activate

pip install fastapi uvicorn litellm httpx sqlalchemy pydantic cors
uvicorn server:app --port 8000
```

### 2. Start the Frontend
```bash
cd frontend
npm install
npm run dev
```

Navigate to `http://localhost:3000` to access the Universal Connector Dashboard!

## How it works

1. **Register** `Agent A` (e.g. A Lead Scraper Webhook) and `Agent B` (e.g. A Slack Notification Webhook).
2. **Build a Pipeline** linking A to B.
3. Provide a mapping instruction: *"Extract the user's name from Agent A and put it in a field called 'text' for Agent B."*
4. Execute! The platform calls Agent A, passes the output to the LLM mapper, dynamically builds the JSON for Agent B, and fires the final webhook!

---
*Created by [Shivay00001](https://github.com/Shivay00001)*
