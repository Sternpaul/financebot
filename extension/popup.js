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
