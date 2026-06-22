document.getElementById('settingsBtn').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

document.getElementById('savePageBtn').addEventListener('click', async () => {
  const status = document.getElementById('status');
  status.style.color = '#8899a6';
  status.textContent = 'Scraping...';
  
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    const activeTab = tabs[0];
    if (!activeTab || !activeTab.id) {
        status.style.color = '#f4212e';
        status.textContent = 'Error: No active tab';
        return;
    }

    chrome.runtime.sendMessage({ type: "MANUAL_SCRAPE", tab: activeTab }, (response) => {
       if (chrome.runtime.lastError) {
         status.style.color = '#f4212e';
         status.textContent = 'Error connecting to background script.';
       } else if (response && response.success) {
         status.style.color = '#00ba7c';
         status.textContent = 'Saved successfully!';
         setTimeout(() => window.close(), 1500);
       } else {
         status.style.color = '#f4212e';
         status.textContent = 'Failed to scrape.';
       }
    });
  });
});

document.getElementById('allowlistBtn').addEventListener('click', () => {
  const status = document.getElementById('status');
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    const activeTab = tabs[0];
    if (!activeTab || !activeTab.url || !activeTab.url.startsWith('http')) {
        status.style.color = '#f4212e';
        status.textContent = 'Invalid webpage';
        return;
    }
    
    try {
      const urlObj = new URL(activeTab.url);
      const hostname = urlObj.hostname;
      // Get root domain (e.g., from www.blog.substack.com -> substack.com)
      const parts = hostname.split('.');
      const rootDomain = parts.slice(-2).join('.');
      
      chrome.storage.local.get(['domainAllowlist'], (data) => {
        let currentList = data.domainAllowlist || '';
        
        // Don't add if it already exists
        if (currentList.includes(rootDomain)) {
          status.style.color = '#1d9bf0';
          status.textContent = `${rootDomain} is already allowed.`;
          setTimeout(() => window.close(), 1500);
          return;
        }
        
        if (currentList && !currentList.endsWith(',')) {
          currentList += ', ';
        }
        currentList += rootDomain;
        
        chrome.storage.local.set({ domainAllowlist: currentList }, () => {
          status.style.color = '#00ba7c';
          status.textContent = `Added ${rootDomain}!`;
          setTimeout(() => window.close(), 1500);
        });
      });
    } catch(e) {
      status.style.color = '#f4212e';
      status.textContent = 'Failed to parse URL';
    }
  });
});
