const axios = require('axios');

async function testRegion(region) {
    const url = `https://${region}/nunmapdfassesment/`;
    try {
        const response = await axios.get(url, {
            headers: {
                'AccessKey': '16b0c016-51f3-41a9-81291a8d0efa-3b27-4947'
            }
        });
        console.log(`${region}: Success`, response.status);
    } catch (e) {
        console.log(`${region}: Error`, e.response ? e.response.status : e.message);
    }
}

async function main() {
    await testRegion('storage.bunnycdn.com');
    await testRegion('sg.storage.bunnycdn.com');
    await testRegion('ny.storage.bunnycdn.com');
    await testRegion('la.storage.bunnycdn.com');
}

main();
