"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePlatformFeeInvoice = exports.getZohoAccessToken = void 0;
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
async function generatePlatformFeeInvoice(tutorId, tutorName, platformFeeAmount, paymentId) {
    const accessToken = await getZohoAccessToken();
    const orgId = process.env.ZOHO_ORG_ID;
    if (!orgId) {
        throw new Error("ZOHO_ORG_ID is missing from environment.");
    }
    const response = await axios_1.default.post(`https://books.zoho.in/api/v3/invoices?organization_id=${orgId}&send=true`, {
        customer_name: tutorName,
        line_items: [{
                name: `Nunma Platform Fee for Payment: ${paymentId}`,
                rate: platformFeeAmount,
                quantity: 1
            }],
        date: new Date().toISOString().split('T')[0],
        status: "sent"
    }, {
        headers: {
            'Authorization': `Zoho-oauthtoken ${accessToken}`,
            'Content-Type': 'application/json'
        }
    });
    return response.data;
}
exports.generatePlatformFeeInvoice = generatePlatformFeeInvoice;
//# sourceMappingURL=zohoUtils.js.map