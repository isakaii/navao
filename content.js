let weaverButton = null;

function init() {
  console.log('Weaver content script loaded');
  waitForChatGPTInterface();
}

function waitForChatGPTInterface() {
  const checkForInterface = () => {
    const textarea = findChatGPTTextarea();
    if (textarea) {
      setupWeaverButton(textarea);
    } else {
      setTimeout(checkForInterface, 1000);
    }
  };
  checkForInterface();
}

function findChatGPTTextarea() {
  const selectors = [
    '#prompt-textarea',
    '[data-id="root"] textarea',
    'textarea[placeholder*="Message"]',
    'textarea[placeholder*="Send a message"]',
    'div[contenteditable="true"]',
    '[role="textbox"]'
  ];
  
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      return element;
    }
  }
  return null;
}

function setupWeaverButton(textarea) {
  if (weaverButton) {
    weaverButton.remove();
  }
  
  // Find the send button container to position our button nearby
  const sendButton = findSendButton();
  if (!sendButton) {
    setTimeout(() => setupWeaverButton(textarea), 1000);
    return;
  }
  
  // Create Weaver optimization button
  weaverButton = document.createElement('button');
  weaverButton.innerHTML = `<img src="${chrome.runtime.getURL('logo.png')}" style="width: 16px; height: 16px; margin-right: 6px; vertical-align: middle; border-radius: 2px;" />Optimize`;
  weaverButton.style.cssText = `
    background: #ffffff;
    color: #030213;
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 8px;
    padding: 8px 12px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    margin-right: 12px;
    display: inline-flex;
    transition: all 0.2s ease;
    z-index: 9999;
    position: relative;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
    line-height: 1 !important;
    white-space: nowrap !important;
    align-items: center;
    flex-direction: row !important;
    flex-wrap: nowrap !important;
    min-width: fit-content;
    width: auto;
    overflow: visible;
  `;
  
  weaverButton.addEventListener('mouseenter', () => {
    weaverButton.style.background = '#f8f9fa';
    weaverButton.style.borderColor = '#030213';
    weaverButton.style.transform = 'translateY(-1px)';
    weaverButton.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.15)';
  });
  
  weaverButton.addEventListener('mouseleave', () => {
    weaverButton.style.background = '#ffffff';
    weaverButton.style.borderColor = 'rgba(0, 0, 0, 0.1)';
    weaverButton.style.transform = 'translateY(0)';
    weaverButton.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
  });
  
  weaverButton.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Weaver optimize button clicked');
    optimizePromptWithWeaver(textarea);
  });
  
  // Insert button before send button
  sendButton.parentNode.insertBefore(weaverButton, sendButton);
  
  // Show/hide button based on textarea content
  const updateButtonVisibility = () => {
    const content = getTextareaValue(textarea);
    weaverButton.style.display = content.trim() ? 'inline-flex' : 'none';
  };
  
  // Monitor textarea for changes
  if (textarea.tagName === 'TEXTAREA') {
    textarea.addEventListener('input', updateButtonVisibility);
  } else {
    const observer = new MutationObserver(updateButtonVisibility);
    observer.observe(textarea, {
      childList: true,
      subtree: true,
      characterData: true
    });
    textarea.addEventListener('input', updateButtonVisibility);
  }
  
  // Check for new interface periodically
  setTimeout(() => {
    const currentTextarea = findChatGPTTextarea();
    if (currentTextarea && currentTextarea !== textarea) {
      setupWeaverButton(currentTextarea);
    } else {
      setTimeout(() => setupWeaverButton(textarea), 2000);
    }
  }, 2000);
}

function findSendButton() {
  const selectors = [
    '[data-testid="send-button"]',
    'button[aria-label*="Send"]',
    'button[type="submit"]',
    '[role="button"][aria-label*="Send"]'
  ];
  
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      return element;
    }
  }
  return null;
}

function getTextareaValue(textarea) {
  if (textarea.tagName === 'TEXTAREA') {
    return textarea.value;
  } else {
    return textarea.textContent || textarea.innerText || '';
  }
}

function setTextareaValue(textarea, value) {
  if (textarea.tagName === 'TEXTAREA') {
    textarea.value = value;
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  } else {
    textarea.textContent = value;
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  }
  
  const event = new Event('change', { bubbles: true });
  textarea.dispatchEvent(event);
}

async function optimizePromptWithWeaver(textarea) {
  console.log('optimizePromptWithWeaver called');
  const originalPrompt = getTextareaValue(textarea);
  console.log('Original prompt:', originalPrompt);
  
  if (!originalPrompt.trim()) {
    console.log('No prompt to optimize');
    return;
  }
  
  // Show loading state
  weaverButton.innerHTML = `<img src="${chrome.runtime.getURL('logo.png')}" style="width: 16px; height: 16px; margin-right: 6px; vertical-align: middle; border-radius: 2px; opacity: 0.6;" />Optimizing...`;
  weaverButton.disabled = true;
  weaverButton.style.opacity = '0.7';
  console.log('Button state changed to loading');
  
  try {
    // Get saved Weaver data
    const result = await chrome.storage.local.get(['weaverData']);
    
    const weaverData = result.weaverData || [];
    
    // Find relevant context based on the user's prompt
    const relevantContext = await findRelevantContext(originalPrompt, weaverData);
    console.log('Found relevant context:', relevantContext);
    
    const optimizedPrompt = await optimizeWithGemini(originalPrompt, relevantContext);
    
    if (optimizedPrompt) {
      setTextareaValue(textarea, optimizedPrompt);
    }
  } catch (error) {
    console.error('Error optimizing prompt:', error);
  } finally {
    // Reset button
    weaverButton.innerHTML = `<img src="${chrome.runtime.getURL('logo.png')}" style="width: 16px; height: 16px; margin-right: 6px; vertical-align: middle; border-radius: 2px;" />Optimize`;
    weaverButton.disabled = false;
    weaverButton.style.opacity = '1';
  }
}

async function findRelevantContext(userPrompt, allWeaverData, maxResults = 5) {
  if (!allWeaverData || allWeaverData.length === 0) {
    return [];
  }
  
  // If we have few snippets, return all of them
  if (allWeaverData.length <= maxResults) {
    return allWeaverData;
  }
  
  const relevanceSystemPrompt = `You are an expert at identifying relevant context for user queries. Given a user's prompt and a list of saved text snippets, identify which snippets are most relevant to help answer or improve the user's prompt.

USER PROMPT:
"${userPrompt}"

SAVED SNIPPETS:
${allWeaverData.map((item, index) => {
  const domain = extractDomain(item.sourceUrl);
  const preview = item.text.slice(0, 200) + (item.text.length > 200 ? '...' : '');
  const concepts = item.nodes && item.nodes.length > 0 ? `\nConcepts: ${item.nodes.map(n => n.name).join(', ')}` : '';
  return `${index}: From ${domain}: "${preview}"${concepts}`;
}).join('\n\n')}

INSTRUCTIONS:
Analyze the user's prompt and identify which saved snippets would be most helpful for:
1. Providing relevant background context
2. Supporting the user's request with specific information
3. Adding domain expertise or examples
4. Enhancing the prompt with related concepts

For example, if the user says "write an email reply to Alicia", look for all snippets that mention "Alicia" or contain previous email conversations with her.

Return ONLY a JSON array of the indices of the most relevant snippets, ordered by relevance (most relevant first). Return at most ${maxResults} indices. If no snippets are relevant, return an empty array [].

Example response: [2, 7, 1, 4]

Return ONLY the JSON array, no explanation.`;

  const response = await callGeminiAPI(relevanceSystemPrompt);
  const cleanResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const relevantIndices = JSON.parse(cleanResponse);
  
  // Return the relevant snippets based on the indices
  return relevantIndices
    .filter(index => index >= 0 && index < allWeaverData.length)
    .map(index => allWeaverData[index])
    .slice(0, maxResults);
}


async function optimizeWithGemini(originalPrompt, weaverData) {
  const contextText = formatWeaverContext(weaverData);
  
  const systemPrompt = `You are an expert prompt engineer. Transform the user's prompt using advanced prompt engineering techniques and integrate all relevant context from their saved sources.

OPTIMIZATION FRAMEWORK:
1. ROLE & EXPERTISE: Add "You are [specific expert/role]" when helpful
2. TASK CLARITY: Make the request specific and actionable  
3. FORMAT & CONSTRAINTS: Specify output format, length, tone, audience
4. CONTEXT INTEGRATION: Weave in ALL relevant saved context naturally
5. STRUCTURED APPROACH: Use step-by-step when complex tasks benefit

PROMPT ENGINEERING TECHNIQUES TO APPLY:
- Start with role assignment when beneficial ("You are a [expert]...")
- Add specific constraints (word count, format, audience)
- Include context naturally within the prompt body
- Use structured templates: "I need [task] for [audience/purpose]. Please present it in [format], with [constraints]"
- Add instruction stacking: "First [step 1], then [step 2]" for complex tasks
- Specify tone and style requirements

SAVED CONTEXT TO INTEGRATE:
${contextText}

ORIGINAL USER PROMPT:
${originalPrompt}

INSTRUCTIONS:
Rewrite the prompt to be more effective by:
1. Incorporating ALL relevant context from the saved context naturally into the prompt body. Do not assume any prior knowledge.
2. Applying appropriate prompt engineering techniques from the framework above
3. Making the request more specific and actionable
4. Adding helpful constraints (format, length, audience, tone) when beneficial
5. Structuring complex requests with clear steps

Return ONLY the optimized prompt with no explanation or meta-commentary.`;

  try {
    const response = await callGeminiAPI(systemPrompt);
    return response || originalPrompt;
  } catch (error) {
    console.error('Gemini API error:', error);
    return contextText + originalPrompt;
  }
}

async function extractNodesAndRelationships(text, existingNodes = [], existingRelationships = []) {
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
    return JSON.parse(response);
  } catch (error) {
    console.error('Error extracting nodes and relationships:', error);
    return { nodes: [], relationships: [] };
  }
}

async function callGeminiAPI(prompt) {
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
  
  if (!response.ok) {
    throw new Error('Gemini API request failed');
  }
  
  const data = await response.json();
  return data.candidates[0]?.content?.parts[0]?.text;
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

function formatWeaverContext(weaverData) {
  if (!weaverData || weaverData.length === 0) return '';
  
  let contextText = 'RELEVANT CONTEXT:\n';
  
  weaverData.forEach((item, index) => {
    const domain = extractDomain(item.sourceUrl);
    contextText += `${index + 1}. From ${domain}: "${item.text}"\n`;
    
    // Include extracted concepts if available
    if (item.nodes && item.nodes.length > 0) {
      contextText += `   Key concepts: ${item.nodes.map(n => n.name).join(', ')}\n`;
    }
  });
  
  contextText += '\nUSING THE ABOVE CONTEXT:\n';
  
  return contextText;
}

function extractDomain(url) {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return 'unknown';
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}