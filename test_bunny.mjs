const regions = ['', 'ny.', 'la.', 'sg.', 'syd.', 'uk.'];
const libId = '608015';
const key = '16b0c016-51f3-41a9-81291a8d0efa-3b27-4947';

async function testRegions() {
  for (const r of regions) {
    const url = `https://${r}video.bunnycdn.com/library/${libId}/videos`;
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
      console.log('SUCCESS on region:', r || 'default');
      console.log('Video ID:', data.guid);
      return;
    } catch(e) {
      console.log('Failed on', r || 'default', e.message);
    }
  }
}
testRegions();
