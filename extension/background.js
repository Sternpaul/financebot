chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'PROCESS_TWEETS') {
    const { url, payload, dataType } = request;
    
    // Parse tweets from payload
    const tweets = extractTweets(payload);
    
    if (tweets.length > 0) {
      console.log(`FinanceBot: Captured ${tweets.length} tweets from stream (${dataType}).`);
      processAndSend(tweets, dataType);
    }
  }
});

// Setup context menus
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "scrape-article",
    title: "FinanceBot: Scrape Article",
    contexts: ["page", "link"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "scrape-article") {
    // If they clicked a link, we might want to scrape that link directly
    // but the easiest way is to scrape the current active tab
    scrapeCurrentTab(tab);
  }
});

chrome.commands.onCommand.addListener((command, tab) => {
  if (command === "scrape-article") {
    scrapeCurrentTab(tab);
  }
});

async function scrapeCurrentTab(tab) {
  if (!tab || !tab.id) return;
  if (tab.url.includes("chrome://") || tab.url.includes("x.com") || tab.url.includes("twitter.com")) {
    console.warn("FinanceBot: Cannot scrape this internal/Twitter page.");
    return;
  }
  
  console.log("FinanceBot: Scraping article from tab:", tab.url);
  
  // Execute the scraper content script
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['article_scraper.js']
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'ARTICLE_SCRAPED') {
    saveWebContent(request.data);
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
      
      // Unshorten text URLs
      let finalUrl = `https://x.com/${author}/status/${id}`;
      let textContent = text;
      const urlsList = obj.legacy?.entities?.urls || [];
      for (const u of urlsList) {
          if (u.url && u.expanded_url) {
              textContent = textContent.replace(u.url, u.expanded_url);
          }
      }

      if (text && author && id && createdAt) {
        // Prevent duplicates in same batch
        if (!results.find(t => t.id === id)) {
           results.push({
             id,
             text: textContent,
             author,
             media_urls: mediaUrls,
             created_at: new Date(createdAt).toISOString(),
             url: finalUrl
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

async function processAndSend(tweets, dataType = 'timeline') {
  chrome.storage.local.get(['supabaseUrl', 'supabasePublishableKey', 'keywordBlocklist', 'usernameBlocklist'], async (config) => {
    if (!config.supabaseUrl || !config.supabasePublishableKey) {
      console.warn("FinanceBot: Supabase credentials not configured in extension popup.");
      return;
    }

    const { supabaseUrl, supabasePublishableKey, keywordBlocklist, usernameBlocklist } = config;
    
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

    const tableName = dataType === 'like' ? 'liked_tweets' : 'raw_tweets';
    const endpoint = `${supabaseUrl}/rest/v1/${tableName}`;

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
          'apikey': supabasePublishableKey,
          'Authorization': `Bearer ${supabasePublishableKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=ignore-duplicates' // Prevent duplicate inserts
        },
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        console.log(`FinanceBot: Successfully pushed ${filteredTweets.length} tweets to ${tableName}.`);
      } else {
        const errText = await response.text();
        console.error("FinanceBot: Failed to push to Supabase", response.status, errText);
      }
    } catch(err) {
      console.error("FinanceBot: Network error pushing to Supabase", err);
    }
  });
}

async function saveWebContent(data) {
  chrome.storage.local.get(['supabaseUrl', 'supabasePublishableKey'], async (config) => {
    if (!config.supabaseUrl || !config.supabasePublishableKey) return;
    
    const { supabaseUrl, supabasePublishableKey } = config;
    const endpoint = `${supabaseUrl}/rest/v1/web_content`;

    const payload = {
      url: data.url,
      title: data.title,
      content: data.content,
      source: 'chrome_extension',
      is_processed: false
    };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'apikey': supabasePublishableKey,
          'Authorization': `Bearer ${supabasePublishableKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=ignore-duplicates'
        },
        body: JSON.stringify([payload])
      });
      
      if (response.ok) {
        console.log(`FinanceBot: Successfully saved article from ${data.url}`);
        // Optional: you could show a chrome notification here
        chrome.notifications?.create({
          type: "basic",
          iconUrl: "icon128.png",
          title: "FinanceBot Scraper",
          message: "Article successfully saved!"
        });
      }
    } catch(err) {
      console.error("FinanceBot: Network error saving article", err);
    }
  });
}
