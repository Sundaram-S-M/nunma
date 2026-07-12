import axios from "axios";

let cachedToken: string | null = null;
let tokenExpiryTime: number = 0;

export async function getZohoAccessToken(): Promise<string> {
    if (cachedToken && Date.now() < tokenExpiryTime) {
        return cachedToken;
    }

    const refreshToken = process.env.ZOHO_REFRESH_TOKEN;
    const clientId = process.env.ZOHO_CLIENT_ID;
    const clientSecret = process.env.ZOHO_CLIENT_SECRET;

    if (!refreshToken || !clientId || !clientSecret) {
        throw new Error("Zoho credentials missing from environment.");
    }

    const authRes = await axios.post("https://accounts.zoho.in/oauth/v2/token", null, {
        params: {
            refresh_token: refreshToken,
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: "refresh_token"
        }
    });

    cachedToken = authRes.data.access_token;
    // Token is usually valid for 3600 seconds. Set expiry 5 minutes before actual expiry just in case.
    tokenExpiryTime = Date.now() + ((authRes.data.expires_in || 3600) * 1000) - 300000;

    return cachedToken!;
}

