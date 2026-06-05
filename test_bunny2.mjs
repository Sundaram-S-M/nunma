import axios from 'axios';
const libId = '628013';
const key = '16b0c016-51f3-41a9-81291a8d0efa-3b27-4947';

async function testRegions() {
    const url = `https://video.bunnycdn.com/library/${libId}/videos`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'AccessKey': key,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({title: 'test'})
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.Message || res.statusText);
      }
      console.log('SUCCESS!');
      console.log('Video ID:', data.guid);
      return;
    } catch(e) {
      console.log('Failed:', e.message);
    }
}
testRegions();
