function addLog(action, details, url = '') {
  chrome.storage.local.get(['scrapeLogs'], (data) => {
    let logs = data.scrapeLogs || [];
    logs.unshift({ timestamp: new Date().toISOString(), action, details, url });
    if (logs.length > 50) logs = logs.slice(0, 50);
    chrome.storage.local.set({ scrapeLogs: logs });
  });
}

let tweetCache = [];

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'PROCESS_TWEETS') {
    const { url, payload, dataType } = request;
    
    // Parse tweets from payload
    const tweets = extractTweets(payload);
    
    // Memory Cache for Passive Liking
    tweets.forEach(tweet => {
      if (!tweetCache.find(t => t.id === tweet.id)) {
        tweetCache.unshift(tweet);
      }
    });
    // Keep cache at max 300 items to prevent memory bloat
    if (tweetCache.length > 300) {
      tweetCache = tweetCache.slice(0, 300);
    }
    
    
    if (tweets.length > 0) {
      console.log(`FinanceBot: Captured ${tweets.length} tweets from stream (${dataType}).`);
      processAndSend(tweets, dataType);
    }
  } else if (request.type === 'LIKE_INTERCEPTED') {
    const { tweetId } = request;
    console.log(`FinanceBot: Intercepted LIKE for tweet_id ${tweetId}`);
    
    // Search cache
    const cachedTweet = tweetCache.find(t => t.id === tweetId);
    if (cachedTweet) {
      console.log(`FinanceBot: Found liked tweet in cache! Syncing to liked_tweets...`);
      processAndSend([cachedTweet], 'like');
      addLog('Manual-Liked', `Instantly synced liked tweet`, cachedTweet.url);
    } else {
      console.warn(`FinanceBot: Liked tweet ${tweetId} not found in memory cache. User might need to scroll to load it.`);
      addLog('Dropped', `Liked tweet not in memory cache`, `ID: ${tweetId}`);
    }
  } else if (request.type === 'MANUAL_SCRAPE') {
    scrapeCurrentTab(request.tab, false, sendResponse);
    return true; // Keep message channel open for async response
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

async function scrapeCurrentTab(tab, isAuto = false, sendResponse = null) {
  if (!tab || !tab.id || !tab.url) {
    if (sendResponse) sendResponse({ success: false });
    return;
  }
  if (tab.url.includes("chrome://") || tab.url.includes("x.com") || tab.url.includes("twitter.com")) {
    if (!isAuto) addLog('Dropped', 'Cannot scrape internal/Twitter pages', tab.url);
    if (sendResponse) sendResponse({ success: false });
    return; // Don't scrape Twitter or internal pages with this script
  }
  
  // Execute the scraper content script
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['article_scraper.js']
  }, (results) => {
    if (results && results[0] && results[0].result) {
      const data = results[0].result;
      if (data.content && data.content.length > 100) {
        const targetTable = isAuto ? 'raw_webcontent' : 'curated_webcontent';
        saveWebContent(data, targetTable);
        addLog(isAuto ? 'Auto-Scraped' : 'Manual-Scraped', `Extracted ${data.content.length} chars`, tab.url);
        if (sendResponse) sendResponse({ success: true });
      } else {
        if (!isAuto) {
          console.warn("FinanceBot: Failed to find enough content to scrape manually.");
          addLog('Dropped', 'Not enough text content found', tab.url);
        }
        if (sendResponse) sendResponse({ success: false });
      }
    } else {
      if (sendResponse) sendResponse({ success: false });
    }
  });
}

// Auto Omni-Scraper
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.startsWith('http')) {
    chrome.storage.local.get(['domainAllowlist'], (config) => {
      const allowedDomains = (config.domainAllowlist || "").toLowerCase().split(',').map(s => s.trim()).filter(s => s);
      if (allowedDomains.length === 0) return; // Feature disabled if empty
      
      const tabUrlLower = tab.url.toLowerCase();
      const isAllowed = allowedDomains.some(domain => tabUrlLower.includes(domain));
      
      if (isAllowed) {
        console.log(`FinanceBot: Omni-scraping allowed domain: ${tab.url}`);
        scrapeCurrentTab(tab, true);
      }
    });
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
  chrome.storage.local.get(['supabaseUrl', 'supabasePublishableKey', 'dashboardPassword', 'keywordBlocklist', 'usernameBlocklist'], async (config) => {
    if (!config.supabaseUrl || !config.supabasePublishableKey) {
      console.warn("FinanceBot: Supabase credentials not configured in extension popup.");
      return;
    }

    const { supabaseUrl, supabasePublishableKey, dashboardPassword, keywordBlocklist, usernameBlocklist } = config;
    
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
      addLog('Dropped', `All ${tweets.length} tweets blocked by filters`);
      return;
    }

    const tableName = dataType === 'like' ? 'liked_tweets' : 'raw_tweets';
    const endpoint = `${supabaseUrl}/rest/v1/${tableName}`;

    // Map tweets to our database schema
    const payload = filteredTweets.map(t => ({
      id: t.id,
      author: t.author,
      text: t.text,
      media_urls: t.media_urls && t.media_urls.length > 0 ? t.media_urls : null,
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
          'x-dashboard-password': dashboardPassword || '',
          'Content-Type': 'application/json',
          'Prefer': 'resolution=ignore-duplicates' // Prevent duplicate inserts
        },
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        console.log(`FinanceBot: Successfully pushed ${filteredTweets.length} tweets to ${tableName}.`);
        addLog('Tweet-Saved', `Pushed ${filteredTweets.length} tweets to ${tableName}`);
      } else {
        const errText = await response.text();
        console.error("FinanceBot: Failed to push to Supabase", response.status, errText);
      }
    } catch(err) {
      console.error("FinanceBot: Network error pushing to Supabase", err);
    }
  });
}

async function saveWebContent(data, tableName) {
  chrome.storage.local.get(['supabaseUrl', 'supabasePublishableKey', 'dashboardPassword'], async (config) => {
    if (!config.supabaseUrl || !config.supabasePublishableKey) return;
    
    const { supabaseUrl, supabasePublishableKey, dashboardPassword } = config;
    const endpoint = `${supabaseUrl}/rest/v1/${tableName}`;

    const payload = {
      url: data.url,
      title: data.title,
      content: data.content,
      source: tableName === 'raw_webcontent' ? 'chrome_extension_auto' : 'chrome_extension_hotkey',
      is_processed: false
    };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'apikey': supabasePublishableKey,
          'Authorization': `Bearer ${supabasePublishableKey}`,
          'x-dashboard-password': dashboardPassword || '',
          'Content-Type': 'application/json',
          'Prefer': 'resolution=ignore-duplicates'
        },
        body: JSON.stringify([payload])
      });
      
      if (response.ok) {
        console.log(`FinanceBot: Successfully saved article to ${tableName} from ${data.url}`);
        // Optional notification for manual scraping
        if (tableName === 'curated_webcontent') {
          chrome.notifications?.create({
            type: "basic",
            iconUrl: "icon128.png",
            title: "FinanceBot Scraper",
            message: "Article successfully saved to Curated Web Content!"
          });
        }
      }
    } catch(err) {
      console.error("FinanceBot: Network error saving article", err);
    }
  });
}
