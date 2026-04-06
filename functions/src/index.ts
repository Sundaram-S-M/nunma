import * as admin from "firebase-admin";
admin.initializeApp();

import * as functions from "firebase-functions";
import { onRequest, onCall } from "firebase-functions/v2/https";
import * as crypto from "crypto";
// import * as nodemailer from "nodemailer";

import { AccessToken, RoomServiceClient, TrackSource } from "livekit-server-sdk";
import axios from "axios";
import { PDFDocument, rgb } from "pdf-lib";
// import Razorpay from "razorpay";
// import { generatePlatformFeeInvoice } from "./zohoUtils";
import { v4 as uuidv4 } from "uuid";
import { Resend } from "resend";
export { gradePdfSubmission } from "./ai/gradeSubmission";

// const db = admin.firestore(); // Moved inside function scopes for deployment stability


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

export const generateLiveToken = onCall(
    { secrets: ["LIVEKIT_API_KEY", "LIVEKIT_API_SECRET", "LIVEKIT_URL"], cors: true },
    async (request) => {
        const db = admin.firestore();
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
        const userName = userData?.name || "Anonymous";
        const userRole = userData?.role || "STUDENT";

        // Fetch zone to check if user is the creator
        const zoneDoc = await db.collection("zones").doc(zoneId).get();
        const zoneData = zoneDoc.data();
        const isCreator = zoneData?.createdBy === uid;

        const apiKey = process.env.LIVEKIT_API_KEY;
        const apiSecret = process.env.LIVEKIT_API_SECRET;
        const liveKitUrl = process.env.LIVEKIT_URL;

        if (!apiKey || !apiSecret || !liveKitUrl) {
            throw new functions.https.HttpsError("failed-precondition", "LiveKit secrets not configured.");
        }

        const at = new AccessToken(apiKey, apiSecret, {
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
    }
);

export const getLiveKitToken = onCall(
    { secrets: ["LIVEKIT_API_KEY", "LIVEKIT_API_SECRET"], cors: true },
    async (request) => {
        const db = admin.firestore();

        // 1. Authenticate caller
        if (!request.auth) {
            throw new functions.https.HttpsError("unauthenticated", "You must be signed in to access live hub sessions.");
        }

        const uid = request.auth.uid;
        const { roomName, identity } = request.data;

        // 2. Validate input strings
        if (typeof roomName !== "string" || !roomName || typeof identity !== "string" || !identity) {
            throw new functions.https.HttpsError("invalid-argument", "Missing required parameters: roomName or identity.");
        }

        // 3. Force identity to the authenticated UID for security
        const secureIdentity = uid;

        // 4. Authorization Check
        let isAuthorized = false;

        // Case A: Is an active student in the zone?
        const studentDoc = await db.collection("zones").doc(roomName).collection("students").doc(uid).get();
        if (studentDoc.exists && studentDoc.data()?.status === "active") {
            isAuthorized = true;
        }

        // Case B: Is the 'Thala' (creator) of the zone?
        if (!isAuthorized) {
            const userDoc = await db.collection("users").doc(uid).get();
            const userData = userDoc.data();
            
            const zoneDoc = await db.collection("zones").doc(roomName).get();
            const zoneData = zoneDoc.data();

            if (userData?.role === "THALA" && zoneData?.createdBy === uid) {
                isAuthorized = true;
            }
        }

        if (!isAuthorized) {
            throw new functions.https.HttpsError("permission-denied", "You are not authorized to enter this knowledge stream.");
        }

        // 5. Generate and Return Token
        const apiKey = process.env.LIVEKIT_API_KEY;
        const apiSecret = process.env.LIVEKIT_API_SECRET;

        if (!apiKey || !apiSecret) {
            throw new functions.https.HttpsError("failed-precondition", "LiveKit configuration is missing on the server.");
        }

        const at = new AccessToken(apiKey, apiSecret, {
            identity: secureIdentity,
            ttl: 3600 // 1 hour expiry
        });

        at.addGrant({
            roomJoin: true,
            room: roomName
        });

        const token = await at.toJwt();
        return { token };
    }
);


export const toggleStudentAudio = onCall(
    { secrets: ["LIVEKIT_API_KEY", "LIVEKIT_API_SECRET", "LIVEKIT_URL"], cors: true },
    async (request) => {
        const db = admin.firestore();
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
        const isCreator = zoneData?.createdBy === uid;

        // Also check if user is a TUTOR in the users collection
        const userDoc = await db.collection("users").doc(uid).get();
        const userRole = userDoc.data()?.role;
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

        const roomService = new RoomServiceClient(liveKitUrl, apiKey, apiSecret);

        // Update participant permissions
        // canPublish is the key here. We set canPublish: true for microphone.
        // We keep video publish strictly false for students.
        await roomService.updateParticipant(sessionId, studentIdentity, undefined, {
            canPublish: allowAudio,
            canPublishSources: allowAudio ? [TrackSource.MICROPHONE] : [],
            canSubscribe: true,
        });

        return { success: true, message: `Student audio ${allowAudio ? 'enabled' : 'disabled'}` };
    }
);


// --- BUNNY STREAM INTEGRATION ---

export const createBunnyVideo = onCall(
    { secrets: ["BUNNY_API_KEY", "BUNNY_LIBRARY_ID"], cors: true },
    async (request) => {
        const db = admin.firestore();
        if (!request.auth) throw new functions.https.HttpsError("unauthenticated", "Login required.");
        
        // Step 1: Role Check
        let role = request.auth.token.role;
        if (!role) {
            const userDoc = await db.collection("users").doc(request.auth.uid).get();
            role = userDoc.data()?.role;
        }

        if (role !== "THALA" && role !== "TUTOR") {
            throw new functions.https.HttpsError("permission-denied", "Thala or Tutor access required.");
        }

        const { title, zoneId } = request.data;
        if (!zoneId) throw new functions.https.HttpsError("invalid-argument", "Missing zoneId for Firestore indexing.");

        const libraryId = process.env.BUNNY_LIBRARY_ID;
        const apiKey = process.env.BUNNY_API_KEY;
        
        if (!libraryId || !apiKey) {
            throw new functions.https.HttpsError("failed-precondition", "Bunny security configuration missing.");
        }

        // Step 2: Bunny Init (Get GUID)
        const response = await axios.post(
            `https://video.bunnycdn.com/library/${libraryId}/videos`, 
            { title: title || 'Untitled' }, 
            { headers: { 'AccessKey': apiKey, 'Content-Type': 'application/json' } }
        );
        
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
    }
);


export const bunnyStreamWebhook = onRequest(
    { secrets: ["BUNNY_WEBHOOK_SECRET"] },
    async (req, res) => {
        const db = admin.firestore();
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
                } else {
                    console.warn(`Bunny Webhook: Video ID not found in database: ${videoGuid}`);
                }
            }
            res.status(200).send('OK');
        } catch (error) {
            console.error("Webhook processing error:", error);
            res.status(500).send('Internal Server Error');
        }
    }
);

export const generateBunnyToken = onCall(
    { secrets: ["BUNNY_TOKEN_KEY", "BUNNY_LIBRARY_ID"], cors: true },
    async (request) => {
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
    }
);

export const getBunnyPlaybackToken = onCall(
    { secrets: ["BUNNY_TOKEN_KEY", "BUNNY_PULL_ZONE_URL"], cors: true },
    async (request) => {
        const db = admin.firestore();
        
        // 1. Authenticate caller
        if (!request.auth) {
            throw new functions.https.HttpsError("unauthenticated", "Login required.");
        }

        const uid = request.auth.uid;
        const { zoneId, videoId } = request.data;

        if (!zoneId || !videoId) {
            throw new functions.https.HttpsError("invalid-argument", "Missing zoneId or videoId.");
        }

        // 2. Fetch Zone document
        const zoneDoc = await db.collection("zones").doc(zoneId).get();
        if (!zoneDoc.exists) {
            throw new functions.https.HttpsError("not-found", "Zone not found.");
        }

        const zoneData = zoneDoc.data()!;
        
        // 3. Authorization Check
        let isAuthorized = zoneData.createdBy === uid;

        if (!isAuthorized) {
            const studentDoc = await db.collection("zones").doc(zoneId).collection("students").doc(uid).get();
            if (studentDoc.exists && studentDoc.data()?.status === "active") {
                isAuthorized = true;
            }
        }

        if (!isAuthorized) {
            throw new functions.https.HttpsError("permission-denied", "Unauthorized access to this content.");
        }

        // 4. Validate videoId in segments array
        const segments = zoneData.segments || [];
        const videoExists = segments.some((s: any) => s.videoId === videoId);

        if (!videoExists) {
            throw new functions.https.HttpsError("not-found", "Video not found in this zone.");
        }

        // 5. Generate Bunny CDN Token
        const tokenKey = process.env.BUNNY_TOKEN_KEY;
        const pullZoneUrl = process.env.BUNNY_PULL_ZONE_URL;

        if (!tokenKey || !pullZoneUrl) {
            throw new functions.https.HttpsError("failed-precondition", "Bunny CDN configuration missing.");
        }

        const expirationTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour
        const videoPath = `/${videoId}/play`;
        const tokenString = tokenKey + videoPath + expirationTime;

        const token = crypto.createHash("sha256")
            .update(tokenString)
            .digest("base64")
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=/g, "");

        return {
            signedUrl: `${pullZoneUrl}${videoPath}?token=${token}&expires=${expirationTime}`,
            expiresAt: expirationTime
        };
    }
);

// --- RAZORPAY & KYC STATE MANAGEMENT ---

/**
 * Extracts a human-readable error message from a Razorpay API error response.
 * Razorpay's errors are typically nested under error.response.data.error.
 */
function extractRazorpayError(error: any): string {
    const rzpError = error?.response?.data?.error;
    if (rzpError) {
        // Build a descriptive message: e.g. "Invalid IFSC code: Please provide a valid IFSC"
        const parts: string[] = [];
        if (rzpError.description) parts.push(rzpError.description);
        if (rzpError.field) parts.push(`(Field: ${rzpError.field})`);
        if (rzpError.reason) parts.push(`Reason: ${rzpError.reason}`);
        if (parts.length > 0) return parts.join(' ');
    }
    return error?.message || "An unexpected Razorpay error occurred.";
}

export const createTutorLinkedAccount = onCall(
    { secrets: ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET"], cors: true },
    async (request) => {
        const db = admin.firestore();
        if (!request.auth) {
            throw new functions.https.HttpsError("unauthenticated", "You must be signed in to create a linked account.");
        }

        const uid = request.auth.uid;
        const { businessName, businessType, legalName, email, phone, pan } = request.data || {};

        if (!businessName || !businessType || !legalName || !email || !phone || !pan) {
            throw new functions.https.HttpsError("invalid-argument", "Missing required business details: { businessName, businessType, legalName, email, phone, pan }.");
        }

        const keyId = process.env.RAZORPAY_KEY_ID;
        const keySecret = process.env.RAZORPAY_KEY_SECRET;
        if (!keyId || !keySecret) {
            throw new functions.https.HttpsError("failed-precondition", "Razorpay credentials are not configured on the server.");
        }

        const authHeader = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`;
        const headers = { 'Authorization': authHeader, 'Content-Type': 'application/json' };

        // 1. Validate calling user has role 'THALA'
        const userRef = db.collection("users").doc(uid);
        const userDoc = await userRef.get();
        if (!userDoc.exists) {
            throw new functions.https.HttpsError("not-found", "User profile not found.");
        }

        const userData = userDoc.data()!;
        if (userData.role !== "THALA") {
            throw new functions.https.HttpsError("permission-denied", "Unauthorized: Only users with role 'THALA' can create linked accounts.");
        }

        // 2. Check for existing razorpayAccountId
        // Note: we check both 'razorpayAccountId' (new) and 'razorpay_account_id' (old) for safety
        let accountId = userData.razorpayAccountId || userData.razorpay_account_id;
        const existingKycStatus = userData.kycStatus;

        if (accountId && existingKycStatus !== "STAKEHOLDER_FAILED") {
            throw new functions.https.HttpsError("already-exists", "A Razorpay account already exists for this user.");
        }

        try {
            // 3. Create Razorpay Account (if not already created and failed at stakeholder level)
            if (!accountId) {
                const createPayload = {
                    email,
                    phone: phone.startsWith('+91') ? phone : `+91${phone}`,
                    type: "route",
                    legal_business_name: legalName,
                    business_type: businessType, // expected: 'proprietorship', 'individual', etc.
                    customer_facing_business_name: businessName,
                    profile: {
                        category: "education" // Standard default for platform
                    }
                };

                const accountResponse = await axios.post(
                    'https://api.razorpay.com/v2/accounts',
                    createPayload,
                    { headers }
                );
                accountId = accountResponse.data.id;

                // Sync accountId back to Firestore immediately so we don't lose it if stakeholders call fails
                await userRef.update({
                    razorpayAccountId: accountId,
                    kycStatus: 'PENDING'
                });
            }

            // 4. Create Stakeholder (separate try/catch)
            try {
                const stakeholderPayload = {
                    name: legalName,
                    email: email,
                    phone: phone.startsWith('+91') ? phone : `+91${phone}`,
                    kyc: {
                        pan: pan.toUpperCase()
                    }
                };

                await axios.post(
                    `https://api.razorpay.com/v2/accounts/${accountId}/stakeholders`,
                    stakeholderPayload,
                    { headers }
                );

                // Update success metadata
                await userRef.update({
                    kycStatus: 'PENDING',
                    kycSubmittedAt: admin.firestore.FieldValue.serverTimestamp()
                });

                return { accountId, status: 'PENDING' };
            } catch (stakeholderError: any) {
                const msg = extractRazorpayError(stakeholderError);
                console.error("Razorpay Stakeholder creation failed:", msg);
                
                await userRef.update({
                    kycStatus: 'STAKEHOLDER_FAILED'
                });

                return { accountId, status: 'STAKEHOLDER_FAILED' };
            }

        } catch (error: any) {
            if (error instanceof functions.https.HttpsError) throw error;
            const msg = extractRazorpayError(error);
            console.error("createTutorLinkedAccount internal error:", msg);
            
            throw new functions.https.HttpsError(
                "internal", 
                `Razorpay Account Creation Failed: ${msg}`
            );
        }
    }
);


export const createRazorpayOrder = onCall(
    { secrets: ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET"], cors: true },
    async (request) => {
        const db = admin.firestore();
        
        // 1. Authenticated check
        if (!request.auth) {
            throw new functions.https.HttpsError("unauthenticated", "You must be signed in to create an order.");
        }

        const { zoneId, amount } = request.data;
        if (!zoneId || !amount) {
            throw new functions.https.HttpsError("invalid-argument", "Missing zoneId or amount.");
        }

        const keyId = process.env.RAZORPAY_KEY_ID;
        const keySecret = process.env.RAZORPAY_KEY_SECRET;
        if (!keyId || !keySecret) {
            throw new functions.https.HttpsError("failed-precondition", "Razorpay secrets not configured.");
        }

        // 2. Fetch Zone and Validate Price
        const zoneDoc = await db.collection("zones").doc(zoneId).get();
        if (!zoneDoc.exists) {
            throw new functions.https.HttpsError("not-found", "Zone not found.");
        }

        const zoneData = zoneDoc.data()!;
        const expectedAmountPaise = Math.round((zoneData.price || 0) * 100);

        if (amount !== expectedAmountPaise) {
            throw new functions.https.HttpsError("invalid-argument", `Amount mismatch. Expected ${expectedAmountPaise} paise.`);
        }

        // 3. Fetch Tutor and Validate Account
        const tutorUid = zoneData.createdBy;
        const tutorDoc = await db.collection("users").doc(tutorUid).get();
        if (!tutorDoc.exists) {
            throw new functions.https.HttpsError("not-found", "Tutor profile not found.");
        }

        const tutorData = tutorDoc.data()!;
        const rzpAccountId = tutorData.razorpayAccountId || tutorData.razorpay_account_id;
        const kycStatus = tutorData.kycStatus;

        if (!rzpAccountId || kycStatus !== 'VERIFIED') {
            throw new functions.https.HttpsError(
                "failed-precondition", 
                "Tutor is not eligible for payments (KYC or Account ID missing)."
            );
        }

        // 4. Commission Logic
        let commissionPct = 15; // Default/FREE
        const plan = tutorData.subscriptionPlan;
        if (plan === 'PRO') commissionPct = 7;
        else if (plan === 'ELITE') commissionPct = 3;

        const commission = Math.round(amount * (commissionPct / 100));
        const tutorShare = amount - commission;

        // 5. Create Razorpay Order via Axios
        try {
            const authHeader = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`;
            const response = await axios.post(
                'https://api.razorpay.com/v1/orders',
                {
                    amount: amount,
                    currency: 'INR',
                    transfers: [
                        {
                            account: rzpAccountId,
                            amount: tutorShare,
                            currency: 'INR',
                            on_hold: false
                        }
                    ]
                },
                {
                    headers: {
                        'Authorization': authHeader,
                        'Content-Type': 'application/json'
                    }
                }
            );

            const orderId = response.data.id;

            // 6. Write Pending Order to Firestore
            await db.collection("zones").doc(zoneId).collection("orders").doc(orderId).set({
                orderId,
                studentUid: request.auth.uid,
                amount,
                commission,
                commissionPct,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                status: 'CREATED'
            });

            return {
                orderId,
                amount,
                currency: 'INR',
                keyId
            };

        } catch (error: any) {
            const msg = extractRazorpayError(error);
            console.error("Razorpay order creation failed:", msg);
            throw new functions.https.HttpsError("internal", `Order creation failed: ${msg}`);
        }
    }
);

export const razorpayRouteWebhook = onRequest(
    { secrets: ["RAZORPAY_WEBHOOK_SECRET", "ZOHO_ORG_ID", "ZOHO_REFRESH_TOKEN", "ZOHO_CLIENT_ID", "ZOHO_CLIENT_SECRET"] },
    async (req, res) => {
        const db = admin.firestore();
        const signature = req.headers['x-razorpay-signature'] as string;
        const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

        if (!signature || !secret) {
            console.error("Missing Razorpay signature or secret.");
            res.status(400).send('Bad Request: Signature missing');
            return;
        }

        // Verify Razorpay webhook signature using raw body and HMAC-SHA256
        const hmac = crypto.createHmac('sha256', secret).update(req.rawBody).digest('hex');

        if (hmac !== signature) {
            console.error("Razorpay signature mismatch.");
            res.status(400).send('Bad Request: Invalid signature');
            return;
        }

        const event = req.body.event;
        if (event !== 'payment.captured') {
            // Handle only payment.captured, ignore others with 200
            res.status(200).send('Event Ignored');
            return;
        }

        try {
            const payload = req.body.payload;
            const payment = payload.payment.entity;
            const orderId = payment.order_id;
            const paymentId = payment.id;

            if (!orderId) {
                console.warn("Webhook received payment.captured without order_id.");
                res.status(200).send('No order_id found');
                return;
            }

            // 1. Query collectionGroup('orders') where orderId matches
            const ordersSnapshot = await db.collectionGroup('orders').where('orderId', '==', orderId).get();
            if (ordersSnapshot.empty) {
                console.error(`Order query failed: No order found with orderId: ${orderId}`);
                res.status(200).send('Order not found');
                return;
            }

            const orderDoc = ordersSnapshot.docs[0];
            const orderData = orderDoc.data();
            const orderRef = orderDoc.ref;
            
            // Extract zoneId and studentUid from document path/data
            const zoneRef = orderRef.parent.parent;
            if (!zoneRef) throw new Error("Invalid order path structure.");
            
            const zoneId = zoneRef.id;
            const studentUid = orderData.studentUid;
            const commissionAmount = orderData.commission || 0; // in paise

            // 2. Enroll student
            const studentRef = db.collection('zones').doc(zoneId).collection('students').doc(studentUid);
            await studentRef.set({
                status: 'active',
                joinedAt: admin.firestore.FieldValue.serverTimestamp(),
                source: 'payment',
                paymentId
            }, { merge: true });

            // 3. Update order status to CAPTURED
            await orderRef.update({
                status: 'CAPTURED',
                capturedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            // 4. Generate Zoho invoice
            try {
                // Fetch tutorUid (zone creator)
                const zoneDoc = await zoneRef.get();
                const tutorUid = zoneDoc.data()?.createdBy;

                if (!tutorUid) {
                    throw new Error(`Tutor UID not found for zone: ${zoneId}`);
                }

                const orgId = process.env.ZOHO_ORG_ID!;
                const refreshToken = process.env.ZOHO_REFRESH_TOKEN!;
                const clientId = process.env.ZOHO_CLIENT_ID!;
                const clientSecret = process.env.ZOHO_CLIENT_SECRET!;

                // Use the returned access_token as Bearer token for Zoho Books invoice POST.
                // refresh OAuth token using URL-encoded POST as confirmed by user
                const tokenParams = new URLSearchParams();
                tokenParams.append('refresh_token', refreshToken);
                tokenParams.append('client_id', clientId);
                tokenParams.append('client_secret', clientSecret);
                tokenParams.append('grant_type', 'refresh_token');

                const tokenResponse = await axios.post('https://accounts.zoho.in/oauth/v2/token', tokenParams.toString(), {
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
                });

                const accessToken = tokenResponse.data.access_token;
                if (!accessToken) throw new Error("Failed to refresh Zoho access token.");

                // Generate Zoho invoice for platform commission
                // Invoice line item: platform commission amount, description 'Nunma Platform Fee'
                const invoicePayload = {
                    customer_name: (await db.collection("users").doc(tutorUid).get()).data()?.name || "Tutor",
                    line_items: [{
                        description: 'Nunma Platform Fee',
                        rate: commissionAmount / 100, // paise to INR
                        quantity: 1
                    }],
                    reason: `Platform fee for Razorpay Payment ${paymentId}`
                };

                const invoiceResponse = await axios.post(
                    `https://www.zohoapis.in/books/v3/invoices?organization_id=${orgId}`,
                    invoicePayload,
                    {
                        headers: {
                            'Authorization': `Bearer ${accessToken}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );

                const zohoInvoiceId = invoiceResponse.data.invoice?.invoice_id || "ZOHO_ERR";

                // Write result to users/{tutorUid}/invoices/{zohoInvoiceId}
                await db.collection('users').doc(tutorUid).collection('invoices').doc(zohoInvoiceId).set({
                    zohoInvoiceId,
                    amount: commissionAmount / 100,
                    paymentId,
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                });

            } catch (zohoError: any) {
                // Log Zoho errors but still return 200
                const errorData = zohoError?.response?.data || zohoError.message;
                console.error("Zoho Invoice Generation Failed:", JSON.stringify(errorData));
            }

            res.status(200).send('OK');

        } catch (error: any) {
            console.error("Webhook processing error:", error);
            res.status(500).send('Internal Server Error');
        }
    }
);

export const bunnyWebhook = onRequest(
    { secrets: ["BUNNY_WEBHOOK_SECRET"] },
    async (req, res) => {
        const db = admin.firestore();
        const signature = req.headers['bunny-signature'] as string;
        const secret = process.env.BUNNY_WEBHOOK_SECRET;

        if (!signature || !secret) {
            console.error("Missing Bunny signature or secret.");
            res.status(400).send('Bad Request: Signature missing');
            return;
        }

        // Verify Bunny webhook signature using raw body and HMAC-SHA256
        const hmac = crypto.createHmac('sha256', secret).update(req.rawBody).digest('hex');

        if (hmac !== signature) {
            console.error("Bunny signature mismatch.");
            res.status(400).send('Bad Request: Invalid signature');
            return;
        }

        const eventType = req.body.Type; // Using 'Type' based on standard Bunny Stream webhook payload
        if (eventType !== 'video.encoding.success' && eventType !== 'video.encoding.failed') {
            // Ignore other events
            res.status(200).send('Event Ignored');
            return;
        }

        try {
            const videoId = req.body.VideoGuid; // Extract VideoGuid from payload
            if (!videoId) {
                console.warn("Bunny webhook received without VideoGuid.");
                res.status(200).send('No VideoGuid found');
                return;
            }

            // 1. Fetch all zones to find the one containing the videoId in segments array
            const zonesSnapshot = await db.collection('zones').get();
            let matchingZoneDoc = null;
            let segments = [];

            for (const doc of zonesSnapshot.docs) {
                const data = doc.data();
                if (data.segments && Array.isArray(data.segments)) {
                    const found = data.segments.some((s: any) => s.videoId === videoId);
                    if (found) {
                        matchingZoneDoc = doc;
                        segments = data.segments;
                        break;
                    }
                }
            }

            if (!matchingZoneDoc) {
                console.warn(`No zone found for videoId: ${videoId}`);
                res.status(200).send('Zone match not found');
                return;
            }

            // 2. Update the matching segment in the array
            const updatedSegments = segments.map((s: any) => {
                if (s.videoId === videoId) {
                    if (eventType === 'video.encoding.success') {
                        return { 
                            ...s, 
                            status: 'READY', 
                            transcodedAt: new Date().toISOString() 
                        };
                    } else if (eventType === 'video.encoding.failed') {
                        return { 
                            ...s, 
                            status: 'FAILED' 
                        };
                    }
                }
                return s;
            });

            // 3. Write back to Firestore
            await matchingZoneDoc.ref.update({
                segments: updatedSegments,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            console.log(`Successfully updated segment status for videoId: ${videoId} in zone: ${matchingZoneDoc.id}`);
            res.status(200).send('OK');

        } catch (error: any) {
            console.error("Bunny webhook processing error:", error);
            res.status(500).send('Internal Server Error');
        }
    }
);

// --- PDF WATERMARKING ---

export const serveSecurePdf = onRequest({ cors: true }, async (req, res) => {
    const db = admin.firestore();
    try {
        const authHeader = req.headers.authorization;
        const idToken = authHeader?.split('Bearer ')[1];
        const decodedToken = await admin.auth().verifyIdToken(idToken!);
        const { zoneId, segmentId } = req.body;

        const studentDoc = await db.doc(`zones/${zoneId}/students/${decodedToken.uid}`).get();
        if (!studentDoc.exists) {
            res.status(403).send('Not enrolled.');
            return;
        }

        const [buffer] = await admin.storage().bucket().file(`segments/pdfs/${segmentId}.pdf`).download();
        const pdfDoc = await PDFDocument.load(buffer);
        const pages = pdfDoc.getPages();
        pages.forEach(p => p.drawText(`${decodedToken.email} - ${decodedToken.uid}`, { x: 50, y: 50, size: 10, opacity: 0.2 }));

        const pdfBytes = await pdfDoc.save();
        res.setHeader('Content-Type', 'application/pdf');
        res.end(Buffer.from(pdfBytes));
    } catch (error) {
        res.status(500).send('Internal Error');
    }
});

// --- ACCOUNT DELETION ---

export const deleteUserAccount = onCall(
    { secrets: ["BUNNY_API_KEY"], cors: true },
    async (request) => {
        const db = admin.firestore();
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
                            await axios.delete(
                                `https://video.bunnycdn.com/library/${libraryId}/videos/${videoId}`,
                                { headers: { 'AccessKey': apiKey } }
                            );
                        } catch (err: any) {
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

        } catch (error: any) {
            console.error("Critical error during account deletion:", error);
            throw new functions.https.HttpsError("internal", `Deletion failed: ${error.message}`);
        }
    }
);

// --- EXAM SUBMISSION LOGIC ---

export const uploadExamScript = onCall(
    {
        secrets: ["BUNNY_API_KEY", "BUNNY_STORAGE_ZONE_NAME", "BUNNY_STORAGE_HOSTNAME", "BUNNY_PULL_ZONE_URL"],
        cors: true
    },
    async (request) => {
        const db = admin.firestore();

        // 1. Authenticate caller
        if (!request.auth) {
            throw new functions.https.HttpsError("unauthenticated", "You must be signed in to upload your exam script.");
        }

        const uid = request.auth.uid;
        const { zoneId, examId, fileBase64, fileName } = request.data;

        // 2. Validate input strings
        if (!zoneId || !examId || !fileBase64 || !fileName) {
            throw new functions.https.HttpsError("invalid-argument", "Missing required parameters: zoneId, examId, fileBase64, or fileName.");
        }

        // 3. Authorization Check: Active student in the zone
        const studentDoc = await db.collection("zones").doc(zoneId).collection("students").doc(uid).get();
        if (!studentDoc.exists || studentDoc.data()?.status !== "active") {
            throw new functions.https.HttpsError("permission-denied", "You are not an active student in this zone.");
        }

        // 4. Validate Exam Existence
        const examDoc = await db.collection("zones").doc(zoneId).collection("exams").doc(examId).get();
        if (!examDoc.exists) {
            throw new functions.https.HttpsError("not-found", "The specified exam does not exist.");
        }

        // 5. Check for existing submission
        const submissionRef = db.collection("zones").doc(zoneId).collection("exams").doc(examId).collection("submissions").doc(uid);
        const submissionDoc = await submissionRef.get();
        if (submissionDoc.exists) {
            throw new functions.https.HttpsError("already-exists", "You have already submitted your answer script for this exam.");
        }

        try {
            // 6. PDF Watermarking
            const pdfBuffer = Buffer.from(fileBase64, 'base64');
            const pdfDoc = await PDFDocument.load(pdfBuffer);
            const pages = pdfDoc.getPages();
            
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const watermarkText = `${uid} | ${timestamp}`;

            for (const page of pages) {
                const { width } = page.getSize();
                page.drawText(watermarkText, {
                    x: width / 2 - 100, // Rough estimate for centering
                    y: 20,
                    size: 10,
                    color: rgb(1, 0, 0),
                    opacity: 0.3
                });
            }

            const watermarkedPdfBytes = await pdfDoc.save();
            const watermarkedBuffer = Buffer.from(watermarkedPdfBytes);
            const fileSizeInBytes = watermarkedBuffer.length;

            // 7. Bunny Storage Upload
            const bunnyApiKey = process.env.BUNNY_API_KEY;
            const storageZoneName = process.env.BUNNY_STORAGE_ZONE_NAME;
            const hostname = process.env.BUNNY_STORAGE_HOSTNAME;
            const pullZoneUrl = process.env.BUNNY_PULL_ZONE_URL;

            if (!bunnyApiKey || !storageZoneName || !hostname || !pullZoneUrl) {
                throw new functions.https.HttpsError("failed-precondition", "Bunny Storage configuration is missing on the server.");
            }

            const storagePath = `exams/${zoneId}/${examId}/${uid}_${timestamp}.pdf`;
            const uploadUrl = `https://${hostname}/${storageZoneName}/${storagePath}`;

            await axios.put(uploadUrl, watermarkedBuffer, {
                headers: {
                    'AccessKey': bunnyApiKey,
                    'Content-Type': 'application/pdf'
                }
            });

            // 8. Update Tutor Storage Metrics (Legacy behavior maintained)
            const zoneDoc = await db.collection('zones').doc(zoneId).get();
            const tutorUid = zoneDoc.data()?.createdBy;
            if (tutorUid) {
                await db.collection("users").doc(tutorUid).update({
                    usedStorageBytes: admin.firestore.FieldValue.increment(fileSizeInBytes)
                });
            }

            const answerSheetUrl = `${pullZoneUrl}/${storagePath}`;

            // 9. Write Submission Record
            const submissionPayload = {
                studentUid: uid,
                fileName,
                answerSheetUrl,
                submittedAt: admin.firestore.FieldValue.serverTimestamp(),
                status: 'PENDING_GRADING',
                cheatViolations: 0
            };

            await submissionRef.set(submissionPayload);

            return { 
                answerSheetUrl, 
                status: 'PENDING_GRADING' 
            };

        } catch (error: any) {
            console.error("uploadExamScript internal error:", error);
            if (error instanceof functions.https.HttpsError) throw error;
            throw new functions.https.HttpsError("internal", `An error occurred while processing your upload: ${error.message}`);
        }
    }
);

export const recordCheatViolation = onCall(
    { secrets: ["BUNNY_API_KEY"], cors: true }, // Bunny API key reused for consistency if needed later
    async (request) => {
        const db = admin.firestore();

        // 1. Authenticate caller
        if (!request.auth) {
            throw new functions.https.HttpsError("unauthenticated", "Login required.");
        }

        const uid = request.auth.uid;
        const { zoneId, examId, violationType } = request.data;

        // 2. Validate input strings and violationType
        const allowedViolations = ['TAB_SWITCH', 'COPY_PASTE', 'WINDOW_BLUR', 'FULLSCREEN_EXIT'];
        if (!zoneId || !examId || !violationType || !allowedViolations.includes(violationType)) {
            throw new functions.https.HttpsError("invalid-argument", "Invalid or missing parameters: { zoneId, examId, violationType }.");
        }

        // 3. Authorization Check: Active student in the zone
        const studentEnrollmentRef = db.collection("zones").doc(zoneId).collection("students").doc(uid);
        const studentDoc = await studentEnrollmentRef.get();
        if (!studentDoc.exists || studentDoc.data()?.status !== "active") {
            throw new functions.https.HttpsError("permission-denied", "You are not an active student in this zone.");
        }

        // 4. Validate Exam Existence and Time
        const examRef = db.collection("zones").doc(zoneId).collection("exams").doc(examId);
        const examDoc = await examRef.get();
        if (!examDoc.exists) {
            throw new functions.https.HttpsError("not-found", "The specified exam does not exist.");
        }

        const examData = examDoc.data()!;
        const now = admin.firestore.Timestamp.now();
        if (examData.endTime && examData.endTime.toMillis() <= now.toMillis()) {
            throw new functions.https.HttpsError("failed-precondition", "This exam has already ended.");
        }

        // 5. Transaction: Fetch/Create submission and record violation
        const submissionRef = examRef.collection("submissions").doc(uid);

        try {
            const result = await db.runTransaction(async (transaction) => {
                const subDoc = await transaction.get(submissionRef);
                
                let currentViolationsCount = 0;
                let currentViolationsArray = [];
                let isNewSubmission = false;

                if (subDoc.exists) {
                    const data = subDoc.data()!;
                    currentViolationsCount = data.cheatViolations || 0;
                    currentViolationsArray = data.violations || [];
                } else {
                    isNewSubmission = true;
                }

                const newCount = currentViolationsCount + 1;
                const newViolationRecord = {
                    type: violationType,
                    timestamp: new Date().toISOString()
                };
                const newViolationsArray = [...currentViolationsArray, newViolationRecord];

                const updatePayload: any = {
                    cheatViolations: newCount,
                    violations: newViolationsArray,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                };

                if (isNewSubmission) {
                    updatePayload.studentUid = uid;
                    updatePayload.status = 'IN_PROGRESS';
                    updatePayload.createdAt = admin.firestore.FieldValue.serverTimestamp();
                    transaction.set(submissionRef, updatePayload);
                } else {
                    if (newCount >= 3) {
                        updatePayload.status = 'FLAGGED';
                        updatePayload.flaggedAt = admin.firestore.FieldValue.serverTimestamp();
                    }
                    transaction.update(submissionRef, updatePayload);
                }

                return {
                    cheatViolations: newCount,
                    status: newCount >= 3 ? 'FLAGGED' : (isNewSubmission ? 'IN_PROGRESS' : subDoc.data()?.status || 'IN_PROGRESS')
                };
            });

            // 6. Define Warning Messages
            let warning = "";
            if (result.cheatViolations === 1) {
                warning = "Warning 1/3: Please stay focused on the exam window. Further violations will flag your submission.";
            } else if (result.cheatViolations === 2) {
                warning = "Warning 2/3: FINAL WARNING. Your next violation will result in your submission being FLAGGED for review.";
            }

            return {
                ...result,
                warning: warning || undefined
            };

        } catch (error: any) {
            console.error("recordCheatViolation transaction failed:", error);
            throw new functions.https.HttpsError("internal", "Failed to record violation due to a server error.");
        }
    }
);

export const submitGradedScript = onCall({ cors: true }, async (request) => {
    const db = admin.firestore();
    if (!request.auth) throw new functions.https.HttpsError("unauthenticated", "Login required.");
    const { zoneId, examId, studentId, score, feedback, mergedPdf, oldFileUrl } = request.data;

    // Authorization
    const zoneDoc = await db.collection('zones').doc(zoneId).get();
    const tutorUid = zoneDoc.data()?.createdBy;
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
        await axios.put(
            `https://storage.bunnycdn.com/${storageZone}/${storagePath}`,
            buffer,
            { headers: { 'AccessKey': bunnyApiKey, 'Content-Type': 'application/pdf' } }
        );

        // Delete Old
        // oldFileUrl format: https://[pullzone]/exams/[zoneId]/[examId]/[studentId]_[fileName]
        let oldFileSizeInBytes = 0;
        try {
            const oldPath = oldFileUrl.replace(`https://${pullZone}/`, '');

            // Get original file size to maintain exact quota diff
            const res = await axios.head(`https://storage.bunnycdn.com/${storageZone}/${oldPath}`, {
                headers: { 'AccessKey': bunnyApiKey }
            });
            oldFileSizeInBytes = parseInt(res.headers['content-length'] || "0");

            await axios.delete(`https://storage.bunnycdn.com/${storageZone}/${oldPath}`, {
                headers: { 'AccessKey': bunnyApiKey }
            });
        } catch (e) {
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

    } catch (error: any) {
        console.error("Grade submit error", error);
        throw new functions.https.HttpsError("internal", "Failed to upload merged script to edge storage.");
    }
});

export const submitExam = onCall({ cors: true }, async (request) => {
    const db = admin.firestore();
    if (!request.auth) throw new functions.https.HttpsError("unauthenticated", "Login required.");
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
            examData.questions.forEach((q: any) => {
                if (answers[q.id] === q.correctAnswer) score++;
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

    const submissionPayload: any = {
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

export const registerIssuance = onCall({ cors: true }, async (request) => {
    const db = admin.firestore();
    
    // 1. Authenticated check
    if (!request.auth) {
        throw new functions.https.HttpsError("unauthenticated", "You must be signed in to register a certificate issuance.");
    }

    const { zoneId, studentUid } = request.data;
    if (!zoneId || !studentUid) {
        throw new functions.https.HttpsError("invalid-argument", "Missing required parameters: zoneId or studentUid.");
    }

    const issuerUid = request.auth.uid;

    // 2. Fetch Zone to get title and creator (Thala check)
    const zoneDoc = await db.collection("zones").doc(zoneId).get();
    if (!zoneDoc.exists) {
        throw new functions.https.HttpsError("not-found", "The specified zone does not exist.");
    }

    const zoneData = zoneDoc.data()!;
    if (zoneData.createdBy !== issuerUid) {
        throw new functions.https.HttpsError("permission-denied", "Unauthorized: Only the zone creator (Thala) can register issuance.");
    }

    const zoneTitle = zoneData.title || zoneData.name || "Untitled Course";

    // 3. Fetch Student (User) to get name and email
    const studentUserDoc = await db.collection("users").doc(studentUid).get();
    if (!studentUserDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Student profile not found.");
    }

    const studentUserData = studentUserDoc.data()!;
    const studentName = studentUserData.name || "Student";
    const studentEmail = studentUserData.email || "no-email@nunma.in";

    // 4. Validate Student Enrollment is active in the zone
    const enrollmentDoc = await db.collection("zones").doc(zoneId).collection("students").doc(studentUid).get();
    if (!enrollmentDoc.exists || enrollmentDoc.data()?.status !== 'active') {
        throw new functions.https.HttpsError("failed-precondition", "Student is not an active participant in this zone.");
    }

    // 5. Duplicate Check: Ensure no certificate already exists for this student + zone in the root certificates collection
    const certQuery = await db.collection("certificates")
        .where("studentId", "==", studentUid)
        .where("zoneId", "==", zoneId)
        .limit(1)
        .get();

    if (!certQuery.empty) {
        throw new functions.https.HttpsError("already-exists", "A certificate has already been issued for this student in this zone.");
    }

    // 6. Generate Verifiable JSON-LD Credential
    const uuid = crypto.randomUUID();
    const urnUuid = `urn:uuid:${uuid}`;
    const isoTimestamp = new Date().toISOString();

    const payload = {
        "@context": ["https://www.w3.org/2018/credentials/v1"],
        "id": urnUuid,
        "type": ["VerifiableCredential", "CourseCompletionCertificate"],
        "issuer": `https://nunma.in/issuers/${issuerUid}`,
        "issuanceDate": isoTimestamp,
        "credentialSubject": {
            "id": `did:email:${studentEmail}`,
            "name": studentName,
            "completedCourse": zoneTitle,
            "zoneId": zoneId,
            "completionDate": isoTimestamp
        }
    };

    // 7. Atomic Batch Write: Certificates root collection and Student doc update
    const batch = db.batch();

    // Create entry in certificates root collection
    const certRef = db.collection("certificates").doc(urnUuid);
    batch.set(certRef, {
        payload,
        studentId: studentUid,
        zoneId,
        issuedAt: admin.firestore.FieldValue.serverTimestamp(),
        issuedBy: issuerUid
    });

    // Update student's enrollment record in the zone (merge: true via update on selected fields)
    const studentEnrollmentRef = db.collection("zones").doc(zoneId).collection("students").doc(studentUid);
    batch.update(studentEnrollmentRef, {
        certificateId: urnUuid,
        certificateIssuedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    try {
        await batch.commit();
        return { certificateId: urnUuid, payload };
    } catch (error: any) {
        console.error("Batch write failed during certificate issuance:", error);
        throw new functions.https.HttpsError("internal", "Failed to finalize certificate registration on the server.");
    }
});




// --- OTP AUTHENTICATION ---

export const requestOTP = onCall({ secrets: ["RESEND_API_KEY"], cors: true }, async (request) => {
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
    const resend = new Resend(resendApiKey);

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
    } catch (error: any) {
        // Log the full error object so we can see the exact Resend rejection reason in Firebase logs
        console.error("RESEND DELIVERY FAILURE for", email, "| Full error:", JSON.stringify(error), "| Message:", error?.message);
        throw new functions.https.HttpsError("internal", error.message || "Failed to send OTP email.");
    }
});

export const verifyOTPAndSignIn = onCall({ cors: true }, async (request) => {
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

    const data = otpDoc.data()!;
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
        const verifiedAt: Date = data.verifiedAt?.toDate ? data.verifiedAt.toDate() : (data.createdAt?.toDate ? data.createdAt.toDate() : new Date());
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
    } catch (error: any) {
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
                } catch (creationError: any) {
                    console.error("verifyOTPAndSignIn: Error creating user account:", creationError);
                    throw new functions.https.HttpsError("failed-precondition", creationError.message || "Could not create user account.");
                }
            } else {
                // Should not happen if validation is correct
                throw new functions.https.HttpsError("invalid-argument", "Registration details missing.");
            }
        } else {
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

export const generateZoneInvite = onCall(
    { cors: ["https://www.nunma.in", "https://nunma.in", "http://localhost:5173"] }, 
    async (request) => {
    const db = admin.firestore();
    if (!request.auth) throw new functions.https.HttpsError("unauthenticated", "Login required.");
    
    const { zoneId } = request.data;
    if (!zoneId) throw new functions.https.HttpsError("invalid-argument", "Missing zoneId.");

    try {
        const zoneDoc = await db.collection("zones").doc(zoneId).get();
        if (!zoneDoc.exists) throw new functions.https.HttpsError("not-found", "Zone not found.");

        const zoneData = zoneDoc.data();
        if (zoneData?.createdBy !== request.auth.uid) {
            throw new functions.https.HttpsError("permission-denied", "Only the zone creator can generate invites.");
        }

        const inviteToken = uuidv4();
        const expiresAt = Date.now() + (48 * 60 * 60 * 1000); // 48 hours

        await db.collection("zones").doc(zoneId).collection("invites").doc(inviteToken).set({
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            expiresAt,
            createdBy: request.auth.uid,
            isActive: true
        });

        console.log(`[INVITE] Token generated for zone ${zoneId} by user ${request.auth.uid}: ${inviteToken}`);
        return { inviteToken, expiresAt, isActive: true };
    } catch (err: any) {
        console.error(`[INVITE_ERROR] Failed to generate token for zone ${zoneId}:`, err);
        throw new functions.https.HttpsError("internal", err.message || "Failed to generate invite token.");
    }
});

export const revokeZoneInvite = onCall(
    { cors: ["https://www.nunma.in", "https://nunma.in", "http://localhost:5173"] }, 
    async (request) => {
    const db = admin.firestore();
    if (!request.auth) throw new functions.https.HttpsError("unauthenticated", "Login required.");

    const { zoneId, inviteToken } = request.data;
    if (!zoneId || !inviteToken) throw new functions.https.HttpsError("invalid-argument", "Missing zoneId or inviteToken.");

    const zoneDoc = await db.collection("zones").doc(zoneId).get();
    if (!zoneDoc.exists) throw new functions.https.HttpsError("not-found", "Zone not found.");

    if (zoneDoc.data()?.createdBy !== request.auth.uid) {
        throw new functions.https.HttpsError("permission-denied", "Only the zone creator can revoke invites.");
    }

    await db.collection("zones").doc(zoneId).collection("invites").doc(inviteToken).update({
        isActive: false
    });

    return { success: true };
});

export const joinZoneByInvite = onCall(
    { cors: ["https://www.nunma.in", "https://nunma.in", "http://localhost:5173"] }, 
    async (request) => {
    const db = admin.firestore();
    if (!request.auth) throw new functions.https.HttpsError("unauthenticated", "Login required.");

    const { zoneId, inviteToken } = request.data;
    if (!zoneId || !inviteToken) throw new functions.https.HttpsError("invalid-argument", "Missing zoneId or inviteToken.");

    const inviteDoc = await db.collection("zones").doc(zoneId).collection("invites").doc(inviteToken).get();
    
    if (!inviteDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Invite token not found.");
    }

    const inviteData = inviteDoc.data();
    if (!inviteData?.isActive || inviteData.expiresAt < Date.now()) {
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
