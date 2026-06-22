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
        if (!chrome.runtime || !chrome.runtime.id) return; // Fix: Extension context invalidated
        
        try {
            // Pass the intercepted GraphQL data to our background service worker
            chrome.runtime.sendMessage({
                type: 'PROCESS_TWEETS',
                url: event.data.url,
                dataType: event.data.dataType,
                payload: event.data.payload
            });
        } catch (e) {
            // Ignore if context is invalidated
        }
    } else if (event.data && event.data.type === 'LIKE_INTERCEPTED') {
        if (!chrome.runtime || !chrome.runtime.id) return;
        try {
            chrome.runtime.sendMessage({
                type: 'LIKE_INTERCEPTED',
                tweetId: event.data.tweetId
            });
        } catch(e) {}
    }
});
