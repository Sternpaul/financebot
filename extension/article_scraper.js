// Minimalist Article Scraper Heuristic
function extractArticleContent() {
  let content = "";
  
  // 1. Try to find the main <article> tag (standard in modern news sites)
  const articleNode = document.querySelector('article');
  if (articleNode) {
    content = articleNode.innerText;
  } else {
    // 2. Fallback: Find the element with the most <p> tags inside it
    let maxPCount = 0;
    let bestNode = document.body;
    
    const divs = document.querySelectorAll('div, main, section');
    divs.forEach(div => {
      const pCount = div.querySelectorAll('p').length;
      if (pCount > maxPCount) {
        maxPCount = pCount;
        bestNode = div;
      }
    });
    
    // Extract only the paragraph text from the best node to avoid navbars
    const paragraphs = bestNode.querySelectorAll('p');
    if (paragraphs.length > 2) {
      let textLines = [];
      paragraphs.forEach(p => {
        const text = p.innerText.trim();
        if (text.length > 20) textLines.push(text);
      });
      content = textLines.join('\n\n');
    } else {
      // 3. Last resort: Just dump the body
      content = document.body.innerText;
    }
  }

  // Clean up extreme whitespace
  content = content.replace(/\n{3,}/g, '\n\n').trim();

  return {
    title: document.title,
    url: window.location.href,
    content: content
  };
}

(function() {
  const data = extractArticleContent();
  if (data.content.length > 100) {
    chrome.runtime.sendMessage({
      type: 'ARTICLE_SCRAPED',
      data: data
    });
    console.log("FinanceBot: Article scraped successfully!");
  } else {
    console.warn("FinanceBot: Failed to find enough content to scrape.");
  }
})();
