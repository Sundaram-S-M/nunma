"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.joinZoneByInvite = exports.revokeZoneInvite = exports.generateZoneInvite = exports.verifyOTPAndSignIn = exports.requestOTP = exports.registerIssuance = exports.submitExam = exports.submitGradedScript = exports.uploadExamScript = exports.deleteUserAccount = exports.serveSecurePdf = exports.razorpayRouteWebhook = exports.createRazorpayOrder = exports.createTutorLinkedAccount = exports.generateBunnyToken = exports.bunnyStreamWebhook = exports.createBunnyVideo = exports.toggleStudentAudio = exports.generateLiveToken = exports.gradePdfSubmission = void 0;
const admin = __importStar(require("firebase-admin"));
admin.initializeApp();
const functions = __importStar(require("firebase-functions"));
const https_1 = require("firebase-functions/v2/https");
const crypto = __importStar(require("crypto"));
// import * as nodemailer from "nodemailer";
const livekit_server_sdk_1 = require("livekit-server-sdk");
const axios_1 = __importDefault(require("axios"));
const pdf_lib_1 = require("pdf-lib");
const razorpay_1 = __importDefault(require("razorpay"));
const zohoUtils_1 = require("./zohoUtils");
const uuid_1 = require("uuid");
const vcUtils_1 = require("./utils/vcUtils");
const resend_1 = require("resend");
var gradeSubmission_1 = require("./ai/gradeSubmission");
Object.defineProperty(exports, "gradePdfSubmission", { enumerable: true, get: function () { return gradeSubmission_1.gradePdfSubmission; } });
const db = admin.firestore();
// Global transporter for billing and OTP emails
/*
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});
*/
// --- LIVEKIT INTEGRATION ---
exports.generateLiveToken = (0, https_1.onCall)({ secrets: ["LIVEKIT_API_KEY", "LIVEKIT_API_SECRET", "LIVEKIT_URL"], cors: true }, async (request) => {
    if (!request.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Login required.");
    }
    const { zoneId, sessionId } = request.data;
    if (!zoneId || !sessionId) {
        throw new functions.https.HttpsError("invalid-argument", "Missing zoneId or sessionId.");
    }
    const uid = request.auth.uid;
    // Fetch user document to check role and name
    const userDoc = await db.collection("users").doc(uid).get();
    if (!userDoc.exists) {
        throw new functions.https.HttpsError("not-found", "User profile not found.");
    }
    const userData = userDoc.data();
    const userName = (userData === null || userData === void 0 ? void 0 : userData.name) || "Anonymous";
    const userRole = (userData === null || userData === void 0 ? void 0 : userData.role) || "STUDENT";
    // Fetch zone to check if user is the creator
    const zoneDoc = await db.collection("zones").doc(zoneId).get();
    const zoneData = zoneDoc.data();
    const isCreator = (zoneData === null || zoneData === void 0 ? void 0 : zoneData.createdBy) === uid;
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const liveKitUrl = process.env.LIVEKIT_URL;
    if (!apiKey || !apiSecret || !liveKitUrl) {
        throw new functions.https.HttpsError("failed-precondition", "LiveKit secrets not configured.");
    }
    const at = new livekit_server_sdk_1.AccessToken(apiKey, apiSecret, {
        identity: userName,
        name: userName,
    });
    const isTutor = userRole === "TUTOR" || isCreator;
    // Add matching grants
    at.addGrant({
        roomJoin: true,
        room: sessionId,
        canPublish: isTutor,
        canSubscribe: true,
        canPublishData: true,
    });
    return {
        token: await at.toJwt(),
        serverUrl: liveKitUrl
    };
});
exports.toggleStudentAudio = (0, https_1.onCall)({ secrets: ["LIVEKIT_API_KEY", "LIVEKIT_API_SECRET", "LIVEKIT_URL"], cors: true }, async (request) => {
    var _a;
    if (!request.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Login required.");
    }
    const { zoneId, sessionId, studentIdentity, allowAudio } = request.data;
    if (!zoneId || !sessionId || !studentIdentity) {
        throw new functions.https.HttpsError("invalid-argument", "Missing required parameters.");
    }
    const uid = request.auth.uid;
    // Security Check: Ensure caller is the Creator or a Tutor of the zone
    const zoneDoc = await db.collection("zones").doc(zoneId).get();
    if (!zoneDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Zone not found.");
    }
    const zoneData = zoneDoc.data();
    const isCreator = (zoneData === null || zoneData === void 0 ? void 0 : zoneData.createdBy) === uid;
    // Also check if user is a TUTOR in the users collection
    const userDoc = await db.collection("users").doc(uid).get();
    const userRole = (_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.role;
    const isTutor = userRole === "TUTOR";
    if (!isCreator && !isTutor) {
        throw new functions.https.HttpsError("permission-denied", "Only tutors can manage permissions.");
    }
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const liveKitUrl = process.env.LIVEKIT_URL;
    if (!apiKey || !apiSecret || !liveKitUrl) {
        throw new functions.https.HttpsError("failed-precondition", "LiveKit secrets not configured.");
    }
    const roomService = new livekit_server_sdk_1.RoomServiceClient(liveKitUrl, apiKey, apiSecret);
    // Update participant permissions
    // canPublish is the key here. We set canPublish: true for microphone.
    // We keep video publish strictly false for students.
    await roomService.updateParticipant(sessionId, studentIdentity, undefined, {
        canPublish: allowAudio,
        canPublishSources: allowAudio ? [livekit_server_sdk_1.TrackSource.MICROPHONE] : [],
        canSubscribe: true,
    });
    return { success: true, message: `Student audio ${allowAudio ? 'enabled' : 'disabled'}` };
});
// --- BUNNY STREAM INTEGRATION ---
exports.createBunnyVideo = (0, https_1.onCall)({ secrets: ["BUNNY_API_KEY", "BUNNY_LIBRARY_ID"], cors: true }, async (request) => {
    var _a;
    if (!request.auth)
        throw new functions.https.HttpsError("unauthenticated", "Login required.");
    // Step 1: Role Check
    let role = request.auth.token.role;
    if (!role) {
        const userDoc = await db.collection("users").doc(request.auth.uid).get();
        role = (_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.role;
    }
    if (role !== "THALA" && role !== "TUTOR") {
        throw new functions.https.HttpsError("permission-denied", "Thala or Tutor access required.");
    }
    const { title, zoneId } = request.data;
    if (!zoneId)
        throw new functions.https.HttpsError("invalid-argument", "Missing zoneId for Firestore indexing.");
    const libraryId = process.env.BUNNY_LIBRARY_ID;
    const apiKey = process.env.BUNNY_API_KEY;
    if (!libraryId || !apiKey) {
        throw new functions.https.HttpsError("failed-precondition", "Bunny security configuration missing.");
    }
    // Step 2: Bunny Init (Get GUID)
    const response = await axios_1.default.post(`https://video.bunnycdn.com/library/${libraryId}/videos`, { title: title || 'Untitled' }, { headers: { 'AccessKey': apiKey, 'Content-Type': 'application/json' } });
    const videoId = response.data.guid;
    // Step 3: Signature Generation
    const expirationTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour expiry
    const signature = crypto.createHash('sha256').update(libraryId + apiKey + expirationTime + videoId).digest('hex');
    // Step 4: DB Write (Direct indexing under Zone subcollection)
    const videoRef = db.doc(`zones/${zoneId}/videos/${videoId}`);
    await videoRef.set({
        bunnyVideoId: videoId,
        status: 'pending',
        title: title || 'Untitled Video',
        tutorId: request.auth.uid,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        zoneId
    });
    return {
        videoId,
        signature,
        expirationTime,
        libraryId,
        uploadUrl: 'https://video.bunnycdn.com/tusupload'
    };
});
exports.bunnyStreamWebhook = (0, https_1.onRequest)({ secrets: ["BUNNY_WEBHOOK_SECRET"] }, async (req, res) => {
    const signature = req.headers['x-bunnystream-signature'] || req.headers['x-bunny-signature'];
    const secret = process.env.BUNNY_WEBHOOK_SECRET;
    if (!signature || !secret || typeof signature !== 'string') {
        res.status(401).send('Unauthorized: Invalid Signature');
        return;
    }
    const expectedSignature = crypto.createHmac('sha256', secret).update(req.rawBody).digest('hex').toLowerCase();
    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
    const signatureBuffer = Buffer.from(signature.toLowerCase(), 'utf8');
    if (expectedBuffer.length !== signatureBuffer.length || !crypto.timingSafeEqual(expectedBuffer, signatureBuffer)) {
        res.status(401).send('Unauthorized: Invalid Signature');
        return;
    }
    try {
        const payload = JSON.parse(req.rawBody.toString('utf8'));
        const videoGuid = payload.VideoGuid;
        if (videoGuid && payload.Status === 3) {
            const videosSnapshot = await db.collection("videos").where("bunnyVideoId", "==", videoGuid).get();
            if (!videosSnapshot.empty) {
                const batch = db.batch();
                videosSnapshot.docs.forEach(doc => {
                    batch.update(doc.ref, { status: "ready" });
                });
                await batch.commit();
            }
            else {
                console.warn(`Bunny Webhook: Video ID not found in database: ${videoGuid}`);
            }
        }
        res.status(200).send('OK');
    }
    catch (error) {
        console.error("Webhook processing error:", error);
        res.status(500).send('Internal Server Error');
    }
});
exports.generateBunnyToken = (0, https_1.onCall)({ secrets: ["BUNNY_TOKEN_KEY", "BUNNY_LIBRARY_ID"], cors: true }, async (request) => {
    if (!request.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Login required.");
    }
    const { videoId } = request.data;
    if (!videoId) {
        throw new functions.https.HttpsError("invalid-argument", "Missing videoId.");
    }
    const tokenKey = process.env.BUNNY_TOKEN_KEY;
    const libraryId = process.env.BUNNY_LIBRARY_ID;
    if (!tokenKey || !libraryId) {
        throw new functions.https.HttpsError("failed-precondition", "Bunny token configuration missing.");
    }
    const expires = Math.floor(Date.now() / 1000) + 21600; // 6 hours from now
    // Bunny signature logic: Token Security Key + Video ID + Expiration Time
    const hash = crypto.createHash('sha256').update(tokenKey + videoId + expires).digest('hex');
    return { token: hash, expires, libraryId };
});
// --- RAZORPAY & KYC STATE MANAGEMENT ---
/**
 * Extracts a human-readable error message from a Razorpay API error response.
 * Razorpay's errors are typically nested under error.response.data.error.
 */
function extractRazorpayError(error) {
    var _a, _b;
    const rzpError = (_b = (_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.error;
    if (rzpError) {
        // Build a descriptive message: e.g. "Invalid IFSC code: Please provide a valid IFSC"
        const parts = [];
        if (rzpError.description)
            parts.push(rzpError.description);
        if (rzpError.field)
            parts.push(`(Field: ${rzpError.field})`);
        if (rzpError.reason)
            parts.push(`Reason: ${rzpError.reason}`);
        if (parts.length > 0)
            return parts.join(' ');
    }
    return (error === null || error === void 0 ? void 0 : error.message) || "An unexpected Razorpay error occurred.";
}
exports.createTutorLinkedAccount = (0, https_1.onCall)({ secrets: ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET"], cors: true }, async (request) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
    if (!request.auth)
        throw new functions.https.HttpsError("unauthenticated", "Login required.");
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    const uid = request.auth.uid;
    const { businessType: payloadBusinessType, legalName: payloadLegalName, phone: payloadPhone, pan: payloadPan, bankAccount: payloadBankAccount, ifsc: payloadIfsc, gstin: payloadGstin, street: payloadStreet, street2: payloadStreet2, city: payloadCity, state: payloadState, pinCode: payloadPinCode, } = request.data || {};
    try {
        const tutorRef = db.collection("users").doc(uid);
        const tutorDoc = await tutorRef.get();
        const tutorData = tutorDoc.data();
        let accountId = tutorData === null || tutorData === void 0 ? void 0 : tutorData.razorpay_account_id;
        const authHeader = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`;
        const headers = { 'Authorization': authHeader, 'Content-Type': 'application/json' };
        // Extract profile data for link generation (needed for both new and existing accounts)
        const bType = payloadBusinessType || ((_a = tutorData === null || tutorData === void 0 ? void 0 : tutorData.taxDetails) === null || _a === void 0 ? void 0 : _a.businessType) || "individual";
        const mappedBusinessType = "proprietorship"; // Standard for individual linked accounts
        const mappedLegalName = payloadLegalName || ((_b = tutorData === null || tutorData === void 0 ? void 0 : tutorData.taxDetails) === null || _b === void 0 ? void 0 : _b.legalName) || (tutorData === null || tutorData === void 0 ? void 0 : tutorData.name) || "Independent Tutor";
        const mappedEmail = (tutorData === null || tutorData === void 0 ? void 0 : tutorData.email) || request.auth.token.email;
        const rawPhone = (payloadPhone || ((_c = tutorData === null || tutorData === void 0 ? void 0 : tutorData.taxDetails) === null || _c === void 0 ? void 0 : _c.phone) || (tutorData === null || tutorData === void 0 ? void 0 : tutorData.phoneNumber) || "").toString().replace(/\D/g, '');
        const mappedPhone = rawPhone.length === 10 ? `+91${rawPhone}` : (rawPhone.startsWith('91') && rawPhone.length === 12 ? `+${rawPhone}` : `+91${rawPhone.slice(-10)}`);
        // ── Step 1: Create or re-use the Razorpay Linked Account ──────────────
        if (!accountId) {
            const createPayload = {
                email: mappedEmail,
                phone: mappedPhone,
                type: "route",
                reference_id: uid.slice(0, 20),
                legal_business_name: mappedLegalName,
                customer_facing_business_name: mappedLegalName,
                business_type: mappedBusinessType,
                profile: {
                    category: "education",
                    subcategory: "professional_courses",
                    addresses: {
                        registered: {
                            street1: payloadStreet || "N/A",
                            street2: payloadStreet2 || "",
                            city: payloadCity || "India",
                            state: payloadState || "KA",
                            postal_code: payloadPinCode || "560001",
                            country: "IN",
                        }
                    }
                },
                legal_info: Object.assign({ pan: (payloadPan || ((_d = tutorData === null || tutorData === void 0 ? void 0 : tutorData.taxDetails) === null || _d === void 0 ? void 0 : _d.pan) || "").toUpperCase() }, (payloadGstin || ((_e = tutorData === null || tutorData === void 0 ? void 0 : tutorData.taxDetails) === null || _e === void 0 ? void 0 : _e.gstin)
                    ? { gst: (payloadGstin || ((_f = tutorData === null || tutorData === void 0 ? void 0 : tutorData.taxDetails) === null || _f === void 0 ? void 0 : _f.gstin) || "").toUpperCase() }
                    : {}))
            };
            let createResponse;
            try {
                createResponse = await axios_1.default.post('https://api.razorpay.com/v2/accounts', createPayload, { headers });
            }
            catch (err) {
                const msg = extractRazorpayError(err);
                console.error("Razorpay account creation failed:", msg, (_g = err === null || err === void 0 ? void 0 : err.response) === null || _g === void 0 ? void 0 : _g.data);
                throw new functions.https.HttpsError("failed-precondition", `Razorpay Account creation rejected: ${msg}`);
            }
            accountId = createResponse.data.id;
            console.log(`Razorpay linked account created: ${accountId} for uid: ${uid}.`);
            // ── Step 3: Configure the Route product with bank settlement details ──
            const bankPayload = {
                product_name: "payment_gateway",
                settlements: {
                    account_number: payloadBankAccount || ((_h = tutorData === null || tutorData === void 0 ? void 0 : tutorData.taxDetails) === null || _h === void 0 ? void 0 : _h.bankAccount),
                    ifsc_code: (payloadIfsc || ((_j = tutorData === null || tutorData === void 0 ? void 0 : tutorData.taxDetails) === null || _j === void 0 ? void 0 : _j.ifsc) || "").toUpperCase(),
                    beneficiary_name: mappedLegalName,
                },
                tnc_accepted: true,
            };
            try {
                // POST is correct for initial product configuration on a new linked account.
                await axios_1.default.post(`https://api.razorpay.com/v2/accounts/${accountId}/products`, bankPayload, { headers });
                console.log(`Product "${bankPayload.product_name}" configured successfully for account: ${accountId}`);
            }
            catch (err) {
                const msg = extractRazorpayError(err);
                console.error(`Product config for account ${accountId} failed:`, msg, (_k = err === null || err === void 0 ? void 0 : err.response) === null || _k === void 0 ? void 0 : _k.data);
                throw new functions.https.HttpsError("failed-precondition", `Razorpay Product configuration rejected: ${msg}`);
            }
            // ── Step 3: Persist KYC data in Firestore ────────────────────────────
            await tutorRef.update({
                razorpay_account_id: accountId,
                kycStatus: 'PENDING',
                taxDetails: Object.assign(Object.assign(Object.assign({}, ((tutorData === null || tutorData === void 0 ? void 0 : tutorData.taxDetails) || {})), { businessType: bType, legalName: mappedLegalName, phone: mappedPhone, bankAccountLast4: (payloadBankAccount || "").slice(-4), ifsc: (payloadIfsc || "").toUpperCase() }), (payloadGstin ? { gstin: payloadGstin.toUpperCase() } : {}))
            });
        }
        else if ((tutorData === null || tutorData === void 0 ? void 0 : tutorData.kycStatus) !== 'VERIFIED') {
            await tutorRef.update({ kycStatus: 'PENDING' });
        }
        // ── Step 4: Generate a Razorpay onboarding magic link ─────────────────
        let onboardingUrl;
        try {
            console.log(`[RAZORPAY_DEBUG] Generating link for accountId: ${accountId} with email: ${mappedEmail}`);
            const linkResponse = await axios_1.default.post(`https://api.razorpay.com/v2/accounts/${accountId}/onboarding_links`, {
                notify_address: mappedEmail // บาง Razorpay versions require an email for notification
            }, { headers });
            onboardingUrl = linkResponse.data.short_url || linkResponse.data.url;
            console.log(`[RAZORPAY_DEBUG] Onboarding link generated successfully: ${onboardingUrl}`);
        }
        catch (v2Error) {
            const v2Msg = extractRazorpayError(v2Error);
            const v2Data = (_l = v2Error === null || v2Error === void 0 ? void 0 : v2Error.response) === null || _l === void 0 ? void 0 : _l.data;
            const is404 = ((_m = v2Error === null || v2Error === void 0 ? void 0 : v2Error.response) === null || _m === void 0 ? void 0 : _m.status) === 404;
            console.error(`[RAZORPAY_ERROR] v2 link failed for ${accountId}:`, v2Msg, JSON.stringify(v2Data));
            if (is404) {
                try {
                    console.log(`[RAZORPAY_DEBUG] Attempting fallback v1 onboarding for ${accountId}`);
                    const v1Response = await axios_1.default.post(`https://api.razorpay.com/v1/accounts/${accountId}/onboarding_links`, { notify_address: mappedEmail }, { headers });
                    onboardingUrl = v1Response.data.short_url || v1Response.data.url;
                }
                catch (v1Error) {
                    const v1Msg = extractRazorpayError(v1Error);
                    const v1Data = (_o = v1Error === null || v1Error === void 0 ? void 0 : v1Error.response) === null || _o === void 0 ? void 0 : _o.data;
                    console.error("[RAZORPAY_ERROR] Fallback failed:", v1Msg, JSON.stringify(v1Data));
                    throw new functions.https.HttpsError("internal", `Razorpay Link Generation Failed (v2/v1 404). Details: ${v1Msg}. Check if Marketplace is enabled in your dashboard.`);
                }
            }
            else {
                throw new functions.https.HttpsError("internal", `Onboarding Link error: ${v2Msg}`);
            }
        }
        return { success: true, onboardingUrl };
    }
    catch (error) {
        // Re-throw HttpsErrors unchanged; wrap raw errors with Razorpay message extraction
        if (error instanceof functions.https.HttpsError)
            throw error;
        const msg = extractRazorpayError(error);
        console.error("createTutorLinkedAccount unexpected error:", error);
        throw new functions.https.HttpsError("internal", msg);
    }
});
exports.createRazorpayOrder = (0, https_1.onCall)({ secrets: ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET"], cors: true }, async (request) => {
    if (!request.auth)
        throw new functions.https.HttpsError("unauthenticated", "Login required.");
    const { zoneId, type = 'zone' } = request.data;
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    try {
        const collectionName = type === 'mentorship' ? 'products' : 'zones';
        const itemDoc = await db.collection(collectionName).doc(zoneId).get();
        if (!itemDoc.exists) {
            throw new functions.https.HttpsError("not-found", `${type === 'mentorship' ? 'Mentorship session' : 'Zone'} not found.`);
        }
        const itemData = itemDoc.data();
        const tutorId = itemData.createdBy;
        if (!tutorId) {
            throw new functions.https.HttpsError("failed-precondition", "This item is not linked to a valid tutor.");
        }
        const tutorDoc = await db.collection("users").doc(tutorId).get();
        if (!tutorDoc.exists) {
            throw new functions.https.HttpsError("not-found", "Tutor profile not found.");
        }
        const tutorData = tutorDoc.data();
        const rzpAccountId = tutorData.razorpay_account_id || (tutorData.isDevBypass ? "acc_TEST_BYPASS" : null);
        if (!rzpAccountId) {
            throw new functions.https.HttpsError("invalid-argument", "Tutor has not completed KYC onboarding.");
        }
        const priceValue = type === 'mentorship' ? (itemData.priceINR || itemData.price) : itemData.price;
        if (!priceValue) {
            throw new functions.https.HttpsError("failed-precondition", "Item price is not defined in the system.");
        }
        const gross_paise = Math.round(parseFloat(priceValue.toString()) * 100);
        let commissionTierPercentage = 0.10; // Basic = 10%
        if (tutorData.subscriptionPlan === 'Pro') {
            commissionTierPercentage = 0.05;
        }
        else if (tutorData.subscriptionPlan === 'Elite') {
            commissionTierPercentage = 0.02;
        }
        const platform_fee_paise = Math.round(gross_paise * commissionTierPercentage);
        const tds_paise = Math.round(gross_paise * 0.001);
        const tcs_paise = Math.round(gross_paise * 0.005);
        const tutor_transfer_paise = gross_paise - (platform_fee_paise + tds_paise + tcs_paise);
        const razorpay = new razorpay_1.default({ key_id: keyId, key_secret: keySecret });
        const order = await razorpay.orders.create({
            amount: gross_paise,
            currency: "INR",
            transfers: [
                {
                    account: rzpAccountId,
                    amount: Math.round(tutor_transfer_paise),
                    currency: "INR",
                    notes: {
                        zoneId: zoneId,
                        studentId: request.auth.uid,
                        tutorId: tutorId,
                        type: type
                    },
                    on_hold: true // Holds funds in escrow until we explicitly release them or standard settlement kicks in
                }
            ],
            notes: { zoneId, studentId: request.auth.uid, tutorId, type }
        });
        return { id: order.id, amount: order.amount };
    }
    catch (error) {
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError("failed-precondition", error.message || "Razorpay order creation rejected");
    }
});
exports.razorpayRouteWebhook = (0, https_1.onRequest)({ secrets: ["RAZORPAY_WEBHOOK_SECRET"] }, async (req, res) => {
    var _a, _b, _c, _d, _e;
    const signature = req.headers['x-razorpay-signature'];
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const hmac = crypto.createHmac('sha256', secret).update(req.rawBody).digest('hex');
    if (hmac !== signature) {
        res.status(400).send('Invalid signature');
        return;
    }
    const event = req.body.event;
    const payload = req.body.payload;
    if (event === 'account.activated' || event === 'account.rejected' || event === 'account.needs_clarification') {
        const accountId = payload.account.entity.id;
        const usersSnapshot = await db.collection('users').where('razorpay_account_id', '==', accountId).get();
        if (!usersSnapshot.empty) {
            const userDoc = usersSnapshot.docs[0];
            let kycStatus = 'PENDING';
            if (event === 'account.activated')
                kycStatus = 'VERIFIED';
            else if (event === 'account.rejected')
                kycStatus = 'FAILED';
            else if (event === 'account.needs_clarification')
                kycStatus = 'NEEDS_CLARIFICATION';
            await userDoc.ref.update({ kycStatus });
            console.log(`Updated KYC status for user ${userDoc.id} to ${kycStatus} based on event ${event}`);
        }
        else {
            console.warn(`No user found with razorpay_account_id: ${accountId} for event: ${event}`);
        }
    }
    else if (event === 'payment.captured') {
        const paymentEntity = payload.payment.entity;
        const txRef = db.collection('transactions').doc(paymentEntity.id);
        const isDuplicate = await db.runTransaction(async (transaction) => {
            const txDoc = await transaction.get(txRef);
            if (txDoc.exists) {
                return true;
            }
            transaction.set(txRef, {
                processedAt: admin.firestore.FieldValue.serverTimestamp(),
                eventId: req.body.id || 'unknown'
            });
            const { zoneId, studentId, type } = paymentEntity.notes || {};
            if (zoneId && studentId) {
                if (type === 'mentorship') {
                    // For mentorship, we just record the enrollment on the user's profile
                    const userEnrollRef = db.collection('users').doc(studentId).collection('enrollments').doc(zoneId);
                    transaction.set(userEnrollRef, {
                        type: 'mentorship',
                        enrolledAt: admin.firestore.FieldValue.serverTimestamp(),
                        status: 'paid'
                    });
                }
                else {
                    // For zones/courses
                    const studentRef = db.collection('zones').doc(zoneId).collection('students').doc(studentId);
                    transaction.set(studentRef, {
                        status: "active",
                        joinedAt: admin.firestore.FieldValue.serverTimestamp(),
                        completedSegments: []
                    });
                }
            }
            return false;
        });
        if (!isDuplicate) {
            // Generate Zoho Invoice directly inline
            try {
                let resolvedTutorId = (_a = paymentEntity.notes) === null || _a === void 0 ? void 0 : _a.tutorId;
                const zoneId = (_b = paymentEntity.notes) === null || _b === void 0 ? void 0 : _b.zoneId;
                if (!resolvedTutorId && zoneId) {
                    const zoneDoc = await db.collection("zones").doc(zoneId).get();
                    if (zoneDoc.exists) {
                        resolvedTutorId = (_c = zoneDoc.data()) === null || _c === void 0 ? void 0 : _c.createdBy;
                    }
                }
                if (resolvedTutorId) {
                    const tutorDoc = await db.collection("users").doc(resolvedTutorId).get();
                    let resolvedTutorName = "Tutor";
                    let subscriptionPlan = "Basic";
                    if (tutorDoc.exists) {
                        const tutorData = tutorDoc.data();
                        resolvedTutorName = tutorData.name || ((_d = tutorData.taxDetails) === null || _d === void 0 ? void 0 : _d.legalName) || "Tutor";
                        subscriptionPlan = tutorData.subscriptionPlan || "Basic";
                    }
                    const gross_paise = paymentEntity.amount || 0;
                    let commissionTierPercentage = 0.10;
                    if (subscriptionPlan === 'Pro')
                        commissionTierPercentage = 0.05;
                    if (subscriptionPlan === 'Elite')
                        commissionTierPercentage = 0.02;
                    const platform_fee_paise = Math.round(gross_paise * commissionTierPercentage);
                    const platformFeeAmount = platform_fee_paise / 100;
                    const invoiceResponse = await (0, zohoUtils_1.generatePlatformFeeInvoice)(resolvedTutorId, resolvedTutorName, platformFeeAmount, paymentEntity.id);
                    const invoiceId = ((_e = invoiceResponse === null || invoiceResponse === void 0 ? void 0 : invoiceResponse.invoice) === null || _e === void 0 ? void 0 : _e.invoice_id) || "unknown";
                    await db.collection("users").doc(resolvedTutorId).collection("invoices").add({
                        zohoInvoiceId: invoiceId,
                        amount: platformFeeAmount,
                        paymentId: paymentEntity.id,
                        createdAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                }
                else {
                    throw new Error("Could not resolve tutorId for invoicing");
                }
            }
            catch (zohoError) {
                console.error("Critical error generating Zoho invoice:", zohoError);
            }
        }
    }
    res.status(200).send('OK');
});
// --- PDF WATERMARKING ---
exports.serveSecurePdf = (0, https_1.onRequest)({ cors: true }, async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        const idToken = authHeader === null || authHeader === void 0 ? void 0 : authHeader.split('Bearer ')[1];
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const { zoneId, segmentId } = req.body;
        const studentDoc = await db.doc(`zones/${zoneId}/students/${decodedToken.uid}`).get();
        if (!studentDoc.exists) {
            res.status(403).send('Not enrolled.');
            return;
        }
        const [buffer] = await admin.storage().bucket().file(`segments/pdfs/${segmentId}.pdf`).download();
        const pdfDoc = await pdf_lib_1.PDFDocument.load(buffer);
        const pages = pdfDoc.getPages();
        pages.forEach(p => p.drawText(`${decodedToken.email} - ${decodedToken.uid}`, { x: 50, y: 50, size: 10, opacity: 0.2 }));
        const pdfBytes = await pdfDoc.save();
        res.setHeader('Content-Type', 'application/pdf');
        res.end(Buffer.from(pdfBytes));
    }
    catch (error) {
        res.status(500).send('Internal Error');
    }
});
// --- ACCOUNT DELETION ---
exports.deleteUserAccount = (0, https_1.onCall)({ secrets: ["BUNNY_API_KEY"], cors: true }, async (request) => {
    if (!request.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Login required for account deletion.");
    }
    const uid = request.auth.uid;
    const libraryId = process.env.BUNNY_LIBRARY_ID;
    const apiKey = process.env.BUNNY_API_KEY;
    console.log(`Starting permanent deletion for user: ${uid}`);
    try {
        // 1. Cleanup Bunny.net Videos
        const tutorVideosSnapshot = await db.collection("videos").where("tutorId", "==", uid).get();
        if (!tutorVideosSnapshot.empty && libraryId && apiKey) {
            console.log(`Deleting ${tutorVideosSnapshot.size} videos from Bunny.net...`);
            const deletePromises = tutorVideosSnapshot.docs.map(async (doc) => {
                const videoId = doc.data().bunnyVideoId;
                if (videoId) {
                    try {
                        await axios_1.default.delete(`https://video.bunnycdn.com/library/${libraryId}/videos/${videoId}`, { headers: { 'AccessKey': apiKey } });
                    }
                    catch (err) {
                        console.error(`Failed to delete video ${videoId} from Bunny:`, err.message);
                    }
                }
                return doc.ref.delete();
            });
            await Promise.all(deletePromises);
        }
        // 2. Cleanup Firebase Storage (Workspace files)
        console.log(`Deleting storage files for workspace: workspaces/${uid}/...`);
        const bucket = admin.storage().bucket();
        await bucket.deleteFiles({ prefix: `workspaces/${uid}/` });
        // 3. Cleanup Firestore Data
        // Delete taxDetails subcollection
        const taxDetailsSnapshot = await db.collection("users").doc(uid).collection("taxDetails").get();
        const taxDeletePromises = taxDetailsSnapshot.docs.map(doc => doc.ref.delete());
        await Promise.all(taxDeletePromises);
        // Delete main user document
        await db.collection("users").doc(uid).delete();
        // 4. Delete from Firebase Auth
        await admin.auth().deleteUser(uid);
        console.log(`Successfully deleted user ${uid} and all associated data.`);
        return { success: true };
    }
    catch (error) {
        console.error("Critical error during account deletion:", error);
        throw new functions.https.HttpsError("internal", `Deletion failed: ${error.message}`);
    }
});
// --- EXAM SUBMISSION LOGIC ---
exports.uploadExamScript = (0, https_1.onCall)({ cors: true }, async (request) => {
    var _a;
    if (!request.auth)
        throw new functions.https.HttpsError("unauthenticated", "Login required.");
    const { file, fileName, zoneId, examId } = request.data;
    const uid = request.auth.uid;
    const studentDoc = await db.collection('zones').doc(zoneId).collection('students').doc(uid).get();
    const studentData = studentDoc.data();
    if (!studentData || studentData.activeExamId !== examId) {
        throw new functions.https.HttpsError("failed-precondition", "No active exam found to upload.");
    }
    if (studentData.examEndsAt) {
        const serverNow = Date.now();
        const absoluteCutoff = new Date(studentData.examEndsAt).getTime() + (20 * 60 * 1000);
        if (serverNow > absoluteCutoff) {
            throw new functions.https.HttpsError("permission-denied", "Submission window has permanently closed.");
        }
    }
    const bunnyApiKey = process.env.BUNNY_STORAGE_API_KEY;
    const storageZone = process.env.BUNNY_STORAGE_ZONE_NAME;
    const pullZone = process.env.BUNNY_PULL_ZONE_URL;
    if (!bunnyApiKey || !storageZone || !pullZone) {
        throw new functions.https.HttpsError("internal", "Storage configuration missing");
    }
    const base64Data = file.replace(/^data:.*\/.*;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const fileSizeInBytes = buffer.length;
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `exams/${zoneId}/${examId}/${uid}_${sanitizedFileName}`;
    try {
        await axios_1.default.put(`https://storage.bunnycdn.com/${storageZone}/${storagePath}`, buffer, {
            headers: {
                'AccessKey': bunnyApiKey,
                'Content-Type': 'application/pdf',
            }
        });
        const zoneDoc = await db.collection('zones').doc(zoneId).get();
        const tutorUid = (_a = zoneDoc.data()) === null || _a === void 0 ? void 0 : _a.createdBy;
        if (tutorUid) {
            await db.collection("users").doc(tutorUid).update({
                usedStorageBytes: admin.firestore.FieldValue.increment(fileSizeInBytes)
            });
        }
        return { fileUrl: `https://${pullZone}/${storagePath}` };
    }
    catch (error) {
        console.error("Upload error", error);
        throw new functions.https.HttpsError("internal", "Failed to upload file to edge storage.");
    }
});
exports.submitGradedScript = (0, https_1.onCall)({ cors: true }, async (request) => {
    var _a;
    if (!request.auth)
        throw new functions.https.HttpsError("unauthenticated", "Login required.");
    const { zoneId, examId, studentId, score, feedback, mergedPdf, oldFileUrl } = request.data;
    // Authorization
    const zoneDoc = await db.collection('zones').doc(zoneId).get();
    const tutorUid = (_a = zoneDoc.data()) === null || _a === void 0 ? void 0 : _a.createdBy;
    if (request.auth.uid !== tutorUid) {
        throw new functions.https.HttpsError("permission-denied", "Only the zone owner can grade exams.");
    }
    const bunnyApiKey = process.env.BUNNY_STORAGE_API_KEY;
    const storageZone = process.env.BUNNY_STORAGE_ZONE_NAME;
    const pullZone = process.env.BUNNY_PULL_ZONE_URL;
    if (!bunnyApiKey || !storageZone || !pullZone || !mergedPdf || !oldFileUrl) {
        throw new functions.https.HttpsError("internal", "Storage configuration missing or missing payload");
    }
    try {
        // Evaluate the new file size
        const base64Data = mergedPdf.replace(/^data:.*\/.*;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const newFileSizeInBytes = buffer.length;
        const newFileName = `graded_${studentId}_exam.pdf`;
        const storagePath = `exams/${zoneId}/${examId}/${newFileName}`;
        // Upload New
        await axios_1.default.put(`https://storage.bunnycdn.com/${storageZone}/${storagePath}`, buffer, { headers: { 'AccessKey': bunnyApiKey, 'Content-Type': 'application/pdf' } });
        // Delete Old
        // oldFileUrl format: https://[pullzone]/exams/[zoneId]/[examId]/[studentId]_[fileName]
        let oldFileSizeInBytes = 0;
        try {
            const oldPath = oldFileUrl.replace(`https://${pullZone}/`, '');
            // Get original file size to maintain exact quota diff
            const res = await axios_1.default.head(`https://storage.bunnycdn.com/${storageZone}/${oldPath}`, {
                headers: { 'AccessKey': bunnyApiKey }
            });
            oldFileSizeInBytes = parseInt(res.headers['content-length'] || "0");
            await axios_1.default.delete(`https://storage.bunnycdn.com/${storageZone}/${oldPath}`, {
                headers: { 'AccessKey': bunnyApiKey }
            });
        }
        catch (e) {
            console.error("Failed to delete old storage file, continuing...", e);
        }
        const sizeDiff = newFileSizeInBytes - oldFileSizeInBytes;
        await db.collection("users").doc(tutorUid).update({
            usedStorageBytes: admin.firestore.FieldValue.increment(sizeDiff)
        });
        // Update DB
        const newFileUrl = `https://${pullZone}/${storagePath}`;
        await db.collection('zones').doc(zoneId).collection('exams').doc(examId).collection('submissions').doc(studentId).set({
            status: "graded",
            score: score,
            marks: score,
            feedback: feedback,
            tutorFeedback: feedback,
            answerSheetUrl: newFileUrl,
            gradedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        // Update student doc for quick access if needed
        await db.collection('zones').doc(zoneId).collection('students').doc(studentId).set({
            activeExamGraded: true
        }, { merge: true });
        return { success: true, gradedUrl: newFileUrl };
    }
    catch (error) {
        console.error("Grade submit error", error);
        throw new functions.https.HttpsError("internal", "Failed to upload merged script to edge storage.");
    }
});
exports.submitExam = (0, https_1.onCall)({ cors: true }, async (request) => {
    if (!request.auth)
        throw new functions.https.HttpsError("unauthenticated", "Login required.");
    const { zoneId, examId, answers, violationLogs, answerSheetUrl } = request.data;
    const uid = request.auth.uid;
    // Time Window Validation
    const studentDoc = await db.collection('zones').doc(zoneId).collection('students').doc(uid).get();
    const studentData = studentDoc.data();
    if (!studentData || studentData.activeExamId !== examId) {
        throw new functions.https.HttpsError("failed-precondition", "No active exam found.");
    }
    if (studentData.examEndsAt) {
        const serverNow = Date.now();
        const absoluteCutoff = new Date(studentData.examEndsAt).getTime() + (20 * 60 * 1000);
        if (serverNow > absoluteCutoff) {
            throw new functions.https.HttpsError("permission-denied", "Submission window has permanently closed.");
        }
    }
    const examDoc = await db.collection('zones').doc(zoneId).collection('exams').doc(examId).get();
    const examData = examDoc.data();
    if (!examData) {
        throw new functions.https.HttpsError("not-found", "Exam not found.");
    }
    let marks = 0;
    let status = 'ongoing';
    const isTerminatedByCheat = violationLogs && violationLogs.length >= 3;
    // Secure Scoring
    if (examData.type === 'online-mcq' || examData.type === 'online-test') {
        if (examData.questions && answers) {
            let score = 0;
            examData.questions.forEach((q) => {
                if (answers[q.id] === q.correctAnswer)
                    score++;
            });
            marks = Math.round((score / examData.questions.length) * (examData.maxMark || 100));
            const minMark = examData.minMark || 0;
            status = marks >= minMark ? 'passed' : 'failed';
        }
    }
    if (isTerminatedByCheat) {
        status = 'failed';
        marks = 0;
    }
    const submissionPayload = {
        examId,
        studentId: uid,
        studentName: request.auth.token.name || 'Student',
        marks,
        status,
        cheatViolations: violationLogs || [],
        completedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    if (answerSheetUrl) {
        submissionPayload.answerSheetUrl = answerSheetUrl;
    }
    await db.collection('zones').doc(zoneId).collection('exams').doc(examId).collection('submissions').doc(uid).set(submissionPayload);
    await studentDoc.ref.update({
        activeExamId: admin.firestore.FieldValue.delete(),
        examEndsAt: admin.firestore.FieldValue.delete(),
        currentExamWarnings: admin.firestore.FieldValue.delete(),
        violationLogs: admin.firestore.FieldValue.delete(),
        examStartedAt: admin.firestore.FieldValue.delete()
    });
    return { success: true, marks, status };
});
exports.registerIssuance = (0, https_1.onCall)({ cors: true }, async (request) => {
    var _a, _b, _c;
    if (!request.auth)
        throw new functions.https.HttpsError("unauthenticated", "Login required.");
    const { zoneId, studentId } = request.data;
    // Security Check: Fetch student's enrollment document and the Zone's structure
    const zoneDoc = await db.collection('zones').doc(zoneId).get();
    const zoneData = zoneDoc.data();
    if (!zoneData)
        throw new functions.https.HttpsError("not-found", "Zone not found.");
    const studentDoc = await db.collection('zones').doc(zoneId).collection('students').doc(studentId).get();
    const studentData = studentDoc.data();
    if (!studentData)
        throw new functions.https.HttpsError("not-found", "Student not enrolled.");
    // Verify that completedSegments.length exactly matches the total number of segments in the Zone.
    const completedSegmentsLength = ((_a = studentData.completedSegments) === null || _a === void 0 ? void 0 : _a.length) || 0;
    const totalSegmentsLength = ((_b = zoneData.segments) === null || _b === void 0 ? void 0 : _b.length) || 0;
    if (completedSegmentsLength !== totalSegmentsLength || totalSegmentsLength === 0) {
        throw new functions.https.HttpsError("permission-denied", "Incomplete course requirements.");
    }
    // Generate unique urn:uuid
    const certId = `urn:uuid:${(0, uuid_1.v4)()}`;
    const studentUserDoc = await db.collection('users').doc(studentId).get();
    const studentName = ((_c = studentUserDoc.data()) === null || _c === void 0 ? void 0 : _c.name) || 'Student';
    const courseName = zoneData.title || zoneData.name || 'Course Completion';
    const issueDate = new Date().toISOString();
    const platformUrl = "https://nunma.in";
    // Call generateOpenBadgePayload to create the credential data
    const payload = (0, vcUtils_1.generateOpenBadgePayload)(studentName, courseName, issueDate, certId, platformUrl);
    // Database Write: Create a new document in a root-level certificates collection
    await db.collection('certificates').doc(certId).set({
        payload,
        studentId,
        zoneId,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    // Update the student's enrollment document
    await studentDoc.ref.update({
        certificateId: certId,
        status: "graduated"
    });
    return { certId };
});
// --- OTP AUTHENTICATION ---
exports.requestOTP = (0, https_1.onCall)({ secrets: ["RESEND_API_KEY"], cors: true }, async (request) => {
    let { email } = request.data;
    if (!email) {
        throw new functions.https.HttpsError("invalid-argument", "Email is required.");
    }
    email = email.toLowerCase().trim();
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = admin.firestore.Timestamp.fromDate(new Date(Date.now() + 10 * 60 * 1000)); // 10 mins
    // Strict Firestore path: otps/{email}
    await admin.firestore().collection("otps").doc(email).set({
        otp,
        expiresAt,
        isVerified: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    // Initialize Resend client inside the function using the injected secret
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
        console.error("RESEND ERROR: RESEND_API_KEY secret is not available in this function invocation.");
        throw new functions.https.HttpsError("failed-precondition", "Email service is not configured.");
    }
    const resend = new resend_1.Resend(resendApiKey);
    try {
        // IMPORTANT: Use support@nunma.in (the primary verified Resend sender).
        // notification@nunma.in is an email alias — Resend validates the exact From
        // address against verified domains; using an alias that isn't explicitly
        // added as a sender in the Resend dashboard will cause silent delivery failure.
        const sendResult = await resend.emails.send({
            from: 'Nunma <support@nunma.in>',
            to: email,
            subject: "Your Nunma Verification Code",
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <h2 style="color: #040457;">Verify your identity</h2>
                    <p>Use the following 6-digit code to complete your sign-in to Nunma:</p>
                    <div style="background: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #040457; border-radius: 8px;">
                        ${otp}
                    </div>
                    <p style="margin-top: 20px; color: #666; font-size: 14px;">This code will expire in 10 minutes.</p>
                </div>
            `
        });
        console.log("RESEND SUCCESS: Email sent for", email, "| Resend response:", JSON.stringify(sendResult));
        return { success: true };
    }
    catch (error) {
        // Log the full error object so we can see the exact Resend rejection reason in Firebase logs
        console.error("RESEND DELIVERY FAILURE for", email, "| Full error:", JSON.stringify(error), "| Message:", error === null || error === void 0 ? void 0 : error.message);
        throw new functions.https.HttpsError("internal", error.message || "Failed to send OTP email.");
    }
});
exports.verifyOTPAndSignIn = (0, https_1.onCall)({ cors: true }, async (request) => {
    var _a, _b;
    let { email, otp, registrationData, password } = request.data;
    if (!email) {
        throw new functions.https.HttpsError("invalid-argument", "Email is required.");
    }
    email = email.toLowerCase().trim();
    // Strict Firestore path: otps/{email} — must match requestOTP exactly
    const otpDoc = await admin.firestore().collection("otps").doc(email).get();
    if (!otpDoc.exists) {
        console.error(`verifyOTPAndSignIn: No OTP document found for email: ${email}`);
        throw new functions.https.HttpsError("not-found", "No OTP found. Please request a new code.");
    }
    const data = otpDoc.data();
    const isAlreadyVerified = data.isVerified === true;
    const otpMatch = otp && data.otp === otp;
    // --- Step 1 path: OTP not yet verified, validate the code ---
    if (!isAlreadyVerified) {
        if (!otpMatch) {
            throw new functions.https.HttpsError("permission-denied", "Invalid OTP. Please check the code and try again.");
        }
        // Check original 10-minute expiry only on first verification
        if (data.expiresAt.toDate() < new Date()) {
            await otpDoc.ref.delete();
            throw new functions.https.HttpsError("permission-denied", "OTP has expired. Please request a new code.");
        }
    }
    // --- Step 2 path: isVerified=true, check the 15-minute grace window ---
    if (isAlreadyVerified && password) {
        const verifiedAt = ((_a = data.verifiedAt) === null || _a === void 0 ? void 0 : _a.toDate) ? data.verifiedAt.toDate() : (((_b = data.createdAt) === null || _b === void 0 ? void 0 : _b.toDate) ? data.createdAt.toDate() : new Date());
        const gracePeriodMs = 15 * 60 * 1000; // 15 minutes to complete password step
        if (Date.now() - verifiedAt.getTime() > gracePeriodMs) {
            console.warn(`verifyOTPAndSignIn: Verification session expired for ${email}`);
            await otpDoc.ref.delete();
            throw new functions.https.HttpsError("permission-denied", "Verification session expired. Please request a new code.");
        }
    }
    // Determine Step 1 vs Step 2 by presence of password
    if (!password) {
        // Step 1: Mark as verified and record the timestamp for the grace window
        await otpDoc.ref.update({
            isVerified: true,
            verifiedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        return { verified: true };
    }
    // Step 2: Finalize registration with password and registrationData
    // Find or create user
    let user;
    try {
        user = await admin.auth().getUserByEmail(email);
    }
    catch (error) {
        if (error.code === 'auth/user-not-found') {
            // Registration flow
            if (registrationData && password) {
                try {
                    user = await admin.auth().createUser({
                        email,
                        password,
                        displayName: registrationData.name
                    });
                    // Create Firestore profile
                    await admin.firestore().collection("users").doc(user.uid).set({
                        email,
                        name: registrationData.name,
                        role: registrationData.role || "STUDENT",
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
                        subscription_entitlements: { storageLimit: 104857600, storageUsed: 0, studentLimit: 100 },
                        storage_used_bytes: 0,
                        studentProfile: { isComplete: false },
                        tutorProfile: { isComplete: false }
                    });
                }
                catch (creationError) {
                    console.error("verifyOTPAndSignIn: Error creating user account:", creationError);
                    throw new functions.https.HttpsError("failed-precondition", creationError.message || "Could not create user account.");
                }
            }
            else {
                // Should not happen if validation is correct
                throw new functions.https.HttpsError("invalid-argument", "Registration details missing.");
            }
        }
        else {
            console.error("verifyOTPAndSignIn: Error fetching user:", error);
            throw new functions.https.HttpsError("internal", error.message);
        }
    }
    // Final Stage cleanup: delete the OTP record
    await otpDoc.ref.delete();
    // Generate custom token
    const customToken = await admin.auth().createCustomToken(user.uid);
    return { verified: true, customToken };
});
// --- ZONE INVITATION SYSTEM ---
exports.generateZoneInvite = (0, https_1.onCall)({ cors: ["https://www.nunma.in", "https://nunma.in", "http://localhost:5173"] }, async (request) => {
    if (!request.auth)
        throw new functions.https.HttpsError("unauthenticated", "Login required.");
    const { zoneId } = request.data;
    if (!zoneId)
        throw new functions.https.HttpsError("invalid-argument", "Missing zoneId.");
    try {
        const zoneDoc = await db.collection("zones").doc(zoneId).get();
        if (!zoneDoc.exists)
            throw new functions.https.HttpsError("not-found", "Zone not found.");
        const zoneData = zoneDoc.data();
        if ((zoneData === null || zoneData === void 0 ? void 0 : zoneData.createdBy) !== request.auth.uid) {
            throw new functions.https.HttpsError("permission-denied", "Only the zone creator can generate invites.");
        }
        const inviteToken = (0, uuid_1.v4)();
        const expiresAt = Date.now() + (48 * 60 * 60 * 1000); // 48 hours
        await db.collection("zones").doc(zoneId).collection("invites").doc(inviteToken).set({
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            expiresAt,
            createdBy: request.auth.uid,
            isActive: true
        });
        console.log(`[INVITE] Token generated for zone ${zoneId} by user ${request.auth.uid}: ${inviteToken}`);
        return { inviteToken, expiresAt, isActive: true };
    }
    catch (err) {
        console.error(`[INVITE_ERROR] Failed to generate token for zone ${zoneId}:`, err);
        throw new functions.https.HttpsError("internal", err.message || "Failed to generate invite token.");
    }
});
exports.revokeZoneInvite = (0, https_1.onCall)({ cors: ["https://www.nunma.in", "https://nunma.in", "http://localhost:5173"] }, async (request) => {
    var _a;
    if (!request.auth)
        throw new functions.https.HttpsError("unauthenticated", "Login required.");
    const { zoneId, inviteToken } = request.data;
    if (!zoneId || !inviteToken)
        throw new functions.https.HttpsError("invalid-argument", "Missing zoneId or inviteToken.");
    const zoneDoc = await db.collection("zones").doc(zoneId).get();
    if (!zoneDoc.exists)
        throw new functions.https.HttpsError("not-found", "Zone not found.");
    if (((_a = zoneDoc.data()) === null || _a === void 0 ? void 0 : _a.createdBy) !== request.auth.uid) {
        throw new functions.https.HttpsError("permission-denied", "Only the zone creator can revoke invites.");
    }
    await db.collection("zones").doc(zoneId).collection("invites").doc(inviteToken).update({
        isActive: false
    });
    return { success: true };
});
exports.joinZoneByInvite = (0, https_1.onCall)({ cors: ["https://www.nunma.in", "https://nunma.in", "http://localhost:5173"] }, async (request) => {
    if (!request.auth)
        throw new functions.https.HttpsError("unauthenticated", "Login required.");
    const { zoneId, inviteToken } = request.data;
    if (!zoneId || !inviteToken)
        throw new functions.https.HttpsError("invalid-argument", "Missing zoneId or inviteToken.");
    const inviteDoc = await db.collection("zones").doc(zoneId).collection("invites").doc(inviteToken).get();
    if (!inviteDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Invite token not found.");
    }
    const inviteData = inviteDoc.data();
    if (!(inviteData === null || inviteData === void 0 ? void 0 : inviteData.isActive) || inviteData.expiresAt < Date.now()) {
        throw new functions.https.HttpsError("failed-precondition", "Invite token is invalid or expired.");
    }
    const uid = request.auth.uid;
    const studentRef = db.collection("zones").doc(zoneId).collection("students").doc(uid);
    const studentDoc = await studentRef.get();
    if (studentDoc.exists) {
        return { success: true, message: "Already enrolled" };
    }
    await studentRef.set({
        status: "active",
        joinedAt: admin.firestore.FieldValue.serverTimestamp(),
        source: "whitelist"
    });
    return { success: true };
});
//# sourceMappingURL=index.js.map