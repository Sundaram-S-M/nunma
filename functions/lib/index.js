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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.onVideoDocumentDeleted = exports.manageLiveTimer = exports.deleteBunnyVideo = exports.sendEnrollmentEmail = exports.onExamDeploymentCreated = exports.onExamAssigned = exports.onStudentLeftZone = exports.onStudentJoinedZone = exports.onZoneCreated = exports.monitorStuckInvoices = exports.processInvoicingQueue = exports.processWhitelist = exports.joinZoneByInvite = exports.revokeZoneInvite = exports.generateZoneInvite = exports.verifyOTPAndSignIn = exports.requestOTP = exports.registerIssuance = exports.submitExam = exports.submitGradedScript = exports.recordCheatViolation = exports.uploadExamScript = exports.uploadFileToBunny = exports.deleteUserAccount = exports.serveSecurePdf = exports.bunnyWebhook = exports.syncVideoStorage = exports.razorpayWebhook = exports.razorpayRouteWebhook = exports.createRazorpayOrder = exports.createTutorLinkedAccount = exports.getBunnyPlaybackToken = exports.generateBunnyToken = exports.bunnyStreamWebhook = exports.createBunnyUploadSignature = exports.toggleStudentAudio = exports.getLiveKitToken = exports.generateLiveToken = exports.askZoneAnalytics = exports.processMCQUploads = exports.generateQuizDraft = exports.gradePdfSubmission = void 0;
const admin = __importStar(require("firebase-admin"));
admin.initializeApp();
const functions = __importStar(require("firebase-functions"));
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-functions/v2/firestore");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const params_1 = require("firebase-functions/params");
const resendApiKey = (0, params_1.defineSecret)('RESEND_API_KEY');
const crypto = __importStar(require("crypto"));
const nodemailer = __importStar(require("nodemailer"));
const livekit_server_sdk_1 = require("livekit-server-sdk");
const axios_1 = __importDefault(require("axios"));
const pdf_lib_1 = require("pdf-lib");
// import Razorpay from "razorpay";
const uuid_1 = require("uuid");
const resend_1 = require("resend");
const busboy_1 = __importDefault(require("busboy"));
var gradeSubmission_1 = require("./ai/gradeSubmission");
Object.defineProperty(exports, "gradePdfSubmission", { enumerable: true, get: function () { return gradeSubmission_1.gradePdfSubmission; } });
var generateQuizDraft_1 = require("./ai/generateQuizDraft");
Object.defineProperty(exports, "generateQuizDraft", { enumerable: true, get: function () { return generateQuizDraft_1.generateQuizDraft; } });
var processMCQUploads_1 = require("./ai/processMCQUploads");
Object.defineProperty(exports, "processMCQUploads", { enumerable: true, get: function () { return processMCQUploads_1.processMCQUploads; } });
var askZoneAnalytics_1 = require("./ai/askZoneAnalytics");
Object.defineProperty(exports, "askZoneAnalytics", { enumerable: true, get: function () { return askZoneAnalytics_1.askZoneAnalytics; } });
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
exports.generateLiveToken = (0, https_1.onCall)({ secrets: ["LIVEKIT_API_KEY", "LIVEKIT_API_SECRET", "LIVEKIT_URL"], cors: true }, async (request) => {
    var _a, _b, _c;
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
        const userName = (userData === null || userData === void 0 ? void 0 : userData.name) || "Anonymous";
        const userRole = (userData === null || userData === void 0 ? void 0 : userData.role) || "STUDENT";
        // Fetch zone to check if user is the creator
        const zoneDoc = await db.collection("zones").doc(zoneId).get();
        const zoneData = zoneDoc.data();
        const isCreator = (zoneData === null || zoneData === void 0 ? void 0 : zoneData.createdBy) === uid;
        const apiKey = (_a = process.env.LIVEKIT_API_KEY) === null || _a === void 0 ? void 0 : _a.trim();
        const apiSecret = (_b = process.env.LIVEKIT_API_SECRET) === null || _b === void 0 ? void 0 : _b.trim();
        const liveKitUrl = (_c = process.env.LIVEKIT_URL) === null || _c === void 0 ? void 0 : _c.trim();
        if (!apiKey || !apiSecret || !liveKitUrl) {
            throw new functions.https.HttpsError("failed-precondition", "LiveKit secrets not configured.");
        }
        const at = new livekit_server_sdk_1.AccessToken(apiKey, apiSecret, {
            identity: uid,
            name: userName,
        });
        const isTutor = userRole === "TUTOR" || userRole === "THALA" || isCreator;
        // Add matching grants
        at.addGrant({
            roomJoin: true,
            roomCreate: isTutor,
            room: sessionId,
            canPublish: isTutor,
            canSubscribe: true,
            canPublishData: true,
        });
        // --- ATTENDANCE TRACKING ---
        if (!isTutor) {
            try {
                const activeSessions = await db.collection("zones").doc(zoneId).collection("sessions")
                    .where("status", "==", "live").limit(1).get();
                if (!activeSessions.empty) {
                    const activeSessionDoc = activeSessions.docs[0];
                    const attendanceSessionId = activeSessionDoc.data().attendanceSessionId;
                    if (attendanceSessionId) {
                        const studentRef = db.collection("zones").doc(zoneId).collection("students").doc(uid);
                        const studentDoc = await studentRef.get();
                        if (studentDoc.exists) {
                            const studentData = studentDoc.data() || {};
                            let history = studentData.attendanceHistory || [];
                            let updated = false;
                            history = history.map((h) => {
                                if (h.sessionId === attendanceSessionId) {
                                    h.status = 'Present';
                                    updated = true;
                                }
                                return h;
                            });
                            if (!updated) {
                                history.push({
                                    sessionId: attendanceSessionId,
                                    status: 'Present',
                                    date: activeSessionDoc.data().date || new Date().toISOString().split('T')[0],
                                    className: `Live Session`
                                });
                            }
                            await studentRef.update({ attendanceHistory: history });
                        }
                    }
                }
            }
            catch (attError) {
                functions.logger.error(`Failed to update attendance for user ${uid} in zone ${zoneId}`, attError);
            }
        }
        return {
            token: await at.toJwt(),
            serverUrl: liveKitUrl
        };
    }
    catch (error) {
        if (error instanceof functions.https.HttpsError)
            throw error;
        functions.logger.error("Global crash in generateLiveToken:", error);
        throw new functions.https.HttpsError("internal", error.message || "Failed to generate live token.");
    }
});
exports.getLiveKitToken = (0, https_1.onCall)({ secrets: ["LIVEKIT_API_KEY", "LIVEKIT_API_SECRET"], cors: true }, async (request) => {
    var _a, _b, _c;
    try {
        const db = admin.firestore();
        // 1. Authenticate caller
        if (!request.auth) {
            throw new https_1.HttpsError("unauthenticated", "You must be signed in to access live hub sessions.");
        }
        const uid = request.auth.uid;
        const { roomName, identity } = request.data;
        // 2. Validate input strings
        if (typeof roomName !== "string" || !roomName || typeof identity !== "string" || !identity) {
            throw new https_1.HttpsError("invalid-argument", "Missing required parameters: roomName or identity.");
        }
        // 3. Force identity to the authenticated UID for security
        const secureIdentity = uid;
        // 4. Authorization Check
        let isAuthorized = false;
        // Case A: Is an active student in the zone?
        const studentDoc = await db.collection("zones").doc(roomName).collection("students").doc(uid).get();
        if (studentDoc.exists && ((_a = studentDoc.data()) === null || _a === void 0 ? void 0 : _a.status) === "active") {
            isAuthorized = true;
        }
        // Case B: Is the 'Thala' or 'Tutor' (creator) of the zone?
        if (!isAuthorized) {
            const userDoc = await db.collection("users").doc(uid).get();
            const userData = userDoc.data();
            const zoneDoc = await db.collection("zones").doc(roomName).get();
            const zoneData = zoneDoc.data();
            const isCreator = (zoneData === null || zoneData === void 0 ? void 0 : zoneData.createdBy) === uid;
            const isTutorOrThala = (userData === null || userData === void 0 ? void 0 : userData.role) === "THALA" || (userData === null || userData === void 0 ? void 0 : userData.role) === "TUTOR";
            if (isTutorOrThala && isCreator) {
                isAuthorized = true;
            }
        }
        if (!isAuthorized) {
            throw new https_1.HttpsError("permission-denied", "You are not authorized to enter this knowledge stream.");
        }
        // 5. Generate and Return Token
        const apiKey = (_b = process.env.LIVEKIT_API_KEY) === null || _b === void 0 ? void 0 : _b.trim();
        const apiSecret = (_c = process.env.LIVEKIT_API_SECRET) === null || _c === void 0 ? void 0 : _c.trim();
        if (!apiKey || !apiSecret) {
            throw new https_1.HttpsError("failed-precondition", "LiveKit configuration is missing on the server.");
        }
        const at = new livekit_server_sdk_1.AccessToken(apiKey, apiSecret, {
            identity: secureIdentity,
            ttl: 3600 // 1 hour expiry
        });
        at.addGrant({
            roomJoin: true,
            roomCreate: isAuthorized,
            room: roomName
        });
        const token = await at.toJwt();
        return { token };
    }
    catch (error) {
        functions.logger.error("Global crash in getLiveKitToken:", error);
        if (error instanceof functions.https.HttpsError)
            throw error;
        throw new functions.https.HttpsError("unknown", "CRASH: " + (error.message || error.toString()));
    }
});
exports.toggleStudentAudio = (0, https_1.onCall)({ secrets: ["LIVEKIT_API_KEY", "LIVEKIT_API_SECRET", "LIVEKIT_URL"], cors: true }, async (request) => {
    var _a, _b, _c, _d;
    try {
        const db = admin.firestore();
        if (!request.auth) {
            throw new functions.https.HttpsError("unauthenticated", "Login required.");
        }
        const { zoneId, sessionId, studentIdentity, allowAudio, allowVideo } = request.data;
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
        const apiKey = (_b = process.env.LIVEKIT_API_KEY) === null || _b === void 0 ? void 0 : _b.trim();
        const apiSecret = (_c = process.env.LIVEKIT_API_SECRET) === null || _c === void 0 ? void 0 : _c.trim();
        const liveKitUrl = (_d = process.env.LIVEKIT_URL) === null || _d === void 0 ? void 0 : _d.trim();
        if (!apiKey || !apiSecret || !liveKitUrl) {
            throw new functions.https.HttpsError("failed-precondition", "LiveKit secrets not configured.");
        }
        const roomService = new livekit_server_sdk_1.RoomServiceClient(liveKitUrl, apiKey, apiSecret);
        const publishSources = [];
        if (allowAudio)
            publishSources.push(livekit_server_sdk_1.TrackSource.MICROPHONE);
        if (allowVideo)
            publishSources.push(livekit_server_sdk_1.TrackSource.CAMERA);
        // Update participant permissions
        await roomService.updateParticipant(sessionId, studentIdentity, undefined, {
            canPublish: allowAudio || allowVideo,
            canPublishSources: publishSources,
            canSubscribe: true,
        });
        return { success: true, message: `Student track permissions updated.` };
    }
    catch (error) {
        if (error instanceof functions.https.HttpsError)
            throw error;
        functions.logger.error("Global crash in toggleStudentAudio:", error);
        throw new functions.https.HttpsError("internal", error.message || "Failed to toggle student audio.");
    }
});
// --- BUNNY STREAM INTEGRATION ---
exports.createBunnyUploadSignature = (0, https_1.onCall)({ secrets: ["BUNNY_API_KEY", "BUNNY_LIBRARY_ID"], cors: true }, async (request) => {
    var _a, _b, _c, _d;
    try {
        const db = admin.firestore();
        if (!request.auth)
            throw new functions.https.HttpsError("unauthenticated", "Login required.");
        // Step 1: Role Check (Only THALA allowed)
        let role = request.auth.token.role;
        if (!role) {
            const userDoc = await db.collection("users").doc(request.auth.uid).get();
            role = (_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.role;
        }
        if (role !== "THALA") {
            throw new functions.https.HttpsError("permission-denied", "Thala access required.");
        }
        const { fileName, title, zoneId, videoId: existingVideoId } = request.data;
        const finalTitle = fileName || title || 'Untitled';
        // Note: zoneId is optional for some flows, but required if indexing in firestore
        // if (!zoneId) throw new functions.https.HttpsError("invalid-argument", "Missing zoneId for Firestore indexing.");
        const libraryId = process.env.BUNNY_LIBRARY_ID ? process.env.BUNNY_LIBRARY_ID.trim() : null;
        const bunnyKey = process.env.BUNNY_API_KEY ? process.env.BUNNY_API_KEY.trim() : null;
        if (!libraryId || !bunnyKey) {
            throw new functions.https.HttpsError('internal', 'BUNNY_API_KEY or BUNNY_LIBRARY_ID is missing or undefined on the server.');
        }
        // Step 2: Bunny Init (Get GUID or use existing)
        let videoId = existingVideoId;
        if (!videoId) {
            try {
                const response = await axios_1.default.post(`https://video.bunnycdn.com/library/${libraryId}/videos`, { title: finalTitle }, { headers: { 'AccessKey': bunnyKey, 'Content-Type': 'application/json' } });
                videoId = response.data.guid;
            }
            catch (apiError) {
                functions.logger.error("Bunny API Error:", ((_b = apiError.response) === null || _b === void 0 ? void 0 : _b.data) || apiError.message);
                throw new functions.https.HttpsError("internal", `Bunny API Error: ${((_d = (_c = apiError.response) === null || _c === void 0 ? void 0 : _c.data) === null || _d === void 0 ? void 0 : _d.Message) || apiError.message}`);
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
    }
    catch (error) {
        if (error instanceof functions.https.HttpsError)
            throw error;
        functions.logger.error("Global crash in createBunnyUploadSignature:", error);
        throw new functions.https.HttpsError("internal", error.message || "Failed to initiate video upload.");
    }
});
exports.bunnyStreamWebhook = (0, https_1.onRequest)({ secrets: ["BUNNY_WEBHOOK_SECRET"] }, async (req, res) => {
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
            const videosSnapshot = await db.collectionGroup("videos").where("bunnyVideoId", "==", videoGuid).get();
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
    }
    catch (error) {
        if (error instanceof functions.https.HttpsError)
            throw error;
        functions.logger.error("Global crash in generateBunnyToken:", error);
        throw new functions.https.HttpsError("internal", error.message || "Failed to generate bunny token.");
    }
});
exports.getBunnyPlaybackToken = (0, https_1.onCall)({ secrets: ["BUNNY_TOKEN_KEY", "BUNNY_PULL_ZONE_URL"], cors: true }, async (request) => {
    var _a;
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
        const zoneData = zoneDoc.data();
        // 3. Authorization Check
        let isAuthorized = zoneData.createdBy === uid || zoneData.tutorId === uid;
        if (!isAuthorized) {
            const studentDoc = await db.collection("zones").doc(zoneId).collection("students").doc(uid).get();
            if (studentDoc.exists && ((_a = studentDoc.data()) === null || _a === void 0 ? void 0 : _a.status) === "active") {
                isAuthorized = true;
            }
        }
        if (!isAuthorized) {
            throw new functions.https.HttpsError("permission-denied", "Unauthorized access to this content.");
        }
        // 4. Validate videoId in segments array
        const segments = zoneData.segments || [];
        const videoExists = segments.some((s) => s.videoId === videoId);
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
    }
    catch (error) {
        if (error instanceof functions.https.HttpsError)
            throw error;
        functions.logger.error("Global crash in getBunnyPlaybackToken:", error);
        throw new functions.https.HttpsError("internal", error.message || "Failed to get playback token.");
    }
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
    var _a, _b;
    try {
        const db = admin.firestore();
        if (!request.auth) {
            throw new functions.https.HttpsError("unauthenticated", "You must be signed in to create a linked account.");
        }
        const uid = request.auth.uid;
        const { businessName, businessType, legalName, email, phone, pan, bankAccount, ifsc, street, street2, city, state, pinCode } = request.data || {};
        if (!businessName || !businessType || !legalName || !email || !phone || !pan || !bankAccount || !ifsc || !street || !city || !state || !pinCode) {
            throw new functions.https.HttpsError("invalid-argument", "Missing required business details including address.");
        }
        const keyId = (_a = process.env.RAZORPAY_KEY_ID) === null || _a === void 0 ? void 0 : _a.trim();
        const keySecret = (_b = process.env.RAZORPAY_KEY_SECRET) === null || _b === void 0 ? void 0 : _b.trim();
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
        const userData = userDoc.data();
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
                profile: {
                    category: "education",
                    subcategory: "professional_courses",
                    addresses: {
                        registered: {
                            street1: street,
                            street2: street2 || "",
                            city: city,
                            state: state,
                            postal_code: pinCode,
                            country: "IN"
                        }
                    }
                }
            };
            const accountResponse = await axios_1.default.post('https://api.razorpay.com/v2/accounts', createPayload, { headers });
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
            await axios_1.default.post(`https://api.razorpay.com/v2/accounts/${accountId}/stakeholders`, stakeholderPayload, { headers });
            // 5. Add Product Configuration for Route (Bank Details)
            try {
                // Step 5a: Request product configuration (POST)
                const productPayload = {
                    product_name: "route",
                    tnc_accepted: true
                };
                const productResponse = await axios_1.default.post(`https://api.razorpay.com/v2/accounts/${accountId}/products`, productPayload, { headers });
                const productId = productResponse.data.id;
                functions.logger.info(`Razorpay Route Product Requested for ${accountId}, Product ID: ${productId}`);
                // Step 5b: Update bank details (PATCH)
                const updatePayload = {
                    settlements: {
                        account_number: bankAccount,
                        ifsc_code: ifsc,
                        beneficiary_name: legalName
                    },
                    tnc_accepted: true
                };
                await axios_1.default.patch(`https://api.razorpay.com/v2/accounts/${accountId}/products/${productId}`, updatePayload, { headers });
                functions.logger.info(`Razorpay Route Product Bank Details Updated for ${accountId}`);
            }
            catch (productError) {
                const msg = extractRazorpayError(productError);
                functions.logger.error("Razorpay Product Configuration failed:", msg);
                // Continue anyway, we can manually configure or retry if it fails
            }
            await userRef.update({
                kycStatus: 'PENDING',
                kycSubmittedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            return { accountId, status: 'PENDING' };
        }
        catch (stakeholderError) {
            const msg = extractRazorpayError(stakeholderError);
            functions.logger.error("Razorpay Stakeholder creation failed:", msg);
            await userRef.update({ kycStatus: 'STAKEHOLDER_FAILED' });
            return { accountId, status: 'STAKEHOLDER_FAILED' };
        }
    }
    catch (error) {
        if (error instanceof functions.https.HttpsError)
            throw error;
        const msg = extractRazorpayError(error);
        functions.logger.error("Global crash in createTutorLinkedAccount:", msg);
        throw new functions.https.HttpsError("internal", `Razorpay Account Creation Failed: ${msg}`);
    }
});
exports.createRazorpayOrder = (0, https_1.onCall)({ secrets: ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET"], cors: true }, async (request) => {
    var _a, _b;
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
        const keyId = (_a = process.env.RAZORPAY_KEY_ID) === null || _a === void 0 ? void 0 : _a.trim();
        const keySecret = (_b = process.env.RAZORPAY_KEY_SECRET) === null || _b === void 0 ? void 0 : _b.trim();
        if (!keyId || !keySecret) {
            throw new functions.https.HttpsError("failed-precondition", "Razorpay secrets not configured.");
        }
        let finalAmount;
        let rzpAccountId;
        let tutorShare;
        let tutorUid;
        let commission;
        if (zoneId) {
            // -- Case A: Student buying a Zone Course --
            const zoneDoc = await db.collection("zones").doc(zoneId).get();
            if (!zoneDoc.exists) {
                throw new functions.https.HttpsError("not-found", "Zone not found.");
            }
            const zoneData = zoneDoc.data();
            // Server-side source of truth for price (prioritize priceINR)
            const price = zoneData.priceINR || zoneData.price || 0;
            finalAmount = Math.round(price * 100); // Convert to paise
            tutorUid = zoneData.createdBy || zoneData.tutorId;
            if (!tutorUid) {
                throw new functions.https.HttpsError("failed-precondition", "Zone creator (tutorUid) is missing.");
            }
            const tutorDoc = await db.collection("users").doc(tutorUid).get();
            if (!tutorDoc.exists) {
                throw new functions.https.HttpsError("not-found", "Tutor profile not found.");
            }
            const tutorData = tutorDoc.data();
            rzpAccountId = tutorData.razorpayAccountId || tutorData.razorpay_account_id;
            const kycStatus = tutorData.kycStatus;
            const isDevBypass = tutorData.isDevBypass === true || tutorData.isWhitelisted === true;
            if (!isDevBypass && (!rzpAccountId || kycStatus !== 'VERIFIED')) {
                throw new functions.https.HttpsError("failed-precondition", "Tutor is not eligible for payments (KYC or Account ID missing).");
            }
            // Commission Logic for Zone sales
            let commissionPct = 15; // Default/FREE
            const plan = tutorData.subscriptionPlan;
            if (plan === 'STANDARD')
                commissionPct = 5;
            else if (plan === 'PREMIUM')
                commissionPct = 2;
            commission = Math.round(finalAmount * (commissionPct / 100));
            tutorShare = finalAmount - commission;
        }
        else {
            // -- Case B: Tutor upgrading Platform Plan --
            const allowedPlans = {
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
        const orderPayload = {
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
        const response = await axios_1.default.post('https://api.razorpay.com/v1/orders', orderPayload, { headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' } });
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
        }
        else {
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
    }
    catch (error) {
        if (error instanceof functions.https.HttpsError)
            throw error;
        const msg = extractRazorpayError(error);
        functions.logger.error("Global crash in createRazorpayOrder:", msg);
        throw new functions.https.HttpsError("internal", `Order creation failed: ${msg}`);
    }
});
/**
 * DEPRECATED: Consolidated into the unified razorpayWebhook below.
 * Keeping a stub for transitional safety if needed, but redirects to 404/200.
 */
exports.razorpayRouteWebhook = (0, https_1.onRequest)(async (req, res) => {
    functions.logger.warn("Deprecated razorpayRouteWebhook called. Please update your Razorpay dashboard to use /razorpayWebhook.");
    res.status(200).send('Deprecated: Please use /razorpayWebhook instead.');
});
/**
 * SECURE RAZORPAY WEBHOOK
 * Implements strict signature validation, two-step idempotency, and atomic fulfillment.
 */
exports.razorpayWebhook = (0, https_1.onRequest)({ secrets: ["RAZORPAY_WEBHOOK_SECRET"], cors: true }, // Removed SMTP_PASS as it's not used here anymore
async (req, res) => {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const db = admin.firestore();
    const signature = req.headers['x-razorpay-signature'];
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
        const eventId = req.headers['x-razorpay-event-id'] || payload.id;
        // Handle account activation events for KYC
        if (event === 'account.activated' || event === 'account.instantly_activated') {
            const accountId = (_c = (_b = (_a = payload.payload) === null || _a === void 0 ? void 0 : _a.account) === null || _b === void 0 ? void 0 : _b.entity) === null || _c === void 0 ? void 0 : _c.id;
            if (!accountId) {
                functions.logger.warn("No account_id found in Razorpay account activation payload.", payload);
                res.status(200).send({ status: 'ignored', reason: 'no_account_id' });
                return;
            }
            if (eventId) {
                const eventRef = db.collection('processed_webhook_events').doc(eventId);
                const eventDoc = await eventRef.get();
                if (eventDoc.exists) {
                    functions.logger.info(`Idempotency check: Account event ${eventId} already processed.`);
                    res.status(200).send({ status: 'ignored', reason: 'already_processed' });
                    return;
                }
                await eventRef.set({ processedAt: admin.firestore.FieldValue.serverTimestamp(), type: event, accountId });
            }
            functions.logger.info(`Processing account activation for Razorpay Account: ${accountId}`);
            // Find user by razorpayAccountId
            const usersSnapshot = await db.collection('users')
                .where('razorpayAccountId', '==', accountId)
                .limit(1)
                .get();
            // Fallback to legacy field name just in case
            const usersSnapshotLegacy = usersSnapshot.empty ?
                await db.collection('users')
                    .where('razorpay_account_id', '==', accountId)
                    .limit(1)
                    .get() : usersSnapshot;
            if (usersSnapshotLegacy.empty) {
                functions.logger.error(`Critical Error: User with Razorpay Account ${accountId} not found.`);
                res.status(200).send({ status: 'error', message: 'user_not_found' });
                return;
            }
            const userDoc = usersSnapshotLegacy.docs[0];
            // Check if already verified as an additional idempotency measure
            if (userDoc.data().kycStatus !== 'VERIFIED') {
                await userDoc.ref.update({ kycStatus: 'VERIFIED' });
                functions.logger.info(`Successfully updated kycStatus to VERIFIED for user ${userDoc.id}`);
            }
            else {
                functions.logger.info(`User ${userDoc.id} is already VERIFIED. No update needed.`);
            }
            res.status(200).send({ status: 'ok' });
            return;
        }
        // Only handle payment.captured for core fulfillment
        if (event !== 'payment.captured' && event !== 'order.paid') {
            functions.logger.info(`Ignoring Razorpay event type: ${event}`);
            res.status(200).send({ status: 'ignored', event });
            return;
        }
        const payment = (_e = (_d = payload.payload) === null || _d === void 0 ? void 0 : _d.payment) === null || _e === void 0 ? void 0 : _e.entity;
        const razorpayOrderId = (payment === null || payment === void 0 ? void 0 : payment.order_id) || ((_h = (_g = (_f = payload.payload) === null || _f === void 0 ? void 0 : _f.order) === null || _g === void 0 ? void 0 : _g.entity) === null || _h === void 0 ? void 0 : _h.id);
        const paymentId = payment === null || payment === void 0 ? void 0 : payment.id;
        if (!razorpayOrderId) {
            functions.logger.warn("No order_id found in Razorpay payload.", payload);
            res.status(200).send({ status: 'ignored', reason: 'no_order_id' });
            return;
        }
        // Step 2: Identify and Fetch Order (Zone vs Platform)
        functions.logger.info(`Processing fulfillment for Razorpay Order: ${razorpayOrderId}`);
        let orderDoc;
        let isPlatformOrder = false;
        // Strategy: Check Zone Orders (Subcollections) first
        const zoneOrderSnapshot = await db.collectionGroup('orders')
            .where('orderId', '==', razorpayOrderId)
            .limit(1)
            .get();
        if (!zoneOrderSnapshot.empty) {
            orderDoc = zoneOrderSnapshot.docs[0];
        }
        else {
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
        const orderData = orderDoc.data();
        // Step 3: Atomic Fulfillment Transaction
        await db.runTransaction(async (transaction) => {
            var _a, _b;
            const freshDoc = await transaction.get(orderRef);
            if (!freshDoc.exists)
                throw new Error("Order document vanished.");
            if (((_a = freshDoc.data()) === null || _a === void 0 ? void 0 : _a.status) === 'paid' || ((_b = freshDoc.data()) === null || _b === void 0 ? void 0 : _b.status) === 'CAPTURED') {
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
            }
            else {
                // C. Zone Enrollment Logic
                const zoneRef = orderRef.parent.parent;
                if (!zoneRef)
                    throw new Error("Invalid order hierarchy.");
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
        const amountInInr = ((payment === null || payment === void 0 ? void 0 : payment.amount) || orderData.amount || 0) / 100;
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
            }).catch(err => console.error('[Zoho Invoice] Non-blocking mail_queue write failed:', err));
        }
        else {
            // 1. Invoice for Student Enrollment
            db.collection('mail_queue').add({
                uid: orderData.studentUid,
                amount: amountInInr,
                gst: gstAmount,
                type: 'ZONE_ENROLLMENT',
                paymentId,
                status: 'pending',
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            }).catch(err => console.error('[Zoho Invoice] Non-blocking mail_queue write failed:', err));
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
                }).catch(err => console.error('[Zoho Invoice] Non-blocking mail_queue write failed:', err));
            }
        }
    }
    catch (error) {
        functions.logger.error("CRITICAL: Webhook processing failed.", error);
        res.status(500).send(`Internal Error: ${error.message}`);
    }
});
/**
 * Callable function to sync video storage from Bunny CDN to Firestore.
 * Calculates per-user storage by cross-referencing the user's Firestore
 * zone/chapter segments with actual video sizes from the Bunny Stream API.
 */
exports.syncVideoStorage = (0, https_1.onCall)({ secrets: ["BUNNY_API_KEY", "BUNNY_LIBRARY_ID"], cors: true }, async (request) => {
    var _a, _b;
    if (!request.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be signed in.");
    }
    const uid = request.auth.uid;
    const db = admin.firestore();
    try {
        const apiKey = (_a = process.env.BUNNY_API_KEY) === null || _a === void 0 ? void 0 : _a.trim();
        const libraryId = (_b = process.env.BUNNY_LIBRARY_ID) === null || _b === void 0 ? void 0 : _b.trim();
        if (!apiKey || !libraryId) {
            throw new functions.https.HttpsError("internal", "Bunny API config missing.");
        }
        // Step 1: Find all zones belonging to this user
        const zonesSnap = await db.collection("zones")
            .where("tutorId", "==", uid)
            .get();
        // Also check createdBy field in case zones use that
        const zonesByCreator = await db.collection("zones")
            .where("createdBy", "==", uid)
            .get();
        // Collect all unique zone IDs
        const zoneIds = new Set();
        zonesSnap.docs.forEach(d => zoneIds.add(d.id));
        zonesByCreator.docs.forEach(d => zoneIds.add(d.id));
        functions.logger.info(`Found ${zoneIds.size} zones for user ${uid}`);
        // Step 2: Collect all video IDs from chapters in those zones
        const videoIds = new Set();
        for (const zoneId of zoneIds) {
            const chaptersSnap = await db.collection("zones").doc(zoneId).collection("chapters").get();
            for (const chapterDoc of chaptersSnap.docs) {
                const segments = chapterDoc.data().segments || [];
                for (const seg of segments) {
                    if (seg.type === "video" && seg.videoId) {
                        videoIds.add(seg.videoId);
                    }
                }
            }
        }
        functions.logger.info(`Found ${videoIds.size} videos for user ${uid}`);
        // Step 3: Fetch each video's storage size from Bunny Stream API
        let totalVideoBytes = 0;
        const fetchPromises = Array.from(videoIds).map(async (videoId) => {
            try {
                const resp = await axios_1.default.get(`https://video.bunnycdn.com/library/${libraryId}/videos/${videoId}`, { headers: { AccessKey: apiKey } });
                // Bunny returns storageSize in bytes (includes all transcoded versions)
                // We take the original size if available, otherwise storageSize
                const originalSize = resp.data.originalSize || resp.data.storageSize || 0;
                functions.logger.info(`Video ${videoId}: ${originalSize} bytes`);
                return originalSize;
            }
            catch (err) {
                functions.logger.warn(`Could not fetch size for video ${videoId}: ${err.message}`);
                return 0;
            }
        });
        const sizes = await Promise.all(fetchPromises);
        totalVideoBytes = sizes.reduce((sum, s) => sum + s, 0);
        functions.logger.info(`Total video storage for user ${uid}: ${totalVideoBytes} bytes`);
        // Step 4: Write the accurate per-user total to Firestore
        await db.collection("users").doc(uid).update({
            usedStorageBytes: totalVideoBytes,
            "subscription_entitlements.storageUsed": totalVideoBytes,
            storageSyncedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        return { usedStorageBytes: totalVideoBytes, videoCount: videoIds.size };
    }
    catch (error) {
        functions.logger.error("syncVideoStorage error:", error);
        throw new functions.https.HttpsError("internal", error.message || "Failed to sync storage.");
    }
});
exports.bunnyWebhook = (0, https_1.onRequest)({ secrets: ["BUNNY_WEBHOOK_SECRET"] }, async (req, res) => {
    const db = admin.firestore();
    const signature = req.headers['bunny-signature'];
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
        // 1. Fetch all chapters using collectionGroup to find the one containing the videoId in segments array
        const chaptersSnapshot = await db.collectionGroup('chapters').get();
        let matchingChapterDoc = null;
        let segments = [];
        for (const doc of chaptersSnapshot.docs) {
            const data = doc.data();
            if (data.segments && Array.isArray(data.segments)) {
                const found = data.segments.some((s) => s.videoId === videoId);
                if (found) {
                    matchingChapterDoc = doc;
                    segments = data.segments;
                    break;
                }
            }
        }
        if (!matchingChapterDoc) {
            console.warn(`No chapter found for videoId: ${videoId}`);
            res.status(200).send('Chapter match not found');
            return;
        }
        // 2. Update the matching segment in the array
        const updatedSegments = segments.map((s) => {
            if (s.videoId === videoId) {
                if (eventType === 'video.encoding.success') {
                    return Object.assign(Object.assign({}, s), { status: 'READY', transcodedAt: new Date().toISOString() });
                }
                else if (eventType === 'video.encoding.failed') {
                    return Object.assign(Object.assign({}, s), { status: 'FAILED' });
                }
            }
            return s;
        });
        // 3. Write back to Firestore
        await matchingChapterDoc.ref.update({
            segments: updatedSegments,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`Successfully updated segment status for videoId: ${videoId} in chapter: ${matchingChapterDoc.id}`);
        res.status(200).send('OK');
    }
    catch (error) {
        console.error("Bunny webhook processing error:", error);
        res.status(500).send('Internal Server Error');
    }
});
// --- PDF WATERMARKING ---
exports.serveSecurePdf = (0, https_1.onRequest)({ cors: true }, async (req, res) => {
    const db = admin.firestore();
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
exports.deleteUserAccount = (0, https_1.onCall)({ secrets: ["BUNNY_API_KEY", "BUNNY_LIBRARY_ID"], cors: true }, async (request) => {
    var _a, _b;
    try {
        const db = admin.firestore();
        if (!request.auth) {
            throw new functions.https.HttpsError("unauthenticated", "Login required for account deletion.");
        }
        const uid = request.auth.uid;
        const libraryId = (_a = process.env.BUNNY_LIBRARY_ID) === null || _a === void 0 ? void 0 : _a.trim();
        const apiKey = (_b = process.env.BUNNY_API_KEY) === null || _b === void 0 ? void 0 : _b.trim();
        console.log(`Starting permanent deletion for user: ${uid}`);
        // 1. Cleanup Bunny.net Videos
        const tutorVideosSnapshot = await db.collectionGroup("videos").where("tutorId", "==", uid).get();
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
        const taxDetailsSnapshot = await db.collection("users").doc(uid).collection("taxDetails").get();
        const taxDeletePromises = taxDetailsSnapshot.docs.map(doc => doc.ref.delete());
        await Promise.all(taxDeletePromises);
        await db.collection("users").doc(uid).delete();
        // 4. Delete from Firebase Auth
        await admin.auth().deleteUser(uid);
        console.log(`Successfully deleted user ${uid} and all associated data.`);
        return { success: true };
    }
    catch (error) {
        if (error instanceof functions.https.HttpsError)
            throw error;
        functions.logger.error("Global crash in deleteUserAccount:", error);
        throw new functions.https.HttpsError("internal", error.message || "Deletion failed.");
    }
});
// --- STORAGE QUOTA HELPERS ---
const DEFAULT_TUTOR_QUOTA = 1024 * 1024 * 1024; // 1GB
const DEFAULT_STUDENT_QUOTA = 100 * 1024 * 1024; // 100MB
/**
 * Checks if the user has enough storage quota for an incoming file.
 */
async function checkStorageQuota(uid, incomingSize) {
    const db = admin.firestore();
    const userDoc = await db.collection("users").doc(uid).get();
    if (!userDoc.exists)
        return { isAllowed: false, used: 0, max: 0 };
    const data = userDoc.data();
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
exports.uploadFileToBunny = (0, https_1.onRequest)({ secrets: ["BUNNY_STORAGE_PASSWORD", "BUNNY_STORAGE_ZONE_NAME", "BUNNY_STORAGE_HOSTNAME", "BUNNY_PULL_ZONE_URL"], cors: true }, async (req, res) => {
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
    let uid;
    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        uid = decodedToken.uid;
    }
    catch (error) {
        res.status(401).send('Unauthorized: Invalid token');
        return;
    }
    // 2. Parse Multipart Body using Busboy
    const bb = (0, busboy_1.default)({ headers: req.headers });
    let fileBuffer = null;
    let fileName = '';
    let folder = 'general';
    bb.on('field', (fieldname, val) => {
        if (fieldname === 'folder')
            folder = val;
    });
    bb.on('file', (fieldname, file, info) => {
        const chunks = [];
        fileName = info.filename;
        file.on('data', (data) => chunks.push(data));
        file.on('end', () => {
            fileBuffer = Buffer.concat(chunks);
        });
    });
    bb.on('finish', async () => {
        var _a, _b, _c, _d;
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
            const bunnyStoragePassword = (_a = process.env.BUNNY_STORAGE_PASSWORD) === null || _a === void 0 ? void 0 : _a.trim();
            const storageZoneName = (_b = process.env.BUNNY_STORAGE_ZONE_NAME) === null || _b === void 0 ? void 0 : _b.trim();
            const hostname = (_c = process.env.BUNNY_STORAGE_HOSTNAME) === null || _c === void 0 ? void 0 : _c.trim();
            const pullZoneUrl = (_d = process.env.BUNNY_PULL_ZONE_URL) === null || _d === void 0 ? void 0 : _d.trim();
            if (!bunnyStoragePassword || !storageZoneName || !hostname || !pullZoneUrl) {
                res.status(500).send('Bunny Storage configuration missing');
                return;
            }
            const timestamp = Date.now();
            const storagePath = `${folder}/${uid}/${timestamp}_${fileName}`;
            const uploadUrl = `https://${hostname}/${storageZoneName}/${storagePath}`;
            await axios_1.default.put(uploadUrl, fileBuffer, {
                headers: {
                    'AccessKey': bunnyStoragePassword,
                    'Content-Type': 'application/octet-stream'
                }
            });
            // 5. Update Metrics
            await db.collection("users").doc(uid).update({
                usedStorageBytes: admin.firestore.FieldValue.increment(fileSize)
            });
            const fileUrl = `${pullZoneUrl}/${storagePath}`;
            res.status(200).json({ fileUrl, fileName, size: fileSize });
        }
        catch (err) {
            functions.logger.error("Upload error:", err);
            res.status(500).send(err.message || 'Internal Upload Error');
        }
    });
    // @ts-ignore
    bb.end(req.rawBody);
});
// --- EXAM SUBMISSION LOGIC ---
exports.uploadExamScript = (0, https_1.onCall)({
    secrets: ["BUNNY_STORAGE_PASSWORD", "BUNNY_STORAGE_ZONE_NAME", "BUNNY_STORAGE_HOSTNAME", "BUNNY_PULL_ZONE_URL"],
    cors: true
}, async (request) => {
    var _a, _b, _c, _d, _e, _f, _g;
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
        if (!studentDoc.exists || ((_a = studentDoc.data()) === null || _a === void 0 ? void 0 : _a.status) !== "active") {
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
        const pdfDoc = await pdf_lib_1.PDFDocument.load(pdfBuffer);
        const pages = pdfDoc.getPages();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const watermarkText = `${uid} | ${timestamp}`;
        for (const page of pages) {
            const { width } = page.getSize();
            page.drawText(watermarkText, {
                x: width / 2 - 100,
                y: 20,
                size: 10,
                color: (0, pdf_lib_1.rgb)(1, 0, 0),
                opacity: 0.3
            });
        }
        const watermarkedPdfBytes = await pdfDoc.save();
        const watermarkedBuffer = Buffer.from(watermarkedPdfBytes);
        const fileSizeInBytes = watermarkedBuffer.length;
        // 7. Bunny Storage Upload
        const bunnyStoragePassword = (_b = process.env.BUNNY_STORAGE_PASSWORD) === null || _b === void 0 ? void 0 : _b.trim();
        const storageZoneName = (_c = process.env.BUNNY_STORAGE_ZONE_NAME) === null || _c === void 0 ? void 0 : _c.trim();
        const hostname = (_d = process.env.BUNNY_STORAGE_HOSTNAME) === null || _d === void 0 ? void 0 : _d.trim();
        const pullZoneUrl = (_e = process.env.BUNNY_PULL_ZONE_URL) === null || _e === void 0 ? void 0 : _e.trim();
        if (!bunnyStoragePassword || !storageZoneName || !hostname || !pullZoneUrl) {
            throw new functions.https.HttpsError("failed-precondition", "Bunny Storage configuration is missing on the server.");
        }
        const storagePath = `exams/${zoneId}/${examId}/${uid}_${timestamp}.pdf`;
        const uploadUrl = `https://${hostname}/${storageZoneName}/${storagePath}`;
        await axios_1.default.put(uploadUrl, watermarkedBuffer, {
            headers: {
                'AccessKey': bunnyStoragePassword,
                'Content-Type': 'application/pdf'
            }
        });
        // 8. Update Tutor Storage Metrics
        const zoneDoc = await db.collection('zones').doc(zoneId).get();
        const tutorUid = ((_f = zoneDoc.data()) === null || _f === void 0 ? void 0 : _f.createdBy) || ((_g = zoneDoc.data()) === null || _g === void 0 ? void 0 : _g.tutorId);
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
    }
    catch (error) {
        if (error instanceof functions.https.HttpsError)
            throw error;
        functions.logger.error("Global crash in uploadExamScript:", error);
        throw new functions.https.HttpsError("internal", error.message || "Failed to upload exam script.");
    }
});
exports.recordCheatViolation = (0, https_1.onCall)({ secrets: ["BUNNY_API_KEY"], cors: true }, async (request) => {
    var _a;
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
        if (!studentDoc.exists || ((_a = studentDoc.data()) === null || _a === void 0 ? void 0 : _a.status) !== "active") {
            throw new functions.https.HttpsError("permission-denied", "You are not an active student in this zone.");
        }
        // 4. Validate Exam Existence and Time
        const examRef = db.collection("zones").doc(zoneId).collection("exams").doc(examId);
        const examDoc = await examRef.get();
        if (!examDoc.exists) {
            throw new functions.https.HttpsError("not-found", "The specified exam does not exist.");
        }
        const examData = examDoc.data();
        const now = admin.firestore.Timestamp.now();
        if (examData.endTime && examData.endTime.toMillis() <= now.toMillis()) {
            throw new functions.https.HttpsError("failed-precondition", "This exam has already ended.");
        }
        // 5. Transaction: Fetch/Create submission and record violation
        const submissionRef = examRef.collection("submissions").doc(uid);
        const result = await db.runTransaction(async (transaction) => {
            var _a;
            const subDoc = await transaction.get(submissionRef);
            let currentViolationsCount = 0;
            let currentViolationsArray = [];
            let isNewSubmission = false;
            if (subDoc.exists) {
                const data = subDoc.data();
                currentViolationsCount = data.cheatViolations || 0;
                currentViolationsArray = data.violations || [];
            }
            else {
                isNewSubmission = true;
            }
            const newCount = currentViolationsCount + 1;
            const newViolationRecord = {
                type: violationType,
                timestamp: new Date().toISOString()
            };
            const newViolationsArray = [...currentViolationsArray, newViolationRecord];
            const updatePayload = {
                cheatViolations: newCount,
                violations: newViolationsArray,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            };
            if (isNewSubmission) {
                updatePayload.studentUid = uid;
                updatePayload.status = 'IN_PROGRESS';
                updatePayload.createdAt = admin.firestore.FieldValue.serverTimestamp();
                transaction.set(submissionRef, updatePayload);
            }
            else {
                if (newCount >= 3) {
                    updatePayload.status = 'FLAGGED';
                    updatePayload.flaggedAt = admin.firestore.FieldValue.serverTimestamp();
                }
                transaction.update(submissionRef, updatePayload);
            }
            return {
                cheatViolations: newCount,
                status: newCount >= 3 ? 'FLAGGED' : (isNewSubmission ? 'IN_PROGRESS' : ((_a = subDoc.data()) === null || _a === void 0 ? void 0 : _a.status) || 'IN_PROGRESS')
            };
        });
        // 6. Define Warning Messages
        let warning = "";
        if (result.cheatViolations === 1) {
            warning = "Warning 1/3: Please stay focused on the exam window. Further violations will flag your submission.";
        }
        else if (result.cheatViolations === 2) {
            warning = "Warning 2/3: FINAL WARNING. Your next violation will result in your submission being FLAGGED for review.";
        }
        return Object.assign(Object.assign({}, result), { warning: warning || undefined });
    }
    catch (error) {
        if (error instanceof functions.https.HttpsError)
            throw error;
        functions.logger.error("Global crash in recordCheatViolation:", error);
        throw new functions.https.HttpsError("internal", error.message || "Failed to record violation due to a server error.");
    }
});
exports.submitGradedScript = (0, https_1.onCall)({ cors: true, secrets: [resendApiKey] }, async (request) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    try {
        const db = admin.firestore();
        if (!request.auth)
            throw new functions.https.HttpsError("unauthenticated", "Login required.");
        const { zoneId, examId, studentId, score, feedback, mergedPdf, oldFileUrl } = request.data;
        // Authorization
        const zoneDoc = await db.collection('zones').doc(zoneId).get();
        const tutorUid = ((_a = zoneDoc.data()) === null || _a === void 0 ? void 0 : _a.createdBy) || ((_b = zoneDoc.data()) === null || _b === void 0 ? void 0 : _b.tutorId);
        let isAuthorized = request.auth.uid === tutorUid;
        let coTutorSubject = null;
        if (!isAuthorized) {
            const roles = ((_c = zoneDoc.data()) === null || _c === void 0 ? void 0 : _c.coTutorRoles) || {};
            if (request.auth.uid in roles) {
                isAuthorized = true;
                coTutorSubject = roles[request.auth.uid];
            }
        }
        if (!isAuthorized) {
            throw new functions.https.HttpsError("permission-denied", "Only the zone owner or an assigned co-tutor can grade exams.");
        }
        // Subject matching enforcement for co-tutors
        if (request.auth.uid !== tutorUid && coTutorSubject) {
            const examDoc = await db.collection('zones').doc(zoneId).collection('exams').doc(examId).get();
            const examSubject = (_d = examDoc.data()) === null || _d === void 0 ? void 0 : _d.subject;
            if (examSubject !== coTutorSubject) {
                throw new functions.https.HttpsError("permission-denied", "You can only grade exams for your assigned subject.");
            }
        }
        const bunnyApiKey = (_e = process.env.BUNNY_API_KEY) === null || _e === void 0 ? void 0 : _e.trim();
        const storageZone = (_f = process.env.BUNNY_STORAGE_ZONE_NAME) === null || _f === void 0 ? void 0 : _f.trim();
        const pullZone = (_g = process.env.BUNNY_PULL_ZONE_URL) === null || _g === void 0 ? void 0 : _g.trim();
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
            const res = await axios_1.default.head(`https://storage.bunnycdn.com/${storageZone}/${oldPath}`, {
                headers: { 'AccessKey': bunnyApiKey }
            });
            oldFileSizeInBytes = parseInt(res.headers['content-length'] || "0");
        }
        catch (e) {
            console.error("Failed to head old file for quota check", e);
        }
        const quota = await checkStorageQuota(request.auth.uid, newFileSizeInBytes - oldFileSizeInBytes);
        if (!quota.isAllowed) {
            throw new functions.https.HttpsError("resource-exhausted", "Quota exceeded during grading update.");
        }
        const newFileName = `graded_${studentId}_exam.pdf`;
        const storagePath = `exams/${zoneId}/${examId}/${newFileName}`;
        // Upload New
        await axios_1.default.put(`https://storage.bunnycdn.com/${storageZone}/${storagePath}`, buffer, { headers: { 'AccessKey': bunnyApiKey, 'Content-Type': 'application/pdf' } });
        // Delete Old
        try {
            const oldPath = oldFileUrl.replace(`https://${pullZone}/`, '');
            // Get original file size to maintain exact quota diff
            const respVal = await axios_1.default.head(`https://storage.bunnycdn.com/${storageZone}/${oldPath}`, {
                headers: { 'AccessKey': bunnyApiKey }
            });
            oldFileSizeInBytes = parseInt(respVal.headers['content-length'] || "0");
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
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            gradedBy: request.auth.uid
        }, { merge: true });
        // Update student doc for quick access if needed
        await db.collection('zones').doc(zoneId).collection('students').doc(studentId).set({
            activeExamGraded: true
        }, { merge: true });
        // Email Notification
        try {
            const apiKey = resendApiKey.value();
            if (apiKey) {
                const studentDoc = await db.collection('zones').doc(zoneId).collection('students').doc(studentId).get();
                const studentEmail = (_h = studentDoc.data()) === null || _h === void 0 ? void 0 : _h.email;
                const studentName = ((_j = studentDoc.data()) === null || _j === void 0 ? void 0 : _j.name) || "Student";
                const examDoc = await db.collection('zones').doc(zoneId).collection('exams').doc(examId).get();
                const examTitle = ((_k = examDoc.data()) === null || _k === void 0 ? void 0 : _k.title) || "Exam";
                if (studentEmail) {
                    const resend = new resend_1.Resend(apiKey);
                    await resend.emails.send({
                        from: "Nunma <support@nunma.in>",
                        to: studentEmail,
                        subject: `Your marks for ${examTitle} are published! 📝`,
                        html: `
                            <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 40px 20px; border: 1px solid #eee; border-radius: 20px;">
                                <div style="text-align: center; margin-bottom: 30px;">
                                    <h1 style="color: #040457; font-size: 24px;">Exam Graded!</h1>
                                </div>
                                <p style="color: #333; font-size: 16px;">Hi ${studentName},</p>
                                <p style="color: #333; font-size: 16px;">Your tutor has graded your submission for <strong>${examTitle}</strong>.</p>
                                <div style="background: #f8f9fa; padding: 24px; border-radius: 16px; margin: 24px 0;">
                                    <p style="margin: 0 0 12px 0; font-size: 18px;"><strong>Score:</strong> ${score}</p>
                                    <p style="margin: 0; font-size: 16px;"><strong>Feedback:</strong> ${feedback || "No additional feedback"}</p>
                                </div>
                                <div style="text-align: center; margin: 40px 0;">
                                    <a href="https://nunma.in/classroom/${zoneId}" style="background: #c2f575; color: #040457; padding: 16px 32px; text-decoration: none; border-radius: 12px; font-weight: bold;">View Corrected PDF →</a>
                                </div>
                            </div>
                        `
                    });
                }
            }
        }
        catch (emailErr) {
            console.error("Failed to send grade email:", emailErr);
        }
        return { success: true, gradedUrl: newFileUrl };
    }
    catch (error) {
        if (error instanceof functions.https.HttpsError)
            throw error;
        functions.logger.error("Global crash in submitGradedScript:", error);
        throw new functions.https.HttpsError("internal", error.message || "Failed to submit graded script.");
    }
});
exports.submitExam = (0, https_1.onCall)({ cors: true }, async (request) => {
    try {
        const db = admin.firestore();
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
        const wrongQuestions = [];
        // Secure Scoring
        if (examData.type === 'online-mcq' || examData.type === 'online-test') {
            if (examData.questions && answers) {
                let score = 0;
                examData.questions.forEach((q, idx) => {
                    const studentAns = answers[q.id];
                    if (studentAns === q.correctAnswer) {
                        score++;
                    }
                    else {
                        wrongQuestions.push(`Q${idx + 1}`);
                    }
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
            answers: answers || {},
            wrongQuestions,
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
        return {
            success: true,
            marks,
            status,
            wrongQuestions,
            pdfUrl: examData.pdfUrl || null
        };
    }
    catch (error) {
        if (error instanceof functions.https.HttpsError)
            throw error;
        functions.logger.error("Global crash in submitExam:", error);
        throw new functions.https.HttpsError("internal", error.message || "Failed to submit exam.");
    }
});
exports.registerIssuance = (0, https_1.onCall)({ secrets: ["RESEND_API_KEY"], cors: true }, async (request) => {
    var _a;
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
        const zoneData = zoneDoc.data();
        if (zoneData.createdBy !== issuerUid && zoneData.tutorId !== issuerUid) {
            throw new functions.https.HttpsError("permission-denied", "Unauthorized: Only the zone creator (Thala) can register issuance.");
        }
        const zoneTitle = zoneData.title || zoneData.name || "Untitled Course";
        // 3. Fetch Student (User) to get name and email
        const studentUserDoc = await db.collection("users").doc(studentUid).get();
        if (!studentUserDoc.exists) {
            throw new functions.https.HttpsError("not-found", "Student profile not found.");
        }
        const studentUserData = studentUserDoc.data();
        const studentName = studentUserData.name || "Student";
        const studentEmail = studentUserData.email || "no-email@nunma.in";
        // 4. Validate Student Enrollment is active in the zone
        const enrollmentDoc = await db.collection("zones").doc(zoneId).collection("students").doc(studentUid).get();
        if (!enrollmentDoc.exists || ((_a = enrollmentDoc.data()) === null || _a === void 0 ? void 0 : _a.status) !== 'active') {
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
        const issuedCertRef = db.collection("issued_certificates").doc(urnUuid);
        batch.set(issuedCertRef, {
            studentId: studentUid,
            tutorId: issuerUid,
            zoneId,
            studentName,
            zoneName: zoneTitle,
            date: isoTimestamp,
            verified: true
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
            const resend = new resend_1.Resend(resendApiKey);
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
            }).catch(err => console.error('[Certificate Email] Failed:', err));
        }
        return { certificateId: urnUuid, payload };
    }
    catch (error) {
        if (error instanceof functions.https.HttpsError)
            throw error;
        functions.logger.error("Global crash in registerIssuance:", error);
        throw new functions.https.HttpsError("internal", error.message || "Failed to finalize certificate registration.");
    }
});
// --- OTP AUTHENTICATION ---
exports.requestOTP = (0, https_1.onCall)({ secrets: ["RESEND_API_KEY"], cors: true }, async (request) => {
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
        const resend = new resend_1.Resend(resendApiKey);
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
    }
    catch (error) {
        if (error instanceof functions.https.HttpsError)
            throw error;
        functions.logger.error("Global crash in requestOTP:", error);
        throw new functions.https.HttpsError("internal", error.message || "Failed to send OTP email.");
    }
});
exports.verifyOTPAndSignIn = (0, https_1.onCall)({ cors: true }, async (request) => {
    var _a, _b;
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
        const data = otpDoc.data();
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
            const verifiedAt = ((_a = data.verifiedAt) === null || _a === void 0 ? void 0 : _a.toDate) ? data.verifiedAt.toDate() : (((_b = data.createdAt) === null || _b === void 0 ? void 0 : _b.toDate) ? data.createdAt.toDate() : new Date());
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
        }
        catch (error) {
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
                    }
                    catch (creationError) {
                        throw new functions.https.HttpsError("failed-precondition", creationError.message || "Could not create user account.");
                    }
                }
                else {
                    throw new functions.https.HttpsError("invalid-argument", "Registration details missing.");
                }
            }
            else {
                throw new functions.https.HttpsError("internal", error.message);
            }
        }
        await otpDoc.ref.delete();
        try {
            const customToken = await admin.auth().createCustomToken(user.uid);
            return { verified: true, customToken };
        }
        catch (iamError) {
            functions.logger.error("IAM Minting Error:", iamError);
            throw new functions.https.HttpsError('internal', 'IAM Configuration Error: Cannot mint token');
        }
    }
    catch (error) {
        if (error instanceof functions.https.HttpsError)
            throw error;
        functions.logger.error("Global crash in verifyOTPAndSignIn:", error);
        throw new functions.https.HttpsError("internal", error.message || "Verification failed.");
    }
});
// --- ZONE INVITATION SYSTEM ---
exports.generateZoneInvite = (0, https_1.onCall)({ cors: true }, async (request) => {
    try {
        const db = admin.firestore();
        if (!request.auth)
            throw new functions.https.HttpsError("unauthenticated", "Login required.");
        const { zoneId } = request.data;
        if (!zoneId)
            throw new functions.https.HttpsError("invalid-argument", "Missing zoneId.");
        const zoneDoc = await db.collection("zones").doc(zoneId).get();
        if (!zoneDoc.exists)
            throw new functions.https.HttpsError("not-found", "Zone not found.");
        const zoneData = zoneDoc.data();
        if ((zoneData === null || zoneData === void 0 ? void 0 : zoneData.createdBy) !== request.auth.uid && (zoneData === null || zoneData === void 0 ? void 0 : zoneData.tutorId) !== request.auth.uid) {
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
        functions.logger.log(`[INVITE] Token generated for zone ${zoneId} by user ${request.auth.uid}: ${inviteToken}`);
        return { inviteToken, expiresAt, isActive: true };
    }
    catch (error) {
        if (error instanceof functions.https.HttpsError)
            throw error;
        functions.logger.error("Global crash in generateZoneInvite:", error);
        throw new functions.https.HttpsError("internal", error.message || "Failed to generate invite.");
    }
});
exports.revokeZoneInvite = (0, https_1.onCall)({ cors: true }, async (request) => {
    try {
        const db = admin.firestore();
        if (!request.auth)
            throw new functions.https.HttpsError("unauthenticated", "Login required.");
        const { zoneId, inviteToken } = request.data;
        if (!zoneId || !inviteToken)
            throw new functions.https.HttpsError("invalid-argument", "Missing zoneId or inviteToken.");
        const zoneDoc = await db.collection("zones").doc(zoneId).get();
        if (!zoneDoc.exists)
            throw new functions.https.HttpsError("not-found", "Zone not found.");
        const zoneData = zoneDoc.data();
        if ((zoneData === null || zoneData === void 0 ? void 0 : zoneData.createdBy) !== request.auth.uid && (zoneData === null || zoneData === void 0 ? void 0 : zoneData.tutorId) !== request.auth.uid) {
            throw new functions.https.HttpsError("permission-denied", "Only the zone creator can revoke invites.");
        }
        await db.collection("zones").doc(zoneId).collection("invites").doc(inviteToken).update({
            isActive: false
        });
        return { success: true };
    }
    catch (error) {
        if (error instanceof functions.https.HttpsError)
            throw error;
        functions.logger.error("Global crash in revokeZoneInvite:", error);
        throw new functions.https.HttpsError("internal", error.message || "Failed to revoke invite.");
    }
});
exports.joinZoneByInvite = (0, https_1.onCall)({ cors: true }, async (request) => {
    try {
        const db = admin.firestore();
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
    }
    catch (error) {
        if (error instanceof functions.https.HttpsError)
            throw error;
        functions.logger.error("Global crash in joinZoneByInvite:", error);
        throw new functions.https.HttpsError("internal", error.message || "Failed to join zone.");
    }
});
// --- SECURE WHITELIST ACCESS ---
exports.processWhitelist = (0, https_1.onCall)({ secrets: ["RESEND_API_KEY"], cors: true }, async (request) => {
    var _a, _b;
    try {
        const db = admin.firestore();
        // 1. Authentication check
        if (!request.auth) {
            throw new https_1.HttpsError("unauthenticated", "You must be signed in to whitelist students.");
        }
        const { zoneId, email, name } = request.data;
        // 1. Strict Input Validation
        if (!zoneId || !email) {
            throw new https_1.HttpsError("invalid-argument", "Missing zoneId or email");
        }
        if (typeof zoneId !== "string" || typeof email !== "string") {
            throw new https_1.HttpsError("invalid-argument", "zoneId and email must be strings.");
        }
        const normalizedEmail = email.trim().toLowerCase();
        if (!normalizedEmail.includes("@")) {
            throw new https_1.HttpsError("invalid-argument", "Invalid email format.");
        }
        // 3. Security check: verify caller owns this zone
        const zoneDoc = await db.collection("zones").doc(zoneId).get();
        if (!zoneDoc.exists) {
            throw new https_1.HttpsError("not-found", "Zone not found.");
        }
        const zoneData = zoneDoc.data();
        const callerUid = request.auth.uid;
        if (zoneData.createdBy !== callerUid && zoneData.tutorId !== callerUid) {
            throw new https_1.HttpsError("permission-denied", "Only the zone creator can whitelist students.");
        }
        const zoneTitle = zoneData.title || "Untitled Zone";
        // 4. Initialize Resend for notifications
        const resendApiKey = process.env.RESEND_API_KEY;
        let resend = null;
        if (resendApiKey) {
            resend = new resend_1.Resend(resendApiKey);
        }
        else {
            functions.logger.warn("RESEND_API_KEY not configured — notification emails will be skipped.");
        }
        const results = {
            enrolled: 0,
            pending: 0,
            alreadyEnrolled: 0,
            alreadySent: 0
        };
        // 2. Graceful Auth Check
        let uid = null;
        try {
            const userRecord = await admin.auth().getUserByEmail(normalizedEmail);
            uid = userRecord.uid;
        }
        catch (authError) {
            functions.logger.info(`User ${normalizedEmail} not found, adding to invites.`);
        }
        if (uid) {
            // User exists, enroll them directly
            const studentRef = db.collection("zones").doc(zoneId).collection("students").doc(uid);
            const studentDoc = await studentRef.get();
            if (studentDoc.exists) {
                results.alreadyEnrolled = 1;
                return Object.assign({ success: true }, results);
            }
            // Get user profile to populate name/email
            const userDoc = await db.collection("users").doc(uid).get();
            const userData = userDoc.data() || {};
            // Atomic batch write for enrollment
            const batch = db.batch();
            // 1. Enrollment in zone
            batch.set(studentRef, Object.assign({ uid: uid, name: userData.name || "Student", email: userData.email || normalizedEmail, avatar: userData.avatar || "", status: "active", source: "whitelist", enrolledAt: admin.firestore.FieldValue.serverTimestamp(), joinedAt: admin.firestore.FieldValue.serverTimestamp() }, (request.data.batchId ? { batchId: request.data.batchId } : {})));
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
            return Object.assign(Object.assign({ success: true }, results), { studentUid: uid, zoneName: zoneTitle, tutorName: zoneData.tutorName || "Your Instructor" });
        }
        else {
            // User doesn't exist, proceed to add their email to the invites subcollection
            const invitesRef = db.collection("zones").doc(zoneId).collection("invites").doc(normalizedEmail);
            const inviteDoc = await invitesRef.get();
            if (inviteDoc.exists) {
                results.alreadySent = 1;
                return Object.assign({ success: true }, results);
            }
            await invitesRef.set(Object.assign({ email: normalizedEmail, name: name || "", addedAt: admin.firestore.FieldValue.serverTimestamp(), addedBy: callerUid, status: "pending" }, (request.data.batchId ? { batchId: request.data.batchId } : {})));
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
                                    <a href="https://nunma.in/auth" 
                                       style="display: inline-block; background: #c2f575; color: #040457; padding: 16px 40px; border-radius: 999px; text-decoration: none; font-weight: 800; font-size: 14px; letter-spacing: 0.05em; text-transform: uppercase;">
                                        Create Account to Enter →
                                    </a>
                                </div>
                                <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 32px;">
                                    Nunma — The Trust Layer for Education
                                </p>
                            </div>
                        `,
                });
            }
            catch (emailError) {
                functions.logger.warn(`Failed to send whitelist email to ${normalizedEmail}:`, emailError.message);
            }
        }
        functions.logger.log(`[WHITELIST] Zone ${zoneId} for ${normalizedEmail}: enrolled=${results.enrolled}, pending=${results.pending}`);
        return Object.assign({ success: true }, results);
    }
    catch (error) {
        functions.logger.error("CRITICAL: processWhitelist execution failed", {
            message: error.message,
            stack: error.stack,
            zoneId: (_a = request.data) === null || _a === void 0 ? void 0 : _a.zoneId,
            email: (_b = request.data) === null || _b === void 0 ? void 0 : _b.email
        });
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError("internal", error.message || "Failed to process whitelist.");
    }
});
// --- ASYNCHRONOUS INVOICING PIPELINE (V3 — Retry-Safe & Idempotent) ---
exports.processInvoicingQueue = (0, firestore_1.onDocumentCreated)({
    document: 'mail_queue/{docId}',
    retry: true,
    secrets: [
        "ZOHO_ORG_ID", "ZOHO_REFRESH_TOKEN", "ZOHO_CLIENT_ID", "ZOHO_CLIENT_SECRET",
        "SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS"
    ]
}, async (event) => {
    var _a, _b, _c, _d, _e;
    const snapshot = event.data;
    if (!snapshot)
        return;
    const db = admin.firestore();
    const docRef = snapshot.ref;
    const MAX_RETRIES = 5;
    // Status progression for step-skipping logic
    const STATUS_ORDER = ['pending', 'customer_synced', 'invoice_created', 'invoice_paid', 'pdf_fetched', 'email_sent', 'delivered'];
    const isAtOrPast = (current, target) => STATUS_ORDER.indexOf(current) >= STATUS_ORDER.indexOf(target);
    // Atomically advance status forward via Firestore transaction.
    // Prevents race conditions if concurrent triggers overlap.
    const advanceStatus = async (newStatus, extraFields = {}) => {
        await db.runTransaction(async (transaction) => {
            const freshDoc = await transaction.get(docRef);
            const freshData = freshDoc.data();
            if (!freshData)
                throw new Error('mail_queue document vanished during status update.');
            const currentIdx = STATUS_ORDER.indexOf(freshData.status);
            const newIdx = STATUS_ORDER.indexOf(newStatus);
            if (newIdx > currentIdx) {
                transaction.update(docRef, Object.assign({ status: newStatus, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, extraFields));
            }
        });
    };
    try {
        // Re-read document fresh — critical for retries where the event snapshot is stale
        const freshSnap = await docRef.get();
        const data = freshSnap.data();
        if (!data)
            return;
        const { status } = data;
        const retryCount = data.retryCount || 0;
        // Terminal states — stop processing
        if (status === 'delivered' || status === 'failed')
            return;
        // Retry budget exhausted — mark permanently failed and write to invoicing_failures
        if (retryCount >= MAX_RETRIES) {
            await docRef.update({
                status: 'failed',
                lastError: `Permanently failed after ${MAX_RETRIES} retries`,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            await db.collection('invoicing_failures').add({
                mailQueueDocId: docRef.id,
                uid: data.uid,
                paymentId: data.paymentId,
                amount: data.amount,
                type: data.type,
                lastStatus: status,
                lastError: data.lastError || `Permanently failed after ${MAX_RETRIES} retries`,
                retryCount,
                createdAt: data.createdAt,
                flaggedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            functions.logger.error(`[INVOICE ALERT] ${docRef.id} permanently FAILED after ${MAX_RETRIES} retries. Written to invoicing_failures for manual resolution.`, {
                uid: data.uid, paymentId: data.paymentId, lastStatus: status
            });
            return;
        }
        const { uid, amount, type, paymentId } = data;
        const orgId = process.env.ZOHO_ORG_ID;
        // Step 1: Refresh Zoho OAuth Token (always — tokens are short-lived)
        const tokenParams = new URLSearchParams();
        tokenParams.append('refresh_token', process.env.ZOHO_REFRESH_TOKEN);
        tokenParams.append('client_id', process.env.ZOHO_CLIENT_ID);
        tokenParams.append('client_secret', process.env.ZOHO_CLIENT_SECRET);
        tokenParams.append('grant_type', 'refresh_token');
        const tokenResponse = await axios_1.default.post('https://accounts.zoho.in/oauth/v2/token', tokenParams.toString(), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        const accessToken = tokenResponse.data.access_token;
        if (!accessToken)
            throw new Error("Failed to refresh Zoho access token.");
        const authHeaders = {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        };
        // Fetch user details (cheap Firestore read, needed throughout pipeline)
        const userDoc = await db.collection("users").doc(uid).get();
        const userData = userDoc.data();
        const userName = (userData === null || userData === void 0 ? void 0 : userData.name) || "Customer";
        const userEmail = userData === null || userData === void 0 ? void 0 : userData.email;
        if (!userEmail)
            throw new Error(`Email not found for user ${uid}`);
        // Step 2: Sync Customer in Zoho (skip if already done)
        let contactId = data.zohoContactId || '';
        if (!isAtOrPast(status, 'customer_synced')) {
            const searchResponse = await axios_1.default.get(`https://www.zohoapis.in/books/v3/contacts?organization_id=${orgId}&email=${userEmail}`, { headers: authHeaders });
            if (((_a = searchResponse.data.contacts) === null || _a === void 0 ? void 0 : _a.length) > 0) {
                contactId = searchResponse.data.contacts[0].contact_id;
            }
            else {
                const contactResponse = await axios_1.default.post(`https://www.zohoapis.in/books/v3/contacts?organization_id=${orgId}`, { contact_name: userName, email: userEmail, contact_type: 'customer' }, { headers: authHeaders });
                contactId = contactResponse.data.contact.contact_id;
            }
            await advanceStatus('customer_synced', { zohoContactId: contactId });
            functions.logger.info(`[Invoice Pipeline] ${docRef.id}: customer_synced (contact: ${contactId})`);
        }
        // Step 3: Create Invoice (CRITICAL idempotency guard — skip if zohoInvoiceId already exists)
        let invoiceId = data.zohoInvoiceId || '';
        if (!isAtOrPast(status, 'invoice_created')) {
            const invoiceResponse = await axios_1.default.post(`https://www.zohoapis.in/books/v3/invoices?organization_id=${orgId}`, {
                customer_id: contactId,
                line_items: [{
                        description: type === 'PLATFORM_FEE' ? 'Nunma Platform Fee' : 'Knowledge Stream Enrollment',
                        rate: amount,
                        quantity: 1
                    }],
                reason: `Payment Received: ${paymentId}`,
                status: 'sent'
            }, { headers: authHeaders });
            invoiceId = invoiceResponse.data.invoice.invoice_id;
            // Persist zohoInvoiceId IMMEDIATELY — prevents duplicate invoices on retry
            await advanceStatus('invoice_created', { zohoInvoiceId: invoiceId });
            functions.logger.info(`[Invoice Pipeline] ${docRef.id}: invoice_created (invoice: ${invoiceId})`);
        }
        // Step 4: Mark Invoice as Paid (skip if already done)
        if (!isAtOrPast(status, 'invoice_paid')) {
            await axios_1.default.post(`https://www.zohoapis.in/books/v3/customerpayments?organization_id=${orgId}`, {
                customer_id: contactId,
                payment_mode: 'online',
                amount: amount,
                date: new Date().toISOString().split('T')[0],
                invoices: [{ invoice_id: invoiceId, amount_applied: amount }]
            }, { headers: authHeaders });
            await advanceStatus('invoice_paid');
            functions.logger.info(`[Invoice Pipeline] ${docRef.id}: invoice_paid`);
        }
        // Step 5: Fetch Invoice PDF (idempotent — always re-fetch since we don't persist the binary)
        const pdfResponse = await axios_1.default.get(`https://www.zohoapis.in/books/v3/invoices/${invoiceId}?organization_id=${orgId}&accept=pdf`, { headers: authHeaders, responseType: 'arraybuffer' });
        const pdfBuffer = Buffer.from(pdfResponse.data, 'binary');
        if (!isAtOrPast(status, 'pdf_fetched')) {
            await advanceStatus('pdf_fetched');
            functions.logger.info(`[Invoice Pipeline] ${docRef.id}: pdf_fetched`);
        }
        // Step 6: Dispatch Email via SMTP
        // KNOWN & ACCEPTED TRADEOFF: If the function crashes after sendMail() succeeds but
        // before 'email_sent' is written, a retry will resend the same invoice email. This means
        // a customer could occasionally receive a duplicate receipt email. This is an accepted
        // minor annoyance, NOT a financial risk — the Zoho invoice is guarded by zohoInvoiceId
        // in Step 3 and will not be recreated. This is intentional and documented, not an
        // overlooked bug.
        if (!isAtOrPast(status, 'email_sent')) {
            await getTransporter().sendMail({
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
            });
            await advanceStatus('email_sent');
            functions.logger.info(`[Invoice Pipeline] ${docRef.id}: email_sent to ${userEmail}`);
        }
        // Step 7: Mark as delivered
        await advanceStatus('delivered', {
            deliveredAt: admin.firestore.FieldValue.serverTimestamp()
        });
        functions.logger.info(`[Invoice Pipeline] SUCCESS: ${docRef.id} fully delivered to ${userEmail} (invoice: ${invoiceId})`);
    }
    catch (error) {
        functions.logger.error(`[Invoice Pipeline] FAILED: ${docRef.id}`, {
            error: ((_b = error.response) === null || _b === void 0 ? void 0 : _b.data) || error.message
        });
        // Re-read to get latest retryCount, then increment
        const latestSnap = await docRef.get();
        const latestData = latestSnap.data();
        const currentRetryCount = (latestData === null || latestData === void 0 ? void 0 : latestData.retryCount) || 0;
        const newRetryCount = currentRetryCount + 1;
        if (newRetryCount >= MAX_RETRIES) {
            // Permanently failed — write to invoicing_failures for manual resolution
            await docRef.update({
                status: 'failed',
                lastError: ((_c = error.response) === null || _c === void 0 ? void 0 : _c.data) || error.message,
                retryCount: newRetryCount,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            await db.collection('invoicing_failures').add({
                mailQueueDocId: docRef.id,
                uid: latestData === null || latestData === void 0 ? void 0 : latestData.uid,
                paymentId: latestData === null || latestData === void 0 ? void 0 : latestData.paymentId,
                amount: latestData === null || latestData === void 0 ? void 0 : latestData.amount,
                type: latestData === null || latestData === void 0 ? void 0 : latestData.type,
                lastStatus: latestData === null || latestData === void 0 ? void 0 : latestData.status,
                lastError: ((_d = error.response) === null || _d === void 0 ? void 0 : _d.data) || error.message,
                retryCount: newRetryCount,
                createdAt: latestData === null || latestData === void 0 ? void 0 : latestData.createdAt,
                flaggedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            functions.logger.error(`[INVOICE ALERT] ${docRef.id} permanently FAILED after ${MAX_RETRIES} retries. Written to invoicing_failures for manual resolution.`, { uid: latestData === null || latestData === void 0 ? void 0 : latestData.uid, paymentId: latestData === null || latestData === void 0 ? void 0 : latestData.paymentId });
        }
        else {
            // Increment retryCount but keep intermediate status for resume-from-failure
            await docRef.update({
                lastError: ((_e = error.response) === null || _e === void 0 ? void 0 : _e.data) || error.message,
                retryCount: newRetryCount,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }
        // Re-throw to trigger Cloud Functions v2 native retry
        throw error;
    }
});
// --- INVOICING MONITOR (Hourly Watchdog) ---
exports.monitorStuckInvoices = (0, scheduler_1.onSchedule)({
    schedule: 'every 1 hours',
    timeZone: 'Asia/Kolkata',
    retryCount: 0
}, async () => {
    const db = admin.firestore();
    const oneHourAgo = admin.firestore.Timestamp.fromDate(new Date(Date.now() - 60 * 60 * 1000));
    // Query old documents, then filter non-terminal statuses in code
    // to avoid composite index requirements
    const oldDocs = await db.collection('mail_queue')
        .where('createdAt', '<', oneHourAgo)
        .get();
    const stuckDocs = oldDocs.docs.filter(doc => {
        const d = doc.data();
        return d.status !== 'delivered' && d.status !== 'failed' && !d.monitorFlagged;
    });
    if (stuckDocs.length === 0) {
        functions.logger.info('[Invoice Monitor] No stuck invoices found. All clear.');
        return;
    }
    functions.logger.error(`[INVOICE MONITOR ALERT] Found ${stuckDocs.length} stuck invoice(s) older than 1 hour.`);
    const batch = db.batch();
    for (const doc of stuckDocs) {
        const data = doc.data();
        const failureRef = db.collection('invoicing_failures').doc();
        batch.set(failureRef, {
            mailQueueDocId: doc.id,
            uid: data.uid,
            paymentId: data.paymentId,
            amount: data.amount,
            type: data.type,
            lastStatus: data.status,
            lastError: data.lastError || 'Stuck — exceeded 1 hour without reaching delivered',
            retryCount: data.retryCount || 0,
            createdAt: data.createdAt,
            flaggedAt: admin.firestore.FieldValue.serverTimestamp(),
            source: 'hourly_monitor'
        });
        // Mark as flagged to avoid duplicate alerts on next monitor run
        batch.update(doc.ref, { monitorFlagged: true });
        functions.logger.error(`[INVOICE MONITOR] Stuck: ${doc.id} | status: ${data.status} | uid: ${data.uid} | paymentId: ${data.paymentId}`);
    }
    await batch.commit();
    functions.logger.info(`[Invoice Monitor] Wrote ${stuckDocs.length} record(s) to invoicing_failures.`);
});
// --- ZONE CONVERSATION MANAGEMENT TRIGGERS ---
/**
 * Automatically creates a community conversation when a new zone is launched.
 */
exports.onZoneCreated = (0, firestore_1.onDocumentCreated)({ document: "zones/{zoneId}" }, async (event) => {
    const snapshot = event.data;
    if (!snapshot)
        return;
    const data = snapshot.data();
    const zoneId = event.params.zoneId;
    const tutorId = data.createdBy || data.tutorId;
    const db = admin.firestore();
    functions.logger.info(`Creating community conversation for zone: ${zoneId}`);
    try {
        await db.collection('conversations').add({
            name: data.title || "Untitled Zone",
            avatar: data.image || "",
            type: 'community',
            zoneId: zoneId,
            participants: tutorId ? [tutorId] : [],
            lastMessage: 'Welcome to the community!',
            lastMessageTime: admin.firestore.FieldValue.serverTimestamp(),
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
    }
    catch (error) {
        functions.logger.error(`Failed to create conversation for zone ${zoneId}:`, error);
    }
});
/**
 * Automatically adds a student to the community conversation when they join a zone.
 * This handles all join paths (Razorpay, Whitelist, Invite, Auto-enroll).
 */
exports.onStudentJoinedZone = (0, firestore_1.onDocumentCreated)({ document: "zones/{zoneId}/students/{studentId}" }, async (event) => {
    const zoneId = event.params.zoneId;
    const studentId = event.params.studentId;
    const db = admin.firestore();
    functions.logger.info(`Adding student ${studentId} to conversation for zone: ${zoneId}`);
    try {
        const convQuery = await db.collection('conversations')
            .where('zoneId', '==', zoneId)
            .where('type', '==', 'community')
            .limit(1)
            .get();
        if (!convQuery.empty) {
            const convRef = convQuery.docs[0].ref;
            await convRef.update({
                participants: admin.firestore.FieldValue.arrayUnion(studentId),
                lastMessage: "A new member has joined the community!",
                lastMessageTime: admin.firestore.FieldValue.serverTimestamp()
            });
        }
        else {
            // Fallback: If conversation missing, create it now
            const zoneDoc = await db.collection('zones').doc(zoneId).get();
            if (zoneDoc.exists) {
                const zoneData = zoneDoc.data();
                const tutorId = zoneData.createdBy || zoneData.tutorId;
                const participants = [studentId];
                if (tutorId)
                    participants.push(tutorId);
                await db.collection('conversations').add({
                    name: zoneData.title || "Untitled Zone",
                    avatar: zoneData.image || "",
                    type: 'community',
                    zoneId: zoneId,
                    participants: participants,
                    lastMessage: 'Welcome to the community!',
                    lastMessageTime: admin.firestore.FieldValue.serverTimestamp(),
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }
        }
    }
    catch (error) {
        functions.logger.error(`Error in onStudentJoinedZone for ${studentId} in ${zoneId}:`, error);
    }
});
/**
 * Automatically removes a student from the community conversation when they leave or are removed from a zone.
 */
exports.onStudentLeftZone = (0, firestore_1.onDocumentDeleted)({ document: "zones/{zoneId}/students/{studentId}" }, async (event) => {
    const zoneId = event.params.zoneId;
    const studentId = event.params.studentId;
    const db = admin.firestore();
    functions.logger.info(`Removing student ${studentId} from conversation for zone: ${zoneId}`);
    try {
        const convQuery = await db.collection('conversations')
            .where('zoneId', '==', zoneId)
            .where('type', '==', 'community')
            .limit(1)
            .get();
        if (!convQuery.empty) {
            const convRef = convQuery.docs[0].ref;
            await convRef.update({
                participants: admin.firestore.FieldValue.arrayRemove(studentId)
            });
        }
    }
    catch (error) {
        functions.logger.error(`Error in onStudentLeftZone for ${studentId} in ${zoneId}:`, error);
    }
});
exports.onExamAssigned = (0, firestore_1.onDocumentCreated)({ document: "zones/{zoneId}/exams/{examId}", secrets: [resendApiKey] }, async (event) => {
    var _a;
    const apiKey = resendApiKey.value();
    if (!apiKey) {
        functions.logger.warn("RESEND_API_KEY not configured — exam emails skipped.");
        return;
    }
    const examData = (_a = event.data) === null || _a === void 0 ? void 0 : _a.data();
    if (!examData)
        return;
    // Skip individual emails for exams that are part of a cluster deployment.
    // A consolidated email will be sent by onExamDeploymentCreated.
    if (examData.examGroupId) {
        functions.logger.info(`Skipping individual email for exam ${event.params.examId} because it belongs to group ${examData.examGroupId}`);
        return;
    }
    const zoneId = event.params.zoneId;
    const db = admin.firestore();
    try {
        // Get Zone details
        const zoneDoc = await db.collection("zones").doc(zoneId).get();
        if (!zoneDoc.exists)
            return;
        const zoneData = zoneDoc.data() || {};
        const zoneName = zoneData.title || "a Learning Zone";
        const tutorName = zoneData.tutorName || "Your Instructor";
        // Get all students
        const studentsSnap = await db.collection("zones").doc(zoneId).collection("students").get();
        if (studentsSnap.empty)
            return;
        const emails = [];
        studentsSnap.forEach(doc => {
            const data = doc.data();
            if (data.email)
                emails.push(data.email);
        });
        if (emails.length === 0)
            return;
        const resend = new resend_1.Resend(apiKey);
        for (const email of emails) {
            await resend.emails.send({
                from: "Nunma <support@nunma.in>",
                to: email,
                subject: `New Exam Assigned in ${zoneName} 📝`,
                html: `
                        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 40px 20px; border: 1px solid #eee; border-radius: 20px;">
                            <div style="text-align: center; margin-bottom: 30px;">
                                <h1 style="color: #040457; font-size: 24px;">New Exam Assigned!</h1>
                            </div>
                            <p style="color: #333; font-size: 16px; line-height: 1.6;">Hi Student,</p>
                            <p style="color: #333; font-size: 16px; line-height: 1.6;"><strong>${tutorName}</strong> has just assigned a new exam <strong>"${examData.title}"</strong> in the zone <strong>"${zoneName}"</strong>.</p>
                            <p style="color: #333; font-size: 16px; line-height: 1.6;">Please log in to your account to view the details and complete it on time.</p>
                            
                            <div style="text-align: center; margin: 40px 0;">
                                <a href="https://nunma.in/classroom/${zoneId}" style="background: #c2f575; color: #040457; padding: 16px 32px; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
                                    Go to Classroom →
                                </a>
                            </div>
                            
                            <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
                            <p style="color: #999; font-size: 12px; text-align: center;">Nunma — The Trust Layer for Education</p>
                        </div>
                    `
            });
        }
        functions.logger.info("Sent exam emails to " + emails.length + " students for zone " + zoneId);
    }
    catch (err) {
        functions.logger.error("Error sending exam assignment emails:", err);
    }
});
exports.onExamDeploymentCreated = (0, firestore_1.onDocumentCreated)({ document: "zones/{zoneId}/exam_deployments/{deploymentId}", secrets: [resendApiKey] }, async (event) => {
    var _a;
    const apiKey = resendApiKey.value();
    if (!apiKey) {
        functions.logger.warn("RESEND_API_KEY not configured — cluster exam emails skipped.");
        return;
    }
    const deploymentData = (_a = event.data) === null || _a === void 0 ? void 0 : _a.data();
    if (!deploymentData || !deploymentData.exams || deploymentData.exams.length === 0)
        return;
    const zoneId = event.params.zoneId;
    const db = admin.firestore();
    try {
        // Get Zone details
        const zoneDoc = await db.collection("zones").doc(zoneId).get();
        if (!zoneDoc.exists)
            return;
        const zoneData = zoneDoc.data() || {};
        const zoneName = zoneData.title || "a Learning Zone";
        const tutorName = zoneData.tutorName || "Your Instructor";
        // Get students (filter if targetBatchIds exists)
        const studentsSnap = await db.collection("zones").doc(zoneId).collection("students").get();
        if (studentsSnap.empty)
            return;
        const emails = [];
        studentsSnap.forEach(doc => {
            const data = doc.data();
            // Filter by batch if specified
            if (deploymentData.targetBatchIds && deploymentData.targetBatchIds.length > 0) {
                if (!deploymentData.targetBatchIds.includes(data.batchId))
                    return;
            }
            else if (deploymentData.targetBatchForSubjects && deploymentData.targetBatchForSubjects !== 'all') {
                if (data.batchId !== deploymentData.targetBatchForSubjects)
                    return;
            }
            if (data.email)
                emails.push(data.email);
        });
        if (emails.length === 0)
            return;
        const resend = new resend_1.Resend(apiKey);
        const examCount = deploymentData.exams.length;
        // Build the exam list HTML
        let examsHtml = "";
        for (const ex of deploymentData.exams) {
            examsHtml += `
                    <div style="background-color: #f9fafb; border-radius: 12px; padding: 15px; margin-bottom: 15px; border-left: 4px solid #c2f575;">
                        <h3 style="margin-top: 0; color: #052e16; font-size: 16px;">${ex.title}</h3>
                        <p style="margin: 5px 0; color: #4b5563; font-size: 14px;">📚 <strong>Subject:</strong> ${ex.subject || 'General'}</p>
                        <p style="margin: 5px 0; color: #4b5563; font-size: 14px;">📅 <strong>Date:</strong> ${ex.date}</p>
                        <p style="margin: 5px 0; color: #4b5563; font-size: 14px;">⏰ <strong>Time:</strong> ${ex.time || ex.startTime} ${ex.duration ? `(${ex.duration} minutes)` : ''}</p>
                        <p style="margin: 5px 0; color: #4b5563; font-size: 14px;">📝 <strong>Type:</strong> ${ex.type === 'online-mcq' ? 'Online MCQ' : ex.type === 'offline' ? 'Offline PDF' : 'Online PDF'}</p>
                    </div>
                `;
        }
        for (const email of emails) {
            await resend.emails.send({
                from: "Nunma <support@nunma.in>",
                to: email,
                subject: `${examCount} New Exams Scheduled in ${zoneName} 📝`,
                html: `
                        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 40px 20px; border: 1px solid #eee; border-radius: 20px;">
                            <div style="text-align: center; margin-bottom: 30px;">
                                <h1 style="color: #040457; font-size: 24px;">New Exams Scheduled!</h1>
                            </div>
                            <p style="color: #333; font-size: 16px; line-height: 1.6;">Hi Student,</p>
                            <p style="color: #333; font-size: 16px; line-height: 1.6;"><strong>${tutorName}</strong> has scheduled <strong>${examCount} new exams</strong> in the zone <strong>"${zoneName}"</strong>. Here are the details:</p>
                            
                            <div style="margin: 30px 0;">
                                ${examsHtml}
                            </div>
                            
                            <p style="color: #333; font-size: 16px; line-height: 1.6;">Make sure you're prepared and log in a few minutes early. You can view all your scheduled exams anytime from your Nunma dashboard.</p>
                            
                            <div style="text-align: center; margin: 40px 0;">
                                <a href="https://nunma.in/classroom/${zoneId}" style="background: #c2f575; color: #040457; padding: 16px 32px; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
                                    View My Exams →
                                </a>
                            </div>
                            
                            <p style="color: #333; font-size: 16px; line-height: 1.6;">Good luck!<br>— Team Nunma</p>
                            
                            <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
                            <p style="color: #999; font-size: 12px; text-align: center;">Nunma — The Trust Layer for Education</p>
                        </div>
                    `
            });
        }
        functions.logger.info("Sent clustered exam emails to " + emails.length + " students for deployment " + event.params.deploymentId);
    }
    catch (err) {
        functions.logger.error("Error sending clustered exam emails:", err);
    }
});
exports.sendEnrollmentEmail = (0, https_1.onCall)({ secrets: [resendApiKey] }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Authentication required.');
    }
    const apiKey = resendApiKey.value();
    if (!apiKey) {
        throw new https_1.HttpsError('internal', 'Email service not configured.');
    }
    const { studentEmail, studentName, zoneName, tutorName, zoneId, origin } = request.data;
    if (!studentEmail || !zoneName || !zoneId) {
        throw new https_1.HttpsError('invalid-argument', 'Missing required fields.');
    }
    const baseUrl = origin || 'https://nunma.in';
    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            from: 'Nunma <support@nunma.in>',
            to: studentEmail,
            subject: "You've been added to a new Zone on Nunma 🎓",
            html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 40px 20px; border: 1px solid #eee; border-radius: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #040457; font-size: 24px;">Welcome to ${zoneName}!</h1>
            </div>
            <p style="color: #333; font-size: 16px; line-height: 1.6;">Hi ${studentName || 'Student'},</p>
            <p style="color: #333; font-size: 16px; line-height: 1.6;">You've been added to <strong>"${zoneName}"</strong> by <strong>${tutorName}</strong>.</p>
            <p style="color: #333; font-size: 16px; line-height: 1.6;">Your instructor has granted you full access to this zone. You can start learning immediately.</p>
            
            <div style="text-align: center; margin: 40px 0;">
              <a href="${baseUrl}/zone/${zoneId}" style="background: #c2f575; color: #040457; padding: 16px 32px; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
                Enter Zone →
              </a>
            </div>
            
            <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
            <p style="color: #999; font-size: 12px; text-align: center;">Nunma — The Trust Layer for Education</p>
          </div>
        `
        })
    });
    if (!response.ok) {
        const error = await response.json();
        console.error('Resend API error:', error);
        throw new https_1.HttpsError('internal', 'Failed to send email.');
    }
    return { success: true };
});
exports.deleteBunnyVideo = (0, https_1.onCall)({ secrets: ["BUNNY_API_KEY", "BUNNY_LIBRARY_ID"], cors: true }, async (request) => {
    if (!request.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Authentication required.');
    }
    const videoId = request.data.videoId;
    if (!videoId) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing videoId');
    }
    const libraryId = process.env.BUNNY_LIBRARY_ID ? process.env.BUNNY_LIBRARY_ID.trim() : null;
    const apiKey = process.env.BUNNY_API_KEY ? process.env.BUNNY_API_KEY.trim() : null;
    if (!libraryId || !apiKey) {
        throw new functions.https.HttpsError('internal', 'Server configuration missing for BunnyCDN.');
    }
    try {
        await axios_1.default.delete(`https://video.bunnycdn.com/library/${libraryId}/videos/${videoId}`, { headers: { 'AccessKey': apiKey } });
        // Also clean up from Firestore
        const db = admin.firestore();
        const videoSnap = await db.collectionGroup("videos").where("bunnyVideoId", "==", videoId).get();
        const batch = db.batch();
        videoSnap.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();
        return { success: true };
    }
    catch (error) {
        console.error(`Failed to delete Bunny video ${videoId}:`, error.message);
        throw new functions.https.HttpsError('internal', 'Failed to delete video from BunnyCDN');
    }
});
exports.manageLiveTimer = (0, https_1.onCall)({ cors: true }, async (request) => {
    if (!request.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Authentication required.');
    }
    const { zoneId, sessionId, action, duration } = request.data;
    if (!zoneId || !sessionId || !action) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing parameters.');
    }
    const sessionRef = admin.firestore().collection('zones').doc(zoneId).collection('liveSessions').doc(sessionId);
    try {
        await admin.firestore().runTransaction(async (transaction) => {
            const sessionDoc = await transaction.get(sessionRef);
            if (!sessionDoc.exists) {
                throw new functions.https.HttpsError('not-found', 'Session not found.');
            }
            const currentData = sessionDoc.data() || {};
            const currentTimer = currentData.timer || {};
            const now = Date.now();
            let newTimer = {};
            if (action === 'start') {
                if (typeof duration !== 'number' || duration <= 0) {
                    throw new functions.https.HttpsError('invalid-argument', 'Valid duration required to start.');
                }
                newTimer = {
                    timerEndsAt: now + (duration * 1000),
                    timerRemaining: duration * 1000,
                    timerStatus: 'running'
                };
            }
            else if (action === 'pause') {
                if (currentTimer.timerStatus !== 'running') {
                    throw new functions.https.HttpsError('failed-precondition', 'Timer is not running.');
                }
                const remaining = Math.max(0, currentTimer.timerEndsAt - now);
                newTimer = {
                    timerEndsAt: currentTimer.timerEndsAt, // keep previous endsAt for history, though unused while paused
                    timerRemaining: remaining,
                    timerStatus: 'paused'
                };
            }
            else if (action === 'resume') {
                if (currentTimer.timerStatus !== 'paused') {
                    throw new functions.https.HttpsError('failed-precondition', 'Timer is not paused.');
                }
                newTimer = {
                    timerEndsAt: now + currentTimer.timerRemaining,
                    timerRemaining: currentTimer.timerRemaining,
                    timerStatus: 'running'
                };
            }
            else if (action === 'cancel') {
                newTimer = {
                    timerEndsAt: 0,
                    timerRemaining: 0,
                    timerStatus: 'stopped'
                };
            }
            else {
                throw new functions.https.HttpsError('invalid-argument', 'Invalid action.');
            }
            transaction.update(sessionRef, { timer: newTimer });
        });
        return { success: true };
    }
    catch (error) {
        console.error('manageLiveTimer error:', error);
        if (error instanceof functions.https.HttpsError)
            throw error;
        throw new functions.https.HttpsError('internal', 'Transaction failed.', error.message);
    }
});
exports.onVideoDocumentDeleted = (0, firestore_1.onDocumentDeleted)({
    document: "zones/{zoneId}/videos/{videoId}",
    secrets: ["BUNNY_API_KEY", "BUNNY_LIBRARY_ID"]
}, async (event) => {
    var _a, _b;
    const deletedData = (_a = event.data) === null || _a === void 0 ? void 0 : _a.data();
    if (!deletedData)
        return;
    const videoId = deletedData.bunnyVideoId || event.params.videoId;
    const libraryId = process.env.BUNNY_LIBRARY_ID ? process.env.BUNNY_LIBRARY_ID.trim() : null;
    const apiKey = process.env.BUNNY_API_KEY ? process.env.BUNNY_API_KEY.trim() : null;
    if (!libraryId || !apiKey) {
        console.error('Server configuration missing for BunnyCDN. Cannot clean up deleted video.');
        return;
    }
    try {
        console.log(`Deleting Bunny video ${videoId} because its Firestore video document was deleted`);
        await axios_1.default.delete(`https://video.bunnycdn.com/library/${libraryId}/videos/${videoId}`, { headers: { 'AccessKey': apiKey } });
    }
    catch (error) {
        if (((_b = error.response) === null || _b === void 0 ? void 0 : _b.status) === 404) {
            console.log(`Bunny video ${videoId} was already deleted or not found.`);
        }
        else {
            console.error(`Failed to delete Bunny video ${videoId}:`, error.message);
        }
    }
});
//# sourceMappingURL=index.js.map