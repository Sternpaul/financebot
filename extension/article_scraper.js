// Minimalist Article Scraper Heuristic
function extractArticleContent() {
  let content = "";
  
  // 1. Try to find the main content container using common selectors (including Substack)
  const contentSelectors = [
    '.available-content', // Substack
    '.body.markup', // Substack alternate
    '.post-content',
    '.article-body',
    '.article-content',
    '.entry-content',
    'article', // Standard HTML5
    'main'
  ];

  let bestNode = null;
  for (const selector of contentSelectors) {
    const node = document.querySelector(selector);
    if (node && node.innerText.trim().length > 100) {
      bestNode = node;
      break;
    }
  }

  if (bestNode) {
    content = bestNode.innerText;
  } else {
    // 2. Fallback: Find the element with the most <p> tags inside it
    let maxPCount = 0;
    bestNode = document.body;
    
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

// Return the extracted data directly to the executeScript callback
extractArticleContent();
