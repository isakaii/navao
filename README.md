# Weaver

**Take your context with you in every prompt**

Weaver automatically builds knowledge graphs from your saved content and optimizes prompts with intelligent, relevant context. Transform your browser into a comprehensive prompt engineering and knowledge management system.

## Features

- **One-Click Page Saving**: Click the Weaver icon and save entire webpage content automatically
- **Knowledge Graph Generation**: AI automatically extracts concepts and relationships from saved content
- **Smart Context Retrieval**: AI identifies and uses only relevant context for prompt optimization
- **Visual Knowledge Exploration**: Interactive graph showing top 7 most connected concepts
- **Advanced Prompt Engineering**: Uses Google's Gemini AI to apply expert prompt engineering techniques
- **Optional Text Selection**: Still supports right-click saving for specific text snippets
- **Local Storage**: All data stays on your device

## How It Works

### Saving Content
1. **One-Click Saving**: Click the Weaver extension icon, then "Save Current Page" to automatically extract and save webpage content
2. **Optional Selection**: Or highlight specific text, right-click, and select "Save Selection to Weaver"
3. **AI Processing**: Content is automatically processed to extract key concepts and relationships
4. **Knowledge Graph**: Builds an interconnected graph of your saved knowledge

### Optimizing Prompts
1. **Go to ChatGPT**: Visit chat.openai.com or chatgpt.com
2. **Type Your Prompt**: Start writing your message (e.g., "write an email reply to Alicia")
3. **Click Optimize**: The "Optimize" button (with Weaver logo) appears next to Send
4. **Smart Context Selection**: AI finds only relevant saved content (e.g., previous emails with Alicia)
5. **Enhanced Results**: Your prompt is optimized with targeted context and advanced techniques

## Installation

### Method 1: Load Unpacked (Developer Mode)

1. **Download the extension**:
   - Clone this repository or download as ZIP
   - Extract to a folder on your computer

2. **Enable Developer Mode**:
   - Open Chrome and go to `chrome://extensions/`
   - Toggle "Developer mode" in the top-right corner

3. **Load the extension**:
   - Click "Load unpacked"
   - Select the `weaver` folder containing the extension files
   - The extension should now appear in your extensions list

4. **Setup API Key**:
   - Copy `config.template.js` to `config.js`
   - Get a free Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Replace `YOUR_GEMINI_API_KEY_HERE` with your actual API key

### Method 2: Chrome Web Store

*Coming soon - extension will be published to the Chrome Web Store*

## Setup & Configuration

### Required Files
- `manifest.json` - Extension configuration
- `background.js` - Context menu and storage logic
- `content.js` - ChatGPT integration and optimization
- `popup.html/css/js` - Management interface
- `config.js` - API configuration (created from template)

### Permissions Needed
- **Context Menus**: For right-click "Save Selection to Weaver" option
- **Storage**: To save webpage content and knowledge graphs locally
- **Notifications**: Success confirmations
- **Active Tab**: To interact with current webpage
- **Scripting**: To extract content from webpages
- **Tabs**: To access page information
- **Host Permissions**: Access to ChatGPT and Gemini API

## Usage Guide

### Saving Content
**Method 1 - One-Click Page Saving (Recommended):**
1. Click the Weaver extension icon in Chrome
2. Click "Save Current Page" button
3. Content is automatically extracted, processed, and added to your knowledge graph

**Method 2 - Text Selection:**
1. Highlight specific text on any webpage
2. Right-click and select "Save Selection to Weaver" 
3. Selected text is processed and added to knowledge graph

### Managing Your Knowledge
1. **View Saved Content**: Click the Weaver extension icon to see all saved snippets
2. **Explore Knowledge Graph**: Click "🧠 View Knowledge Graph" to visualize connections
3. **Interactive Graph**: Shows top 7 most connected concepts by default
4. **Search & Filter**: Use search to explore all concepts and relationships
5. **Content Management**: Click snippets to view full text, use "×" to delete individual items

### Smart Prompt Optimization
1. **Go to ChatGPT**: Visit chat.openai.com or chatgpt.com and start typing
2. **Click Optimize**: The "Optimize" button (with Weaver logo) appears next to Send
3. **AI-Powered Enhancement**: Your prompt is enhanced with:
   - **Relevant Context Only**: AI selects only pertinent saved content
   - **Advanced Prompt Engineering**: Professional structuring and clarity
   - **Semantic Understanding**: Finds related concepts across your knowledge base
   - **Example**: "write email to Alicia" → finds all Alicia-related content automatically

## Technical Details

### Architecture
- **Manifest V3** Chrome extension
- **Service Worker** for background operations and AI processing
- **Content Scripts** for ChatGPT integration and page extraction
- **Gemini 1.5 Flash** for knowledge graph generation and optimization
- **Interactive SVG** for knowledge graph visualization

### File Structure
```
weaver/
├── manifest.json          # Extension configuration
├── background.js          # Content saving & knowledge graph generation
├── content.js            # ChatGPT integration & smart optimization
├── popup.html/css/js     # Management interface & page saving
├── graph.html/js         # Knowledge graph visualization
├── config.template.js    # API configuration template
├── config.js             # API configuration (created from template)
├── logo.png              # Logo icon
└── README.md            # This file
```

### AI-Powered Features
- **Knowledge Graph Generation**: Extracts concepts, entities, and relationships from content
- **Semantic Context Retrieval**: Identifies relevant content based on prompt intent
- **Cross-Snippet Connections**: Links related concepts from different sources (e.g., "AI" ↔ "Machine Learning")
- **Advanced Prompt Engineering**: Professional structuring, role assignment, and constraint addition
- **Content Intelligence**: Smart page extraction avoiding navigation, ads, and irrelevant content

## Troubleshooting

### Button Not Appearing
- Reload the extension in `chrome://extensions/`
- Refresh the ChatGPT page
- Check that you're on chat.openai.com or chatgpt.com

### Notifications Not Working
- Check Chrome notification settings
- Verify system notifications are enabled
- Extension needs notification permission

### API Errors
- Verify internet connection
- Ensure you've created `config.js` from the template
- Check your Gemini API key in `config.js` is valid
- Review console for detailed error messages

## Privacy & Security

- **Local Storage Only**: All saved text stays on your device
- **No Data Collection**: Extension doesn't track or store user data
- **API Calls**: Only optimization requests sent to Gemini
- **Open Source**: All code is visible and auditable

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source. Feel free to use, modify, and distribute.

## Support

Having issues? 
1. Check the troubleshooting section above
2. Review browser console for error messages
3. Open an issue on GitHub with details

---

**Take your context with you in every prompt**
