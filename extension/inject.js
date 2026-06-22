(function() {
    // 1. Intercept XMLHttpRequest
    const XHR = XMLHttpRequest.prototype;
    const open = XHR.open;
    const send = XHR.send;

    XHR.open = function(method, url) {
        this._url = url;
        return open.apply(this, arguments);
    };

    XHR.send = function() {
        this.addEventListener('load', function() {
            if (this._url && typeof this._url === 'string' && this._url.includes('/graphql/')) {
                const isTimeline = this._url.includes('HomeTimeline') || 
                                   this._url.includes('HomeLatestTimeline') || 
                                   this._url.includes('ListLatestTweetsTimeline') ||
                                   this._url.includes('UserTweets');
                const isLike = this._url.includes('FavoriteTweet') || this._url.includes('Likes');
                
                if (isTimeline || isLike) {
                    try {
                        const data = JSON.parse(this.responseText);
                        window.postMessage({
                            type: 'TWITTER_DATA_INTERCEPTED',
                            dataType: isLike ? 'like' : 'timeline',
                            url: this._url,
                            payload: data
                        }, '*');
                    } catch (e) {
                        // ignore parsing errors
                    }
                }
            }
        });
        return send.apply(this, arguments);
    };
    
    // 2. Intercept Fetch API
    const originalFetch = window.fetch;
    window.fetch = async function() {
        const url = arguments[0];
        
        try {
            const response = await originalFetch.apply(this, arguments);
            
            if (url && typeof url === 'string' && url.includes('/graphql/')) {
                const isTimeline = url.includes('HomeTimeline') || 
                                   url.includes('HomeLatestTimeline') || 
                                   url.includes('ListLatestTweetsTimeline') ||
                                   url.includes('UserTweets');
                const isLike = url.includes('FavoriteTweet') || url.includes('Likes');
                
                if (isTimeline || isLike) {
                    // Clone the response so we don't break the original stream X consumes
                    const clone = response.clone();
                    clone.json().then(data => {
                        window.postMessage({
                            type: 'TWITTER_DATA_INTERCEPTED',
                            dataType: isLike ? 'like' : 'timeline',
                            url: url,
                            payload: data
                        }, '*');
                    }).catch(e => {});
                }
            }
            return response;
        } catch (e) {
            throw e;
        }
    };
})();
