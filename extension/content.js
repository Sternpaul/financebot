// Inject the interceptor script into the page context
const s = document.createElement('script');
s.src = chrome.runtime.getURL('inject.js');
s.onload = function() {
    this.remove();
};
(document.head || document.documentElement).appendChild(s);

// Listen for messages from the injected script
window.addEventListener('message', function(event) {
    // Only accept messages from the same frame
    if (event.source !== window) return;
    
    if (event.data && event.data.type === 'TWITTER_DATA_INTERCEPTED') {
        // Pass the intercepted GraphQL data to our background service worker
        chrome.runtime.sendMessage({
            type: 'PROCESS_TWEETS',
            url: event.data.url,
            payload: event.data.payload
        });
    }
});
