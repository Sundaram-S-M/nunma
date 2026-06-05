const axios = require('axios');

async function testCall() {
    try {
        const res = await axios.post('https://us-central1-nunma-by-cursor.cloudfunctions.net/getLiveKitToken', {
            data: {
                roomName: "testZone123",
                identity: "testUser123"
            }
        });
        console.log(res.data);
    } catch (err) {
        console.error(err.response ? err.response.data : err.message);
    }
}
testCall();
