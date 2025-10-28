import React, { useCallback, useEffect, useRef, useState } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  applyEdgeChanges,
  applyNodeChanges,
} from 'reactflow'
import dagre from 'dagre'
import 'reactflow/dist/style.css'
import { toPng } from 'html-to-image'

const sampleJSON = {
  "user": {
    "id": 1,
    "name": "John Doe",
    "address": {
      "city": "New York",
      "country": "USA"
    }
  },
  "items": [
    {"name": "item1"},
    {"name": "item2"}
  ]
}

let idCounter = 1
function uid(){ return 'n' + idCounter++ }

function traverse(json, path='$', nodes=[], edges=[], parentId=null){
  const isArr = Array.isArray(json)
  const isObj = json !== null && typeof json === 'object' && !isArr
  const type = isArr ? 'array' : isObj ? 'object' : 'primitive'
  const id = uid()
  const label = (path === '$') ? 'root' : path.split('.').slice(-1)[0].replace(/\[\d+\]/g,'')
  const display = type === 'primitive' ? (label + ': ' + JSON.stringify(json)) : label
  nodes.push({
    id,
    data: { label: display, path, value: json, type },
    position: { x: 0, y: 0 },
    style: {
      padding: 10,
      borderRadius: 8,
      background: type === 'object' ? 'var(--obj)' : type === 'array' ? 'var(--arr)' : 'var(--prim)',
      color: 'var(--node-text)',
      minWidth: 110,
      textAlign: 'center'
    }
  })
  if(parentId){
    edges.push({ id: 'e' + parentId + '-' + id, source: parentId, target: id, animated: false, type: 'smoothstep' })
  }
  if(isObj){
    for(const key of Object.keys(json)){
      const childPath = path === '$' ? `$.${key}` : `${path}.${key}`
      traverse(json[key], childPath, nodes, edges, id)
    }
  } else if(isArr){
    for(let i=0;i<json.length;i++){
      const childPath = `${path}[${i}]`
      traverse(json[i], childPath, nodes, edges, id)
    }
  }
  return { nodes, edges }
}

const dagreGraph = new dagre.graphlib.Graph()
dagreGraph.setDefaultEdgeLabel(() => ({}))

const nodeWidth = 140
const nodeHeight = 60

function getLayoutedElements(nodes, edges, direction = 'LR') {
  const isHorizontal = direction === 'LR'
  dagreGraph.setGraph({ rankdir: direction, nodesep: 30, ranksep: 60 })
  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight })
  })
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target)
  })

  dagre.layout(dagreGraph)

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id)
    node.position = {
      x: nodeWithPosition.x - nodeWidth / 2,
      y: nodeWithPosition.y - nodeHeight / 2,
    }
    return node
  })

  const layoutedEdges = edges.map((edge) => {
    return edge
  })

  return { nodes: layoutedNodes, edges: layoutedEdges }
}

export default function App(){
  const [jsonText, setJsonText] = useState(JSON.stringify(sampleJSON, null, 2))
  const [nodes, setNodes] = useState([])
  const [edges, setEdges] = useState([])
  const [message, setMessage] = useState('')
  const [themeDark, setThemeDark] = useState(false)
  const [rfInstance, setRfInstance] = useState(null)
  const reactFlowWrapper = useRef(null)
  const searchRef = useRef(null)

  useEffect(()=>{ document.documentElement.setAttribute('data-theme', themeDark ? 'dark' : 'light') }, [themeDark])

  const onNodesChange = useCallback((changes)=> setNodes(ns => applyNodeChanges(changes, ns)), [])
  const onEdgesChange = useCallback((changes)=> setEdges(es => applyEdgeChanges(changes, es)), [])

  const generate = useCallback((jsonStr=null)=>{
    try{
      const parsed = jsonStr ? JSON.parse(jsonStr) : JSON.parse(jsonText)
      idCounter = 1
      const { nodes: n, edges: e } = traverse(parsed, '$', [], [])
      const laid = getLayoutedElements(n, e, 'LR') // Left to Right layout
      // improve node styles (smaller for primitives)
      laid.nodes = laid.nodes.map(nd => {
        if(nd.data && nd.data.type === 'primitive'){
          nd.style = { ...nd.style, minWidth: 90, background: 'var(--prim)', color: 'var(--node-text)' }
        }
        return nd
      })
      setNodes(laid.nodes)
      setEdges(laid.edges)
      setMessage('Tree generated')
      setTimeout(()=> rfInstance && rfInstance.fitView({ padding:0.2 }), 300)
    }catch(err){
      setMessage('Invalid JSON: ' + err.message)
    }
  }, [jsonText, rfInstance])

  useEffect(()=>{ generate(JSON.stringify(sampleJSON, null, 2)) }, []) // initial

  const onSearch = ()=>{
    const q = searchRef.current.value.trim()
    if(!q){ setMessage('Enter JSON path to search (e.g. $.user.address.city)'); return }
    const match = nodes.find(n => n.data && n.data.path === q)
    if(!match){ setMessage('No match found'); return }
    setMessage('Match found: ' + q)
    setNodes(ns => ns.map(n => n.id === match.id ? ({...n, style:{...n.style, boxShadow:'0 6px 18px rgba(99,102,241,0.25)', outline:'3px solid rgba(99,102,241,0.35)'}}) : ({...n, style:{...n.style, opacity: 0.45}})))
    if(rfInstance){
      rfInstance.setCenter(match.position.x + 60, match.position.y + 20, { duration: 400 })
    }
  }

  const clearAll = ()=>{ setJsonText(''); setNodes([]); setEdges([]); setMessage('Cleared') }

  const onNodeClick = (_, node)=>{
    if(node && node.data && node.data.path){
      navigator.clipboard.writeText(node.data.path).then(()=> setMessage('Copied path: ' + node.data.path)).catch(()=> setMessage('Copy failed'))
    }
  }

  const exportImage = async ()=>{
    if(!reactFlowWrapper.current){ setMessage('Nothing to export'); return }
    try{
      const dataUrl = await toPng(reactFlowWrapper.current, { cacheBust: true })
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = 'json-tree.png'
      a.click()
      setMessage('Image downloaded')
    }catch(e){
      setMessage('Export failed: ' + e.message)
    }
  }

  return (
    <div className="container">
      <div className="card flex gap-6 items-start">
        <div style={{flex:1}}>
          <div className="flex items-start justify-between mb-4">
            <h1 className="text-2xl font-bold">JSON Tree Visualizer</h1>
            <div className="flex items-center gap-3">
              <label className="text-sm mr-2">Dark/Light</label>
              <input type="checkbox" checked={themeDark} onChange={(e)=>setThemeDark(e.target.checked)} />
            </div>
          </div>
          <label className="text-sm text-gray-500 mb-2 inline-block">Paste or type JSON data</label>
          <textarea className="json-input w-full card p-3" value={jsonText} onChange={(e)=>setJsonText(e.target.value)} placeholder='Paste JSON here'></textarea>
          <div className="flex gap-3 mt-3">
            <button className="button bg-blue-600" onClick={()=>generate()}>Generate Tree</button>
            <button className="button bg-gray-600" onClick={clearAll}>Clear</button>
            <button className="button bg-green-600" onClick={exportImage}>Download PNG</button>
            <div className="ml-auto flex items-center gap-2">
              <input ref={searchRef} className="px-3 py-2 border rounded" placeholder="$.user.address.city or $.items[0].name" />
              <button className="button bg-indigo-600" onClick={onSearch}>Search</button>
            </div>
          </div>
          <div className="mt-3 text-sm text-gray-500">{message}</div>
          <div className="mt-6 text-xs text-gray-600">
            <strong>Tips:</strong> Click a node to copy its JSON path. Use the search input to jump to paths like <code>$.items[0].name</code>.
          </div>
        </div>

        <div style={{flex:1.2, minHeight:480}} className="card p-2">
          <div ref={reactFlowWrapper} style={{width:'100%', height:520, background:'#f8fafc', borderRadius:8, padding:8}}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              fitView
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onInit={setRfInstance}
              onNodeClick={onNodeClick}
              nodeTypes={{}}
              panOnScroll
              panOnDrag
            >
              <Background gap={12} color="#e6edf3" />
              <MiniMap nodeStrokeColor={n => {
                if(n.data && n.data.type === 'object') return 'var(--obj)'
                if(n.data && n.data.type === 'array') return 'var(--arr)'
                return 'var(--prim)'
              }} nodeColor={n => {
                if(n.data && n.data.type === 'object') return 'var(--obj)'
                if(n.data && n.data.type === 'array') return 'var(--arr)'
                return 'var(--prim)'
              }} />
              <Controls />
            </ReactFlow>
          </div>
        </div>
      </div>
    </div>
  )
}
