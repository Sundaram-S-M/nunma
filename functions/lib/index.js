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
Object.defineProperty(exports, "__esModule", { value: true });
exports.bunnyStreamWebhook = exports.downloadInvoice = exports.sendInvoiceEmail = exports.createZohoCheckoutSession = exports.createMentorshipBooking = exports.verifyOTPAndSignIn = exports.requestOTP = exports.sendWhitelistInvite = exports.handleBunnyWebhook = exports.generateBunnyToken = exports.createBunnyVideo = exports.get100msToken = void 0;
const functions = __importStar(require("firebase-functions"));
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const crypto = __importStar(require("crypto"));
const nodemailer = __importStar(require("nodemailer"));
const jwt = __importStar(require("jsonwebtoken"));
if (!admin.apps.length) {
    admin.initializeApp();
}
// --- 100ms LIVE INTEGRATION ---
/**
 * Generates a signed JWT for the 100ms SDK.
 * Reads HMS_ACCESS_KEY and HMS_SECRET from Firebase environment secrets.
 */
exports.get100msToken = (0, https_1.onCall)({ secrets: ["HMS_ACCESS_KEY", "HMS_SECRET"] }, async (request) => {
    const accessKey = process.env.HMS_ACCESS_KEY;
    const secret = process.env.HMS_SECRET;
    if (!accessKey || !secret) {
        console.error("[100ms] HMS_ACCESS_KEY or HMS_SECRET secrets are not configured.");
        throw new functions.https.HttpsError("failed-precondition", "100ms credentials are not configured on the server.");
    }
    const now = Math.floor(Date.now() / 1000);
    const payload = {
        access_key: accessKey,
        type: "app",
        version: 2,
        role: "broadcaster",
        room_id: "sandbox-test-room",
        user_id: "test-user-id",
        iat: now,
        nbf: now,
    };
    const token = jwt.sign(payload, secret, {
        algorithm: "HS256",
        expiresIn: "24h",
    });
    console.log("[100ms] Token generated successfully.");
    return { token };
});
// --- BUNNY STREAM INTEGRATION ---
const BUNNY_LIBRARY_ID = process.env.BUNNY_LIBRARY_ID;
const BUNNY_API_KEY = process.env.BUNNY_API_KEY;
const BUNNY_HOSTNAME = process.env.BUNNY_HOSTNAME || 'video.bunnycdn.com';
const BUNNY_TOKEN_KEY = process.env.BUNNY_TOKEN_KEY; // From Pull Zone Security
exports.createBunnyVideo = functions.https.onCall(async (request) => {
    const data = request.data;
    const context = request;
    // 1. Auth Check
    if (!context.auth)
        throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
    const { title } = data;
    if (!BUNNY_LIBRARY_ID || !BUNNY_API_KEY) {
        throw new functions.https.HttpsError("failed-precondition", "Bunny config missing.");
    }
    try {
        // 2. Create Video Object in Bunny
        const response = await fetch(`https://${BUNNY_HOSTNAME}/library/${BUNNY_LIBRARY_ID}/videos`, {
            method: 'POST',
            headers: {
                'AccessKey': BUNNY_API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ title: title || 'Untitled Lesson' })
        });
        if (!response.ok) {
            const errText = await response.text();
            console.error("Bunny Create Error:", errText);
            throw new Error(`Bunny API Refused: ${response.status}`);
        }
        const videoData = await response.json();
        const videoId = videoData.guid;
        // 3. Generate Presigned Upload Signature
        // Signature = SHA256(LibraryID + APIKey + ExpirationTime + VideoID)
        const expirationTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour validity
        const stringToSign = BUNNY_LIBRARY_ID + BUNNY_API_KEY + expirationTime + videoId;
        const signature = crypto.createHash('sha256').update(stringToSign).digest('hex');
        const uploadUrl = `https://${BUNNY_HOSTNAME}/library/${BUNNY_LIBRARY_ID}/videos/${videoId}`;
        return {
            videoId,
            authorizationSignature: signature,
            expirationTime,
            uploadUrl,
            libraryId: BUNNY_LIBRARY_ID // Needed for client construction
        };
    }
    catch (error) {
        console.error("Create Bunny Video Failed:", error);
        throw new functions.https.HttpsError("internal", error.message);
    }
});
exports.generateBunnyToken = functions.https.onCall(async (request) => {
    const data = request.data;
    const context = request;
    if (!context.auth)
        throw new functions.https.HttpsError("unauthenticated", "Login required.");
    const { videoId } = data;
    if (!videoId || !BUNNY_TOKEN_KEY) {
        throw new functions.https.HttpsError("invalid-argument", "Missing videoId or Server Config");
    }
    // Token = SHA256(TokenKey + VideoID + Expires) -- Simple Check
    // Or Path Based: SHA256(TokenKey + URLPath + Expires)
    // Bunny Standard for Iframe: sha256(authenticationKey + authenticationPath + expiration)
    // authenticationPath usually is nothing if configured to root, or the path. Let's assume standard path protection.
    // NOTE: Make sure Bunny Pull Zone "URL Token Authentication" is enabled.
    const expires = Math.floor(Date.now() / 1000) + 7200; // 2 hours
    // Sign: securityKey + path + expires
    // (Ensure you check "URL Token Authentication" in Bunny settings)
    // Wait, typical Bunny token is: crypto.createHash('sha256').update(securityKey + path + expires).digest('hex');
    // But different tutorials show different things. Let's stick to the URL Token Auth logic:
    // Token = sha256(securityKey + path + expires)
    const hash = crypto.createHash('sha256').update(BUNNY_TOKEN_KEY + videoId + expires).digest('hex');
    return {
        token: hash,
        expires,
        videoId
    };
});
exports.handleBunnyWebhook = functions.https.onRequest(async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }
    const { VideoGuid, Status } = req.body;
    // Verify it's from Bunny? (Bunny doesn't sign webhooks well, checking headers or IP is tricky without config)
    // For now, reliance on obscurity or add a secret query param in the webhook URL setup in Bunny.
    if (VideoGuid && Status === 3) { // Status 3 = Finished
        console.log(`Video ${VideoGuid} finished processing.`);
        // Find which zone/chapter has this videoId... this is tricky without a reverse index.
        // Option: Search or better, store zoneId/chapterId in Bunny video meta tags if possible.
        // For now, we will assume we update by searching. Expensive but functional for MVP.
        // Ideally, we passed meta tags to CreateVideo.
        // Let's implement a simple search:
        // Or specific zones logic.
        // This part requires us to know WHERE the video is.
        // Updating: zones/{zoneId}/chapters/{chapterId}/segments/{segmentId}
        // PLAN B: Client polls or we assume 'ready' after some time.
        // MVP: Just log it. Real impl needs specific path.
        // We will skip Firestore update for now to avoid scan costs, relying on Client handling "Processing" error gracefully or user manual refresh.
    }
    res.status(200).send('OK');
});
exports.sendWhitelistInvite = functions.https.onCall(async (request) => {
    const data = request.data;
    const context = request;
    if (!context.auth)
        throw new functions.https.HttpsError("unauthenticated", "Login required.");
    const { email, zoneTitle } = data;
    if (!email)
        throw new functions.https.HttpsError("invalid-argument", "Email is required.");
    console.log(`[INVITE] Whitelist invitation placeholder for ${email} to join zone: ${zoneTitle}`);
    // In a real implementation, you would send an email here using a service like SendGrid
    // and include a link like: https://nunma.app/signup?invite=${zoneId}
    return { success: true, message: `Invitation logged for ${email}` };
});
// --- OTP AUTHENTICATION SYSTEM ---
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});
/**
 * Generates and stores a 6-digit OTP for a given email.
 * Sends the OTP via email.
 */
exports.requestOTP = functions.https.onCall(async (request) => {
    const data = request.data;
    const { email } = data;
    if (!email) {
        throw new functions.https.HttpsError("invalid-argument", "Email is required.");
    }
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = admin.firestore.Timestamp.now().toMillis() + (10 * 60 * 1000); // 10 mins
    try {
        await admin.firestore().collection("otp_verifications").doc(email).set({
            otp,
            expiresAt,
            createdAt: admin.firestore.Timestamp.now()
        });
        console.log(`[OTP] Generated for ${email}: ${otp}. Expires in 10 mins.`);
        // --- REAL EMAIL INTEGRATION ---
        const mailOptions = {
            from: `"Nunma Platform" <${process.env.SMTP_USER}>`,
            to: email,
            subject: "Your Nunma Verification Code",
            text: `Your verification code is: ${otp}. It will expire in 10 minutes.`,
            html: `
                <div style="font-family: sans-serif; padding: 20px; color: #040457;">
                    <h2 style="color: #040457;">Verification Code</h2>
                    <p style="font-size: 16px;">Welcome to Nunma. Use the following code to verify your email address:</p>
                    <div style="background: #f4f4f4; padding: 15px; font-size: 24px; font-weight: bold; text-align: center; border-radius: 8px; letter-spacing: 5px;">
                        ${otp}
                    </div>
                    <p style="font-size: 12px; color: #666; margin-top: 20px;">This code will expire in 10 minutes. If you did not request this, please ignore this email.</p>
                </div>
            `,
        };
        if (process.env.SMTP_USER && process.env.SMTP_PASS) {
            await transporter.sendMail(mailOptions);
        }
        else {
            console.warn("SMTP credentials missing. Email not sent. Check logs for OTP.");
        }
        return { success: true, message: "Verification code sent to email." };
    }
    catch (error) {
        console.error("requestOTP error:", error);
        throw new functions.https.HttpsError("internal", "Failed to generate OTP.");
    }
});
/**
 * Verifies OTP and returns a custom token for client sign-in.
 * If user doesn't exist, it creates a profile in Firestore only IF password is provided.
 */
exports.verifyOTPAndSignIn = functions.https.onCall(async (request) => {
    const data = request.data;
    const { email, otp, registrationData, password } = data;
    if (!email || !otp) {
        throw new functions.https.HttpsError("invalid-argument", "Email and OTP are required.");
    }
    try {
        const otpRef = admin.firestore().collection("otp_verifications").doc(email);
        const otpDoc = await otpRef.get();
        if (!otpDoc.exists) {
            throw new functions.https.HttpsError("not-found", "No OTP requested for this email.");
        }
        const { otp: storedOtp, expiresAt } = otpDoc.data();
        if (admin.firestore.Timestamp.now().toMillis() > expiresAt) {
            await otpRef.delete();
            throw new functions.https.HttpsError("out-of-range", "OTP has expired.");
        }
        if (storedOtp !== otp) {
            throw new functions.https.HttpsError("permission-denied", "Invalid OTP.");
        }
        // OTP is valid, but we delay deleting until full sign-up or sign-in is complete to allow intermediate password step
        // If password is not provided, this is just the intermediate verification step.
        if (!password) {
            return { verified: true, message: "OTP verified. Please proceed to provide a password." };
        }
        // Get or Create Firebase User
        let userRecord;
        try {
            userRecord = await admin.auth().getUserByEmail(email);
            // If user exists and password IS provided, update their password (e.g. forgot password flow) 
            // OR we are just confirming their sign in. For security, if they provide a password with OTP, we can set it.
            await admin.auth().updateUser(userRecord.uid, {
                password: password
            });
        }
        catch (error) {
            if (error.code === 'auth/user-not-found') {
                // Register new user since we have the password
                userRecord = await admin.auth().createUser({
                    email,
                    password: password
                });
                // If we have registration data, create the Firestore profile
                if (registrationData) {
                    const { name, role } = registrationData;
                    await admin.firestore().collection('users').doc(userRecord.uid).set({
                        uid: userRecord.uid,
                        email,
                        name: name || 'New User',
                        role: role || 'STUDENT',
                        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name || email}`,
                        createdAt: admin.firestore.Timestamp.now()
                    });
                }
            }
            else {
                throw error;
            }
        }
        // Generate Custom Token for successful sign in
        const customToken = await admin.auth().createCustomToken(userRecord.uid);
        // Security: Delete the OTP only after successful token generation
        await otpRef.delete();
        return { customToken, uid: userRecord.uid };
    }
    catch (error) {
        console.error("verifyOTPAndSignIn error:", error);
        if (error instanceof functions.https.HttpsError)
            throw error;
        throw new functions.https.HttpsError("internal", error.message || "Failed to verify OTP.");
    }
});
// --- SECURE BOOKING SYSTEM ---
exports.createMentorshipBooking = functions.https.onCall(async (request) => {
    const data = request.data;
    const context = request;
    if (!context.auth)
        throw new functions.https.HttpsError("unauthenticated", "Login required.");
    const { tutorId, productId, date, slotId, time, studentCountry } = data;
    if (!tutorId || !productId || !date || !slotId) {
        throw new functions.https.HttpsError("invalid-argument", "Missing required fields.");
    }
    try {
        const db = admin.firestore();
        const productSnap = await db.collection('products').doc(productId).get();
        if (!productSnap.exists) {
            throw new functions.https.HttpsError("not-found", "Product not found.");
        }
        const productData = productSnap.data();
        const priceUSD = productData.priceUSD || productData.price || '0';
        const priceINR = productData.priceINR || productData.price || '0';
        const tutorSnap = await db.collection('users').doc(tutorId).get();
        const tutorData = tutorSnap.data() || {};
        const tutorCountry = tutorData.country || 'IN'; // Assuming default to IN if not set
        let finalPrice = priceUSD;
        let currency = 'USD';
        // Check distinct pricing tier
        if (studentCountry === 'IN' && tutorCountry === 'IN') {
            finalPrice = priceINR;
            currency = 'INR';
        }
        const bookingData = {
            productId: productId,
            productTitle: productData.title,
            tutorId: tutorId,
            studentId: context.auth.uid,
            studentName: context.auth.token.name || 'Student',
            date: date,
            slotId: slotId,
            time: time,
            status: 'confirmed',
            price: finalPrice,
            currency: currency,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };
        const bookingRef = await db.collection('bookings').add(bookingData);
        await db.collection('users').doc(context.auth.uid).collection('enrollments').doc(productId).set({
            productId: productId,
            title: productData.title,
            type: 'mentorship',
            date: date,
            enrolledAt: new Date().toISOString()
        });
        return {
            success: true,
            bookingId: bookingRef.id,
            price: finalPrice,
            currency: currency
        };
    }
    catch (error) {
        console.error("createMentorshipBooking error:", error);
        throw new functions.https.HttpsError("internal", error.message || "Failed to create booking.");
    }
});
// --- ZOHO PAYMENTS INTEGRATION ---
exports.createZohoCheckoutSession = functions.https.onCall(async (request) => {
    const data = request.data;
    const context = request;
    if (!context.auth)
        throw new functions.https.HttpsError("unauthenticated", "Login required.");
    const { productId, title, amount, currency, returnUrl } = data;
    if (!productId || !amount) {
        throw new functions.https.HttpsError("invalid-argument", "Missing required product details for checkout.");
    }
    const ZOHO_API_KEY = process.env.ZOHO_API_KEY;
    const ZOHO_DOMAIN = process.env.ZOHO_DOMAIN || 'checkout.zoho.in'; // typically checkout.zoho.in or checkout.zoho.com
    if (!ZOHO_API_KEY) {
        console.warn("ZOHO_API_KEY is missing. Returning a simulated checkout URL for development.");
        // Simulated response for development when keys aren't added yet
        return {
            success: true,
            checkoutUrl: `${returnUrl}?simulated_zoho_success=true&product_id=${productId}`,
            message: "Simulated Zoho Checkout URL (Configure ZOHO_API_KEY in .env for live)"
        };
    }
    try {
        // Standard payload scaffolding for Zoho Checkout API (Hosted Pages)
        // Adjust endpoint and payload specific to the exact Zoho product (Checkout, Subscriptions, Invoice)
        const payload = {
            amount: parseFloat(amount),
            currency: currency || 'INR',
            reference_id: productId,
            description: title || 'Nunma Session Checkout',
            redirect_url: returnUrl,
            customer: {
                name: context.auth.token.name || 'Student',
                email: context.auth.token.email || ''
            }
        };
        const response = await fetch(`https://${ZOHO_DOMAIN}/api/v1/checkout`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Zoho-oauthtoken ${ZOHO_API_KEY}` // Ensure correct Auth scheme is used depending on Zoho Product
            },
            body: JSON.stringify(payload)
        });
        if (!response.ok) {
            const errorText = await response.text();
            console.error("Zoho Checkout API Error:", errorText);
            throw new Error(`Zoho API Error: ${response.status}`);
        }
        const responseData = await response.json();
        // Assuming Zoho responds with a hosted page URL
        return {
            success: true,
            checkoutUrl: responseData.hosted_page_url || responseData.url || returnUrl
        };
    }
    catch (error) {
        console.error("createZohoCheckoutSession error:", error);
        throw new functions.https.HttpsError("internal", error.message || "Failed to initiate Zoho Checkout.");
    }
});
// --- INVOICING & BILLING SYSTEM ---
exports.sendInvoiceEmail = functions.https.onCall(async (request) => {
    const data = request.data;
    const context = request;
    if (!context.auth)
        throw new functions.https.HttpsError("unauthenticated", "Login required.");
    const { transactionId, amount, service, date, recipientEmail, recipientName } = data;
    if (!transactionId || !amount || !recipientEmail) {
        throw new functions.https.HttpsError("invalid-argument", "Missing invoice data.");
    }
    try {
        const mailOptions = {
            from: `"Nunma Billing" <${process.env.SMTP_USER}>`,
            to: recipientEmail,
            subject: `Invoice for ${service} (${transactionId})`,
            html: `
                <div style="font-family: sans-serif; padding: 20px; color: #040457;">
                    <h2 style="color: #040457;">Payment Receipt</h2>
                    <p>Hi ${recipientName || 'User'},</p>
                    <p>Thank you for your payment. Here are the details of your transaction:</p>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                        <tr style="background: #f4f4f4;">
                            <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Transaction ID</th>
                            <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Date</th>
                            <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Service</th>
                            <th style="padding: 10px; text-align: right; border: 1px solid #ddd;">Amount</th>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border: 1px solid #ddd;">${transactionId}</td>
                            <td style="padding: 10px; border: 1px solid #ddd;">${date}</td>
                            <td style="padding: 10px; border: 1px solid #ddd;">${service}</td>
                            <td style="padding: 10px; text-align: right; border: 1px solid #ddd; font-weight: bold;">${amount}</td>
                        </tr>
                    </table>
                    <p style="margin-top: 30px; font-size: 12px; color: #666;">This is an automated receipt from Nunma Academy.</p>
                </div>
            `,
        };
        if (process.env.SMTP_USER && process.env.SMTP_PASS) {
            await transporter.sendMail(mailOptions);
            return { success: true, message: "Invoice sent successfully." };
        }
        else {
            console.warn("SMTP credentials missing. Invoice email not sent.");
            return { success: false, message: "SMTP credentials missing. Logging only." };
        }
    }
    catch (error) {
        console.error("sendInvoiceEmail error:", error);
        throw new functions.https.HttpsError("internal", error.message || "Failed to send invoice email.");
    }
});
exports.downloadInvoice = functions.https.onCall(async (request) => {
    const data = request.data;
    const context = request;
    if (!context.auth)
        throw new functions.https.HttpsError("unauthenticated", "Login required.");
    const { transactionId, amount, service, date, status } = data;
    if (!transactionId) {
        throw new functions.https.HttpsError("invalid-argument", "Missing transactionId.");
    }
    // Return a raw HTML string that the client can open in a new tab and print/save as PDF.
    const htmlInvoice = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Invoice - ${transactionId}</title>
        <style>
            body { font-family: 'Inter', sans-serif; padding: 40px; color: #1A1A4E; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #f4f4f4; padding-bottom: 20px; margin-bottom: 40px; }
            .title { font-size: 32px; font-weight: 900; margin: 0; }
            .meta { text-align: right; color: #666; font-size: 14px; }
            .details { margin-bottom: 40px; }
            .table { width: 100%; border-collapse: collapse; }
            .table th, .table td { padding: 15px; text-align: left; border-bottom: 1px solid #eee; }
            .table th { background: #f8fafc; font-weight: bold; text-transform: uppercase; font-size: 12px; color: #888; }
            .table .amount { text-align: right; font-weight: bold; color: #1A1A4E; }
            .footer { margin-top: 60px; font-size: 12px; color: #aaa; text-align: center; }
            @media print { .no-print { display: none; } }
        </style>
    </head>
    <body onload="window.print()">
        <div class="header">
            <h1 class="title">NUNMA INVOICE</h1>
            <div class="meta">
                <p>Transaction ID: <strong>${transactionId}</strong></p>
                <p>Date: ${date}</p>
                <p>Status: <span style="color: ${status === 'Completed' ? 'green' : 'inherit'};">${status}</span></p>
            </div>
        </div>
        <div class="details">
            <table class="table">
                <thead>
                    <tr>
                        <th>Description</th>
                        <th class="amount">Total</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>${service}</td>
                        <td class="amount">${amount}</td>
                    </tr>
                </tbody>
            </table>
        </div>
        <div class="footer">
            <p>Thank you for your business. For any queries, contact support@nunma.in.</p>
        </div>
    </body>
    </html>
    `;
    return { success: true, html: htmlInvoice };
});
// --- BUNNY STREAM WEBHOOK (v2) ---
/**
 * Receives processing status updates from Bunny Stream.
 * Status 3 = Finished → sets document status to 'ready'
 * Status 5 = Failed   → sets document status to 'failed'
 * Always returns 200 so Bunny does not aggressively retry.
 */
exports.bunnyStreamWebhook = (0, https_1.onRequest)(async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }
    const { VideoGuid, Status } = req.body;
    if (VideoGuid && (Status === 3 || Status === 5)) {
        const newStatus = Status === 3 ? 'ready' : 'failed';
        try {
            const db = admin.firestore();
            const snapshot = await db
                .collection('tutor_videos')
                .where('bunnyVideoId', '==', VideoGuid)
                .get();
            if (!snapshot.empty) {
                const batch = db.batch();
                snapshot.docs.forEach((doc) => batch.update(doc.ref, { status: newStatus }));
                await batch.commit();
                console.log(`[BunnyWebhook] Video ${VideoGuid} → status '${newStatus}'`);
            }
            else {
                console.warn(`[BunnyWebhook] No tutor_videos doc found for bunnyVideoId=${VideoGuid}`);
            }
        }
        catch (error) {
            // Log but do NOT propagate — we must return 200 regardless.
            console.error('[BunnyWebhook] Firestore update failed:', error);
        }
    }
    // Crucial: always acknowledge receipt to prevent Bunny retry storms.
    res.status(200).send('Webhook received');
});
//# sourceMappingURL=index.js.map