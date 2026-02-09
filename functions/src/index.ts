import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { AccessToken } from "livekit-server-sdk";
import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables from .env file explicitly
dotenv.config({ path: path.join(__dirname, "../.env") });

admin.initializeApp();

export const generateLiveKitToken = functions.https.onCall(async (data, context) => {
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

    const isTutor = role === "Tutor" || role === "TUTOR";
    const canPublish = isTutor;

    try {
        // 3. Generate Token
        const apiKey = process.env.LIVEKIT_API_KEY;
        const apiSecret = process.env.LIVEKIT_API_SECRET;

        console.log("generateLiveKitToken: Environment check", {
            hasApiKey: !!apiKey,
            hasApiSecret: !!apiSecret
        });

        if (!apiKey || !apiSecret) {
            console.error("generateLiveKitToken: Missing LiveKit API keys in environment");
            throw new Error("LiveKit API configuration is missing on the server.");
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
        throw new functions.https.HttpsError(
            "internal",
            `Failed to generate token: ${error.message || 'Unknown error'}`
        );
    }
});
