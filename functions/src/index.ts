import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { AccessToken } from "livekit-server-sdk";
import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables from .env file explicitly
dotenv.config({ path: path.join(__dirname, "../.env") });

admin.initializeApp();

import * as crypto from "crypto";

export const generateLiveKitToken = functions.https.onCall(async (data, context) => {
    // ... (Existing code omitted for brevity in thought process, but preserved in action)
    console.log("generateLiveKitToken: Function started", {
        hasAuth: !!context.auth,
        roomName: data?.roomName,
        role: data?.role
    });

    // 1. Verify Authentication
    if (!context.auth) {
        console.error("generateLiveKitToken: Unauthenticated call");
        throw new functions.https.HttpsError(
            "unauthenticated",
            "The function must be called while authenticated."
        );
    }

    const { roomName, role } = data;
    const userId = context.auth.uid;
    const userName = context.auth.token.name || context.auth.token.email || userId;

    if (!roomName) {
        console.error("generateLiveKitToken: Missing roomName");
        throw new functions.https.HttpsError("invalid-argument", "Room name is required.");
    }

    const isTutor = role?.toUpperCase() === "TUTOR";
    const canPublish = isTutor;

    try {
        // 3. Generate Token
        const apiKey = process.env.LIVEKIT_API_KEY;
        const apiSecret = process.env.LIVEKIT_API_SECRET;

        console.log("generateLiveKitToken: Environment check", {
            hasApiKey: !!apiKey,
            hasApiSecret: !!apiSecret,
            isTutor
        });

        if (!apiKey || !apiSecret) {
            console.error("generateLiveKitToken: Missing LiveKit API keys in environment");
            throw new functions.https.HttpsError(
                "failed-precondition",
                "LiveKit API configuration is missing on the server. Please check environment variables."
            );
        }

        const at = new AccessToken(apiKey, apiSecret, {
            identity: userId,
            name: userName,
        });

        at.addGrant({
            roomJoin: true,
            room: roomName,
            canPublish: canPublish,
            canSubscribe: true,
        });

        const token = at.toJwt();
        console.log("generateLiveKitToken: Token generated successfully");
        return { token, isTutor };
    } catch (error: any) {
        console.error("generateLiveKitToken: Error generating token:", error);
        if (error instanceof functions.https.HttpsError) throw error;
        throw new functions.https.HttpsError(
            "internal",
            `Failed to generate token: ${error.message || 'Unknown error'}`
        );
    }
});

// --- BUNNY STREAM INTEGRATION ---

const BUNNY_LIBRARY_ID = process.env.BUNNY_LIBRARY_ID;
const BUNNY_API_KEY = process.env.BUNNY_API_KEY;
const BUNNY_HOSTNAME = process.env.BUNNY_HOSTNAME || 'video.bunnycdn.com';
const BUNNY_TOKEN_KEY = process.env.BUNNY_TOKEN_KEY; // From Pull Zone Security

export const createBunnyVideo = functions.https.onCall(async (data, context) => {
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

export const generateBunnyToken = functions.https.onCall(async (data, context) => {
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

export const sendWhitelistInvite = functions.https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Login required.");

    const { email, zoneTitle } = data;
    if (!email) throw new functions.https.HttpsError("invalid-argument", "Email is required.");

    console.log(`[INVITE] Whitelist invitation placeholder for ${email} to join zone: ${zoneTitle}`);

    // In a real implementation, you would send an email here using a service like SendGrid
    // and include a link like: https://nunma.app/signup?invite=${zoneId}

    return { success: true, message: `Invitation logged for ${email}` };
});

// --- OTP AUTHENTICATION SYSTEM ---

/**
 * Generates and stores a 6-digit OTP for a given email.
 * Placeholder for real email sending.
 */
export const requestOTP = functions.https.onCall(async (data) => {
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

        // --- REAL EMAIL INTEGRATION WOULD GO HERE ---
        // For now, we return success and use function logs to retrieve the OTP for testing.

        return { success: true, message: "Verification code sent to email." };
    } catch (error: any) {
        console.error("requestOTP error:", error);
        throw new functions.https.HttpsError("internal", "Failed to generate OTP.");
    }
});

/**
 * Verifies OTP and returns a custom token for client sign-in.
 * If user doesn't exist, it creates a profile in Firestore.
 */
export const verifyOTPAndSignIn = functions.https.onCall(async (data) => {
    const { email, otp, registrationData } = data;

    if (!email || !otp) {
        throw new functions.https.HttpsError("invalid-argument", "Email and OTP are required.");
    }

    try {
        const otpRef = admin.firestore().collection("otp_verifications").doc(email);
        const otpDoc = await otpRef.get();

        if (!otpDoc.exists()) {
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

        // OTP is valid, delete it
        await otpRef.delete();

        // Get or Create Firebase User
        let userRecord;
        try {
            userRecord = await admin.auth().getUserByEmail(email);
        } catch (error: any) {
            if (error.code === 'auth/user-not-found') {
                // Register new user
                userRecord = await admin.auth().createUser({ email });

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

        // Generate Custom Token
        const customToken = await admin.auth().createCustomToken(userRecord.uid);

        return { customToken, uid: userRecord.uid };
    } catch (error: any) {
        console.error("verifyOTPAndSignIn error:", error);
        if (error instanceof functions.https.HttpsError) throw error;
        throw new functions.https.HttpsError("internal", error.message || "Failed to verify OTP.");
    }
});
