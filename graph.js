document.addEventListener('DOMContentLoaded', function() {
  loadGraphData();
  setupEventListeners();
});

let graphData = { nodes: [], relationships: [] };
let weaverData = [];
let selectedNode = null;
let filteredNodes = [];

function setupEventListeners() {
  const searchInput = document.getElementById('search-input');
  searchInput.addEventListener('input', (e) => {
    filterNodes(e.target.value);
  });
}

function loadGraphData() {
  chrome.storage.local.get(['weaverData', 'graphData'], function(result) {
    weaverData = result.weaverData || [];
    graphData = result.graphData || { nodes: [], relationships: [] };
    
    console.log('Graph page loaded data:', {
      snippetCount: weaverData.length,
      nodeCount: graphData.nodes.length,
      relationshipCount: graphData.relationships.length
    });
    
    // Initialize with top 7 nodes
    filteredNodes = getTopNodesByRelationships(7);
    
    updateStats();
    renderNodes();
  });
}

function updateStats() {
  const displayedNodesCount = filteredNodes.length;
  const totalNodesCount = graphData.nodes.length;
  
  // Show "displayed/total" if filtering is active, otherwise just total
  if (displayedNodesCount < totalNodesCount) {
    document.getElementById('nodes-count').textContent = `${displayedNodesCount}/${totalNodesCount}`;
  } else {
    document.getElementById('nodes-count').textContent = totalNodesCount;
  }
  
  document.getElementById('relationships-count').textContent = graphData.relationships.length;
  document.getElementById('snippets-count').textContent = weaverData.length;
}

function filterNodes(query) {
  if (!query.trim()) {
    // Show top 7 nodes with most relationships when no search query
    filteredNodes = getTopNodesByRelationships(7);
  } else {
    const lowerQuery = query.toLowerCase();
    filteredNodes = graphData.nodes.filter(node => 
      node.name.toLowerCase().includes(lowerQuery) ||
      node.type.toLowerCase().includes(lowerQuery) ||
      node.description.toLowerCase().includes(lowerQuery)
    );
  }
  renderNodes();
  updateStats();
}

function getTopNodesByRelationships(limit = 7) {
  if (graphData.nodes.length === 0) return [];
  
  // Count relationships for each node
  const nodeRelationshipCounts = graphData.nodes.map(node => {
    const relationshipCount = graphData.relationships.filter(rel => 
      rel.fromNode === node.id || rel.toNode === node.id
    ).length;
    
    return {
      ...node,
      relationshipCount
    };
  });
  
  // Sort by relationship count (descending) and take top nodes
  return nodeRelationshipCounts
    .sort((a, b) => b.relationshipCount - a.relationshipCount)
    .slice(0, Math.min(limit, nodeRelationshipCounts.length))
    .map(({ relationshipCount, ...node }) => node); // Remove the count property
}

function renderNodes() {
  const container = document.getElementById('nodes-container');
  const nodes = filteredNodes.length > 0 ? filteredNodes : graphData.nodes;
  
  if (nodes.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>No concepts found</h3>
        <p>Save some text content to build your knowledge graph</p>
      </div>
    `;
    return;
  }
  
  // Create the network visualization
  container.innerHTML = `
    <div class="graph-network">
      <svg id="network-svg" width="100%" height="500">
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" 
                  refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="var(--green-accent)" opacity="0.6" />
          </marker>
        </defs>
        <g id="edges-group"></g>
        <g id="edge-labels-group"></g>
        <g id="nodes-group"></g>
      </svg>
    </div>
    ${renderRelationships()}
  `;
  
  createNetworkVisualization(nodes);
}

function createNetworkVisualization(nodes) {
  const svg = document.getElementById('network-svg');
  const rect = svg.getBoundingClientRect();
  const width = rect.width;
  const height = 500;
  
  // Position nodes in a circle layout initially
  const positions = layoutNodes(nodes, width, height);
  
  // Get valid relationships for the filtered nodes
  const nodeIds = new Set(nodes.map(n => n.id));
  const validRelationships = graphData.relationships.filter(rel => 
    nodeIds.has(rel.fromNode) && nodeIds.has(rel.toNode)
  );
  
  // Clear existing content
  document.getElementById('edges-group').innerHTML = '';
  document.getElementById('edge-labels-group').innerHTML = '';
  document.getElementById('nodes-group').innerHTML = '';
  
  // Draw edges first (so they appear behind nodes)
  validRelationships.forEach(rel => {
    const fromPos = positions.find(p => p.id === rel.fromNode);
    const toPos = positions.find(p => p.id === rel.toNode);
    
    if (fromPos && toPos) {
      createEdge(fromPos, toPos, rel);
    }
  });
  
  // Draw nodes
  nodes.forEach(node => {
    const pos = positions.find(p => p.id === node.id);
    if (pos) {
      createNode(node, pos.x, pos.y);
    }
  });
}

function layoutNodes(nodes, width, height) {
  const positions = [];
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) * 0.3;
  
  if (nodes.length === 1) {
    positions.push({ id: nodes[0].id, x: centerX, y: centerY });
  } else if (nodes.length === 2) {
    positions.push({ id: nodes[0].id, x: centerX - 100, y: centerY });
    positions.push({ id: nodes[1].id, x: centerX + 100, y: centerY });
  } else {
    nodes.forEach((node, i) => {
      const angle = (i / nodes.length) * 2 * Math.PI;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      positions.push({ id: node.id, x, y });
    });
  }
  
  return positions;
}

function createEdge(fromPos, toPos, relationship) {
  const edgesGroup = document.getElementById('edges-group');
  const labelsGroup = document.getElementById('edge-labels-group');
  
  // Calculate edge positions (from node edge to node edge, not center to center)
  const nodeRadius = 50;
  const dx = toPos.x - fromPos.x;
  const dy = toPos.y - fromPos.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  if (distance === 0) return; // Same position
  
  const unitX = dx / distance;
  const unitY = dy / distance;
  
  const startX = fromPos.x + unitX * nodeRadius;
  const startY = fromPos.y + unitY * nodeRadius;
  const endX = toPos.x - unitX * nodeRadius;
  const endY = toPos.y - unitY * nodeRadius;
  
  // Create line
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  line.setAttribute('x1', startX);
  line.setAttribute('y1', startY);
  line.setAttribute('x2', endX);
  line.setAttribute('y2', endY);
  line.setAttribute('stroke', 'var(--green-accent)');
  line.setAttribute('stroke-width', '2');
  line.setAttribute('opacity', '0.6');
  line.setAttribute('marker-end', 'url(#arrowhead)');
  line.classList.add('graph-edge');
  
  edgesGroup.appendChild(line);
  
  // Create label positioned along the line
  const midX = (startX + endX) / 2;
  const midY = (startY + endY) / 2;
  
  // Calculate the angle of the line
  const angle = Math.atan2(endY - startY, endX - startX) * 180 / Math.PI;
  
  // Create a group for the label to apply transformations
  const labelGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  labelGroup.setAttribute('transform', `translate(${midX}, ${midY}) rotate(${angle})`);
  
  // Add background rectangle first
  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect.setAttribute('fill', 'var(--card)');
  rect.setAttribute('stroke', 'var(--border)');
  rect.setAttribute('stroke-width', '1');
  rect.setAttribute('rx', '4');
  rect.setAttribute('opacity', '0.95');
  
  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  text.setAttribute('x', '0');
  text.setAttribute('y', '0');
  text.setAttribute('text-anchor', 'middle');
  text.setAttribute('dominant-baseline', 'middle');
  text.setAttribute('fill', 'var(--green-accent)');
  text.setAttribute('font-size', '10px');
  text.setAttribute('font-weight', '600');
  text.textContent = relationship.relationshipType;
  text.classList.add('edge-label');
  
  // Add text to get bbox, then position rectangle
  labelGroup.appendChild(text);
  labelsGroup.appendChild(labelGroup);
  
  // Get text dimensions and adjust rectangle
  const bbox = text.getBBox();
  rect.setAttribute('x', bbox.x - 6);
  rect.setAttribute('y', bbox.y - 3);
  rect.setAttribute('width', bbox.width + 12);
  rect.setAttribute('height', bbox.height + 6);
  
  // Insert rectangle before text so it appears behind
  labelGroup.insertBefore(rect, text);
}

function createNode(node, x, y) {
  const nodesGroup = document.getElementById('nodes-group');
  
  // Create node group
  const nodeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  nodeGroup.setAttribute('transform', `translate(${x}, ${y})`);
  nodeGroup.classList.add('svg-node');
  nodeGroup.classList.add(`type-${node.type.toLowerCase().replace(/\s+/g, '')}`);
  nodeGroup.setAttribute('data-node-id', node.id);
  nodeGroup.style.cursor = 'pointer';
  
  // Create circle
  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  circle.setAttribute('r', '45');
  circle.setAttribute('fill', getNodeColor(node.type));
  circle.setAttribute('stroke', getNodeBorderColor(node.type));
  circle.setAttribute('stroke-width', selectedNode === node.id ? '3' : '2');
  circle.classList.add('node-circle');
  
  nodeGroup.appendChild(circle);
  
  // Create text
  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  text.setAttribute('text-anchor', 'middle');
  text.setAttribute('dominant-baseline', 'middle');
  text.setAttribute('fill', getNodeTextColor(node.type));
  text.setAttribute('font-size', '11px');
  text.setAttribute('font-weight', '500');
  text.style.pointerEvents = 'none';
  text.style.userSelect = 'none';
  
  // Split long names into multiple lines with better wrapping for larger circles
  const name = node.name;
  const maxCharsPerLine = 14; // Increased for larger circles
  
  if (name.length > maxCharsPerLine) {
    const words = name.split(' ');
    const lines = [];
    let currentLine = '';
    
    for (let i = 0; i < words.length; i++) {
      const testLine = currentLine + (currentLine ? ' ' : '') + words[i];
      if (testLine.length <= maxCharsPerLine) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          lines.push(currentLine);
          currentLine = words[i];
        } else {
          // Single word is too long, truncate it
          lines.push(words[i].substring(0, maxCharsPerLine - 3) + '...');
          currentLine = '';
        }
      }
    }
    if (currentLine) lines.push(currentLine);
    
    // Limit to 3 lines max
    if (lines.length > 3) {
      lines[2] = lines[2].substring(0, maxCharsPerLine - 3) + '...';
      lines.splice(3);
    }
    
    if (lines.length > 1) {
      const lineHeight = 12;
      const startY = -(lines.length - 1) * lineHeight / 2;
      
      lines.forEach((line, index) => {
        const tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
        tspan.setAttribute('x', '0');
        tspan.setAttribute('dy', index === 0 ? startY : lineHeight);
        tspan.textContent = line;
        text.appendChild(tspan);
      });
    } else {
      text.textContent = lines[0] || name;
    }
  } else {
    text.textContent = name;
  }
  
  nodeGroup.appendChild(text);
  
  // Add click handler
  nodeGroup.addEventListener('click', () => {
    selectNode(node.id);
  });
  
  // Add hover effects
  nodeGroup.addEventListener('mouseenter', () => {
    circle.setAttribute('stroke-width', '3');
    nodeGroup.style.transform = `translate(${x}, ${y}) scale(1.1)`;
  });
  
  nodeGroup.addEventListener('mouseleave', () => {
    circle.setAttribute('stroke-width', selectedNode === node.id ? '3' : '2');
    nodeGroup.style.transform = `translate(${x}, ${y}) scale(1)`;
  });
  
  nodesGroup.appendChild(nodeGroup);
}

function getNodeColor(type) {
  const colors = {
    'person': '#EBF4FF',
    'concept': '#F0FDF4', 
    'organization': '#F5F3FF',
    'topic': '#FFFBEB',
    'location': '#FEF2F2',
    'event': '#FDF2F8',
    'document': '#F9FAFB',
    'datetime': '#F0F9FF',
    'phonenumber': '#F7FEE7'
  };
  return colors[type.toLowerCase()] || colors.document;
}

function getNodeBorderColor(type) {
  const colors = {
    'person': '#3B82F6',
    'concept': '#10B981',
    'organization': '#8B5CF6', 
    'topic': '#F59E0B',
    'location': '#EF4444',
    'event': '#EC4899',
    'document': '#6B7280',
    'datetime': '#06B6D4',
    'phonenumber': '#84CC16'
  };
  return colors[type.toLowerCase()] || colors.document;
}

function getNodeTextColor(type) {
  const colors = {
    'person': '#1E40AF',
    'concept': '#065F46',
    'organization': '#5B21B6',
    'topic': '#D97706',
    'location': '#B91C1C', 
    'event': '#BE185D',
    'document': '#374151',
    'datetime': '#0C4A6E',
    'phonenumber': '#365314'
  };
  return colors[type.toLowerCase()] || colors.document;
}

function renderRelationships() {
  if (graphData.relationships.length === 0) {
    return '';
  }
  
  return `
    <div class="relationships-section">
      <div class="relationships-title">
        Relationships (${graphData.relationships.length})
      </div>
      ${graphData.relationships.slice(0, 15).map(rel => {
        const fromNode = graphData.nodes.find(n => n.id === rel.fromNode);
        const toNode = graphData.nodes.find(n => n.id === rel.toNode);
        
        if (!fromNode || !toNode) return '';
        
        return `
          <div class="relationship">
            <strong>${escapeHtml(fromNode.name)}</strong>
            <div class="relationship-type">${escapeHtml(rel.relationshipType)}</div>
            <strong>${escapeHtml(toNode.name)}</strong>
          </div>
        `;
      }).join('')}
      ${graphData.relationships.length > 15 ? `
        <div style="text-align: center; color: var(--muted-foreground); font-size: 12px; margin-top: 12px;">
          ... and ${graphData.relationships.length - 15} more relationships
        </div>
      ` : ''}
    </div>
  `;
}

function selectNode(nodeId) {
  selectedNode = selectedNode === nodeId ? null : nodeId;
  
  // Update the visual selection in the SVG
  document.querySelectorAll('.svg-node').forEach(node => {
    const circle = node.querySelector('.node-circle');
    if (node.dataset.nodeId === selectedNode) {
      circle.setAttribute('stroke-width', '3');
      node.classList.add('selected');
    } else {
      circle.setAttribute('stroke-width', '2');
      node.classList.remove('selected');
    }
  });
  
  renderSuggestions();
}

function renderSuggestions() {
  const container = document.getElementById('suggestions-container');
  
  if (!selectedNode) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>Select a concept</h3>
        <p>Click on any concept to see related content and suggestions</p>
      </div>
    `;
    return;
  }
  
  const node = graphData.nodes.find(n => n.id === selectedNode);
  if (!node) return;
  
  // Find related snippets
  const relatedSnippets = weaverData.filter(snippet => 
    snippet.nodes && snippet.nodes.some(n => n.id === node.id || n.name.toLowerCase() === node.name.toLowerCase())
  );
  
  // Find connected nodes
  const connectedRelationships = graphData.relationships.filter(rel => 
    rel.fromNode === selectedNode || rel.toNode === selectedNode
  );
  
  const connectedNodes = connectedRelationships.map(rel => {
    const connectedNodeId = rel.fromNode === selectedNode ? rel.toNode : rel.fromNode;
    const connectedNode = graphData.nodes.find(n => n.id === connectedNodeId);
    return { relationship: rel, node: connectedNode };
  }).filter(item => item.node);
  
  container.innerHTML = `
    <div class="suggestion">
      <div class="suggestion-header">
        <div class="suggestion-title">📍 ${escapeHtml(node.name)}</div>
        <div class="relevance-badge">${node.type}</div>
      </div>
      <div class="suggestion-snippet">${escapeHtml(node.description)}</div>
      <div class="suggestion-reason">
        Found in ${relatedSnippets.length} snippet${relatedSnippets.length !== 1 ? 's' : ''}
        ${connectedNodes.length > 0 ? ` • Connected to ${connectedNodes.length} concept${connectedNodes.length !== 1 ? 's' : ''}` : ''}
      </div>
    </div>
    
    ${connectedNodes.length > 0 ? `
      <div style="margin: 16px 0; font-weight: 500; color: var(--card-foreground);">
        🔗 Connected Concepts
      </div>
      ${connectedNodes.map(({ relationship, node: connectedNode }) => `
        <div class="suggestion">
          <div class="suggestion-header">
            <div class="suggestion-title">${escapeHtml(connectedNode.name)}</div>
            <div class="relevance-badge">${escapeHtml(relationship.relationshipType)}</div>
          </div>
          <div class="suggestion-snippet">${escapeHtml(connectedNode.description)}</div>
          <div class="suggestion-reason">
            ${escapeHtml(relationship.description)}
          </div>
        </div>
      `).join('')}
    ` : ''}
    
    ${relatedSnippets.length > 0 ? `
      <div style="margin: 16px 0; font-weight: 500; color: var(--card-foreground);">
        📄 Related Content (${relatedSnippets.length})
      </div>
      ${relatedSnippets.slice(0, 5).map((snippet, index) => {
        const domain = extractDomain(snippet.sourceUrl);
        const timeAgo = formatTimeAgo(snippet.timestamp);
        const preview = snippet.text.slice(0, 150) + (snippet.text.length > 150 ? '...' : '');
        
        return `
          <div class="suggestion" style="cursor: pointer;" onclick="showSnippetDetail('${snippet.id}')">
            <div class="suggestion-header">
              <div class="suggestion-title">Snippet ${index + 1} from ${escapeHtml(domain)}</div>
              <div class="relevance-badge">${timeAgo}</div>
            </div>
            <div class="suggestion-snippet">${escapeHtml(preview)}</div>
            <div class="suggestion-reason">
              Contains references to "${escapeHtml(node.name)}"
            </div>
          </div>
        `;
      }).join('')}
      ${relatedSnippets.length > 5 ? `
        <div style="text-align: center; color: var(--muted-foreground); font-size: 12px; margin-top: 12px;">
          ... and ${relatedSnippets.length - 5} more related snippets
        </div>
      ` : ''}
    ` : ''}
  `;
}

function showSnippetDetail(snippetId) {
  const snippet = weaverData.find(s => s.id === snippetId);
  if (!snippet) return;
  
  // Create a modal to show full snippet content
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    backdrop-filter: blur(4px);
  `;
  
  const domain = extractDomain(snippet.sourceUrl);
  const timeAgo = formatTimeAgo(snippet.timestamp);
  
  modal.innerHTML = `
    <div style="
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: calc(var(--radius) + 4px);
      padding: 24px;
      max-width: 90%;
      max-height: 90%;
      overflow-y: auto;
      position: relative;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    ">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h3 style="margin: 0; color: var(--card-foreground);">Saved Text</h3>
        <button onclick="this.closest('div').parentElement.remove()" style="
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: var(--muted-foreground);
          padding: 4px;
          border-radius: 4px;
          line-height: 1;
        ">&times;</button>
      </div>
      <div style="
        font-size: 14px;
        line-height: 1.6;
        color: var(--card-foreground);
        white-space: pre-wrap;
        word-break: break-word;
        margin-bottom: 16px;
      ">${escapeHtml(snippet.text)}</div>
      <div style="
        background: var(--muted);
        border-radius: var(--radius);
        padding: 12px;
        font-size: 12px;
        color: var(--muted-foreground);
      ">
        <strong>Source:</strong> ${escapeHtml(domain)}<br>
        <strong>Saved:</strong> ${timeAgo}
        ${snippet.nodes && snippet.nodes.length > 0 ? `<br><strong>Concepts:</strong> ${snippet.nodes.map(n => n.name).join(', ')}` : ''}
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Close on background click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
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