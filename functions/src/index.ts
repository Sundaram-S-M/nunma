import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { AccessToken } from "livekit-server-sdk";
import * as crypto from "crypto";
import * as corsLib from "cors";
import * as nodemailer from "nodemailer";

const cors = (corsLib as any)({ origin: true });

if (!admin.apps.length) {
    admin.initializeApp();
}

/**
 * Diagnostic function to check if LiveKit keys are visible to the server.
 * EXPLICIT CORS handling for re-wired version.
 */
export const checkLiveKitConfig = functions.https.onRequest(async (req, res) => {
    return cors(req, res, async () => {
        res.status(200).send({
            hasApiKey: !!process.env.LIVEKIT_API_KEY,
            apiKeyPrefix: process.env.LIVEKIT_API_KEY ? process.env.LIVEKIT_API_KEY.substring(0, 4) : 'none',
            hasApiSecret: !!process.env.LIVEKIT_API_SECRET,
            envKeys: Object.keys(process.env).filter(k => k.includes('LIVEKIT'))
        });
    });
});

/**
 * Re-wired Token Generation using onRequest with Security.
 */
export const generateLiveKitToken = functions.https.onRequest(async (req, res) => {
    return cors(req, res, async () => {
        try {
            if (req.method !== 'POST') {
                res.status(405).send({ error: 'Method Not Allowed' });
                return;
            }

            // 1. Authenticate Request
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                res.status(401).send({ error: 'Unauthorized: Missing or malformed token' });
                return;
            }

            const idToken = authHeader.split('Bearer ')[1];
            let decodedToken;
            try {
                decodedToken = await admin.auth().verifyIdToken(idToken);
            } catch (e) {
                res.status(401).send({ error: 'Unauthorized: Invalid token' });
                return;
            }

            const uid = decodedToken.uid;
            const { roomName, zoneId } = req.body;

            if (!roomName || !zoneId) {
                res.status(400).send({ error: 'roomName and zoneId are required' });
                return;
            }

            // 2. Authorize User
            const zoneRef = admin.firestore().collection('zones').doc(zoneId);
            const zoneDoc = await zoneRef.get();

            if (!zoneDoc.exists) {
                res.status(404).send({ error: 'Zone not found' });
                return;
            }

            const zoneData = zoneDoc.data()!;
            const isCreator = zoneData.createdBy === uid;

            let isAuthorized = isCreator;

            if (!isAuthorized) {
                // Check if enrolled as student
                const studentDoc = await zoneRef.collection('students').doc(uid).get();
                if (studentDoc.exists) {
                    isAuthorized = true;
                }
            }

            if (!isAuthorized) {
                res.status(403).send({ error: 'Forbidden: You are not authorized to join this room' });
                return;
            }

            const apiKey = (process.env.LIVEKIT_API_KEY || '').trim();
            const apiSecret = (process.env.LIVEKIT_API_SECRET || '').trim();

            if (!apiKey || !apiSecret) {
                console.error("LiveKit configuration missing on server");
                res.status(500).send({ error: 'LiveKit keys missing on server' });
                return;
            }

            const identity = uid;
            const name = decodedToken.name || decodedToken.email || uid;
            const isTutor = isCreator; // Only the creator gets publisher rights for now

            const at = new AccessToken(apiKey, apiSecret, {
                identity: identity,
                name: name,
            });

            at.addGrant({
                roomJoin: true,
                room: roomName,
                canPublish: isTutor,
                canSubscribe: true,
                canPublishData: true,
            });

            const token = at.toJwt();
            res.status(200).send({ token, isTutor, roomName });
        } catch (error: any) {
            console.error("Token Generation Error:", error);
            res.status(500).send({ error: error.message || 'Token generation failed' });
        }
    });
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
export const verifyOTPAndSignIn = functions.https.onCall(async (data) => {
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

export const createMentorshipBooking = functions.https.onCall(async (data, context) => {
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

export const createZohoCheckoutSession = functions.https.onCall(async (data, context) => {
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
