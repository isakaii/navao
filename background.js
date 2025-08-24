// Import configuration
importScripts('config.js');

// Optional: Keep context menu for users who prefer right-click to save selected text
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "saveToWeaver",
    title: "Save Selection to Weaver",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "saveToWeaver" && info.selectionText) {
    saveTextToWeaver(info.selectionText, tab.url);
  }
});

// Handle messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'savePageContent') {
    savePageContentToWeaver(message.content)
      .then(() => sendResponse({ success: true }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true; // Keep the message channel open for async response
  }
});

async function savePageContentToWeaver(pageContent) {
  console.log('savePageContentToWeaver called with:', pageContent);
  
  const text = pageContent.text;
  const sourceUrl = pageContent.url;
  
  return saveTextToWeaver(text, sourceUrl);
}

async function saveTextToWeaver(text, sourceUrl) {
  console.log('saveTextToWeaver called with:', { text, sourceUrl });
  
  try {
    // Get existing data to pass to Gemini for context
    const result = await chrome.storage.local.get(['weaverData', 'graphData']);
    const weaverData = result.weaverData || [];
    const graphData = result.graphData || { nodes: [], relationships: [] };
    
    console.log('Existing graph data:', graphData);
    
    // Extract nodes and relationships using Gemini
    console.log('Calling Gemini API for extraction...');
    const extractedGraph = await extractNodesAndRelationshipsInBackground(text, graphData.nodes, graphData.relationships);
    
    console.log('Extracted graph:', extractedGraph);
    
    // Create the saved item with original text as payload
    const savedItem = {
      text: text,
      timestamp: Date.now(),
      sourceUrl: sourceUrl,
      id: generateId(),
      nodes: extractedGraph.nodes || [],
      relationships: extractedGraph.relationships || []
    };
    
    // Update weaverData and graphData
    weaverData.push(savedItem);
    
    // Merge new nodes and relationships with existing ones
    const updatedGraphData = mergeGraphData(graphData, extractedGraph);
    
    console.log('Final graph data to save:', updatedGraphData);
    
    chrome.storage.local.set({ 
      weaverData: weaverData,
      graphData: updatedGraphData 
    }, () => {
      console.log('Data saved successfully, creating notification...');
      showSaveNotification(text);
    });
    
  } catch (error) {
    console.error('Error saving to weaver:', error);
    // Fallback to old method if extraction fails
    const savedItem = {
      text: text,
      timestamp: Date.now(),
      sourceUrl: sourceUrl,
      id: generateId(),
      nodes: [],
      relationships: []
    };
    
    chrome.storage.local.get(['weaverData'], (result) => {
      const weaverData = result.weaverData || [];
      weaverData.push(savedItem);
      chrome.storage.local.set({ weaverData: weaverData }, () => {
        console.log('Saved with fallback method (no graph extraction)');
        showSaveNotification(text);
      });
    });
  }
}

async function extractNodesAndRelationshipsInBackground(text, existingNodes = [], existingRelationships = []) {
  const existingContext = formatExistingGraph(existingNodes, existingRelationships);
  
  const systemPrompt = `You are an expert knowledge graph extraction system. Analyze the provided text and extract meaningful nodes (entities/concepts) and their relationships.

EXISTING GRAPH CONTEXT:
${existingContext}

NEW TEXT TO ANALYZE:
"${text}"

INSTRUCTIONS:
1. Extract 3-7 key nodes (entities, concepts, people, organizations, topics) from the text
2. Identify meaningful relationships between nodes (both within the new text and connections to existing nodes)
3. Each node should have: name, type (person, concept, organization, topic, etc.), description
4. Each relationship should have: fromNode, toNode, relationshipType, description
5. Consider the existing graph context to avoid duplicates and find connections
6. IMPORTANT: Look for conceptual relationships between related terms across different snippets. For example:
   - "Artificial Intelligence" and "Machine Learning" should be connected (e.g., "Machine Learning" is a "subset of" "Artificial Intelligence")
   - "Python" and "Programming" should be connected (e.g., "Python" is a "type of" "Programming Language")
   - "Neural Networks" and "Deep Learning" should be connected (e.g., "Neural Networks" are "fundamental to" "Deep Learning")
   - "Data Science" and "Statistics" should be connected (e.g., "Data Science" "relies on" "Statistics")
7. Use relationship types like: "subset of", "type of", "part of", "related to", "uses", "implements", "applies", "fundamental to", "relies on", "enables", "includes"
8. When you find a concept in the new text that is semantically related to an existing node, create a relationship even if they weren't mentioned together
9. Prioritize creating cross-snippet conceptual connections that build a more interconnected knowledge graph

Return a JSON object with this exact structure:
{
  "nodes": [
    {
      "id": "unique_id",
      "name": "Node Name", 
      "type": "node_type",
      "description": "Brief description"
    }
  ],
  "relationships": [
    {
      "id": "unique_id",
      "fromNode": "node_id",
      "toNode": "node_id",
      "relationshipType": "relationship_type", 
      "description": "Relationship description"
    }
  ]
}

Return ONLY the JSON object, no explanation.`;

  try {
    const response = await callGeminiAPI(systemPrompt);
    const cleanResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleanResponse);
  } catch (error) {
    console.error('Error extracting nodes and relationships:', error);
    return { nodes: [], relationships: [] };
  }
}

async function callGeminiAPI(prompt) {
  console.log('Making Gemini API call...');
  console.log('API URL:', `${CONFIG.GEMINI_API_URL}?key=${CONFIG.GEMINI_API_KEY}`);
  
  const response = await fetch(`${CONFIG.GEMINI_API_URL}?key=${CONFIG.GEMINI_API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: prompt
        }]
      }]
    })
  });
  
  console.log('Gemini API response status:', response.status);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('Gemini API error response:', errorText);
    throw new Error(`Gemini API request failed: ${response.status} - ${errorText}`);
  }
  
  const data = await response.json();
  console.log('Gemini API response data:', data);
  
  const result = data.candidates[0]?.content?.parts[0]?.text;
  console.log('Extracted text from Gemini:', result);
  
  return result;
}

function formatExistingGraph(nodes, relationships) {
  if (!nodes.length && !relationships.length) {
    return 'No existing graph data.';
  }
  
  let context = 'EXISTING NODES:\n';
  nodes.forEach(node => {
    context += `- ${node.name} (${node.type}): ${node.description}\n`;
  });
  
  if (relationships.length) {
    context += '\nEXISTING RELATIONSHIPS:\n';
    relationships.forEach(rel => {
      context += `- ${rel.fromNode} ${rel.relationshipType} ${rel.toNode}: ${rel.description}\n`;
    });
  }
  
  return context;
}

function mergeGraphData(existingGraph, newGraph) {
  const mergedNodes = [...existingGraph.nodes];
  const mergedRelationships = [...existingGraph.relationships];
  
  // Add new nodes, avoiding duplicates
  newGraph.nodes.forEach(newNode => {
    const exists = mergedNodes.find(existing => 
      existing.name.toLowerCase() === newNode.name.toLowerCase() || 
      existing.id === newNode.id
    );
    if (!exists) {
      mergedNodes.push(newNode);
    }
  });
  
  // Add new relationships, avoiding duplicates
  newGraph.relationships.forEach(newRel => {
    const exists = mergedRelationships.find(existing =>
      existing.fromNode === newRel.fromNode && 
      existing.toNode === newRel.toNode &&
      existing.relationshipType === newRel.relationshipType
    );
    if (!exists) {
      mergedRelationships.push(newRel);
    }
  });
  
  return { nodes: mergedNodes, relationships: mergedRelationships };
}

function showSaveNotification(text) {
  chrome.notifications.getPermissionLevel((level) => {
    console.log('Notification permission level:', level);
    
    if (level === 'granted') {
      const notificationId = 'weaver-' + Date.now();
      console.log('Creating notification with ID:', notificationId);
      
      chrome.notifications.create(notificationId, {
        type: 'basic',
        iconUrl: 'logo.png',
        title: 'Saved to Weaver!',
        message: `"${text.slice(0, 50)}${text.length > 50 ? '...' : ''}" has been saved.`,
        contextMessage: 'Text snippet saved successfully'
      }, (createdId) => {
        if (chrome.runtime.lastError) {
          console.error('Notification error:', chrome.runtime.lastError);
          console.log('Trying fallback notification...');
          
          // Fallback notification with minimal setup
          chrome.notifications.create('weaver-fallback-' + Date.now(), {
            type: 'basic',
            iconUrl: '',
            title: 'Saved to Weaver!',
            message: `Text saved successfully!`
          }, (fallbackId) => {
            if (chrome.runtime.lastError) {
              console.error('Fallback notification also failed:', chrome.runtime.lastError);
            } else {
              console.log('Fallback notification created:', fallbackId);
            }
          });
        } else {
          console.log('Notification created successfully:', createdId);
        }
      });
    } else {
      console.error('Notifications not permitted. Permission level:', level);
    }
  });
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}