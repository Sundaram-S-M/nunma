import * as admin from "firebase-admin";
admin.initializeApp();

import * as functions from "firebase-functions";
import { onRequest, onCall, HttpsError } from "firebase-functions/v2/https";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as crypto from "crypto";
import * as nodemailer from "nodemailer";

import { AccessToken, RoomServiceClient, TrackSource } from "livekit-server-sdk";
import axios from "axios";
import { PDFDocument, rgb } from "pdf-lib";
// import Razorpay from "razorpay";
// import { generatePlatformFeeInvoice } from "./zohoUtils";
import { v4 as uuidv4 } from "uuid";
import { Resend } from "resend";
import Busboy from 'busboy';
export { gradePdfSubmission } from "./ai/gradeSubmission";
export { generateQuizDraft } from "./ai/generateQuizDraft";
export { askZoneAnalytics } from "./ai/askZoneAnalytics";

// const db = admin.firestore(); // Moved inside function scopes for deployment stability


// Global transporter helper for billing and OTP emails
const getTransporter = () => {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587');
    const secure = process.env.SMTP_SECURE === 'true';
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
        throw new Error("SMTP configuration missing from environment.");
    }

    return nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
            user,
            pass,
        },
    });
};





// --- LIVEKIT INTEGRATION ---

export const generateLiveToken = onCall(
    { secrets: ["LIVEKIT_API_KEY", "LIVEKIT_API_SECRET", "LIVEKIT_URL"], cors: true },
    async (request) => {
        try {
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
        } catch (error: any) {
            if (error instanceof functions.https.HttpsError) throw error;
            functions.logger.error("Global crash in generateLiveToken:", error);
            throw new functions.https.HttpsError("internal", error.message || "Failed to generate live token.");
        }
    }
);

export const getLiveKitToken = onCall(
    { secrets: ["LIVEKIT_API_KEY", "LIVEKIT_API_SECRET"], cors: true },
    async (request) => {
        try {
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
        } catch (error: any) {
            if (error instanceof functions.https.HttpsError) throw error;
            functions.logger.error("Global crash in getLiveKitToken:", error);
            throw new functions.https.HttpsError("internal", error.message || "Failed to get live token.");
        }
    }
);


export const toggleStudentAudio = onCall(
    { secrets: ["LIVEKIT_API_KEY", "LIVEKIT_API_SECRET", "LIVEKIT_URL"], cors: true },
    async (request) => {
        try {
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
        } catch (error: any) {
            if (error instanceof functions.https.HttpsError) throw error;
            functions.logger.error("Global crash in toggleStudentAudio:", error);
            throw new functions.https.HttpsError("internal", error.message || "Failed to toggle student audio.");
        }
    }
);


// --- BUNNY STREAM INTEGRATION ---

export const createBunnyUploadSignature = onCall(
    { secrets: ["BUNNY_API_KEY", "BUNNY_LIBRARY_ID"], cors: true },
    async (request) => {
        try {
            const db = admin.firestore();
            if (!request.auth) throw new functions.https.HttpsError("unauthenticated", "Login required.");
            
            // Step 1: Role Check (Only THALA allowed)
            let role = request.auth.token.role;
            if (!role) {
                const userDoc = await db.collection("users").doc(request.auth.uid).get();
                role = userDoc.data()?.role;
            }

            if (role !== "THALA") {
                throw new functions.https.HttpsError("permission-denied", "Thala access required.");
            }

            const { fileName, title, zoneId, videoId: existingVideoId } = request.data;
            const finalTitle = fileName || title || 'Untitled';
            
            // Note: zoneId is optional for some flows, but required if indexing in firestore
            // if (!zoneId) throw new functions.https.HttpsError("invalid-argument", "Missing zoneId for Firestore indexing.");

            const libraryId = process.env.BUNNY_LIBRARY_ID;
            const bunnyKey = process.env.BUNNY_API_KEY ? process.env.BUNNY_API_KEY.trim() : null;

            if (!libraryId || !bunnyKey) {
                throw new functions.https.HttpsError('internal', 'BUNNY_API_KEY or BUNNY_LIBRARY_ID is missing or undefined on the server.');
            }

            // Step 2: Bunny Init (Get GUID or use existing)
            let videoId = existingVideoId;
            if (!videoId) {
                try {
                    const response = await axios.post(
                        `https://video.bunnycdn.com/library/${libraryId}/videos`, 
                        { title: finalTitle }, 
                        { headers: { 'AccessKey': bunnyKey, 'Content-Type': 'application/json' } }
                    );
                    videoId = response.data.guid;
                } catch (apiError: any) {
                    functions.logger.error("Bunny API Error:", apiError.response?.data || apiError.message);
                    throw new functions.https.HttpsError("internal", `Bunny API Error: ${apiError.response?.data?.Message || apiError.message}`);
                }
            }
            
            // Step 3: Signature Generation
            const expirationTime = Math.floor(Date.now() / 1000) + 86400; // 24 hours expiry
            const signature = crypto.createHash('sha256')
                .update(String(libraryId) + String(bunnyKey) + String(expirationTime) + String(videoId))
                .digest('hex');

            // Step 4: DB Write (Direct indexing under Zone subcollection)
            if (zoneId) {
                const videoRef = db.doc(`zones/${zoneId}/videos/${videoId}`);
                await videoRef.set({
                    bunnyVideoId: videoId,
                    status: 'uploading',
                    title: finalTitle,
                    tutorId: request.auth.uid,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    zoneId
                }, { merge: true }); // Use merge to avoid overwriting existing metadata during resume
            }

            return { 
                videoId, 
                signature, 
                expireTime: expirationTime,
                libraryId
            };
        } catch (error: any) {
            if (error instanceof functions.https.HttpsError) throw error;
            functions.logger.error("Global crash in createBunnyUploadSignature:", error);
            throw new functions.https.HttpsError("internal", error.message || "Failed to initiate video upload.");
        }
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
        try {
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
        } catch (error: any) {
            if (error instanceof functions.https.HttpsError) throw error;
            functions.logger.error("Global crash in generateBunnyToken:", error);
            throw new functions.https.HttpsError("internal", error.message || "Failed to generate bunny token.");
        }
    }
);

export const getBunnyPlaybackToken = onCall(
    { secrets: ["BUNNY_TOKEN_KEY", "BUNNY_PULL_ZONE_URL"], cors: true },
    async (request) => {
        try {
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
            let isAuthorized = zoneData.createdBy === uid || zoneData.tutorId === uid;

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
                const videoDoc = await db.doc(`zones/${zoneId}/videos/${videoId}`).get();
                if (!videoDoc.exists) {
                    throw new functions.https.HttpsError("not-found", "Video not found in this zone.");
                }
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
        } catch (error: any) {
            if (error instanceof functions.https.HttpsError) throw error;
            functions.logger.error("Global crash in getBunnyPlaybackToken:", error);
            throw new functions.https.HttpsError("internal", error.message || "Failed to get playback token.");
        }
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
        try {
            const db = admin.firestore();
            if (!request.auth) {
                throw new functions.https.HttpsError("unauthenticated", "You must be signed in to create a linked account.");
            }

            const uid = request.auth.uid;
            const { businessName, businessType, legalName, email, phone, pan, bankAccount, ifsc } = request.data || {};

            if (!businessName || !businessType || !legalName || !email || !phone || !pan || !bankAccount || !ifsc) {
                throw new functions.https.HttpsError("invalid-argument", "Missing required business details: { businessName, businessType, legalName, email, phone, pan, bankAccount, ifsc }.");
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
            if (userData.role !== "THALA" && userData.role !== "TUTOR") {
                throw new functions.https.HttpsError("permission-denied", "Unauthorized: Only users with role 'TUTOR' or 'THALA' can create linked accounts.");
            }

            // 2. Check for existing razorpayAccountId
            let accountId = userData.razorpayAccountId || userData.razorpay_account_id;
            const existingKycStatus = userData.kycStatus;

            if (accountId && existingKycStatus !== "STAKEHOLDER_FAILED") {
                throw new functions.https.HttpsError("already-exists", "A Razorpay account already exists for this user.");
            }

            // 3. Create Razorpay Account
            if (!accountId) {
                const createPayload = {
                    email,
                    phone: phone.startsWith('+91') ? phone : `+91${phone}`,
                    type: "route",
                    legal_business_name: legalName,
                    business_type: businessType,
                    customer_facing_business_name: businessName,
                    profile: { category: "education" }
                };

                const accountResponse = await axios.post(
                    'https://api.razorpay.com/v2/accounts',
                    createPayload,
                    { headers }
                );
                accountId = accountResponse.data.id;

                await userRef.update({
                    razorpayAccountId: accountId,
                    kycStatus: 'PENDING'
                });
            }

            // 4. Create Stakeholder
            try {
                const stakeholderPayload = {
                    name: legalName,
                    email: email,
                    phone: phone.startsWith('+91') ? phone : `+91${phone}`,
                    kyc: { pan: pan.toUpperCase() }
                };

                await axios.post(
                    `https://api.razorpay.com/v2/accounts/${accountId}/stakeholders`,
                    stakeholderPayload,
                    { headers }
                );

                // 5. Add Product Configuration for Route (Bank Details)
                try {
                    const productPayload = {
                        product_name: "route",
                        tnc_accepted: true,
                        ip: request.rawRequest?.ip || "127.0.0.1",
                        settlements: {
                            account_number: bankAccount,
                            ifsc_code: ifsc,
                            beneficiary_name: legalName
                        }
                    };

                    await axios.post(
                        `https://api.razorpay.com/v2/accounts/${accountId}/products`,
                        productPayload,
                        { headers }
                    );
                    functions.logger.info(`Razorpay Route Product Configured for ${accountId}`);
                } catch (productError: any) {
                    const msg = extractRazorpayError(productError);
                    functions.logger.error("Razorpay Product Configuration failed:", msg);
                    // Continue anyway, we can manually configure or retry if it fails
                }

                await userRef.update({
                    kycStatus: 'PENDING',
                    kycSubmittedAt: admin.firestore.FieldValue.serverTimestamp()
                });

                return { accountId, status: 'PENDING' };
            } catch (stakeholderError: any) {
                const msg = extractRazorpayError(stakeholderError);
                functions.logger.error("Razorpay Stakeholder creation failed:", msg);
                
                await userRef.update({ kycStatus: 'STAKEHOLDER_FAILED' });
                return { accountId, status: 'STAKEHOLDER_FAILED' };
            }

        } catch (error: any) {
            if (error instanceof functions.https.HttpsError) throw error;
            const msg = extractRazorpayError(error);
            functions.logger.error("Global crash in createTutorLinkedAccount:", msg);
            throw new functions.https.HttpsError("internal", `Razorpay Account Creation Failed: ${msg}`);
        }
    }
);


export const createRazorpayOrder = onCall(
    { secrets: ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET"], cors: true },
    async (request) => {
        try {
            const db = admin.firestore();
            
            // 1. Authenticated check
            if (!request.auth) {
                throw new functions.https.HttpsError("unauthenticated", "You must be signed in to create an order.");
            }

            const data = request.data;
            const zoneId = data.zoneId;
            const planId = data.planId;

            if (!zoneId && !planId) {
                throw new functions.https.HttpsError("invalid-argument", "Missing zoneId or planId.");
            }

            const keyId = process.env.RAZORPAY_KEY_ID;
            const keySecret = process.env.RAZORPAY_KEY_SECRET;
            if (!keyId || !keySecret) {
                throw new functions.https.HttpsError("failed-precondition", "Razorpay secrets not configured.");
            }

            let finalAmount: number;
            let rzpAccountId: string | undefined;
            let tutorShare: number | undefined;
            let tutorUid: string | undefined;
            let commission: number | undefined;

            if (zoneId) {
                // -- Case A: Student buying a Zone Course --
                const zoneDoc = await db.collection("zones").doc(zoneId).get();
                if (!zoneDoc.exists) {
                    throw new functions.https.HttpsError("not-found", "Zone not found.");
                }

                const zoneData = zoneDoc.data()!;
                // Server-side source of truth for price (prioritize priceINR)
                const price = zoneData.priceINR || zoneData.price || 0;
                finalAmount = Math.round(price * 100); // Convert to paise

                tutorUid = zoneData.createdBy;
                if (!tutorUid) {
                    throw new functions.https.HttpsError("failed-precondition", "Zone creator (tutorUid) is missing.");
                }
                const tutorDoc = await db.collection("users").doc(tutorUid).get();
                if (!tutorDoc.exists) {
                    throw new functions.https.HttpsError("not-found", "Tutor profile not found.");
                }

                const tutorData = tutorDoc.data()!;
                rzpAccountId = tutorData.razorpayAccountId || tutorData.razorpay_account_id;
                const kycStatus = tutorData.kycStatus;

                if (!rzpAccountId || kycStatus !== 'VERIFIED') {
                    throw new functions.https.HttpsError(
                        "failed-precondition", 
                        "Tutor is not eligible for payments (KYC or Account ID missing)."
                    );
                }

                // Commission Logic for Zone sales
                let commissionPct = 15; // Default/FREE
                const plan = tutorData.subscriptionPlan;
                if (plan === 'STANDARD') commissionPct = 5;
                else if (plan === 'PREMIUM') commissionPct = 2;

                commission = Math.round(finalAmount * (commissionPct / 100));
                tutorShare = finalAmount - commission;

            } else {
                // -- Case B: Tutor upgrading Platform Plan --
                const allowedPlans: Record<string, number> = {
                    'standard': 149900,
                    'premium': 499900
                };

                if (!allowedPlans[planId]) {
                    throw new functions.https.HttpsError("invalid-argument", "Invalid subscription plan selected.");
                }

                finalAmount = allowedPlans[planId];
                // No transfers for platform subscription payments (goes 100% to Nunma)
            }

            // 5. Create Razorpay Order via Axios
            const authHeader = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`;
            const orderPayload: any = {
                amount: finalAmount,
                currency: 'INR',
                notes: {
                    type: planId ? 'PLATFORM_SUBSCRIPTION' : 'ZONE_ENROLLMENT',
                    planId: planId || '',
                    zoneId: zoneId || '',
                    userId: request.auth.uid
                }
            };

            // Add Route transfers ONLY for Zone enrollment
            if (zoneId && rzpAccountId && tutorShare) {
                orderPayload.transfers = [
                    {
                        account: rzpAccountId,
                        amount: tutorShare,
                        currency: 'INR',
                        on_hold: false
                    }
                ];
            }

            const response = await axios.post(
                'https://api.razorpay.com/v1/orders',
                orderPayload,
                { headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' } }
            );

            const razorpayOrder = response.data;

            // 6. Write Pending Order to Firestore (Only for Zone Sales)
            if (zoneId) {
                await db.collection("zones").doc(zoneId).collection("orders").doc(razorpayOrder.id).set({
                    orderId: razorpayOrder.id,
                    studentUid: request.auth.uid,
                    tutorUid: tutorUid, // Store tutorUid for webhook consumption
                    amount: finalAmount,
                    commission: commission, // Store commission for webhook invoicing
                    tutorShare: tutorShare, // Store tutorShare for reference
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    status: 'CREATED'
                });
            } else {
                // Platform subscription order
                await db.collection("platform_orders").doc(razorpayOrder.id).set({
                    orderId: razorpayOrder.id,
                    tutorUid: request.auth.uid,
                    planId,
                    amount: finalAmount,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    status: 'CREATED'
                });
            }

            return {
                orderId: razorpayOrder.id,
                amount: razorpayOrder.amount,
                currency: razorpayOrder.currency,
                keyId
            };

        } catch (error: any) {
            if (error instanceof functions.https.HttpsError) throw error;
            const msg = extractRazorpayError(error);
            functions.logger.error("Global crash in createRazorpayOrder:", msg);
            throw new functions.https.HttpsError("internal", `Order creation failed: ${msg}`);
        }
    }
);


/**
 * DEPRECATED: Consolidated into the unified razorpayWebhook below.
 * Keeping a stub for transitional safety if needed, but redirects to 404/200.
 */
export const razorpayRouteWebhook = onRequest(async (req, res) => {
    functions.logger.warn("Deprecated razorpayRouteWebhook called. Please update your Razorpay dashboard to use /razorpayWebhook.");
    res.status(200).send('Deprecated: Please use /razorpayWebhook instead.');
});


/**
 * SECURE RAZORPAY WEBHOOK
 * Implements strict signature validation, two-step idempotency, and atomic fulfillment.
 */
export const razorpayWebhook = onRequest(
    { secrets: ["RAZORPAY_WEBHOOK_SECRET"], cors: true }, // Removed SMTP_PASS as it's not used here anymore
    async (req, res) => {
        const db = admin.firestore();
        const signature = req.headers['x-razorpay-signature'] as string;
        const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

        // Step 1: Signature Validation
        functions.logger.info("Executing Razorpay Webhook Signature Validation...");
        if (!signature || !secret) {
            functions.logger.error("Rejecting Webhook: Signature or Secret missing in environment.");
            res.status(400).send('Invalid signature configuration');
            return;
        }

        const hmac = crypto.createHmac('sha256', secret).update(req.rawBody).digest('hex');
        if (hmac !== signature) {
            functions.logger.error("Rejecting Webhook: HMAC signature mismatch.", { provided: signature, calculated: hmac });
            res.status(400).send('Invalid signature match');
            return;
        }
        functions.logger.info("Razorpay Signature Verified Successfully.");

        try {
            const payload = req.body;
            const event = payload.event;
            
            // Only handle payment.captured for core fulfillment
            if (event !== 'payment.captured' && event !== 'order.paid') {
                functions.logger.info(`Ignoring Razorpay event type: ${event}`);
                res.status(200).send({ status: 'ignored', event });
                return;
            }

            const payment = payload.payload?.payment?.entity;
            const razorpayOrderId = payment?.order_id || payload.payload?.order?.entity?.id;
            const paymentId = payment?.id;

            if (!razorpayOrderId) {
                functions.logger.warn("No order_id found in Razorpay payload.", payload);
                res.status(200).send({ status: 'ignored', reason: 'no_order_id' });
                return;
            }

            // Step 2: Identify and Fetch Order (Zone vs Platform)
            functions.logger.info(`Processing fulfillment for Razorpay Order: ${razorpayOrderId}`);
            
            let orderDoc: admin.firestore.QueryDocumentSnapshot | admin.firestore.DocumentSnapshot;
            let isPlatformOrder = false;

            // Strategy: Check Zone Orders (Subcollections) first
            const zoneOrderSnapshot = await db.collectionGroup('orders')
                .where('orderId', '==', razorpayOrderId)
                .limit(1)
                .get();

            if (!zoneOrderSnapshot.empty) {
                orderDoc = zoneOrderSnapshot.docs[0];
            } else {
                // Check Platform Orders (Top-level)
                const platformOrderDoc = await db.collection('platform_orders').doc(razorpayOrderId).get();
                if (!platformOrderDoc.exists) {
                    functions.logger.error(`Critical Error: Order ${razorpayOrderId} not found in any collection.`);
                    res.status(200).send({ status: 'error', message: 'order_not_found' });
                    return;
                }
                orderDoc = platformOrderDoc;
                isPlatformOrder = true;
            }

            const orderRef = orderDoc.ref;
            const orderData = orderDoc.data()!;
            
            // Step 3: Atomic Fulfillment Transaction
            await db.runTransaction(async (transaction) => {
                const freshDoc = await transaction.get(orderRef);
                if (!freshDoc.exists) throw new Error("Order document vanished.");

                if (freshDoc.data()?.status === 'paid' || freshDoc.data()?.status === 'CAPTURED') {
                    functions.logger.info(`Idempotency: Order ${razorpayOrderId} already processed.`);
                    return;
                }

                // A. Update Order Status
                transaction.update(orderRef, { 
                    status: 'paid', 
                    fulfilled: true,
                    paymentId,
                    paidAt: admin.firestore.FieldValue.serverTimestamp()
                });

                if (isPlatformOrder) {
                    // B. Platform Subscription Logic
                    const tutorUid = orderData.tutorUid;
                    const planId = orderData.planId;
                    if (tutorUid && planId) {
                        const userRef = db.collection('users').doc(tutorUid);
                        // Convert planId to uppercase for DB consistency (STANDARD/PREMIUM)
                        transaction.update(userRef, {
                            subscriptionPlan: planId.toUpperCase(),
                            subscriptionUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
                        });
                        functions.logger.info(`Upgraded Tutor ${tutorUid} to plan: ${planId}`);
                    }
                } else {
                    // C. Zone Enrollment Logic
                    const zoneRef = orderRef.parent.parent;
                    if (!zoneRef) throw new Error("Invalid order hierarchy.");
                    
                    const zoneId = zoneRef.id;
                    const studentUid = orderData.studentUid;

                    if (studentUid) {
                        const studentRef = db.collection('zones').doc(zoneId).collection('students').doc(studentUid);
                        const enrollmentRef = db.collection('users').doc(studentUid).collection('enrollments').doc(zoneId);

                        transaction.set(studentRef, { 
                            status: 'active', 
                            joinedAt: admin.firestore.FieldValue.serverTimestamp(),
                            source: 'razorpay_webhook',
                            paymentId
                        }, { merge: true });

                        transaction.set(enrollmentRef, { 
                            zoneId,
                            enrolledAt: admin.firestore.FieldValue.serverTimestamp(),
                            status: 'active'
                        }, { merge: true });
                        functions.logger.info(`Enrolled Student ${studentUid} in Zone ${zoneId}`);
                    }
                }
            });

            // Return success to Razorpay immediately after enrollment is confirmed
            res.status(200).send({ status: 'ok', orderId: razorpayOrderId });

            // Step 4: Post-Fulfillment Mail Queueing (fire-and-forget)
            // These writes trigger the async Zoho invoicing pipeline via onDocumentCreated.
            // They are intentionally non-blocking so Razorpay always gets a fast 200 response.
            const amountInInr = (payment?.amount || orderData.amount || 0) / 100;
            const gstAmount = amountInInr * 0.18;

            if (isPlatformOrder) {
                // Receipt for Tutor Platform Subscription
                db.collection('mail_queue').add({
                    uid: orderData.tutorUid,
                    amount: amountInInr,
                    gst: gstAmount,
                    planId: orderData.planId,
                    type: 'PLATFORM_SUBSCRIPTION',
                    paymentId,
                    status: 'pending',
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                }).catch(err =>
                    console.error('[Zoho Invoice] Non-blocking mail_queue write failed:', err)
                );
            } else {
                // 1. Invoice for Student Enrollment
                db.collection('mail_queue').add({
                    uid: orderData.studentUid,
                    amount: amountInInr,
                    gst: gstAmount,
                    type: 'ZONE_ENROLLMENT',
                    paymentId,
                    status: 'pending',
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                }).catch(err =>
                    console.error('[Zoho Invoice] Non-blocking mail_queue write failed:', err)
                );

                // 2. Platform Fee Receipt for Tutor (Commission)
                if (orderData.commission && orderData.tutorUid) {
                    const commissionInInr = orderData.commission / 100;
                    const commissionGst = commissionInInr * 0.18;
                    db.collection('mail_queue').add({
                        uid: orderData.tutorUid,
                        amount: commissionInInr,
                        gst: commissionGst,
                        type: 'PLATFORM_FEE',
                        paymentId,
                        status: 'pending',
                        createdAt: admin.firestore.FieldValue.serverTimestamp()
                    }).catch(err =>
                        console.error('[Zoho Invoice] Non-blocking mail_queue write failed:', err)
                    );
                }
            }

        } catch (error: any) {
            functions.logger.error("CRITICAL: Webhook processing failed.", error);
            res.status(500).send(`Internal Error: ${error.message}`);
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
        try {
            const db = admin.firestore();
            if (!request.auth) {
                throw new functions.https.HttpsError("unauthenticated", "Login required for account deletion.");
            }

            const uid = request.auth.uid;
            const libraryId = process.env.BUNNY_LIBRARY_ID;
            const apiKey = process.env.BUNNY_API_KEY;

            console.log(`Starting permanent deletion for user: ${uid}`);

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
            const taxDetailsSnapshot = await db.collection("users").doc(uid).collection("taxDetails").get();
            const taxDeletePromises = taxDetailsSnapshot.docs.map(doc => doc.ref.delete());
            await Promise.all(taxDeletePromises);

            await db.collection("users").doc(uid).delete();

            // 4. Delete from Firebase Auth
            await admin.auth().deleteUser(uid);

            console.log(`Successfully deleted user ${uid} and all associated data.`);
            return { success: true };

        } catch (error: any) {
            if (error instanceof functions.https.HttpsError) throw error;
            functions.logger.error("Global crash in deleteUserAccount:", error);
            throw new functions.https.HttpsError("internal", error.message || "Deletion failed.");
        }
    }
);

// --- STORAGE QUOTA HELPERS ---

const DEFAULT_TUTOR_QUOTA = 1024 * 1024 * 1024; // 1GB
const DEFAULT_STUDENT_QUOTA = 100 * 1024 * 1024; // 100MB

/**
 * Checks if the user has enough storage quota for an incoming file.
 */
async function checkStorageQuota(uid: string, incomingSize: number): Promise<{ isAllowed: boolean, used: number, max: number }> {
    const db = admin.firestore();
    const userDoc = await db.collection("users").doc(uid).get();
    if (!userDoc.exists) return { isAllowed: false, used: 0, max: 0 };
    
    const data = userDoc.data()!;
    const role = data.role || "STUDENT";
    const used = data.usedStorageBytes || 0;
    const max = data.maxStorageQuota || (role === "TUTOR" || role === "THALA" ? DEFAULT_TUTOR_QUOTA : DEFAULT_STUDENT_QUOTA);
    
    return {
        isAllowed: (used + incomingSize) <= max,
        used,
        max
    };
}

// --- GENERIC MULTIPART UPLOAD (onRequest) ---

/**
 * Handles multipart document uploads and streams them to Bunny Edge Storage.
 * Enforces user storage quotas.
 */
export const uploadFileToBunny = onRequest(
    { secrets: ["BUNNY_API_KEY", "BUNNY_STORAGE_ZONE_NAME", "BUNNY_STORAGE_HOSTNAME", "BUNNY_PULL_ZONE_URL"], cors: true },
    async (req, res) => {
        // Handle CORS manually for multipart/form-data
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        if (req.method === 'OPTIONS') {
            res.status(204).send('');
            return;
        }

        if (req.method !== 'POST') {
            res.status(405).send('Method Not Allowed');
            return;
        }

        const db = admin.firestore();

        // 1. Verify Auth Token manually for onRequest
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).send('Unauthorized: Missing token');
            return;
        }

        const idToken = authHeader.split('Bearer ')[1];
        let uid: string;
        try {
            const decodedToken = await admin.auth().verifyIdToken(idToken);
            uid = decodedToken.uid;
        } catch (error) {
            res.status(401).send('Unauthorized: Invalid token');
            return;
        }

        // 2. Parse Multipart Body using Busboy
        const bb = Busboy({ headers: req.headers });
        let fileBuffer: Buffer | null = null;
        let fileName = '';
        let folder = 'general';

        bb.on('field', (fieldname: string, val: string) => {
            if (fieldname === 'folder') folder = val;
        });

        bb.on('file', (fieldname: string, file: any, info: any) => {
            const chunks: any[] = [];
            fileName = info.filename;
            file.on('data', (data: any) => chunks.push(data));
            file.on('end', () => {
                fileBuffer = Buffer.concat(chunks);
            });
        });

        bb.on('finish', async () => {
            if (!fileBuffer) {
                res.status(400).send('No file uploaded');
                return;
            }

            try {
                const fileSize = fileBuffer.length;

                // 3. Quota Check
                const quota = await checkStorageQuota(uid, fileSize);
                if (!quota.isAllowed) {
                    res.status(403).send(`Storage quota exceeded. Used: ${quota.used}, Max: ${quota.max}, New: ${fileSize}`);
                    return;
                }

                // 4. Bunny Upload
                const bunnyApiKey = process.env.BUNNY_API_KEY;
                const storageZoneName = process.env.BUNNY_STORAGE_ZONE_NAME;
                const hostname = process.env.BUNNY_STORAGE_HOSTNAME;
                const pullZoneUrl = process.env.BUNNY_PULL_ZONE_URL;

                if (!bunnyApiKey || !storageZoneName || !hostname || !pullZoneUrl) {
                    res.status(500).send('Bunny Storage configuration missing');
                    return;
                }

                const timestamp = Date.now();
                const storagePath = `${folder}/${uid}/${timestamp}_${fileName}`;
                const uploadUrl = `https://${hostname}/${storageZoneName}/${storagePath}`;

                await axios.put(uploadUrl, fileBuffer, {
                    headers: {
                        'AccessKey': bunnyApiKey,
                        'Content-Type': 'application/octet-stream'
                    }
                });

                // 5. Update Metrics
                await db.collection("users").doc(uid).update({
                    usedStorageBytes: admin.firestore.FieldValue.increment(fileSize)
                });

                const fileUrl = `${pullZoneUrl}/${storagePath}`;
                res.status(200).json({ fileUrl, fileName, size: fileSize });

            } catch (err: any) {
                functions.logger.error("Upload error:", err);
                res.status(500).send(err.message || 'Internal Upload Error');
            }
        });

        // @ts-ignore
        bb.end(req.rawBody);
    }
);


// --- EXAM SUBMISSION LOGIC ---

export const uploadExamScript = onCall(
    {
        secrets: ["BUNNY_API_KEY", "BUNNY_STORAGE_ZONE_NAME", "BUNNY_STORAGE_HOSTNAME", "BUNNY_PULL_ZONE_URL"],
        cors: true
    },
    async (request) => {
        try {
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

            // 5a. Quota Check
            const pdfBuffer = Buffer.from(fileBase64, 'base64');
            const quota = await checkStorageQuota(uid, pdfBuffer.length);
            if (!quota.isAllowed) {
                throw new functions.https.HttpsError("resource-exhausted", "Storage quota exceeded. Please contact support.");
            }

            // 6. PDF Watermarking
            const pdfDoc = await PDFDocument.load(pdfBuffer);
            const pages = pdfDoc.getPages();
            
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const watermarkText = `${uid} | ${timestamp}`;

            for (const page of pages) {
                const { width } = page.getSize();
                page.drawText(watermarkText, {
                    x: width / 2 - 100,
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

            // 8. Update Tutor Storage Metrics
            const zoneDoc = await db.collection('zones').doc(zoneId).get();
            const tutorUid = zoneDoc.data()?.createdBy || zoneDoc.data()?.tutorId;
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
            if (error instanceof functions.https.HttpsError) throw error;
            functions.logger.error("Global crash in uploadExamScript:", error);
            throw new functions.https.HttpsError("internal", error.message || "Failed to upload exam script.");
        }
    }
);

export const recordCheatViolation = onCall(
    { secrets: ["BUNNY_API_KEY"], cors: true }, 
    async (request) => {
        try {
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
            if (error instanceof functions.https.HttpsError) throw error;
            functions.logger.error("Global crash in recordCheatViolation:", error);
            throw new functions.https.HttpsError("internal", error.message || "Failed to record violation due to a server error.");
        }
    }
);

export const submitGradedScript = onCall({ cors: true }, async (request) => {
    try {
        const db = admin.firestore();
        if (!request.auth) throw new functions.https.HttpsError("unauthenticated", "Login required.");
        const { zoneId, examId, studentId, score, feedback, mergedPdf, oldFileUrl } = request.data;

        // Authorization
        const zoneDoc = await db.collection('zones').doc(zoneId).get();
        const tutorUid = zoneDoc.data()?.createdBy || zoneDoc.data()?.tutorId;
        if (request.auth.uid !== tutorUid) {
            throw new functions.https.HttpsError("permission-denied", "Only the zone owner can grade exams.");
        }

        const bunnyApiKey = process.env.BUNNY_API_KEY;
        const storageZone = process.env.BUNNY_STORAGE_ZONE_NAME;
        const pullZone = process.env.BUNNY_PULL_ZONE_URL;

        if (!bunnyApiKey || !storageZone || !pullZone || !mergedPdf || !oldFileUrl) {
            throw new functions.https.HttpsError("internal", "Storage configuration missing or missing payload");
        }

        const base64Data = mergedPdf.replace(/^data:.*\/.*;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const newFileSizeInBytes = buffer.length;

        // Quota Check (Delta)
        let oldFileSizeInBytes = 0;
        try {
            const oldPath = oldFileUrl.replace(`https://${pullZone}/`, '');

            // Get original file size to maintain exact quota diff
            const res = await axios.head(`https://storage.bunnycdn.com/${storageZone}/${oldPath}`, {
                headers: { 'AccessKey': bunnyApiKey }
            });
            oldFileSizeInBytes = parseInt(res.headers['content-length'] || "0");
        } catch (e) {
            console.error("Failed to head old file for quota check", e);
        }

        const quota = await checkStorageQuota(request.auth.uid, newFileSizeInBytes - oldFileSizeInBytes);
        if (!quota.isAllowed) {
            throw new functions.https.HttpsError("resource-exhausted", "Quota exceeded during grading update.");
        }

        const newFileName = `graded_${studentId}_exam.pdf`;
        const storagePath = `exams/${zoneId}/${examId}/${newFileName}`;

        // Upload New
        await axios.put(
            `https://storage.bunnycdn.com/${storageZone}/${storagePath}`,
            buffer,
            { headers: { 'AccessKey': bunnyApiKey, 'Content-Type': 'application/pdf' } }
        );

        // Delete Old
        try {
            const oldPath = oldFileUrl.replace(`https://${pullZone}/`, '');

            // Get original file size to maintain exact quota diff
            const respVal = await axios.head(`https://storage.bunnycdn.com/${storageZone}/${oldPath}`, {
                headers: { 'AccessKey': bunnyApiKey }
            });
            oldFileSizeInBytes = parseInt(respVal.headers['content-length'] || "0");

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
        if (error instanceof functions.https.HttpsError) throw error;
        functions.logger.error("Global crash in submitGradedScript:", error);
        throw new functions.https.HttpsError("internal", error.message || "Failed to submit graded script.");
    }
});

export const submitExam = onCall({ cors: true }, async (request) => {
    try {
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
    } catch (error: any) {
        if (error instanceof functions.https.HttpsError) throw error;
        functions.logger.error("Global crash in submitExam:", error);
        throw new functions.https.HttpsError("internal", error.message || "Failed to submit exam.");
    }
});

export const registerIssuance = onCall({ secrets: ["RESEND_API_KEY"], cors: true }, async (request) => {
    try {
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
        if (zoneData.createdBy !== issuerUid && zoneData.tutorId !== issuerUid) {
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

        // 5. Duplicate Check
        const certQuery = await db.collection("certificates")
            .where("studentId", "==", studentUid)
            .where("zoneId", "==", zoneId)
            .limit(1)
            .get();

        if (!certQuery.empty) {
            throw new functions.https.HttpsError("already-exists", "A certificate has already been issued for this student in this zone.");
        }

        // 6. Generate Verifiable Credential
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

        // 7. Atomic Batch Write
        const batch = db.batch();
        const certRef = db.collection("certificates").doc(urnUuid);
        batch.set(certRef, {
            payload,
            studentId: studentUid,
            zoneId,
            issuedAt: admin.firestore.FieldValue.serverTimestamp(),
            issuedBy: issuerUid
        });

        const studentEnrollmentRef = db.collection("zones").doc(zoneId).collection("students").doc(studentUid);
        batch.update(studentEnrollmentRef, {
            certificateId: urnUuid,
            certificateIssuedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        await batch.commit();

        // 8. Fire-and-forget certificate notification email via Resend
        const resendApiKey = process.env.RESEND_API_KEY;
        if (resendApiKey && studentEmail !== "no-email@nunma.in") {
            const resend = new Resend(resendApiKey);
            const verificationLink = `https://nunma.in/verify/${urnUuid}`;

            resend.emails.send({
                from: 'Nunma <support@nunma.in>',
                to: studentEmail,
                subject: "Your Nunma Certificate is Ready 🎓",
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                        <h1 style="color: #040457;">Congratulations, ${studentName}! 🎉</h1>
                        <p>Your certificate for <strong>${zoneTitle}</strong> has been successfully issued.</p>
                        <div style="background: #f4f4f4; padding: 15px; border-radius: 8px; margin: 20px 0;">
                            <p style="margin: 5px 0; font-size: 12px; color: #666;"><b>Certificate ID:</b></p>
                            <p style="margin: 5px 0; font-size: 14px; color: #040457; word-break: break-all;">${urnUuid}</p>
                        </div>
                        <a href="${verificationLink}" style="display: inline-block; background: #040457; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Verify Certificate</a>
                        <p style="margin-top: 20px; color: #666; font-size: 14px;">You can verify your certificate anytime at:<br/><a href="${verificationLink}" style="color: #040457;">${verificationLink}</a></p>
                        <p style="margin-top: 20px;">Happy learning,<br/><b>Nunma Team</b></p>
                    </div>
                `
            }).catch(err =>
                console.error('[Certificate Email] Failed:', err)
            );
        }

        return { certificateId: urnUuid, payload };
    } catch (error: any) {
        if (error instanceof functions.https.HttpsError) throw error;
        functions.logger.error("Global crash in registerIssuance:", error);
        throw new functions.https.HttpsError("internal", error.message || "Failed to finalize certificate registration.");
    }
});




// --- OTP AUTHENTICATION ---

export const requestOTP = onCall({ secrets: ["RESEND_API_KEY"], cors: true }, async (request) => {
    try {
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

        // Initialize Resend client
        const resendApiKey = process.env.RESEND_API_KEY;
        if (!resendApiKey) {
            throw new functions.https.HttpsError("failed-precondition", "Email service is not configured.");
        }
        const resend = new Resend(resendApiKey);

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
        console.log("RESEND SUCCESS for", email, "| Resend response:", JSON.stringify(sendResult));
        return { success: true };
    } catch (error: any) {
        if (error instanceof functions.https.HttpsError) throw error;
        functions.logger.error("Global crash in requestOTP:", error);
        throw new functions.https.HttpsError("internal", error.message || "Failed to send OTP email.");
    }
});

export const verifyOTPAndSignIn = onCall({ cors: true }, async (request) => {
    try {
        let { email, otp, registrationData, password } = request.data;
        if (!email) {
            throw new functions.https.HttpsError("invalid-argument", "Email is required.");
        }

        email = email.toLowerCase().trim();

        const otpDoc = await admin.firestore().collection("otps").doc(email).get();
        if (!otpDoc.exists) {
            throw new functions.https.HttpsError("not-found", "No OTP found. Please request a new code.");
        }

        const data = otpDoc.data()!;
        const isAlreadyVerified = data.isVerified === true;
        const otpMatch = otp && data.otp === otp;

        if (!isAlreadyVerified) {
            if (!otpMatch) {
                throw new functions.https.HttpsError("permission-denied", "Invalid OTP. Please check the code and try again.");
            }
            if (data.expiresAt.toDate() < new Date()) {
                await otpDoc.ref.delete();
                throw new functions.https.HttpsError("permission-denied", "OTP has expired. Please request a new code.");
            }
        }

        if (isAlreadyVerified && password) {
            const verifiedAt: Date = data.verifiedAt?.toDate ? data.verifiedAt.toDate() : (data.createdAt?.toDate ? data.createdAt.toDate() : new Date());
            const gracePeriodMs = 15 * 60 * 1000;
            if (Date.now() - verifiedAt.getTime() > gracePeriodMs) {
                await otpDoc.ref.delete();
                throw new functions.https.HttpsError("permission-denied", "Verification session expired. Please request a new code.");
            }
        }

        if (!password) {
            await otpDoc.ref.update({
                isVerified: true,
                verifiedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            return { verified: true };
        }

        let user;
        try {
            user = await admin.auth().getUserByEmail(email);
        } catch (error: any) {
            if (error.code === 'auth/user-not-found') {
                if (registrationData && password) {
                    try {
                        user = await admin.auth().createUser({
                            email,
                            password,
                            displayName: registrationData.name
                        });

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
                        throw new functions.https.HttpsError("failed-precondition", creationError.message || "Could not create user account.");
                    }
                } else {
                    throw new functions.https.HttpsError("invalid-argument", "Registration details missing.");
                }
            } else {
                throw new functions.https.HttpsError("internal", error.message);
            }
        }

        await otpDoc.ref.delete();
        
        try {
            const customToken = await admin.auth().createCustomToken(user.uid);
            return { verified: true, customToken };
        } catch (iamError: any) {
            functions.logger.error("IAM Minting Error:", iamError);
            throw new functions.https.HttpsError('internal', 'IAM Configuration Error: Cannot mint token');
        }
    } catch (error: any) {
        if (error instanceof functions.https.HttpsError) throw error;
        functions.logger.error("Global crash in verifyOTPAndSignIn:", error);
        throw new functions.https.HttpsError("internal", error.message || "Verification failed.");
    }
});

// --- ZONE INVITATION SYSTEM ---

export const generateZoneInvite = onCall(
    { cors: true }, 
    async (request) => {
        try {
            const db = admin.firestore();
            if (!request.auth) throw new functions.https.HttpsError("unauthenticated", "Login required.");
            
            const { zoneId } = request.data;
            if (!zoneId) throw new functions.https.HttpsError("invalid-argument", "Missing zoneId.");

            const zoneDoc = await db.collection("zones").doc(zoneId).get();
            if (!zoneDoc.exists) throw new functions.https.HttpsError("not-found", "Zone not found.");

            const zoneData = zoneDoc.data();
            if (zoneData?.createdBy !== request.auth.uid && zoneData?.tutorId !== request.auth.uid) {
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

            functions.logger.log(`[INVITE] Token generated for zone ${zoneId} by user ${request.auth.uid}: ${inviteToken}`);
            return { inviteToken, expiresAt, isActive: true };
        } catch (error: any) {
            if (error instanceof functions.https.HttpsError) throw error;
            functions.logger.error("Global crash in generateZoneInvite:", error);
            throw new functions.https.HttpsError("internal", error.message || "Failed to generate invite.");
        }
    }
);

export const revokeZoneInvite = onCall(
    { cors: true }, 
    async (request) => {
        try {
            const db = admin.firestore();
            if (!request.auth) throw new functions.https.HttpsError("unauthenticated", "Login required.");

            const { zoneId, inviteToken } = request.data;
            if (!zoneId || !inviteToken) throw new functions.https.HttpsError("invalid-argument", "Missing zoneId or inviteToken.");

            const zoneDoc = await db.collection("zones").doc(zoneId).get();
            if (!zoneDoc.exists) throw new functions.https.HttpsError("not-found", "Zone not found.");

            const zoneData = zoneDoc.data();
            if (zoneData?.createdBy !== request.auth.uid && zoneData?.tutorId !== request.auth.uid) {
                throw new functions.https.HttpsError("permission-denied", "Only the zone creator can revoke invites.");
            }

            await db.collection("zones").doc(zoneId).collection("invites").doc(inviteToken).update({
                isActive: false
            });

            return { success: true };
        } catch (error: any) {
            if (error instanceof functions.https.HttpsError) throw error;
            functions.logger.error("Global crash in revokeZoneInvite:", error);
            throw new functions.https.HttpsError("internal", error.message || "Failed to revoke invite.");
        }
    }
);

export const joinZoneByInvite = onCall(
    { cors: true }, 
    async (request) => {
        try {
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

            const userDoc = await db.collection("users").doc(uid).get();
            const userData = userDoc.data() || {};

            const zoneDoc = await db.collection("zones").doc(zoneId).get();
            const zoneData = zoneDoc.data() || {};

            const batch = db.batch();

            batch.set(studentRef, {
                uid: uid,
                name: userData.name || "Student",
                email: userData.email || "",
                avatar: userData.avatar || "",
                status: "active",
                enrolledAt: admin.firestore.FieldValue.serverTimestamp(),
                joinedAt: admin.firestore.FieldValue.serverTimestamp(),
                source: "invite"
            });

            const enrollmentRef = db.collection("users").doc(uid).collection("enrollments").doc(zoneId);
            batch.set(enrollmentRef, {
                zoneId,
                enrolledAt: admin.firestore.FieldValue.serverTimestamp(),
                tutorId: zoneData.tutorId || zoneData.createdBy || "",
                zoneName: zoneData.title || zoneData.name || "Untitled Zone"
            });

            batch.update(db.collection("zones").doc(zoneId), {
                studentCount: admin.firestore.FieldValue.increment(1)
            });

            await batch.commit();

            return { success: true };
        } catch (error: any) {
            if (error instanceof functions.https.HttpsError) throw error;
            functions.logger.error("Global crash in joinZoneByInvite:", error);
            throw new functions.https.HttpsError("internal", error.message || "Failed to join zone.");
        }
    }
);

// --- SECURE WHITELIST ACCESS ---

export const processWhitelist = onCall(
    { secrets: ["RESEND_API_KEY"], cors: true },
    async (request) => {
        try {
            const db = admin.firestore();

            // 1. Authentication check
            if (!request.auth) {
                throw new HttpsError("unauthenticated", "You must be signed in to whitelist students.");
            }

            const { zoneId, email } = request.data;

            // 1. Strict Input Validation
            if (!zoneId || !email) {
                throw new HttpsError("invalid-argument", "Missing zoneId or email");
            }

            if (typeof zoneId !== "string" || typeof email !== "string") {
                throw new HttpsError("invalid-argument", "zoneId and email must be strings.");
            }

            const normalizedEmail = email.trim().toLowerCase();
            if (!normalizedEmail.includes("@")) {
                throw new HttpsError("invalid-argument", "Invalid email format.");
            }

            // 3. Security check: verify caller owns this zone
            const zoneDoc = await db.collection("zones").doc(zoneId).get();
            if (!zoneDoc.exists) {
                throw new HttpsError("not-found", "Zone not found.");
            }

            const zoneData = zoneDoc.data()!;
            const callerUid = request.auth.uid;

            if (zoneData.createdBy !== callerUid && zoneData.tutorId !== callerUid) {
                throw new HttpsError("permission-denied", "Only the zone creator can whitelist students.");
            }

            const zoneTitle = zoneData.title || "Untitled Zone";

            // 4. Initialize Resend for notifications
            const resendApiKey = process.env.RESEND_API_KEY;
            let resend: InstanceType<typeof Resend> | null = null;
            if (resendApiKey) {
                resend = new Resend(resendApiKey);
            } else {
                functions.logger.warn("RESEND_API_KEY not configured — notification emails will be skipped.");
            }

            const results: { enrolled: number; pending: number; alreadyEnrolled: number } = {
                enrolled: 0,
                pending: 0,
                alreadyEnrolled: 0
            };

            // 2. Graceful Auth Check
            let uid = null;
            try {
                const userRecord = await admin.auth().getUserByEmail(normalizedEmail);
                uid = userRecord.uid;
            } catch (authError: any) {
                functions.logger.info(`User ${normalizedEmail} not found, adding to invites.`);
            }

            if (uid) {
                // User exists, enroll them directly
                const studentRef = db.collection("zones").doc(zoneId).collection("students").doc(uid);
                const studentDoc = await studentRef.get();

                if (studentDoc.exists) {
                    results.alreadyEnrolled = 1;
                    return { success: true, ...results };
                }

                // Get user profile to populate name/email
                const userDoc = await db.collection("users").doc(uid).get();
                const userData = userDoc.data() || {};

                // Atomic batch write for enrollment
                const batch = db.batch();
                
                // 1. Enrollment in zone
                batch.set(studentRef, {
                    uid: uid,
                    name: userData.name || "Student",
                    email: userData.email || normalizedEmail,
                    avatar: userData.avatar || "",
                    status: "active",
                    source: "whitelist",
                    enrolledAt: admin.firestore.FieldValue.serverTimestamp(),
                    joinedAt: admin.firestore.FieldValue.serverTimestamp(), // legacy support
                });

                // 2. Enrollment in user document
                const enrollmentRef = db.collection("users").doc(uid).collection("enrollments").doc(zoneId);
                batch.set(enrollmentRef, {
                    zoneId,
                    enrolledAt: admin.firestore.FieldValue.serverTimestamp(),
                    tutorId: zoneData.tutorId || zoneData.createdBy,
                    zoneName: zoneTitle
                });

                // 3. Increment studentCount
                batch.update(db.collection("zones").doc(zoneId), {
                    studentCount: admin.firestore.FieldValue.increment(1)
                });

                await batch.commit();

                results.enrolled = 1;
                return { 
                    success: true, 
                    ...results, 
                    studentUid: uid,
                    zoneName: zoneTitle,
                    tutorName: zoneData.tutorName || "Your Instructor"
                };
            } else {
                // User doesn't exist, proceed to add their email to the invites subcollection
                const invitesRef = db.collection("zones").doc(zoneId).collection("invites").doc(normalizedEmail);
                await invitesRef.set({
                    email: normalizedEmail,
                    addedAt: admin.firestore.FieldValue.serverTimestamp(),
                    addedBy: callerUid,
                    status: "pending"
                });
                
                results.pending = 1;
            }

            // Send notification email (fire-and-forget)
            if (resend) {
                try {
                    await resend.emails.send({
                        from: "Nunma <support@nunma.in>",
                        to: normalizedEmail,
                        subject: "You've been granted access to a new Zone on NUNMA",
                        html: `
                            <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: auto; padding: 40px 20px;">
                                <div style="text-align: center; margin-bottom: 32px;">
                                    <h1 style="color: #040457; font-size: 28px; font-weight: 900; margin: 0;">Welcome to ${zoneTitle} 🎓</h1>
                                </div>
                                <div style="background: #f8f9fa; padding: 24px; border-radius: 16px; border: 1px solid #e5e7eb; margin-bottom: 24px;">
                                    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
                                        You've been granted <strong style="color: #040457;">premium access</strong> to a new Zone on Nunma.
                                    </p>
                                    <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0;">
                                        Your instructor has whitelisted you — no payment required. Jump in and start learning immediately.
                                    </p>
                                </div>
                                <div style="text-align: center; margin: 32px 0;">
                                    <a href="https://www.nunma.in/classroom/${zoneId}" 
                                       style="display: inline-block; background: #c2f575; color: #040457; padding: 16px 40px; border-radius: 999px; text-decoration: none; font-weight: 800; font-size: 14px; letter-spacing: 0.05em; text-transform: uppercase;">
                                        Enter Classroom →
                                    </a>
                                </div>
                                <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 32px;">
                                    Nunma — The Trust Layer for Education
                                </p>
                            </div>
                        `,
                    });
                } catch (emailError: any) {
                    functions.logger.warn(`Failed to send whitelist email to ${normalizedEmail}:`, emailError.message);
                }
            }

            functions.logger.log(`[WHITELIST] Zone ${zoneId} for ${normalizedEmail}: enrolled=${results.enrolled}, pending=${results.pending}`);

            return {
                success: true,
                ...results
            };

        } catch (error: any) {
             functions.logger.error("CRITICAL: processWhitelist execution failed", {
                message: error.message,
                stack: error.stack,
                zoneId: request.data?.zoneId,
                email: request.data?.email
            });

            if (error instanceof HttpsError) throw error;
            throw new HttpsError("internal", error.message || "Failed to process whitelist.");
        }
    }
);

// --- ASYNCHRONOUS INVOICING PIPELINE (V2) ---

export const processInvoicingQueue = onDocumentCreated(
    { 
        document: 'mail_queue/{docId}', 
        retry: true,
        secrets: [
            "ZOHO_ORG_ID", "ZOHO_REFRESH_TOKEN", "ZOHO_CLIENT_ID", "ZOHO_CLIENT_SECRET",
            "SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS"
        ]
    },
    async (event) => {
        const snapshot = event.data;
        if (!snapshot) return;

        const data = snapshot.data();
        const db = admin.firestore();

        if (data.status !== 'pending') return;

        try {
            const { uid, amount, type, paymentId } = data;
            const orgId = process.env.ZOHO_ORG_ID!;
            const refreshToken = process.env.ZOHO_REFRESH_TOKEN!;
            const clientId = process.env.ZOHO_CLIENT_ID!;
            const clientSecret = process.env.ZOHO_CLIENT_SECRET!;

            // 1. Refresh Zoho OAuth Token
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

            const authHeaders = {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            };

            // 2. Fetch User Details for Zoho Customer
            const userDoc = await db.collection("users").doc(uid).get();
            const userData = userDoc.data();
            const userName = userData?.name || "Customer";
            const userEmail = userData?.email;

            if (!userEmail) throw new Error(`Email not found for user ${uid}`);

            // 3. Ensure Customer exists in Zoho
            const searchResponse = await axios.get(
                `https://www.zohoapis.in/books/v3/contacts?organization_id=${orgId}&email=${userEmail}`,
                { headers: authHeaders }
            );

            let contactId = "";
            if (searchResponse.data.contacts && searchResponse.data.contacts.length > 0) {
                contactId = searchResponse.data.contacts[0].contact_id;
            } else {
                const contactResponse = await axios.post(
                    `https://www.zohoapis.in/books/v3/contacts?organization_id=${orgId}`,
                    { contact_name: userName, email: userEmail, contact_type: 'customer' },
                    { headers: authHeaders }
                );
                contactId = contactResponse.data.contact.contact_id;
            }

            // 4. Create Invoice
            const invoicePayload = {
                customer_id: contactId,
                line_items: [{
                    description: type === 'PLATFORM_FEE' ? 'Nunma Platform Fee' : 'Knowledge Stream Enrollment',
                    rate: amount,
                    quantity: 1
                }],
                reason: `Payment Received: ${paymentId}`,
                status: 'sent'
            };

            const invoiceResponse = await axios.post(
                `https://www.zohoapis.in/books/v3/invoices?organization_id=${orgId}`,
                invoicePayload,
                { headers: authHeaders }
            );

            const invoiceId = invoiceResponse.data.invoice.invoice_id;

            // 5. Mark Invoice as Paid
            await axios.post(
                `https://www.zohoapis.in/books/v3/customerpayments?organization_id=${orgId}`,
                {
                    customer_id: contactId,
                    payment_mode: 'online',
                    amount: amount,
                    date: new Date().toISOString().split('T')[0],
                    invoices: [{
                        invoice_id: invoiceId,
                        amount_applied: amount
                    }]
                },
                { headers: authHeaders }
            );

            // 6. Fetch Invoice PDF
            const pdfResponse = await axios.get(
                `https://www.zohoapis.in/books/v3/invoices/${invoiceId}?organization_id=${orgId}&accept=pdf`,
                { 
                    headers: authHeaders,
                    responseType: 'arraybuffer' 
                }
            );

            const pdfBuffer = Buffer.from(pdfResponse.data, 'binary');

            // 7. Dispatch Email via SMTP
            const mailOptions = {
                from: `"Nunma Academy" <${process.env.SMTP_USER}>`,
                to: userEmail,
                subject: `Invoice for ${type === 'PLATFORM_FEE' ? 'Platform Fee' : 'Course Enrollment'}`,
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                        <h1 style="color: #1A1A4E;">Payment Confirmed</h1>
                        <p>Hi ${userName},</p>
                        <p>Your payment has been successfully processed. Please find your invoice attached.</p>
                        <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
                            <p style="margin: 5px 0;"><b>Payment ID:</b> ${paymentId}</p>
                            <p style="margin: 5px 0;"><b>Amount:</b> ₹${amount}</p>
                        </div>
                        <p>Happy learning,<br/><b>Nunma Team</b></p>
                    </div>
                `,
                attachments: [{
                    filename: `Invoice_${paymentId}.pdf`,
                    content: pdfBuffer
                }]
            };

            await getTransporter().sendMail(mailOptions);

            // 8. Update Queue Status
            await snapshot.ref.update({
                status: 'delivered',
                zohoInvoiceId: invoiceId,
                deliveredAt: admin.firestore.FieldValue.serverTimestamp()
            });

            console.log(`Async Pipeline Success: Invoice ${invoiceId} delivered to ${userEmail}`);

        } catch (error: any) {
            console.error("Async Invoicing Failed:", error.response?.data || error.message);
            await snapshot.ref.update({
                status: 'failed',
                error: error.response?.data || error.message,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            throw error;
        }
    }
);
