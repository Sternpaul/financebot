const https = require('https');

https.get('https://rsshub.app/telegram/channel/whale_alert', (res) => {
  console.log(`Status: ${res.statusCode}`);
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log(`Body length: ${data.length}`);
    if (res.statusCode !== 200) {
      console.log(data.slice(0, 500));
    } else {
        console.log(data.slice(0, 500));
    }
  });
}).on('error', err => console.error(err));
