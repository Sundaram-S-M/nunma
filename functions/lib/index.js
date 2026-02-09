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
exports.generateLiveKitToken = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const livekit_server_sdk_1 = require("livekit-server-sdk");
const dotenv = __importStar(require("dotenv"));
const path = __importStar(require("path"));
// Load environment variables from .env file explicitly
dotenv.config({ path: path.join(__dirname, "../.env") });
admin.initializeApp();
exports.generateLiveKitToken = functions.https.onCall(async (data, context) => {
    console.log("generateLiveKitToken: Function started", {
        hasAuth: !!context.auth,
        roomName: data === null || data === void 0 ? void 0 : data.roomName,
        role: data === null || data === void 0 ? void 0 : data.role
    });
    // 1. Verify Authentication
    if (!context.auth) {
        console.error("generateLiveKitToken: Unauthenticated call");
        throw new functions.https.HttpsError("unauthenticated", "The function must be called while authenticated.");
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
        const at = new livekit_server_sdk_1.AccessToken(apiKey, apiSecret, {
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
    }
    catch (error) {
        console.error("generateLiveKitToken: Error generating token:", error);
        throw new functions.https.HttpsError("internal", `Failed to generate token: ${error.message || 'Unknown error'}`);
    }
});
//# sourceMappingURL=index.js.map