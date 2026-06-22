chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'PROCESS_TWEETS') {
    const { url, payload } = request;
    
    // Parse tweets from payload
    const tweets = extractTweets(payload);
    
    if (tweets.length > 0) {
      console.log(`FinanceBot: Captured ${tweets.length} tweets from stream.`);
      processAndSend(tweets);
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
      
      // Extract media
      let mediaUrls = [];
      const mediaList = obj.legacy?.extended_entities?.media || [];
      for (const media of mediaList) {
          if (media.media_url_https) {
              mediaUrls.push(media.media_url_https);
          }
      }

      if (text && author && id && createdAt) {
        // Prevent duplicates in same batch
        if (!results.find(t => t.id === id)) {
           results.push({
             id,
             text,
             author,
             media_urls: mediaUrls,
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

async function processAndSend(tweets) {
  chrome.storage.local.get(['supabaseUrl', 'supabaseKey', 'keywordBlocklist', 'usernameBlocklist'], async (config) => {
    if (!config.supabaseUrl || !config.supabaseKey) {
      console.warn("FinanceBot: Supabase credentials not configured in extension popup.");
      return;
    }

    const { supabaseUrl, supabaseKey, keywordBlocklist, usernameBlocklist } = config;
    
    // Parse filters
    const keywords = (keywordBlocklist || "").toLowerCase().split(',').map(s => s.trim()).filter(s => s);
    const blockedUsers = (usernameBlocklist || "").toLowerCase().split(',').map(s => s.trim()).filter(s => s);

    // Apply filters
    const filteredTweets = tweets.filter(t => {
      const textLower = t.text.toLowerCase();
      const authorLower = t.author.toLowerCase();

      // Check username blocklist
      if (blockedUsers.includes(authorLower)) return false;

      // Check keyword blocklist
      for (const kw of keywords) {
        if (textLower.includes(kw)) return false;
      }

      return true;
    });

    if (filteredTweets.length === 0) {
      console.log("FinanceBot: All tweets filtered out by blocklists.");
      return;
    }

    const endpoint = `${supabaseUrl}/rest/v1/raw_tweets`;

    // Map tweets to our database schema
    const payload = filteredTweets.map(t => ({
      id: t.id,
      author: t.author,
      text: t.text,
      media_urls: t.media_urls,
      url: t.url,
      posted_at: t.created_at,
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
        console.log(`FinanceBot: Successfully pushed ${filteredTweets.length} tweets to raw_tweets.`);
      } else {
        const errText = await response.text();
        console.error("FinanceBot: Failed to push to Supabase", response.status, errText);
      }
    } catch(err) {
      console.error("FinanceBot: Network error pushing to Supabase", err);
    }
  });
}
