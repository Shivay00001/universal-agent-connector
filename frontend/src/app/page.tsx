"use client";

import { useState, useEffect } from "react";

export default function Home() {
  const [agents, setAgents] = useState<any[]>([]);
  const [workflows, setWorkflows] = useState<any[]>([]);
  
  const [activeTab, setActiveTab] = useState("registry");
  
  // New Agent Form
  const [newAgent, setNewAgent] = useState({ name: "", endpoint: "", description: "" });
  
  // New Workflow Form
  const [newWf, setNewWf] = useState({ name: "", nodes: [], edges: [] });
  const [selectedAgent, setSelectedAgent] = useState("");

  const fetchAgents = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/registry");
      if (res.ok) {
        setAgents(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchWorkflows = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/workflows");
      if (res.ok) {
        setWorkflows(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchAgents();
    fetchWorkflows();
  }, []);

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("http://127.0.0.1:8000/api/registry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAgent)
      });
      if (res.ok) {
        setNewAgent({ name: "", endpoint: "", description: "" });
        fetchAgents();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const addNodeToWf = () => {
    if (!selectedAgent) return;
    setNewWf({
      ...newWf,
      nodes: [...newWf.nodes, selectedAgent]
    });
    setSelectedAgent("");
  };

  const handleCreateWorkflow = async () => {
    // Auto-generate sequential edges
    const edges = [];
    for (let i = 0; i < newWf.nodes.length - 1; i++) {
      edges.push({
        source: newWf.nodes[i],
        target: newWf.nodes[i + 1],
        mapping_prompt: "Extract the output from the previous step and format it for the next step natively."
      });
    }

    try {
      const res = await fetch("http://127.0.0.1:8000/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newWf, edges })
      });
      if (res.ok) {
        setNewWf({ name: "", nodes: [], edges: [] });
        fetchWorkflows();
        setActiveTab("execute");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const executeWorkflow = async (id: string) => {
    const payload = prompt("Enter initial JSON payload:", "{}");
    if (!payload) return;
    const llmKey = prompt("Enter LLM API Key for mapping:", "sk-...");
    if (!llmKey) return;

    try {
      const res = await fetch(`http://127.0.0.1:8000/api/execute/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          initial_payload: JSON.parse(payload),
          llm_api_key: llmKey,
          llm_model: "openai/gpt-4o"
        })
      });
      if (res.ok) {
        const data = await res.json();
        alert(`Execution started! ID: ${data.execution_id}`);
      }
    } catch (e) {
      console.error(e);
      alert("Execution failed to start.");
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white font-sans p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="border-b border-white/10 pb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
              Universal AI Connector
            </h1>
            <p className="text-gray-400 mt-2">Connect and orchestrate any AI agent, Webhook, or API instantly.</p>
          </div>
          <div className="flex gap-4">
            <button onClick={() => setActiveTab("registry")} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'registry' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}>Agent Hub</button>
            <button onClick={() => setActiveTab("builder")} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'builder' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}>Pipeline Builder</button>
            <button onClick={() => setActiveTab("execute")} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'execute' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}>Executions</button>
          </div>
        </header>

        {/* Tab Content */}
        {activeTab === "registry" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 bg-[#1A1B1E] p-6 rounded-xl border border-white/5">
              <h2 className="text-lg font-medium mb-6 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span> Register Endpoint
              </h2>
              <form onSubmit={handleCreateAgent} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Agent Name</label>
                  <input required value={newAgent.name} onChange={(e) => setNewAgent({...newAgent, name: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors" placeholder="e.g. OpenAI Summarizer" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">API Endpoint (URL)</label>
                  <input required value={newAgent.endpoint} onChange={(e) => setNewAgent({...newAgent, endpoint: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors" placeholder="https://api.example.com/run" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Description</label>
                  <input value={newAgent.description} onChange={(e) => setNewAgent({...newAgent, description: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors" placeholder="What does this agent do?" />
                </div>
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors mt-4">
                  Register Agent
                </button>
              </form>
            </div>
            
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-lg font-medium mb-6">Registered Agents ({agents.length})</h2>
              {agents.length === 0 ? (
                <div className="text-center py-12 bg-[#1A1B1E] rounded-xl border border-white/5 text-gray-500 text-sm">
                  No external agents registered yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {agents.map(a => (
                    <div key={a.id} className="bg-[#1A1B1E] p-5 rounded-xl border border-white/5 hover:border-white/20 transition-colors group">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-white">{a.name}</h3>
                        <span className="text-xs px-2 py-1 bg-green-500/10 text-green-400 rounded-md">Active</span>
                      </div>
                      <p className="text-xs text-gray-400 truncate mb-4">{a.endpoint}</p>
                      <p className="text-sm text-gray-300 line-clamp-2">{a.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "builder" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 bg-[#1A1B1E] p-6 rounded-xl border border-white/5">
              <h2 className="text-lg font-medium mb-6 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-500"></span> Create Pipeline
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Pipeline Name</label>
                  <input value={newWf.name} onChange={(e) => setNewWf({...newWf, name: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-purple-500 transition-colors" placeholder="e.g. Lead Gen Auto-Responder" />
                </div>
                
                <div className="pt-4 border-t border-white/10">
                  <label className="block text-xs font-medium text-gray-400 mb-2">Append Node</label>
                  <div className="flex gap-2">
                    <select value={selectedAgent} onChange={(e) => setSelectedAgent(e.target.value)} className="flex-1 bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-purple-500 text-white">
                      <option value="">Select Agent...</option>
                      {agents.map(a => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                    <button onClick={addNodeToWf} disabled={!selectedAgent} className="px-4 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors disabled:opacity-50">+</button>
                  </div>
                </div>

                <button onClick={handleCreateWorkflow} disabled={!newWf.name || newWf.nodes.length === 0} className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg text-sm transition-colors mt-6">
                  Save Pipeline
                </button>
              </div>
            </div>

            <div className="lg:col-span-2">
              <h2 className="text-lg font-medium mb-6">Sequence Canvas</h2>
              <div className="bg-[#1A1B1E] p-8 rounded-xl border border-white/5 min-h-[400px] flex flex-col items-center justify-center">
                {newWf.nodes.length === 0 ? (
                  <p className="text-gray-500 text-sm">Add nodes from the sidebar to build your sequence.</p>
                ) : (
                  <div className="w-full max-w-md space-y-2">
                    {newWf.nodes.map((nodeId, idx) => {
                      const agent = agents.find(a => a.id === nodeId);
                      return (
                        <div key={idx} className="flex flex-col items-center">
                          <div className="w-full bg-black/40 border border-white/10 rounded-xl p-4 flex items-center justify-between">
                            <div>
                              <div className="text-xs text-gray-500 mb-1">Step {idx + 1}</div>
                              <div className="font-medium">{agent?.name || 'Unknown Agent'}</div>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-xs text-gray-400">
                              API
                            </div>
                          </div>
                          {idx < newWf.nodes.length - 1 && (
                            <div className="w-0.5 h-8 bg-gradient-to-b from-white/20 to-purple-500/50 my-1"></div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "execute" && (
          <div className="space-y-6">
            <h2 className="text-lg font-medium">Ready Pipelines ({workflows.length})</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {workflows.map(wf => (
                <div key={wf.id} className="bg-[#1A1B1E] p-6 rounded-xl border border-white/5 flex flex-col">
                  <h3 className="text-lg font-medium mb-2">{wf.name}</h3>
                  <p className="text-sm text-gray-400 mb-6 flex-1">{wf.nodes.length} Steps Sequence</p>
                  <button onClick={() => executeWorkflow(wf.id)} className="w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-medium transition-colors">
                    Execute Now
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
