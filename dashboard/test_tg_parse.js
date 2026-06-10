const https = require('https');

https.get('https://t.me/s/whale_alert', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const regex = /<div class="tgme_widget_message_text[^>]*>(.*?)<\/div>/g;
    let match;
    let count = 0;
    while ((match = regex.exec(data)) !== null) {
      if (count === 0) console.log("First post:", match[1].substring(0, 100));
      count++;
    }
    console.log(`Found ${count} posts`);
  });
});
