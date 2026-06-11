async function run() {
  const libraryId = '628013';
  const videoId = '0ffe6454-8f60-4021-9620-980a6ff099a1';
  const url = `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}`;

  const browserHeaders = {
    'Host': 'iframe.mediadelivery.net',
    'Connection': 'keep-alive',
    'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'Upgrade-Insecure-Requests': '1',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Sec-Fetch-Site': 'cross-site',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Dest': 'iframe',
    'Referer': 'http://localhost:5173/',
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept-Language': 'en-US,en;q=0.9'
  };

  try {
    const response = await fetch(url, { headers: browserHeaders });
    console.log("Response status with browser headers:", response.status);
    if (!response.ok) {
      console.log("Response headers:", [...response.headers.entries()]);
    }
  } catch (e) {
    console.error("Fetch failed:", e);
  }
}

run();
