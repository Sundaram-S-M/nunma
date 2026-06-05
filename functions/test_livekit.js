const { AccessToken } = require('livekit-server-sdk');

async function test() {
    try {
        const at = new AccessToken("dummyKey", "dummySecret", {
            identity: "testUser",
            ttl: 3600
        });

        at.addGrant({
            roomJoin: true,
            room: "testRoom"
        });

        const token = await at.toJwt();
        console.log("Success! Token:", token);
    } catch (err) {
        console.error("Crash:", err);
    }
}

test();
