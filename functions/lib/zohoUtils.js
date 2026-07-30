"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getZohoAccessToken = void 0;
const axios_1 = __importDefault(require("axios"));
let cachedToken = null;
let tokenExpiryTime = 0;
async function getZohoAccessToken() {
    if (cachedToken && Date.now() < tokenExpiryTime) {
        return cachedToken;
    }
    const refreshToken = process.env.ZOHO_REFRESH_TOKEN;
    const clientId = process.env.ZOHO_CLIENT_ID;
    const clientSecret = process.env.ZOHO_CLIENT_SECRET;
    if (!refreshToken || !clientId || !clientSecret) {
        throw new Error("Zoho credentials missing from environment.");
    }
    const authRes = await axios_1.default.post("https://accounts.zoho.in/oauth/v2/token", null, {
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
    return cachedToken;
}
exports.getZohoAccessToken = getZohoAccessToken;
//# sourceMappingURL=zohoUtils.js.map