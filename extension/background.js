chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'PROCESS_TWEETS') {
    const { url, payload } = request;
    
    // Parse tweets from payload
    const tweets = extractTweets(payload);
    
    if (tweets.length > 0) {
      console.log(`FinanceBot: Captured ${tweets.length} tweets from stream.`);
      sendToSupabase(tweets);
    }
  }
});

// Recursive function to deeply search the GraphQL JSON for tweet entries
function extractTweets(obj, results = []) {
  if (!obj || typeof obj !== 'object') return results;
  
  // A tweet in GraphQL is usually found in a 'tweet_results.result' or similar
  if (obj.__typename === 'Tweet' || (obj.legacy && obj.core)) {
    try {
      const text = obj.legacy?.full_text;
      const author = obj.core?.user_results?.result?.legacy?.screen_name || obj.core?.user_results?.result?.core?.screen_name;
      const createdAt = obj.legacy?.created_at;
      const id = obj.rest_id || obj.legacy?.id_str;
      
      if (text && author && id && createdAt) {
        // Prevent duplicates in same batch
        if (!results.find(t => t.id === id)) {
           results.push({
             id,
             text,
             author,
             created_at: new Date(createdAt).toISOString(),
             url: `https://x.com/${author}/status/${id}`
           });
        }
      }
    } catch(e) {}
  }

  // Recurse into children
  for (let key in obj) {
    extractTweets(obj[key], results);
  }
  
  return results;
}

async function sendToSupabase(tweets) {
  chrome.storage.local.get(['supabaseUrl', 'supabaseKey'], async (config) => {
    if (!config.supabaseUrl || !config.supabaseKey) {
      console.warn("FinanceBot: Supabase credentials not configured in extension popup.");
      return;
    }

    const { supabaseUrl, supabaseKey } = config;
    const endpoint = `${supabaseUrl}/rest/v1/news_articles`;

    // Map tweets to our database schema
    const payload = tweets.map(t => ({
      source_platform: 'twitter',
      source_handle: t.author,
      title: null,
      content: t.text,
      url: t.url,
      posted_at: t.created_at,
      author_name: t.author,
      // The AI Brain will update is_processed, tickers_mentioned later
      is_processed: false 
    }));

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=ignore-duplicates' // Prevent duplicate inserts
        },
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        console.log(`FinanceBot: Successfully pushed ${tweets.length} tweets to Supabase.`);
      } else {
        const errText = await response.text();
        console.error("FinanceBot: Failed to push to Supabase", response.status, errText);
      }
    } catch(err) {
      console.error("FinanceBot: Network error pushing to Supabase", err);
    }
  });
}
