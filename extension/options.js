document.addEventListener('DOMContentLoaded', () => {
  const urlInput = document.getElementById('supabaseUrl');
  const keyInput = document.getElementById('supabasePublishableKey');
  const keywordInput = document.getElementById('keywordBlocklist');
  const usernameInput = document.getElementById('usernameBlocklist');
  const domainInput = document.getElementById('domainAllowlist');
  const saveBtn = document.getElementById('saveBtn');
  const status = document.getElementById('status');
  const logsList = document.getElementById('logsList');
  const clearLogsBtn = document.getElementById('clearLogsBtn');

  chrome.storage.local.get(['supabaseUrl', 'supabasePublishableKey', 'keywordBlocklist', 'usernameBlocklist', 'domainAllowlist', 'scrapeLogs'], (data) => {
    if (data.supabaseUrl) urlInput.value = data.supabaseUrl;
    if (data.supabasePublishableKey) keyInput.value = data.supabasePublishableKey;
    if (data.keywordBlocklist) keywordInput.value = data.keywordBlocklist;
    if (data.usernameBlocklist) usernameInput.value = data.usernameBlocklist;
    if (data.domainAllowlist) domainInput.value = data.domainAllowlist;
    
    renderLogs(data.scrapeLogs || []);
  });

  function renderLogs(logs) {
    logsList.innerHTML = '';
    if (logs.length === 0) {
      logsList.innerHTML = '<div style="color: #8899a6; font-size: 12px;">No activity yet.</div>';
      return;
    }
    
    logs.forEach(log => {
      const d = new Date(log.timestamp);
      const timeStr = `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
      
      const div = document.createElement('div');
      div.className = 'log-item';
      
      div.innerHTML = `
        <div>
          <span class="log-time">[${timeStr}]</span>
          <span class="log-action">${log.action}</span>
        </div>
        <div class="log-details">${log.details}</div>
        ${log.url ? `<div class="log-url">${log.url}</div>` : ''}
      `;
      logsList.appendChild(div);
    });
  }

  clearLogsBtn.addEventListener('click', () => {
    chrome.storage.local.set({ scrapeLogs: [] }, () => {
      renderLogs([]);
    });
  });

  saveBtn.addEventListener('click', () => {
    chrome.storage.local.set({
      supabaseUrl: urlInput.value.trim(),
      supabasePublishableKey: keyInput.value.trim(),
      keywordBlocklist: keywordInput.value,
      usernameBlocklist: usernameInput.value,
      domainAllowlist: domainInput.value
    }, () => {
      status.textContent = 'Settings saved!';
      setTimeout(() => status.textContent = '', 2000);
    });
  });
});
