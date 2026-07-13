from sqlalchemy import create_engine, Column, String, Integer, JSON
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = "sqlite:///./universal.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# To store external agent configurations
class AgentRegistry(Base):
    __tablename__ = "agent_registry"
    id = Column(String, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(String)
    endpoint = Column(String)  # Webhook or REST endpoint
    headers = Column(JSON, default={}) # API keys / Auth Headers
    schema_hint = Column(String) # E.g. {"input_key": "prompt", "output_key": "data"}

# To store pipeline logic
class Workflow(Base):
    __tablename__ = "workflows"
    id = Column(String, primary_key=True, index=True)
    name = Column(String)
    nodes = Column(JSON)      # Array of Agent IDs
    edges = Column(JSON)      # Array of {source, target, mapping_prompt}

# To track running pipelines
class Execution(Base):
    __tablename__ = "executions"
    id = Column(String, primary_key=True, index=True)
    workflow_id = Column(String, index=True)
    status = Column(String)   # running, success, failed
    current_node = Column(String)
    payload = Column(JSON)    # Data passing between nodes
    logs = Column(JSON, default=[])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
