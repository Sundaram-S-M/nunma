const http = require('http');
const crypto = require('crypto');

http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Allow-Methods', '*');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (req.url === '/get-sig') {
        const libId = '628013';
        const key = '16b0c016-51f3-41a9-81291a8d0efa-3b27-4947';
        const videoId = 'e8617480-e585-43da-8eab-47c345b32343';
        const expirationTime = Math.floor(Date.now() / 1000) + 86400;
        const signature = crypto.createHash('sha256').update(String(libId) + String(key) + String(expirationTime) + String(videoId)).digest('hex');
        
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({ signature, expirationTime, videoId, libId }));
        return;
    }

    console.log('--- NEW REQUEST ---');
    console.log(req.method, req.url);
    console.log(req.headers);

    res.writeHead(201, {
        'Location': 'http://localhost:9999/tusupload/12345',
        'Tus-Resumable': '1.0.0'
    });
    res.end();
}).listen(9999, () => console.log('Proxy listening on 9999'));
