
import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { Node, Edge, Point, HistoryItem, NodeInput, NodeOutput, Theme } from './types';
import { NodeType, NodeStatus } from './types';
import Sidebar from './components/Sidebar';
import NodeComponent from './components/Node';
import EdgeComponent from './components/Edge';
import HistorySidebar from './components/HistorySidebar';
import SettingsPanel from './components/SettingsPanel';
import AppModeView from './components/AppModeView';
import { PlayIcon, SettingsIcon, AppWindowIcon, CanvasViewIcon, StarIcon, SaveIcon, FolderOpenIcon } from './components/icons';
import * as geminiService from './services/geminiService';
import { PRESET_CONFIGS } from './presets';

const createNode = (type: NodeType, position: Point, presetId?: string): Node => {
  const id = crypto.randomUUID();
  const baseNode = { id, type, position, data: { status: NodeStatus.IDLE, content: null, inputs: [] as NodeInput[], outputs: [] as NodeOutput[], isMuted: false } };
  switch (type) {
    case NodeType.TEXT_INPUT: return { ...baseNode, data: { ...baseNode.data, width: 320, height: 150, label: 'Text Input', outputs: [{ id: `${id}-output`, label: 'Text', type: 'text' }] } };
    case NodeType.IMAGE_INPUT: return { ...baseNode, data: { ...baseNode.data, width: 350, label: 'Image Input', outputs: [{ id: `${id}-output`, label: 'Image', type: 'image' }] } };
    case NodeType.TEXT_GENERATOR: return { ...baseNode, data: { ...baseNode.data, width: 320, height: 100, label: 'Text Generator', inputs: [{ id: `${id}-input`, label: 'Prompt', type: 'text' }], outputs: [{ id: `${id}-output`, label: 'Text', type: 'text' }] } };
    case NodeType.IMAGE_EDITOR: return { ...baseNode, data: { ...baseNode.data, width: 320, height: 100, label: 'Image Generator/Editor', inputs: [{ id: `${id}-input-image`, label: 'Image (Optional)', type: 'image' }, { id: `${id}-input-text`, label: 'Prompt', type: 'text' }], outputs: [{ id: `${id}-output-image`, label: 'Image', type: 'image' }, { id: `${id}-output-text`, label: 'Text', type: 'text' }] } };
    case NodeType.VIDEO_GENERATOR: return { ...baseNode, data: { ...baseNode.data, width: 320, height: 100, label: 'Video Generator', inputs: [{ id: `${id}-input-image`, label: 'Image', type: 'image' }, { id: `${id}-input-text`, label: 'Text', type: 'text' }], outputs: [{ id: `${id}-output`, label: 'Video', type: 'video' }] } };
    case NodeType.OUTPUT_DISPLAY: return { ...baseNode, data: { ...baseNode.data, width: 350, label: 'Output', inputs: [{ id: `${id}-input`, label: 'Input', type: 'any' }] } };
    case NodeType.PROMPT_PRESET:
        const config = PRESET_CONFIGS[presetId!];
        const inputs = config.inputs.map((input, index) => ({ ...input, id: `${id}-input-${index}`})) as NodeInput[];
        const outputs = config.outputs.map((output, index) => ({ ...output, id: `${id}-output-${index}`})) as NodeOutput[];
        return { ...baseNode, data: { ...baseNode.data, width: 180, height: 180, label: config.label, prompt: config.prompt, inputs, outputs } };
    default: throw new Error("Unknown node type");
  }
};

const DEFAULT_THEME: Theme = {
    canvasBackground: '#0a0a0a',
    nodeBackground: '#171717',
    nodeOpacity: 0.7,
    nodeTextColor: '#ffffff',
    uploaderTextColor: '#6b7280',
    canvasBackgroundImage: null,
    edgeWidth: 2,
    edgeColors: { text: '#f59e0b', image: '#d1d5db', video: '#3b82f6', any: '#a3a3a3' },
    buttonColor: '#4f46e5',
};

const App: React.FC = () => {
  const [nodes, setNodes] = useState<Record<string, Node>>({});
  const [edges, setEdges] = useState<Record<string, Edge>>({});
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [viewTransform] = useState({ scale: 1, x: 0, y: 0 });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);
  const [isSettingsPanelOpen, setIsSettingsPanelOpen] = useState(false);
  const [isNodeSidebarCollapsed, setIsNodeSidebarCollapsed] = useState(false);
  const [isHistorySidebarCollapsed, setIsHistorySidebarCollapsed] = useState(false);
  const [isAppMode, setIsAppMode] = useState(false);
  const [apiKey, setApiKey] = useState(localStorage.getItem('gemini_api_key') || '');

  const dragRef = useRef<{ nodeId: string, offset: Point } | null>(null);
  const edgeDragRef = useRef<{ sourceNodeId: string, sourceHandleId: string, startPos: Point } | null>(null);
  const [ghostEdge, setGhostEdge] = useState<{ start: Point, end: Point } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const zIndexCounter = useRef(10);

  useEffect(() => {
    process.env.API_KEY = apiKey;
    localStorage.setItem('gemini_api_key', apiKey);
  }, [apiKey]);

  const exportWorkflow = useCallback(() => {
    const workflow = { nodes, edges, theme };
    const blob = new Blob([JSON.stringify(workflow, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `workflow-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [nodes, edges, theme]);

  const importWorkflow = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const workflow = JSON.parse(content);
        if (workflow.nodes) setNodes(workflow.nodes);
        if (workflow.edges) setEdges(workflow.edges);
        if (workflow.theme) setTheme(workflow.theme);
      } catch (err) {
        alert('Failed to import workflow: Invalid JSON format');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  }, []);

  const deleteNode = useCallback((nodeId: string) => {
    setNodes(prev => {
      const next = { ...prev };
      delete next[nodeId];
      return next;
    });
    setEdges(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(edgeId => {
        const edge = next[edgeId];
        // Defensive check: edge might be null or undefined in some states
        if (edge && (edge.sourceNodeId === nodeId || edge.targetNodeId === nodeId)) {
          delete next[edgeId];
        }
      });
      return next;
    });
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
  }, [selectedNodeId]);

  const deleteEdge = useCallback((edgeId: string) => {
    setEdges(prev => {
      const next = { ...prev };
      delete next[edgeId];
      return next;
    });
  }, []);

  const getCanvasMousePos = (e: React.MouseEvent | MouseEvent): Point => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - viewTransform.x) / viewTransform.scale,
      y: (e.clientY - rect.top - viewTransform.y) / viewTransform.scale
    };
  };

  const addNode = useCallback((type: NodeType, presetId?: string) => {
    const newNode = createNode(type, { x: 400, y: 200 }, presetId);
    newNode.zIndex = zIndexCounter.current++;
    setNodes(prev => ({ ...prev, [newNode.id]: newNode }));
    setSelectedNodeId(newNode.id);
  }, []);

  const updateNodeData = useCallback((nodeId: string, data: Partial<Node['data']>) => {
    setNodes(prev => prev[nodeId] ? { ...prev, [nodeId]: { ...prev[nodeId], data: { ...prev[nodeId].data, ...data } } } : prev);
  }, []);

  const onMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    const node = nodes[nodeId];
    if (!node) return;
    dragRef.current = { nodeId, offset: { x: e.clientX - node.position.x, y: e.clientY - node.position.y } };
    setSelectedNodeId(nodeId);
    setNodes(prev => ({ ...prev, [nodeId]: { ...prev[nodeId], zIndex: zIndexCounter.current++ } }));
  };

  const onHandleMouseDown = (e: React.MouseEvent, nodeId: string, handleId: string, type: 'input' | 'output') => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const canvasRect = canvasRef.current!.getBoundingClientRect();
    const startPos = {
      x: (rect.left + rect.width / 2 - canvasRect.left),
      y: (rect.top + rect.height / 2 - canvasRect.top)
    };
    edgeDragRef.current = { sourceNodeId: nodeId, sourceHandleId: handleId, startPos };
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (dragRef.current) {
      const { nodeId, offset } = dragRef.current;
      setNodes(prev => {
        if (!prev[nodeId]) return prev;
        return {
          ...prev,
          [nodeId]: { ...prev[nodeId], position: { x: e.clientX - offset.x, y: e.clientY - offset.y } }
        };
      });
    }
    if (edgeDragRef.current) {
      setGhostEdge({ start: edgeDragRef.current.startPos, end: getCanvasMousePos(e) });
    }
  };

  const onMouseUp = (e: React.MouseEvent) => {
    if (edgeDragRef.current) {
      const target = e.target as HTMLElement;
      const targetHandleId = target.id;
      const targetNodeId = target.closest('[data-node-id]')?.getAttribute('data-node-id');
      const targetType = target.getAttribute('data-handle-type');

      if (targetHandleId && targetNodeId && targetType === 'input') {
        const edgeId = crypto.randomUUID();
        // Capture values synchronously from the ref before the async state update
        const sourceNodeId = edgeDragRef.current.sourceNodeId;
        const sourceHandleId = edgeDragRef.current.sourceHandleId;
        
        setEdges(prev => ({ 
          ...prev, 
          [edgeId]: { id: edgeId, sourceNodeId, sourceHandleId, targetNodeId, targetHandleId } 
        }));
      }
    }
    dragRef.current = null;
    edgeDragRef.current = null;
    setGhostEdge(null);
  };

  const getHandlePosition = (nodeId: string, handleId: string): Point => {
    const node = nodes[nodeId];
    if (!node) return { x: 0, y: 0 };
    const width = node.data.width || 320;
    const height = node.data.height || 150;
    const inputIdx = node.data.inputs?.findIndex(i => i.id === handleId) ?? -1;
    const outputIdx = node.data.outputs?.findIndex(o => o.id === handleId) ?? -1;
    
    if (inputIdx !== -1) {
      const total = node.data.inputs.length;
      const topPercent = total > 1 ? (inputIdx / (total - 1)) * 80 + 10 : 50;
      return { x: node.position.x, y: node.position.y + 24 + (height * topPercent / 100) };
    }
    if (outputIdx !== -1) {
      const total = node.data.outputs.length;
      const topPercent = total > 1 ? (outputIdx / (total - 1)) * 80 + 10 : 50;
      return { x: node.position.x + width, y: node.position.y + 24 + (height * topPercent / 100) };
    }
    return node.position;
  };

  const getFileAsBase64 = async (file: File): Promise<{ data: string, mimeType: string }> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve({ data: base64, mimeType: file.type });
      };
      reader.readAsDataURL(file);
    });
  };

  const resolveData = async (nodeId: string, handleId: string, currentResults: Record<string, any>): Promise<any> => {
    const edge = Object.values(edges).find(e => e && e.targetNodeId === nodeId && e.targetHandleId === handleId);
    if (!edge) return null;
    return currentResults[edge.sourceNodeId] || null;
  };

  const runWorkflow = useCallback(async () => {
    if (!apiKey) { alert("Please enter API Key."); return; }
    setIsProcessing(true);
    
    const results: Record<string, any> = {};
    const processedNodes = new Set<string>();
    const nodeIds = Object.keys(nodes);

    nodeIds.forEach(id => updateNodeData(id, { status: NodeStatus.IDLE, errorMessage: undefined }));

    try {
      let madeProgress = true;
      while (processedNodes.size < nodeIds.length && madeProgress) {
        madeProgress = false;
        for (const nodeId of nodeIds) {
          if (processedNodes.has(nodeId)) continue;

          const node = nodes[nodeId];
          if (!node) continue;
          const incomingEdges = Object.values(edges).filter(e => e && e.targetNodeId === nodeId);
          const allInputsReady = incomingEdges.every(e => e && processedNodes.has(e.sourceNodeId));

          if (allInputsReady) {
            updateNodeData(nodeId, { status: NodeStatus.PROCESSING });
            
            try {
              let output: any = null;
              
              if (node.type === NodeType.TEXT_INPUT || node.type === NodeType.IMAGE_INPUT) {
                output = node.data.content;
              } else if (node.type === NodeType.TEXT_GENERATOR) {
                const prompt = await resolveData(nodeId, node.data.inputs[0].id, results);
                output = await geminiService.generateText(prompt);
              } else if (node.type === NodeType.IMAGE_EDITOR) {
                const img = await resolveData(nodeId, node.data.inputs[0].id, results);
                const prompt = await resolveData(nodeId, node.data.inputs[1].id, results);
                
                let b64Data = "";
                let mimeType = "image/png";
                if (img instanceof File) {
                   const converted = await getFileAsBase64(img);
                   b64Data = converted.data;
                   mimeType = converted.mimeType;
                } else if (typeof img === 'string' && img.startsWith('data:')) {
                   const parts = img.split(',');
                   b64Data = parts[1];
                   mimeType = parts[0].split(':')[1].split(';')[0];
                }

                if (b64Data) {
                  const res = await geminiService.editImage(b64Data, mimeType, prompt || "enhance this image");
                  output = res.newBase64Image ? `data:image/png;base64,${res.newBase64Image}` : res.text;
                } else {
                  output = await geminiService.generateImage(prompt);
                }
              } else if (node.type === NodeType.VIDEO_GENERATOR) {
                 const img = await resolveData(nodeId, node.data.inputs[0].id, results);
                 const prompt = await resolveData(nodeId, node.data.inputs[1].id, results);
                 let b64 = null, mime = null;
                 if (img instanceof File) {
                    const conv = await getFileAsBase64(img);
                    b64 = conv.data; mime = conv.mimeType;
                 }
                 output = await geminiService.generateVideo(b64, mime, prompt, (m) => updateNodeData(nodeId, { content: { progress: m } }));
              } else if (node.type === NodeType.PROMPT_PRESET) {
                const parts: { data: string, mimeType: string }[] = [];
                for (const input of node.data.inputs) {
                  const val = await resolveData(nodeId, input.id, results);
                  if (val instanceof File) {
                    parts.push(await getFileAsBase64(val));
                  } else if (typeof val === 'string' && val.startsWith('data:image')) {
                    const [meta, b64] = val.split(',');
                    parts.push({ data: b64, mimeType: meta.split(':')[1].split(';')[0] });
                  }
                }
                const res = await geminiService.executePreset(parts, node.data.prompt || "");
                output = res.newBase64Image ? `data:image/png;base64,${res.newBase64Image}` : res.text;
              } else if (node.type === NodeType.OUTPUT_DISPLAY) {
                output = await resolveData(nodeId, node.data.inputs[0].id, results);
              }

              results[nodeId] = output;
              updateNodeData(nodeId, { status: NodeStatus.COMPLETED, content: output });
              processedNodes.add(nodeId);
              madeProgress = true;
            } catch (err) {
              updateNodeData(nodeId, { status: NodeStatus.ERROR, errorMessage: String(err) });
              throw err;
            }
          }
        }
      }
    } catch (e) {
      console.error("Workflow failed", e);
    } finally {
      setIsProcessing(false);
    }
  }, [nodes, edges, apiKey, updateNodeData]);

  const handleEditPrompt = (nodeId: string) => setEditingNodeId(nodeId);
  const saveEditedPrompt = (newPrompt: string) => {
    if (editingNodeId) updateNodeData(editingNodeId, { prompt: newPrompt });
    setEditingNodeId(null);
  };

  return (
    <div className="flex w-screen h-screen overflow-hidden bg-[#050505] select-none">
      <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={importWorkflow} />
      {!isAppMode && <Sidebar onAddNode={addNode} isCollapsed={isNodeSidebarCollapsed} onToggle={() => setIsNodeSidebarCollapsed(p => !p)} />}
      <div className="relative flex-grow h-full overflow-hidden" onMouseMove={onMouseMove} onMouseUp={onMouseUp} onClick={() => setSelectedNodeId(null)}>
        <div className="absolute top-6 right-6 z-50 flex items-center space-x-3 pointer-events-auto">
          <div className="flex items-center space-x-2 bg-neutral-900/90 backdrop-blur-xl p-2 rounded-2xl border border-white/10 shadow-2xl">
            <div className="flex items-center bg-black/40 px-3 py-1.5 rounded-xl border border-white/5 focus-within:border-indigo-500/50 transition-colors">
              <StarIcon className="w-4 h-4 text-indigo-400 mr-2" />
              <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="API Key" className="bg-transparent text-xs text-white focus:outline-none w-32 font-mono" />
            </div>
            
            <div className="flex items-center border-l border-white/10 ml-2 pl-2 space-x-1">
              <button onClick={exportWorkflow} className="p-2 text-white/60 hover:text-white transition-colors" title="Export Workflow"><SaveIcon className="w-5 h-5"/></button>
              <button onClick={() => fileInputRef.current?.click()} className="p-2 text-white/60 hover:text-white transition-colors" title="Import Workflow"><FolderOpenIcon className="w-5 h-5"/></button>
            </div>

            <div className="flex items-center border-l border-white/10 ml-1 pl-2 space-x-1">
              <button onClick={() => setIsAppMode(!isAppMode)} className="p-2 text-white/60 hover:text-white transition-colors" title={isAppMode ? "Canvas View" : "App View"}>
                {isAppMode ? <CanvasViewIcon className="w-5 h-5" /> : <AppWindowIcon className="w-5 h-5"/>}
              </button>
              <button onClick={() => setIsSettingsPanelOpen(true)} className="p-2 text-white/60 hover:text-white transition-colors" title="Settings"><SettingsIcon className="w-5 h-5"/></button>
            </div>
          </div>
          <button onClick={runWorkflow} disabled={isProcessing} className="flex items-center px-6 py-3 font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-2xl transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50">
            {isProcessing ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2" /> : <PlayIcon className="w-5 h-5 mr-2" />}
            {isProcessing ? "Flowing..." : "Run Flow"}
          </button>
        </div>

        <div ref={canvasRef} className="w-full h-full relative" style={{ backgroundColor: theme.canvasBackground, backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)`, backgroundSize: '30px 30px' }}>
           <svg className="absolute inset-0 pointer-events-none w-full h-full overflow-visible">
             {Object.values(edges).map(edge => {
               // Defensive null check for the edge itself
               if (!edge) return null;
               
               const sourceNode = nodes[edge.sourceNodeId];
               const targetNode = nodes[edge.targetNodeId];
               
               // Defensive check: Don't render if either node is missing (e.g. during deletion/import)
               if (!sourceNode || !targetNode) return null;
               
               return (
                 <EdgeComponent 
                   key={edge.id} id={edge.id} isSelected={false} onClick={() => deleteEdge(edge.id)} width={theme.edgeWidth} color="#444"
                   start={getHandlePosition(edge.sourceNodeId, edge.sourceHandleId)}
                   end={getHandlePosition(edge.targetNodeId, edge.targetHandleId)}
                 />
               );
             })}
             {ghostEdge && <EdgeComponent id="ghost" isSelected={false} onClick={() => {}} width={2} color="#4f46e5" start={ghostEdge.start} end={ghostEdge.end} />}
           </svg>
           
           {!isAppMode && Object.values(nodes).map(node => (
             <NodeComponent 
               key={node.id} node={node} isSelected={selectedNodeId === node.id} 
               onMouseDown={onMouseDown} onHandleMouseDown={onHandleMouseDown} 
               onResizeMouseDown={() => {}} updateNodeData={updateNodeData} 
               onEditPrompt={handleEditPrompt} onDeleteNode={() => deleteNode(node.id)} edgeColors={theme.edgeColors} 
             />
           ))}
           {isAppMode && <AppModeView nodes={nodes} updateNodeData={updateNodeData} theme={theme} />}
        </div>
      </div>
      {!isAppMode && <HistorySidebar history={history} onUseAsInput={() => {}} isCollapsed={isHistorySidebarCollapsed} onToggle={() => setIsHistorySidebarCollapsed(p => !p)} theme={theme} />}
      
      {editingNodeId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-neutral-900 border border-white/10 rounded-3xl p-8 w-full max-w-2xl shadow-2xl text-white">
            <h2 className="text-xl font-bold mb-4">Edit Preset Prompt</h2>
            <textarea className="w-full h-64 bg-black/40 border border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:border-indigo-500 mb-6" defaultValue={nodes[editingNodeId]?.data.prompt} onChange={(e) => { if (nodes[editingNodeId]) nodes[editingNodeId].data.prompt = e.target.value; }} />
            <div className="flex justify-end space-x-4">
              <button onClick={() => setEditingNodeId(null)} className="px-6 py-2 rounded-xl bg-white/5 hover:bg-white/10">Cancel</button>
              <button onClick={() => saveEditedPrompt(nodes[editingNodeId!]?.data.prompt || '')} className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500">Save Prompt</button>
            </div>
          </div>
        </div>
      )}
      
      {isSettingsPanelOpen && <SettingsPanel theme={theme} setTheme={setTheme} shortcuts={{} as any} setShortcuts={() => {}} onClose={() => setIsSettingsPanelOpen(false)} zoom={1} onZoomChange={() => {}} />}
    </div>
  );
};

export default App;
