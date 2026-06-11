const axios = require('axios');

async function getZones() {
    try {
        const response = await axios.get('https://api.bunny.net/storagezone', {
            headers: {
                'AccessKey': '16b0c016-51f3-41a9-81291a8d0efa-3b27-4947'
            }
        });
        const zones = response.data;
        zones.forEach(z => {
            console.log(`Zone: ${z.Name}, Region: ${z.Region}, Password: ${z.Password}`);
        });
    } catch (e) {
        console.error("Failed to fetch zones:", e.response ? e.response.status : e.message);
    }
}

getZones();
