document.addEventListener('DOMContentLoaded', function() {
  loadData();
  setupEventListeners();
});

let savedData = [];

function setupEventListeners() {
  document.getElementById('save-current-page').addEventListener('click', saveCurrentPage);
  document.getElementById('clear-all').addEventListener('click', clearAllSnippets);
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal').addEventListener('click', function(e) {
    if (e.target === this) {
      closeModal();
    }
  });
  
  // View Knowledge Graph button
  document.getElementById('view-graph').addEventListener('click', openKnowledgeGraph);
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
    
    updateCount(savedData.length);
    updateGraphButton(graphData.nodes.length);
    renderSnippets(savedData);
  });
}

function updateGraphButton(nodeCount) {
  const graphButton = document.getElementById('view-graph');
  if (nodeCount === 0) {
    graphButton.disabled = true;
    graphButton.textContent = 'No Knowledge Graph Yet';
  } else {
    graphButton.disabled = false;
    graphButton.textContent = `View Knowledge Graph (${nodeCount} concepts)`;
  }
}

function openKnowledgeGraph() {
  const graphUrl = chrome.runtime.getURL('graph.html');
  chrome.tabs.create({ url: graphUrl });
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
    container.innerHTML = `
      <div id="empty-state" class="empty-state">
        <h3>No saved content yet</h3>
        <p>Highlight text on any webpage and right-click to save it to Weaver</p>
      </div>
    `;
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

async function saveCurrentPage() {
  const saveButton = document.getElementById('save-current-page');
  
  try {
    // Show loading state
    saveButton.innerHTML = '⏳ Saving Page...';
    saveButton.disabled = true;
    
    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab || !tab.url) {
      throw new Error('Cannot access current tab');
    }
    
    // Skip chrome:// and extension pages
    if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
      throw new Error('Cannot save content from system pages');
    }
    
    // Inject content script to extract page content
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: extractPageContent
    });
    
    const pageContent = results[0].result;
    
    if (!pageContent || !pageContent.text.trim()) {
      throw new Error('No readable content found on this page');
    }
    
    // Save the extracted content using the existing background script function
    await chrome.runtime.sendMessage({
      action: 'savePageContent',
      content: pageContent
    });
    
    // Reload data to show the new saved content
    loadData();
    
    // Show success state briefly
    saveButton.innerHTML = '✅ Page Saved!';
    setTimeout(() => {
      saveButton.innerHTML = '💾 Save Current Page';
      saveButton.disabled = false;
    }, 2000);
    
  } catch (error) {
    console.error('Error saving page:', error);
    saveButton.innerHTML = '❌ Failed to Save';
    setTimeout(() => {
      saveButton.innerHTML = '💾 Save Current Page';
      saveButton.disabled = false;
    }, 2000);
  }
}

// This function will be injected into the page to extract content
function extractPageContent() {
  // Get the page title
  const title = document.title;
  
  // Get the main content - try multiple strategies
  let mainContent = '';
  
  // Strategy 1: Look for main content containers
  const contentSelectors = [
    'article',
    'main',
    '[role="main"]',
    '.content',
    '.main-content',
    '.post-content',
    '.entry-content',
    '#content',
    '.container'
  ];
  
  for (const selector of contentSelectors) {
    const element = document.querySelector(selector);
    if (element) {
      mainContent = element.innerText.trim();
      if (mainContent.length > 200) {
        break;
      }
    }
  }
  
  // Strategy 2: If no main content found, get body text but filter out navigation
  if (!mainContent || mainContent.length < 200) {
    // Clone body to manipulate without affecting the page
    const bodyClone = document.body.cloneNode(true);
    
    // Remove unwanted elements
    const unwantedSelectors = [
      'nav', 'header', 'footer', 'aside',
      '.navigation', '.nav', '.menu', '.sidebar',
      '.header', '.footer', '.ads', '.advertisement',
      'script', 'style', 'noscript'
    ];
    
    unwantedSelectors.forEach(selector => {
      const elements = bodyClone.querySelectorAll(selector);
      elements.forEach(el => el.remove());
    });
    
    mainContent = bodyClone.innerText.trim();
  }
  
  // Clean up the content
  mainContent = mainContent
    .replace(/\s+/g, ' ')  // Replace multiple whitespace with single space
    .replace(/\n\s*\n/g, '\n\n')  // Clean up line breaks
    .trim();
  
  // Limit content length (to avoid overwhelming the AI)
  const maxLength = 5000;
  if (mainContent.length > maxLength) {
    mainContent = mainContent.substring(0, maxLength) + '...';
  }
  
  return {
    title,
    text: mainContent,
    url: window.location.href,
    timestamp: Date.now()
  };
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