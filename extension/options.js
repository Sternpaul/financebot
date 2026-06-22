document.addEventListener('DOMContentLoaded', () => {
  const urlInput = document.getElementById('supabaseUrl');
  const keyInput = document.getElementById('supabasePublishableKey');
  const passwordInput = document.getElementById('dashboardPassword');
  const keywordInput = document.getElementById('keywordBlocklist');
  const usernameInput = document.getElementById('usernameBlocklist');
  const domainInput = document.getElementById('domainAllowlist');
  const saveBtn = document.getElementById('saveBtn');
  const status = document.getElementById('status');
  const logsList = document.getElementById('logsList');
  const clearLogsBtn = document.getElementById('clearLogsBtn');

  chrome.storage.local.get(['supabaseUrl', 'supabasePublishableKey', 'dashboardPassword', 'keywordBlocklist', 'usernameBlocklist', 'domainAllowlist', 'scrapeLogs'], (data) => {
    if (data.supabaseUrl) urlInput.value = data.supabaseUrl;
    if (data.supabasePublishableKey) keyInput.value = data.supabasePublishableKey;
    if (data.dashboardPassword) passwordInput.value = data.dashboardPassword;
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

      const topDiv = document.createElement('div');
      
      const timeSpan = document.createElement('span');
      timeSpan.className = 'log-time';
      timeSpan.textContent = `[${timeStr}] `;
      
      const actionSpan = document.createElement('span');
      actionSpan.className = 'log-action';
      actionSpan.textContent = log.action;
      
      topDiv.appendChild(timeSpan);
      topDiv.appendChild(actionSpan);
      
      const detailsDiv = document.createElement('div');
      detailsDiv.className = 'log-details';
      detailsDiv.textContent = log.details;
      
      div.appendChild(topDiv);
      div.appendChild(detailsDiv);
      
      if (log.url) {
        const urlDiv = document.createElement('div');
        urlDiv.className = 'log-url';
        urlDiv.textContent = log.url;
        div.appendChild(urlDiv);
      }
      
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
      dashboardPassword: passwordInput.value.trim(),
      keywordBlocklist: keywordInput.value,
      usernameBlocklist: usernameInput.value,
      domainAllowlist: domainInput.value
    }, () => {
      status.textContent = 'Settings saved!';
      setTimeout(() => status.textContent = '', 2000);
    });
  });
});
