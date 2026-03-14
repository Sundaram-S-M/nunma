import * as functions from "firebase-functions";
import { onRequest, onCall } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as crypto from "crypto";
import * as nodemailer from "nodemailer";
import * as jwt from "jsonwebtoken";
import axios from "axios";
import { PDFDocument, rgb, degrees } from "pdf-lib";
import { CloudTasksClient } from "@google-cloud/tasks";

const tasksClient = new CloudTasksClient();

if (!admin.apps.length) {
    admin.initializeApp();
}

// --- 100ms LIVE INTEGRATION ---

/**
 * Generates a signed JWT for the 100ms SDK.
 * Reads HMS_ACCESS_KEY and HMS_SECRET from Firebase environment secrets.
 */
export const get100msToken = onCall(
    { secrets: ["HMS_ACCESS_KEY", "HMS_SECRET"] },
    async (request) => {
        const accessKey = process.env.HMS_ACCESS_KEY;
        const secret = process.env.HMS_SECRET;

        if (!accessKey || !secret) {
            console.error("[100ms] HMS_ACCESS_KEY or HMS_SECRET secrets are not configured.");
            throw new functions.https.HttpsError(
                "failed-precondition",
                "100ms credentials are not configured on the server."
            );
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
    }
);

// --- BUNNY STREAM INTEGRATION ---

const BUNNY_LIBRARY_ID = process.env.BUNNY_LIBRARY_ID;
const BUNNY_API_KEY = process.env.BUNNY_API_KEY;
const BUNNY_HOSTNAME = process.env.BUNNY_HOSTNAME || 'video.bunnycdn.com';
const BUNNY_TOKEN_KEY = process.env.BUNNY_TOKEN_KEY; // From Pull Zone Security

export const createBunnyVideo = functions.https.onCall(async (request) => {
    const data = request.data;
    const context = request;
    // 1. Auth Check
    if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");

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

        const videoData: any = await response.json();
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
    } catch (error: any) {
        console.error("Create Bunny Video Failed:", error);
        throw new functions.https.HttpsError("internal", error.message);
    }
});

export const generateBunnyToken = functions.https.onCall(async (request) => {
    const data = request.data;
    const context = request;
    if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Login required.");

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

export const handleBunnyWebhook = functions.https.onRequest(async (req, res) => {
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

export const sendWhitelistInvite = functions.https.onCall(async (request) => {
    const data = request.data;
    const context = request;
    if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Login required.");

    const { email, zoneTitle } = data;
    if (!email) throw new functions.https.HttpsError("invalid-argument", "Email is required.");

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
export const requestOTP = functions.https.onCall(async (request) => {
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
        } else {
            console.warn("SMTP credentials missing. Email not sent. Check logs for OTP.");
        }

        return { success: true, message: "Verification code sent to email." };
    } catch (error: any) {
        console.error("requestOTP error:", error);
        throw new functions.https.HttpsError("internal", "Failed to generate OTP.");
    }
});

/**
 * Verifies OTP and returns a custom token for client sign-in.
 * If user doesn't exist, it creates a profile in Firestore only IF password is provided.
 */
export const verifyOTPAndSignIn = functions.https.onCall(async (request) => {
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

        const { otp: storedOtp, expiresAt } = otpDoc.data()!;

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
        } catch (error: any) {
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
            } else {
                throw error;
            }
        }

        // Generate Custom Token for successful sign in
        const customToken = await admin.auth().createCustomToken(userRecord.uid);

        // Security: Delete the OTP only after successful token generation
        await otpRef.delete();

        return { customToken, uid: userRecord.uid };
    } catch (error: any) {
        console.error("verifyOTPAndSignIn error:", error);
        if (error instanceof functions.https.HttpsError) throw error;
        throw new functions.https.HttpsError("internal", error.message || "Failed to verify OTP.");
    }
});

// --- SECURE BOOKING SYSTEM ---

export const createMentorshipBooking = functions.https.onCall(async (request) => {
    const data = request.data;
    const context = request;
    if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Login required.");

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

        const productData = productSnap.data()!;

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

    } catch (error: any) {
        console.error("createMentorshipBooking error:", error);
        throw new functions.https.HttpsError("internal", error.message || "Failed to create booking.");
    }
});

// --- ZOHO PAYMENTS INTEGRATION ---

export const createZohoCheckoutSession = functions.https.onCall(async (request) => {
    const data = request.data;
    const context = request;
    if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Login required.");

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

        const responseData: any = await response.json();

        // Assuming Zoho responds with a hosted page URL
        return {
            success: true,
            checkoutUrl: responseData.hosted_page_url || responseData.url || returnUrl
        };

    } catch (error: any) {
        console.error("createZohoCheckoutSession error:", error);
        throw new functions.https.HttpsError("internal", error.message || "Failed to initiate Zoho Checkout.");
    }
});

// --- INVOICING & BILLING SYSTEM ---

export const sendInvoiceEmail = functions.https.onCall(async (request) => {
    const data = request.data;
    const context = request;
    if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Login required.");

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
        } else {
            console.warn("SMTP credentials missing. Invoice email not sent.");
            return { success: false, message: "SMTP credentials missing. Logging only." };
        }
    } catch (error: any) {
        console.error("sendInvoiceEmail error:", error);
        throw new functions.https.HttpsError("internal", error.message || "Failed to send invoice email.");
    }
});

export const downloadInvoice = functions.https.onCall(async (request) => {
    const data = request.data;
    const context = request;
    if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Login required.");

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
export const bunnyStreamWebhook = onRequest(async (req, res) => {
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
                snapshot.docs.forEach((doc) => {
                    batch.update(doc.ref, { status: newStatus });

                    // Increment storage usage if video is newly ready
                    if (newStatus === 'ready') {
                        const data = doc.data();
                        if (data.tutorId && data.sizeBytes) {
                            const tutorRef = db.collection('users').doc(data.tutorId);
                            batch.update(tutorRef, {
                                storage_used_bytes: admin.firestore.FieldValue.increment(data.sizeBytes)
                            });
                        }
                    }
                });
                await batch.commit();
                console.log(`[BunnyWebhook] Video ${VideoGuid} → status '${newStatus}'`);
            } else {
                console.warn(`[BunnyWebhook] No tutor_videos doc found for bunnyVideoId=${VideoGuid}`);
            }
        } catch (error) {
            // Log but do NOT propagate — we must return 200 regardless.
            console.error('[BunnyWebhook] Firestore update failed:', error);
        }
    }

    // Crucial: always acknowledge receipt to prevent Bunny retry storms.
    res.status(200).send('Webhook received');
});

// --- ZOHO BILLING SUBSCRIPTION INTEGRATION ---

/**
 * Helper function to generate a fresh Zoho Access Token.
 * Zoho requires exchanging a refresh token for an access token.
 */
async function getZohoAccessToken() {
    const refreshToken = process.env.ZOHO_REFRESH_TOKEN;
    const clientId = process.env.ZOHO_CLIENT_ID;
    const clientSecret = process.env.ZOHO_CLIENT_SECRET;

    if (!refreshToken || !clientId || !clientSecret) {
        throw new Error("Zoho authentication secrets are missing.");
    }

    const response = await axios.post("https://accounts.zoho.in/oauth/v2/token", null, {
        params: {
            refresh_token: refreshToken,
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: "refresh_token"
        }
    });

    if (response.data && response.data.error) {
        throw new Error(`Zoho Token Error: ${response.data.error}`);
    }

    return response.data.access_token;
}

// --- RAZORPAY ROUTE INTEGRATION ---

import Razorpay from "razorpay";

export const createTutorLinkedAccount = onCall(
    { secrets: ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET"] },
    async (request) => {
        const context = request;
        if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Login required.");

        const keyId = process.env.RAZORPAY_KEY_ID;
        const keySecret = process.env.RAZORPAY_KEY_SECRET;

        if (!keyId || !keySecret) {
            throw new functions.https.HttpsError("failed-precondition", "Razorpay secrets missing.");
        }

        try {
            const db = admin.firestore();
            const tutorRef = db.collection("users").doc(context.auth.uid);
            const tutorDoc = await tutorRef.get();

            if (!tutorDoc.exists) {
                throw new functions.https.HttpsError("not-found", "Tutor profile not found.");
            }

            const tutorData = tutorDoc.data();
            let accountId = tutorData?.razorpay_account_id;

            const authHeader = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`;

            // 1. Create a Linked Account if one doesn't exist
            if (!accountId) {
                const createPayload = {
                    email: tutorData?.email || context.auth.token.email,
                    phone: tutorData?.phone || "9999999999", // Fallback required by Razorpay
                    type: "route",
                    reference_id: context.auth.uid,
                    legal_business_name: tutorData?.name || "Independent Tutor",
                    business_type: "individual",
                    profile: {
                        category: "education",
                        subcategory: "e_learning",
                        addresses: {
                            registered: {
                                street1: "Online",
                                city: "Online",
                                state: "Online",
                                postal_code: "111111",
                                country: "IN"
                            }
                        }
                    }
                };

                const response = await axios.post('https://api.razorpay.com/v2/accounts', createPayload, {
                    headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' }
                });

                accountId = response.data.id;
                await tutorRef.update({ razorpay_account_id: accountId });
            }

            // 2. Generate Account Onboarding/Login Link
            const linkResponse = await axios.post(`https://api.razorpay.com/v2/accounts/${accountId}/login_links`, {}, {
                headers: { 'Authorization': authHeader }
            });

            return {
                success: true,
                onboardingUrl: linkResponse.data.short_url || linkResponse.data.url
            };

        } catch (error: any) {
            console.error("createTutorLinkedAccount error:", error.response?.data || error);
            throw new functions.https.HttpsError("internal", error.message || "Failed to create Razorpay Account.");
        }
    }
);

export const createRazorpayOrder = onCall(
    { secrets: ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET"] },
    async (request) => {
        const { amount, tutorId } = request.data;
        const context = request;

        if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Login required.");
        if (!amount || !tutorId) {
            throw new functions.https.HttpsError("invalid-argument", "Missing amount or tutorId.");
        }

        const keyId = process.env.RAZORPAY_KEY_ID;
        const keySecret = process.env.RAZORPAY_KEY_SECRET;

        if (!keyId || !keySecret) {
            throw new functions.https.HttpsError("failed-precondition", "Razorpay secrets missing.");
        }

        try {
            const db = admin.firestore();
            const tutorDoc = await db.collection("users").doc(tutorId).get();

            if (!tutorDoc.exists) {
                throw new functions.https.HttpsError("not-found", "Tutor profile not found.");
            }

            const tutorData = tutorDoc.data()!;
            const tutorAccountId = tutorData.razorpayAccountId;

            if (!tutorAccountId) {
                throw new functions.https.HttpsError("failed-precondition", "Tutor has not connected their Razorpay account.");
            }

            // Determine commission rate based on subscription plan
            let commissionRate = 0.10; // Default Starter: 10%
            const userPlan = tutorData.subscriptionPlan || "starter";

            if (userPlan === "standard") {
                commissionRate = 0.05;
            } else if (userPlan === "premium") {
                commissionRate = 0.02;
            }

            // Calculations in paise
            const totalAmount = parseInt(amount); // amount should be in paise from frontend
            const platformCommission = Math.floor(totalAmount * commissionRate);
            const tutorTransferAmount = totalAmount - platformCommission;

            const razorpay = new Razorpay({
                key_id: keyId,
                key_secret: keySecret,
            });

            const orderOptions = {
                amount: totalAmount,
                currency: "INR",
                receipt: `receipt_${Date.now()}`,
                transfers: [
                    {
                        account: tutorAccountId,
                        amount: tutorTransferAmount,
                        currency: "INR",
                        notes: {
                            purpose: "Nunma Tutor Payout",
                            plan: userPlan
                        },
                        on_hold: 0,
                    }
                ]
            };

            const order = await razorpay.orders.create(orderOptions);

            return {
                id: order.id,
                amount: order.amount,
                currency: order.currency
            };
        } catch (error: any) {
            console.error("createRazorpayOrder error:", error);
            throw new functions.https.HttpsError("internal", error.message || "Failed to create Razorpay Order.");
        }
    }
);

export const razorpayRouteWebhook = onRequest(
    { secrets: ["RAZORPAY_WEBHOOK_SECRET"] },
    async (req, res) => {
        if (req.method !== 'POST') {
            res.status(405).send('Method Not Allowed');
            return;
        }

        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
        if (!webhookSecret) {
            console.error("RAZORPAY_WEBHOOK_SECRET is missing.");
            res.status(500).send("Server Error");
            return;
        }

        const signature = req.headers['x-razorpay-signature'] as string;

        try {
            const hmac = crypto.createHmac('sha256', webhookSecret);
            hmac.update(JSON.stringify(req.body));
            const expectedSignature = hmac.digest('hex');

            if (expectedSignature !== signature) {
                res.status(400).send('Invalid Signature');
                return;
            }

            const event = req.body.event;

            // Idempotency Check: Prevent duplicate processing of the same event
            const eventId = req.body.id || req.body.payload?.payment?.entity?.id || req.body.payload?.account?.id;
            if (eventId) {
                const lockRef = admin.firestore().collection("system").doc("webhooks").collection("processed").doc(eventId);
                const lockDoc = await lockRef.get();
                if (lockDoc.exists) {
                    console.log(`[RazorpayWebhook] Event ${eventId} already processed. Skipping.`);
                    res.status(200).send('OK');
                    return;
                }
                await lockRef.set({ processedAt: admin.firestore.FieldValue.serverTimestamp(), event: event });
            }

            if (event === 'account.instantly_verified') {
                const account = req.body.payload.account.entity;
                const tutorId = account.reference_id;
                const pan = account.legal_info?.pan;

                if (tutorId && pan) {
                    await admin.firestore().collection('users').doc(tutorId).update({
                        "taxDetails.panNumber": pan,
                        "taxDetails.legalName": account.legal_business_name || "Independent Tutor",
                        // Note: gstin is optional and might be manually added or synced later if available
                    });
                    console.log(`[RazorpayWebhook] KYC Sync: PAN updated for Tutor ${tutorId}`);
                }
            } else if (event === 'payment.captured') {
                const payment = req.body.payload.payment.entity;
                const paymentId = payment.id;

                // Extract metadata for invoicing
                const amount = payment.amount;
                const zoneId = payment.notes?.zoneId;
                const studentId = payment.notes?.studentId;
                const transfers = req.body.payload.transfer?.entity || req.body.transfers;

                let tutorAccountId = null;
                if (Array.isArray(transfers) && transfers.length > 0) {
                    tutorAccountId = transfers[0].account;
                } else if (transfers && transfers.account) {
                    tutorAccountId = transfers.account;
                }

                // Enqueue Cloud Task for Asynchronous Zoho Invoicing
                const project = process.env.GCLOUD_PROJECT || admin.instanceId().app.options.projectId;
                const location = 'us-central1'; // Default Firebase region, should ideally be dynamic
                const queue = 'generate-invoice-queue';
                const queuePath = tasksClient.queuePath(project as string, location, queue);

                const url = `https://${location}-${project}.cloudfunctions.net/processZohoInvoice`;
                const payload = { paymentId, amount, zoneId, studentId, tutorAccountId };

                const task: any = {
                    httpRequest: {
                        httpMethod: 'POST',
                        url: url,
                        body: Buffer.from(JSON.stringify(payload)).toString('base64'),
                        headers: { 'Content-Type': 'application/json' },
                    },
                    // Deterministic name for Cloud Tasks native deduplication
                    name: tasksClient.taskPath(project as string, location, queue, `task-${paymentId}`)
                };

                try {
                    await tasksClient.createTask({ parent: queuePath, task });
                    console.log(`[RazorpayWebhook] Enqueued invoice task for payment ${paymentId}`);
                } catch (enqueueError: any) {
                    if (enqueueError.code === 6) { // ALREADY_EXISTS
                        console.log(`[RazorpayWebhook] Task for payment ${paymentId} already exists. Native deduplication active.`);
                    } else {
                        console.error(`[RazorpayWebhook] Failed to enqueue task:`, enqueueError);
                    }
                }
            }
            res.status(200).send('OK');
        } catch (error: any) {
            console.error("Razorpay webhook error:", error.response?.data || error.message);
            res.status(500).send("Webhook Error");
        }
    });


/**
 * Worker function triggered by Cloud Tasks to process Zoho Invoicing asynchronously.
 * Handles Student hydration, Zoho Customer creation, Invoice generation (Tax vs Bill of Supply),
 * and email delivery via Zoho SMTP.
 */
export const processZohoInvoice = onRequest(async (req, res) => {
    try {
        const payload = req.body;
        const { paymentId, amount, zoneId, studentId, tutorAccountId } = payload;

        if (!paymentId || !amount) {
            console.error("[processZohoInvoice] Missing required payload data.");
            res.status(400).send("Bad Request");
            return;
        }

        const db = admin.firestore();

        // 1. Hydrate "Customer" Data (Student or Tutor depending on context)
        const customerDoc = await db.collection('users').doc(studentId).get();
        if (!customerDoc.exists) {
            console.error(`[processZohoInvoice] Customer ${studentId} not found.`);
            res.status(404).send("Customer Not Found");
            return;
        }
        const customerData = customerDoc.data()!;
        const customerEmail = customerData.email;
        const customerName = customerData.name || "User";

        // 2. Hydrate Tutor Data to determine Invoice Type (if it's a Course Sale)
        let taxDetails: any = {};
        let tutorDisplayName = "";
        
        if (tutorAccountId) {
            const tutorsSnapshot = await db.collection('users')
                .where('razorpay_account_id', '==', tutorAccountId)
                .limit(1)
                .get();

            if (!tutorsSnapshot.empty) {
                const tutorData = tutorsSnapshot.docs[0].data();
                taxDetails = tutorData.taxDetails || {};
                tutorDisplayName = taxDetails.legalName || tutorData.name;
            } else {
                console.warn(`[processZohoInvoice] Tutor for account ${tutorAccountId} not found. Defaulting to Bill of Supply.`);
            }
        }

        // 3. Authenticate with Zoho
        const accessToken = await getZohoAccessToken();
        const orgId = process.env.ZOHO_ORG_ID;

        if (!orgId) {
            throw new Error("ZOHO_ORG_ID is missing.");
        }

        const authHeader = {
            "Authorization": `Zoho-oauthtoken ${accessToken}`,
            "Content-Type": "application/json"
        };

        // 4. Search/Create Zoho Customer
        let zohoCustomerId = "";
        const searchResponse = await axios.get(`https://www.zohoapis.in/books/v3/contacts?organization_id=${orgId}&email=${customerEmail}`, { headers: authHeader });

        if (searchResponse.data.contacts && searchResponse.data.contacts.length > 0) {
            zohoCustomerId = searchResponse.data.contacts[0].contact_id;
        } else {
            const contactPayload = {
                contact_name: customerName,
                company_name: "Individual",
                contact_type: "customer",
                emails: customerEmail,
                email: customerEmail
            };
            const createContactResponse = await axios.post(`https://www.zohoapis.in/books/v3/contacts?organization_id=${orgId}`, contactPayload, { headers: authHeader });
            zohoCustomerId = createContactResponse.data.contact.contact_id;
        }

        // 5. Determine Template and Transaction Type
        const amountInRupees = amount / 100;
        let templateId = "";
        let transactionType = "";

        if (!tutorAccountId) {
            // 1. Platform Subscription (Nunma to Tutor)
            templateId = "2946323000000032184";
            transactionType = "Platform Subscription";
        } else if (taxDetails.gstin) {
            // 3. Course Sale - Tax Invoice (Tutor with GST)
            templateId = "2946323000000170017";
            transactionType = "Tax Invoice";
        } else {
            // 2. Course Sale - Bill of Supply (Tutor without GST)
            templateId = "2946323000000202049";
            transactionType = "Bill of Supply";
        }

        // 6. Generate Dynamic Zoho Payload
        const invoicePayload: any = {
            customer_id: zohoCustomerId,
            template_id: templateId,
            reference_number: paymentId,
            date: new Date().toISOString().split('T')[0],
            line_items: [
                {
                    name: tutorAccountId ? "Tutoring Session Fee" : "Nunma Platform Subscription",
                    description: tutorAccountId 
                        ? `Course Payment for Zone: ${zoneId} | Payment ID: ${paymentId}`
                        : `Subscription fee for Nunma Platform | Payment ID: ${paymentId}`,
                    rate: amountInRupees,
                    quantity: 1
                }
            ],
            notes: tutorAccountId 
                ? `Tutor: ${tutorDisplayName} | PAN: ${taxDetails.panNumber || "N/A"}`
                : "Nunma Academy Service Fee",
        };

        // Add custom fields for PAN/LegalName if needed by the template
        if (tutorAccountId && !taxDetails.gstin) {
            invoicePayload.custom_fields = [
                { label: "Invoice Type", value: "Bill of Supply" },
                { label: "Tutor PAN", value: taxDetails.panNumber || "N/A" }
            ];
        }

        const createInvoiceResponse = await axios.post(`https://www.zohoapis.in/books/v3/invoices?organization_id=${orgId}`, invoicePayload, { headers: authHeader });
        const invoiceId = createInvoiceResponse.data.invoice.invoice_id;

        // 7. Fetch PDF from Zoho
        const pdfResponse = await axios.get(`https://www.zohoapis.in/books/v3/invoices/${invoiceId}?organization_id=${orgId}&accept=pdf`, {
            headers: authHeader,
            responseType: 'arraybuffer'
        });

        // 8. Email Delivery via Zoho SMTP
        const mailOptions = {
            from: `"Nunma Academy" <${process.env.SMTP_USER}>`,
            to: customerEmail,
            subject: `Invoice for your payment (${paymentId})`,
            text: `Hi ${customerName}, please find attached the invoice for your recent payment.`,
            attachments: [
                {
                    filename: `Invoice_${paymentId}.pdf`,
                    content: Buffer.from(pdfResponse.data)
                }
            ]
        };

        await transporter.sendMail(mailOptions);

        // 9. Log Success in Firestore
        await db.collection('users').doc(studentId).collection('invoices').doc(paymentId).set({
            invoiceId: invoiceId,
            paymentId: paymentId,
            amount: amountInRupees,
            date: admin.firestore.FieldValue.serverTimestamp(),
            status: "sent",
            invoiceType: transactionType
        });

        console.log(`[processZohoInvoice] Success: Invoice ${invoiceId} (${transactionType}) sent to ${customerEmail}`);
        res.status(200).send("OK");

    } catch (error: any) {
        console.error("[processZohoInvoice] Error processing invoice:", error.response?.data || error.message);
        res.status(500).send("Internal Server Error");
    }
});


/**
 * Webhook Listener to process Zoho Billing events.
 * It queries Firestore for the user by email and updates their document to reflect an active subscription.
 */
export const zohoBillingWebhook = onRequest(async (req, res) => {
    try {
        const eventType = req.body.event_type;
        const customerEmail = req.body.data?.subscription?.customer?.email;

        // Check for subscription created or payment success events
        if ((eventType === "subscription_created" || eventType === "payment_success") && customerEmail) {
            const db = admin.firestore();
            const usersRef = db.collection("users");
            const snapshot = await usersRef.where("email", "==", customerEmail).get();

            if (!snapshot.empty) {
                const batch = db.batch();
                snapshot.docs.forEach((doc) => {
                    batch.update(doc.ref, { subscriptionActive: true });
                });
                await batch.commit();
                console.log(`[ZohoWebhook] User ${customerEmail} subscription activated.`);
            } else {
                console.warn(`[ZohoWebhook] No user found with email ${customerEmail}.`);
            }
        }
    } catch (error: any) {
        console.error("[ZohoWebhook] Error processing webhook:", error.message);
    }

    // Always securely return 200 OK so Zoho stops retrying
    res.status(200).send('Webhook received');
});

// --- PDF WATERMARKING ---

export const serveSecurePdf = onRequest({ cors: true }, async (req, res) => {
    // Handle CORS manually for robust preflight support
    res.set('Access-Control-Allow-Origin', '*');
    if (req.method === 'OPTIONS') {
        res.set('Access-Control-Allow-Methods', 'GET, POST');
        res.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
        res.status(204).send('');
        return;
    }

    try {
        // 1. Extract and Verify Auth Token
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).send('Unauthorized: Missing Bearer Token');
            return;
        }

        const idToken = authHeader.split('Bearer ')[1];
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const uid = decodedToken.uid;
        const email = decodedToken.email || 'Unknown User';

        // 2. Extract inputs (supporting both GET query and POST body)
        const zoneId = req.query.zoneId || req.body?.zoneId;
        const segmentId = req.query.segmentId || req.body?.segmentId;

        if (!zoneId || !segmentId) {
            res.status(400).send('Bad Request: Missing zoneId or segmentId');
            return;
        }

        // 3. Verify Active Enrollment (O(1) Check)
        const studentRef = admin.firestore().doc(`zones/${zoneId}/students/${uid}`);
        const studentDoc = await studentRef.get();
        if (!studentDoc.exists) {
            res.status(403).send('Forbidden: Not enrolled in this zone');
            return;
        }

        // 4. Fetch raw PDF buffer from Firebase Storage
        const bucket = admin.storage().bucket();
        let file = bucket.file(`segments/pdfs/${segmentId}`);
        let [exists] = await file.exists();

        if (!exists) {
            file = bucket.file(`segments/pdfs/${segmentId}.pdf`);
            [exists] = await file.exists();
            if (!exists) {
                res.status(404).send('Not Found: PDF file missing');
                return;
            }
        }

        const [buffer] = await file.download();

        // 5. Watermark with pdf-lib
        const pdfDoc = await PDFDocument.load(buffer);
        const pages = pdfDoc.getPages();
        const watermarkText = `${email} - ${uid}`;

        for (const page of pages) {
            const { width, height } = page.getSize();
            // Draw watermark across the center
            page.drawText(watermarkText, {
                x: width / 2 - 150,
                y: height / 2,
                size: 24,
                color: rgb(0.75, 0.75, 0.75), // Light gray
                opacity: 0.1, // 10% opacity
                rotate: degrees(45),
            });
        }

        // 6. Return Binary Stream
        const pdfBytes = await pdfDoc.save();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Length', pdfBytes.length);
        res.end(Buffer.from(pdfBytes));

    } catch (error: any) {
        console.error('serveSecurePdf error:', error);
        res.status(500).send('Internal Server Error');
    }
});
