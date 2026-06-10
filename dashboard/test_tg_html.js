const https = require('https');
https.get('https://t.me/s/RunnerXBT_Insights', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log("Length:", data.length);
    console.log("Preview:", data.substring(0, 1000));
    const titleMatch = /<title>(.*?)<\/title>/.exec(data);
    console.log("Title:", titleMatch ? titleMatch[1] : 'none');
  });
});
