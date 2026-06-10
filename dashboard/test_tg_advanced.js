const https = require('https');

https.get('https://t.me/s/RunnerXBT_Insights', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    // We want to match the whole message container to extract link, time, and text
    const messageRegex = /<div class="tgme_widget_message_wrap[^>]*>([\s\S]*?)<\/div>(?=\s*<div class="tgme_widget_message_wrap|$)/g;
    let match;
    let count = 0;
    while ((match = messageRegex.exec(data)) !== null) {
      const inner = match[1];
      const textMatch = /<div class="tgme_widget_message_text[^>]*>(.*?)<\/div>/.exec(inner);
      const timeMatch = /<time datetime="([^"]+)"/.exec(inner);
      const linkMatch = /<a class="tgme_widget_message_date" href="([^"]+)"/.exec(inner);
      
      if (textMatch && timeMatch && linkMatch) {
        if (count === 0) {
            console.log("Time:", timeMatch[1]);
            console.log("Link:", linkMatch[1]);
            console.log("Text:", textMatch[1].substring(0, 100));
        }
        count++;
      }
    }
    console.log(`Found ${count} fully parsed posts`);
  });
});
