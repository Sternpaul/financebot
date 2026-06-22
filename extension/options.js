document.addEventListener('DOMContentLoaded', () => {
  const urlInput = document.getElementById('supabaseUrl');
  const keyInput = document.getElementById('supabasePublishableKey');
  const keywordInput = document.getElementById('keywordBlocklist');
  const usernameInput = document.getElementById('usernameBlocklist');
  const domainInput = document.getElementById('domainAllowlist');
  const saveBtn = document.getElementById('saveBtn');
  const status = document.getElementById('status');

  chrome.storage.local.get(['supabaseUrl', 'supabasePublishableKey', 'keywordBlocklist', 'usernameBlocklist', 'domainAllowlist'], (data) => {
    if (data.supabaseUrl) urlInput.value = data.supabaseUrl;
    if (data.supabasePublishableKey) keyInput.value = data.supabasePublishableKey;
    if (data.keywordBlocklist) keywordInput.value = data.keywordBlocklist;
    if (data.usernameBlocklist) usernameInput.value = data.usernameBlocklist;
    if (data.domainAllowlist) domainInput.value = data.domainAllowlist;
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
