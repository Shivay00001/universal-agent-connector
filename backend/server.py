import asyncio
import httpx
import json
import uuid
import litellm
from fastapi import FastAPI, Depends, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from database import Base, engine, get_db, AgentRegistry, Workflow, Execution
from pydantic import BaseModel

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Universal AI Agent Connector")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Models ---
class AgentCreate(BaseModel):
    name: str
    description: str = ""
    endpoint: str
    headers: dict = {}
    schema_hint: str = ""

class WorkflowCreate(BaseModel):
    name: str
    nodes: list
    edges: list

class ExecuteRequest(BaseModel):
    initial_payload: dict
    llm_api_key: str
    llm_model: str = "openai/gpt-4o"

# --- Registry Endpoints ---
@app.get("/api/registry")
def list_agents(db: Session = Depends(get_db)):
    return db.query(AgentRegistry).all()

@app.post("/api/registry")
def create_agent(agent: AgentCreate, db: Session = Depends(get_db)):
    db_agent = AgentRegistry(
        id=str(uuid.uuid4()),
        name=agent.name,
        description=agent.description,
        endpoint=agent.endpoint,
        headers=agent.headers,
        schema_hint=agent.schema_hint
    )
    db.add(db_agent)
    db.commit()
    db.refresh(db_agent)
    return {"id": db_agent.id, "name": db_agent.name}

@app.delete("/api/registry/{agent_id}")
def delete_agent(agent_id: str, db: Session = Depends(get_db)):
    db.query(AgentRegistry).filter(AgentRegistry.id == agent_id).delete()
    db.commit()
    return {"status": "deleted"}

# --- Workflow Endpoints ---
@app.get("/api/workflows")
def list_workflows(db: Session = Depends(get_db)):
    return db.query(Workflow).all()

@app.post("/api/workflows")
def create_workflow(wf: WorkflowCreate, db: Session = Depends(get_db)):
    db_wf = Workflow(
        id=str(uuid.uuid4()),
        name=wf.name,
        nodes=wf.nodes,
        edges=wf.edges
    )
    db.add(db_wf)
    db.commit()
    db.refresh(db_wf)
    return {"id": db_wf.id, "name": db_wf.name}

# --- Universal Orchestration Engine ---
async def execute_node(client: httpx.AsyncClient, agent: AgentRegistry, payload: dict) -> dict:
    # Universal HTTP caller
    try:
        req_payload = payload
        resp = await client.post(
            agent.endpoint,
            headers=agent.headers,
            json=req_payload,
            timeout=120.0
        )
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        return {"error": str(e)}

async def map_payload_via_llm(previous_output: dict, mapping_prompt: str, llm_model: str, llm_api_key: str) -> dict:
    if not mapping_prompt:
        return previous_output

    system_msg = "You are a payload translator. Output ONLY valid JSON containing the mapped fields. No markdown formatting."
    user_msg = f"Mapping instruction: {mapping_prompt}\n\nInput Payload:\n{json.dumps(previous_output)}"
    
    try:
        response = litellm.completion(
            model=llm_model,
            api_key=llm_api_key,
            messages=[
                {"role": "system", "content": system_msg},
                {"role": "user", "content": user_msg}
            ]
        )
        content = response.choices[0].message.content.strip()
        if content.startswith("```json"):
            content = content.replace("```json", "").replace("```", "").strip()
        
        return json.loads(content)
    except Exception as e:
        print(f"LLM Mapping Error: {e}")
        return previous_output

async def run_universal_pipeline(exec_id: str, workflow_id: str, initial_payload: dict, llm_key: str, llm_model: str):
    db = next(get_db())
    execution = db.query(Execution).filter(Execution.id == exec_id).first()
    wf = db.query(Workflow).filter(Workflow.id == workflow_id).first()
    
    if not wf or not execution:
        return

    current_payload = initial_payload
    logs = []
    
    async with httpx.AsyncClient() as client:
        for node_id in wf.nodes:
            execution.current_node = node_id
            db.commit()

            # Find agent details
            agent = db.query(AgentRegistry).filter(AgentRegistry.id == node_id).first()
            if not agent:
                logs.append(f"Agent {node_id} not found in registry.")
                break

            logs.append(f"Executing Agent: {agent.name} at {agent.endpoint}")
            
            # Execute agent
            node_output = await execute_node(client, agent, current_payload)
            logs.append(f"Result from {agent.name}: {json.dumps(node_output)}")
            
            # Find next edge to map payload
            next_edge = next((e for e in wf.edges if e.get("source") == node_id), None)
            
            if next_edge and next_edge.get("target"):
                # Run LLM Mapping
                logs.append(f"Running LLM Translation mapping -> {next_edge.get('target')}...")
                current_payload = await map_payload_via_llm(
                    node_output,
                    next_edge.get("mapping_prompt", ""),
                    llm_model,
                    llm_key
                )
                logs.append(f"Mapped Payload: {json.dumps(current_payload)}")
            else:
                current_payload = node_output
                
            execution.payload = current_payload
            execution.logs = logs
            db.commit()

    execution.status = "success"
    db.commit()

@app.post("/api/execute/{workflow_id}")
async def execute_workflow(workflow_id: str, req: ExecuteRequest, bg_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    wf = db.query(Workflow).filter(Workflow.id == workflow_id).first()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")
        
    exec_id = str(uuid.uuid4())
    execution = Execution(
        id=exec_id,
        workflow_id=workflow_id,
        status="running",
        payload=req.initial_payload,
        logs=[]
    )
    db.add(execution)
    db.commit()
    
    bg_tasks.add_task(
        run_universal_pipeline,
        exec_id,
        workflow_id,
        req.initial_payload,
        req.llm_api_key,
        req.llm_model
    )
    return {"execution_id": exec_id}

@app.get("/api/executions/{exec_id}")
def get_execution(exec_id: str, db: Session = Depends(get_db)):
    execution = db.query(Execution).filter(Execution.id == exec_id).first()
    if not execution:
        raise HTTPException(status_code=404, detail="Not found")
    return execution
