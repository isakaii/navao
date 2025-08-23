chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "saveToWeaver",
    title: "Save to Weaver",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "saveToWeaver" && info.selectionText) {
    saveTextToWeaver(info.selectionText, tab.url);
  }
});

function saveTextToWeaver(text, sourceUrl) {
  console.log('saveTextToWeaver called with:', { text, sourceUrl });
  
  const savedItem = {
    text: text,
    timestamp: Date.now(),
    sourceUrl: sourceUrl,
    id: generateId()
  };

  chrome.storage.local.get(['weaverData'], (result) => {
    console.log('Current weaverData:', result.weaverData);
    const weaverData = result.weaverData || [];
    weaverData.push(savedItem);
    
    chrome.storage.local.set({ weaverData: weaverData }, () => {
      console.log('Data saved successfully, creating notification...');
      
      // Check notification permission first
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
    });
  });
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}