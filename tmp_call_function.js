import fs from 'fs';

const credentialsPath = 'C:/Users/Admin/.config/configstore/firebase-tools.json';
const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
const projectId = 'nunma-by-cursor';
const region = 'us-central1';

async function run() {
  let idToken = credentials.tokens.id_token;

  // Refresh token logic to get a fresh id_token
  try {
    const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_id: '563577306548-nua8qqj188502h1g5g5k28481g2v5f0t.apps.googleusercontent.com',
        client_secret: 'vEsT7Wx2J03VJ1K6t45OI7A7',
        grant_type: 'refresh_token',
        refresh_token: credentials.tokens.refresh_token
      })
    });
    if (refreshResponse.ok) {
      const refreshData = await refreshResponse.json();
      idToken = refreshData.id_token || idToken;
      console.log("Token refreshed successfully.");
    } else {
      console.error("Token refresh failed status:", refreshResponse.status, await refreshResponse.text());
    }
  } catch (e) {
    console.error("Token refresh failed error:", e);
  }

  const functionUrl = `https://${region}-${projectId}.cloudfunctions.net/generateBunnyToken`;

  console.log("Calling generateBunnyToken...");
  const response = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`
    },
    body: JSON.stringify({
      data: {
        videoId: '0ffe6454-8f60-4021-9620-980a6ff099a1'
      }
    })
  });

  if (!response.ok) {
    console.error("Function call failed:", response.status, await response.text());
    return;
  }

  const result = await response.json();
  console.log("Result:", JSON.stringify(result, null, 2));

  const { token, expires, libraryId } = result.result;
  const videoId = '0ffe6454-8f60-4021-9620-980a6ff099a1';

  // Request the iframe URL
  const iframeUrl = `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}?token=${token}&expires=${expires}&autoplay=true`;
  console.log(`Requesting iframe URL: ${iframeUrl}`);

  const iframeResponse = await fetch(iframeUrl, {
    headers: {
      'Referer': 'http://localhost:5173/',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });

  console.log("Iframe response status:", iframeResponse.status);
  console.log("Iframe response headers:");
  iframeResponse.headers.forEach((val, key) => {
    console.log(`  ${key}: ${val}`);
  });

  const body = await iframeResponse.text();
  console.log("Iframe response body snippet:");
  console.log(body.substring(0, 1000));
}

run();
