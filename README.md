# 🧠 Navao - AI-Powered Context for ChatGPT

Navao is a Chrome extension that lets you save highlighted text from any webpage and automatically enhance your ChatGPT prompts with that context using AI optimization.

## ✨ Features

- **💾 Save Text Anywhere**: Right-click on highlighted text to save it to Navao
- **🧠 AI-Powered Optimization**: Click "Optimize" button in ChatGPT to enhance prompts with saved context
- **📱 Simple Management**: View, delete, and manage saved text snippets through a clean popup interface
- **🤖 Gemini Integration**: Uses Google's Gemini AI to apply prompt engineering best practices
- **🔒 Local Storage**: All data stays on your device

## 🚀 How It Works

1. **Save Context**: Highlight any text on the web → Right-click → "💾 Save to Navao"
2. **Go to ChatGPT**: Visit chat.openai.com or chatgpt.com
3. **Type Your Prompt**: Start writing your message
4. **Optimize**: Click the "Optimize" button (with Navao logo) that appears
5. **Get Enhanced Results**: Your prompt is automatically optimized with relevant context

## 📥 Installation

### Method 1: Load Unpacked (Developer Mode)

1. **Download the extension**:
   - Clone this repository or download as ZIP
   - Extract to a folder on your computer

2. **Enable Developer Mode**:
   - Open Chrome and go to `chrome://extensions/`
   - Toggle "Developer mode" in the top-right corner

3. **Load the extension**:
   - Click "Load unpacked"
   - Select the `navao` folder containing the extension files
   - The extension should now appear in your extensions list

4. **Setup API Key** (Optional):
   - The extension includes a Gemini API key for testing
   - For production use, replace the key in `config.js`

### Method 2: Chrome Web Store

*Coming soon - extension will be published to the Chrome Web Store*

## 🛠️ Setup & Configuration

### Required Files
- `manifest.json` - Extension configuration
- `background.js` - Context menu and storage logic
- `content.js` - ChatGPT integration and optimization
- `popup.html/css/js` - Management interface
- `config.js` - API configuration

### Permissions Needed
- **Context Menus**: For right-click "Save to Navao" option
- **Storage**: To save highlighted text locally
- **Notifications**: Success confirmations
- **Active Tab**: To interact with current webpage
- **Host Permissions**: Access to ChatGPT and Gemini API

## 📖 Usage Guide

### Saving Text
1. Highlight any text on any webpage
2. Right-click and select "💾 Save to Navao"
3. You'll see a notification confirming the save

### Managing Saved Text
1. Click the Navao extension icon in Chrome
2. View all saved snippets with timestamps and source domains
3. Click any snippet to view full text
4. Use the "×" button to delete individual snippets
5. Use "Clear All" to remove all saved text

### Optimizing ChatGPT Prompts
1. Go to ChatGPT and start typing a prompt
2. The "Optimize" button (with Navao logo) appears next to Send
3. Click to enhance your prompt with:
   - Saved context from Navao
   - Advanced prompt engineering techniques
   - Better structure and clarity
   - Specific constraints and formatting

## 🔧 Technical Details

### Architecture
- **Manifest V3** Chrome extension
- **Service Worker** for background operations
- **Content Scripts** for ChatGPT integration
- **Gemini 1.5 Flash** for AI optimization

### File Structure
```
navao/
├── manifest.json          # Extension configuration
├── background.js          # Context menu & storage
├── content.js            # ChatGPT integration
├── popup.html/css/js     # Management interface
├── config.js             # API configuration
├── logo.png              # Logo icon
└── README.md            # This file
```

### API Integration
- Uses Google's Gemini 1.5 Flash model
- Applies advanced prompt engineering techniques
- Integrates ALL saved context naturally into prompts
- Adds role assignments, constraints, and structure
- Fallback handling for API errors

## 🐛 Troubleshooting

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
- Check Gemini API key in `config.js`
- Review console for detailed error messages

## 🔐 Privacy & Security

- **Local Storage Only**: All saved text stays on your device
- **No Data Collection**: Extension doesn't track or store user data
- **API Calls**: Only optimization requests sent to Gemini
- **Open Source**: All code is visible and auditable

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is open source. Feel free to use, modify, and distribute.

## 🆘 Support

Having issues? 
1. Check the troubleshooting section above
2. Review browser console for error messages
3. Open an issue on GitHub with details

---

**Made with ❤️ for better AI conversations**
