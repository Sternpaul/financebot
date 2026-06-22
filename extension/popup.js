document.addEventListener('DOMContentLoaded', () => {
  const urlInput = document.getElementById('supabaseUrl');
  const keyInput = document.getElementById('supabaseKey');
  const keywordInput = document.getElementById('keywordBlocklist');
  const usernameInput = document.getElementById('usernameBlocklist');
  const saveBtn = document.getElementById('saveBtn');
  const status = document.getElementById('status');

  chrome.storage.local.get(['supabaseUrl', 'supabaseKey', 'keywordBlocklist', 'usernameBlocklist'], (data) => {
    if (data.supabaseUrl) urlInput.value = data.supabaseUrl;
    if (data.supabaseKey) keyInput.value = data.supabaseKey;
    if (data.keywordBlocklist) keywordInput.value = data.keywordBlocklist;
    if (data.usernameBlocklist) usernameInput.value = data.usernameBlocklist;
  });

  saveBtn.addEventListener('click', () => {
    chrome.storage.local.set({
      supabaseUrl: urlInput.value.trim(),
      supabaseKey: keyInput.value.trim(),
      keywordBlocklist: keywordInput.value,
      usernameBlocklist: usernameInput.value
    }, () => {
      status.textContent = 'Settings saved!';
      setTimeout(() => status.textContent = '', 2000);
    });
  });
});
