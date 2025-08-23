document.addEventListener('DOMContentLoaded', function() {
  loadSnippets();
  
  document.getElementById('clear-all').addEventListener('click', clearAllSnippets);
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal').addEventListener('click', function(e) {
    if (e.target === this) {
      closeModal();
    }
  });
});

function loadSnippets() {
  chrome.storage.local.get(['weaverData'], function(result) {
    const weaverData = result.weaverData || [];
    updateCount(weaverData.length);
    renderSnippets(weaverData);
  });
}

function updateCount(count) {
  const countElement = document.getElementById('count');
  countElement.textContent = `${count} saved snippet${count !== 1 ? 's' : ''}`;
  
  const clearButton = document.getElementById('clear-all');
  clearButton.disabled = count === 0;
}

function renderSnippets(snippets) {
  const container = document.getElementById('snippets-container');
  const emptyState = document.getElementById('empty-state');
  
  if (snippets.length === 0) {
    emptyState.style.display = 'block';
    return;
  }
  
  emptyState.style.display = 'none';
  
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
          showFullText(snippet.text);
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

function showFullText(text) {
  document.getElementById('modal-text').textContent = text;
  document.getElementById('modal').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('modal').classList.add('hidden');
}

function deleteSnippet(id) {
  chrome.storage.local.get(['weaverData'], function(result) {
    const weaverData = result.weaverData || [];
    const updatedData = weaverData.filter(snippet => snippet.id !== id);
    
    chrome.storage.local.set({ weaverData: updatedData }, function() {
      loadSnippets();
    });
  });
}

function clearAllSnippets() {
  if (confirm('Are you sure you want to clear all saved snippets?')) {
    chrome.storage.local.set({ weaverData: [] }, function() {
      loadSnippets();
    });
  }
}