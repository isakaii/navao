document.addEventListener('DOMContentLoaded', function() {
  loadData();
  setupEventListeners();
});

let currentView = 'list';
let savedData = [];
let graphNodes = [];

function setupEventListeners() {
  document.getElementById('clear-all').addEventListener('click', clearAllSnippets);
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal').addEventListener('click', function(e) {
    if (e.target === this) {
      closeModal();
    }
  });
  
  // View toggle buttons
  document.getElementById('list-view').addEventListener('click', () => switchView('list'));
  document.getElementById('graph-view').addEventListener('click', () => switchView('graph'));
  
  // Graph controls
  document.getElementById('reset-zoom').addEventListener('click', resetGraphView);
  document.getElementById('layout-force').addEventListener('click', () => setGraphLayout('force'));
  document.getElementById('layout-tree').addEventListener('click', () => setGraphLayout('tree'));
}

function loadData() {
  chrome.storage.local.get(['weaverData', 'graphData'], function(result) {
    savedData = result.weaverData || [];
    const graphData = result.graphData || { nodes: [], relationships: [] };
    
    console.log('Popup loaded data:', {
      snippetCount: savedData.length,
      nodeCount: graphData.nodes.length,
      relationshipCount: graphData.relationships.length
    });
    
    graphNodes = graphData;
    updateCount(savedData.length);
    renderCurrentView();
  });
}

function switchView(view) {
  currentView = view;
  
  // Update button states
  document.getElementById('list-view').classList.toggle('active', view === 'list');
  document.getElementById('graph-view').classList.toggle('active', view === 'graph');
  
  // Update container visibility
  document.getElementById('list-container').classList.toggle('hidden', view !== 'list');
  document.getElementById('graph-container').classList.toggle('hidden', view !== 'graph');
  
  renderCurrentView();
}

function renderCurrentView() {
  if (currentView === 'list') {
    renderSnippets(savedData);
  } else {
    renderGraph();
  }
}

function updateCount(count) {
  const countElement = document.getElementById('count');
  countElement.textContent = `${count} saved snippet${count !== 1 ? 's' : ''}`;
  
  const clearButton = document.getElementById('clear-all');
  clearButton.disabled = count === 0;
}

function renderSnippets(snippets) {
  const container = document.getElementById('snippets-container');
  let emptyState = document.getElementById('empty-state');
  
  if (snippets.length === 0) {
    if (emptyState) {
      emptyState.style.display = 'block';
    }
    container.innerHTML = '<div id="empty-state" class="empty-state">No saved text yet. Highlight text on any webpage and right-click to save it.</div>';
    return;
  }
  
  if (emptyState) {
    emptyState.style.display = 'none';
  }
  
  container.innerHTML = snippets.map(snippet => {
    const domain = extractDomain(snippet.sourceUrl);
    const timeAgo = formatTimeAgo(snippet.timestamp);
    const previewText = snippet.text.slice(0, 50) + (snippet.text.length > 50 ? '...' : '');
    
    return `
      <div class="snippet-item" data-id="${snippet.id}">
        <button class="delete-btn" data-id="${snippet.id}">&times;</button>
        <div class="snippet-text">${escapeHtml(previewText)}</div>
        <div class="snippet-meta">
          <span class="snippet-domain">${escapeHtml(domain)}</span>
          <span class="snippet-time">${timeAgo}</span>
        </div>
      </div>
    `;
  }).join('');
  
  container.querySelectorAll('.snippet-item').forEach(item => {
    item.addEventListener('click', function(e) {
      if (!e.target.classList.contains('delete-btn')) {
        const id = this.dataset.id;
        const snippet = snippets.find(s => s.id === id);
        if (snippet) {
          showSnippetModal(snippet);
        }
      }
    });
  });
  
  container.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      const id = this.dataset.id;
      deleteSnippet(id);
    });
  });
}

function renderGraph() {
  const canvas = document.getElementById('graph-canvas');
  const emptyState = document.getElementById('graph-empty-state');
  
  console.log('renderGraph called with:', {
    nodeCount: graphNodes.nodes ? graphNodes.nodes.length : 0,
    relationshipCount: graphNodes.relationships ? graphNodes.relationships.length : 0
  });
  
  if (!graphNodes.nodes || graphNodes.nodes.length === 0) {
    console.log('No nodes found, showing empty state');
    if (emptyState) {
      emptyState.style.display = 'block';
    }
    canvas.innerHTML = '';
    return;
  }
  
  console.log('Rendering simple graph');
  if (emptyState) {
    emptyState.style.display = 'none';
  }
  
  renderSimpleGraph(canvas, graphNodes, savedData);
}

function resetGraphView() {
  renderGraph();
}

function setGraphLayout(layout) {
  document.querySelectorAll('.graph-control-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  document.getElementById(`layout-${layout}`).classList.add('active');
  
  // For now, just re-render with the same layout
  renderGraph();
}

function renderSimpleGraph(container, graphData, weaverData) {
  // Clear container
  container.innerHTML = '';
  
  // Create a simple grid-based layout
  const nodes = graphData.nodes || [];
  const relationships = graphData.relationships || [];
  
  // Create nodes container
  const nodesContainer = document.createElement('div');
  nodesContainer.className = 'simple-graph-nodes';
  nodesContainer.innerHTML = `
    <style>
      .simple-graph-nodes {
        display: flex;
        flex-wrap: wrap;
        gap: 16px;
        padding: 20px;
        justify-content: center;
        align-items: flex-start;
      }
      .simple-node {
        background: var(--card);
        border: 2px solid var(--border);
        border-radius: var(--radius);
        padding: 12px 16px;
        min-width: 120px;
        text-align: center;
        cursor: pointer;
        transition: all 0.2s ease;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }
      .simple-node:hover {
        border-color: var(--green-accent);
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(34, 197, 94, 0.15);
      }
      .simple-node-name {
        font-weight: var(--font-weight-medium);
        font-size: 14px;
        margin-bottom: 4px;
        color: var(--card-foreground);
      }
      .simple-node-type {
        font-size: 11px;
        color: var(--muted-foreground);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .simple-node-description {
        font-size: 12px;
        color: var(--muted-foreground);
        margin-top: 8px;
        line-height: 1.3;
        max-height: 60px;
        overflow: hidden;
      }
      
      /* Node type colors */
      .simple-node.type-person { border-color: #3B82F6; background: rgba(59, 130, 246, 0.05); }
      .simple-node.type-concept { border-color: #10B981; background: rgba(16, 185, 129, 0.05); }
      .simple-node.type-organization { border-color: #8B5CF6; background: rgba(139, 92, 246, 0.05); }
      .simple-node.type-topic { border-color: #F59E0B; background: rgba(245, 158, 11, 0.05); }
      .simple-node.type-location { border-color: #EF4444; background: rgba(239, 68, 68, 0.05); }
      .simple-node.type-event { border-color: #EC4899; background: rgba(236, 72, 153, 0.05); }
      .simple-node.type-document { border-color: #6B7280; background: rgba(107, 114, 128, 0.05); }
      .simple-node.type-datetime { border-color: #06B6D4; background: rgba(6, 182, 212, 0.05); }
      .simple-node.type-phonenumber { border-color: #84CC16; background: rgba(132, 204, 22, 0.05); }
    </style>
  `;
  
  // Add nodes
  nodes.forEach(node => {
    const nodeElement = document.createElement('div');
    nodeElement.className = `simple-node type-${node.type.toLowerCase().replace(/\s+/g, '')}`;
    nodeElement.innerHTML = `
      <div class="simple-node-name">${escapeHtml(node.name)}</div>
      <div class="simple-node-type">${escapeHtml(node.type)}</div>
      <div class="simple-node-description">${escapeHtml(node.description || '')}</div>
    `;
    
    // Add click handler
    nodeElement.addEventListener('click', () => {
      showNodeDetails(node, weaverData);
    });
    
    nodesContainer.appendChild(nodeElement);
  });
  
  container.appendChild(nodesContainer);
  
  // Show relationships summary if any exist
  if (relationships.length > 0) {
    const relationshipsContainer = document.createElement('div');
    relationshipsContainer.className = 'simple-relationships';
    relationshipsContainer.innerHTML = `
      <style>
        .simple-relationships {
          margin-top: 20px;
          padding: 16px 20px;
          background: var(--muted);
          border-radius: var(--radius);
          margin: 20px;
        }
        .relationships-title {
          font-weight: var(--font-weight-medium);
          margin-bottom: 12px;
          color: var(--card-foreground);
          font-size: 14px;
        }
        .relationship-item {
          font-size: 12px;
          color: var(--muted-foreground);
          margin-bottom: 6px;
          padding: 4px 8px;
          background: var(--card);
          border-radius: calc(var(--radius) / 2);
          border: 1px solid var(--border);
        }
        .relationship-type {
          color: var(--green-accent);
          font-weight: var(--font-weight-medium);
        }
      </style>
      <div class="relationships-title">Relationships (${relationships.length})</div>
    `;
    
    relationships.slice(0, 10).forEach(rel => {
      const fromNode = nodes.find(n => n.id === rel.fromNode);
      const toNode = nodes.find(n => n.id === rel.toNode);
      
      if (fromNode && toNode) {
        const relElement = document.createElement('div');
        relElement.className = 'relationship-item';
        relElement.innerHTML = `
          <strong>${escapeHtml(fromNode.name)}</strong> 
          <span class="relationship-type">${escapeHtml(rel.relationshipType)}</span> 
          <strong>${escapeHtml(toNode.name)}</strong>
        `;
        relationshipsContainer.appendChild(relElement);
      }
    });
    
    if (relationships.length > 10) {
      const moreElement = document.createElement('div');
      moreElement.className = 'relationship-item';
      moreElement.style.fontStyle = 'italic';
      moreElement.textContent = `... and ${relationships.length - 10} more relationships`;
      relationshipsContainer.appendChild(moreElement);
    }
    
    container.appendChild(relationshipsContainer);
  }
}

function showNodeDetails(node, weaverData) {
  // Find all snippets that contain this node
  const relatedSnippets = weaverData.filter(snippet => 
    snippet.nodes && snippet.nodes.some(n => n.id === node.id || n.name.toLowerCase() === node.name.toLowerCase())
  );
  
  showNodeModal(node, relatedSnippets);
}

function showSnippetModal(snippet) {
  const modal = document.getElementById('modal');
  const modalTitle = document.getElementById('modal-title');
  const modalText = document.getElementById('modal-text');
  const modalMeta = document.getElementById('modal-meta');
  
  modalTitle.textContent = 'Saved Text';
  modalText.textContent = snippet.text;
  
  // Show metadata
  const domain = extractDomain(snippet.sourceUrl);
  const timeAgo = formatTimeAgo(snippet.timestamp);
  const nodeInfo = snippet.nodes && snippet.nodes.length > 0 
    ? `\n\nExtracted Concepts: ${snippet.nodes.map(n => n.name).join(', ')}`
    : '';
  
  modalMeta.textContent = `Source: ${domain}\nSaved: ${timeAgo}${nodeInfo}`;
  if (modalMeta) {
    modalMeta.classList.remove('hidden');
  }
  
  modal.classList.remove('hidden');
}

function showNodeModal(node, relatedSnippets) {
  const modal = document.getElementById('modal');
  const modalTitle = document.getElementById('modal-title');
  const modalText = document.getElementById('modal-text');
  const modalMeta = document.getElementById('modal-meta');
  
  modalTitle.textContent = node.name;
  modalText.textContent = `${node.description}\n\n--- Related Content ---\n\n` + 
    relatedSnippets.map((snippet, i) => 
      `${i + 1}. ${snippet.text.slice(0, 200)}${snippet.text.length > 200 ? '...' : ''}\n   (from ${extractDomain(snippet.sourceUrl)})`
    ).join('\n\n');
  
  modalMeta.textContent = `Type: ${node.type}\nFound in ${relatedSnippets.length} saved snippet${relatedSnippets.length !== 1 ? 's' : ''}`;
  if (modalMeta) {
    modalMeta.classList.remove('hidden');
  }
  
  modal.classList.remove('hidden');
}

function extractDomain(url) {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return 'Unknown';
  }
}

function formatTimeAgo(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function closeModal() {
  document.getElementById('modal').classList.add('hidden');
  const modalMeta = document.getElementById('modal-meta');
  if (modalMeta) {
    modalMeta.classList.add('hidden');
  }
}

function deleteSnippet(id) {
  chrome.storage.local.get(['weaverData', 'graphData'], function(result) {
    const updatedWeaverData = (result.weaverData || []).filter(snippet => snippet.id !== id);
    
    // Rebuild graph data from remaining snippets
    const updatedGraphData = rebuildGraphData(updatedWeaverData);
    
    chrome.storage.local.set({ 
      weaverData: updatedWeaverData,
      graphData: updatedGraphData 
    }, function() {
      loadData();
    });
  });
}

function clearAllSnippets() {
  if (confirm('Are you sure you want to clear all saved snippets?')) {
    chrome.storage.local.set({ 
      weaverData: [],
      graphData: { nodes: [], relationships: [] }
    }, function() {
      loadData();
    });
  }
}

function rebuildGraphData(snippets) {
  const allNodes = [];
  const allRelationships = [];
  
  snippets.forEach(snippet => {
    if (snippet.nodes) {
      snippet.nodes.forEach(node => {
        const exists = allNodes.find(n => 
          n.name.toLowerCase() === node.name.toLowerCase() || n.id === node.id
        );
        if (!exists) {
          allNodes.push(node);
        }
      });
    }
    
    if (snippet.relationships) {
      snippet.relationships.forEach(rel => {
        const exists = allRelationships.find(r =>
          r.fromNode === rel.fromNode && 
          r.toNode === rel.toNode &&
          r.relationshipType === rel.relationshipType
        );
        if (!exists) {
          allRelationships.push(rel);
        }
      });
    }
  });
  
  return { nodes: allNodes, relationships: allRelationships };
}