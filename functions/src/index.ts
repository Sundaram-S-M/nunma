import * as functions from "firebase-functions";
import { onRequest, onCall } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as crypto from "crypto";
// import * as nodemailer from "nodemailer";
import * as jwt from "jsonwebtoken";
import axios from "axios";
import { PDFDocument } from "pdf-lib";
import { CloudTasksClient } from "@google-cloud/tasks";
import Razorpay from "razorpay";

if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();
const tasksClient = new CloudTasksClient();

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

// --- 100ms LIVE INTEGRATION ---

export const get100msToken = onCall(
    { secrets: ["HMS_ACCESS_KEY", "HMS_SECRET"] },
    async (request) => {
        const accessKey = process.env.HMS_ACCESS_KEY;
        const secret = process.env.HMS_SECRET;
        if (!accessKey || !secret) {
            throw new functions.https.HttpsError("failed-precondition", "100ms credentials not configured.");
        }
        const now = Math.floor(Date.now() / 1000);
        const payload = { access_key: accessKey, type: "app", version: 2, role: "broadcaster", room_id: "sandbox", user_id: request.auth?.uid || "guest", iat: now, nbf: now };
        const token = jwt.sign(payload, secret, { algorithm: "HS256", expiresIn: "24h" });
        return { token };
    }
);

// --- BUNNY STREAM INTEGRATION ---

export const createBunnyVideo = onCall(async (request) => {
    if (!request.auth) throw new functions.https.HttpsError("unauthenticated", "Login required.");
    const { title } = request.data;
    const libraryId = process.env.BUNNY_LIBRARY_ID;
    const apiKey = process.env.BUNNY_API_KEY;
    if (!libraryId || !apiKey) throw new functions.https.HttpsError("failed-precondition", "Bunny config missing.");

    const response = await axios.post(`https://video.bunnycdn.com/library/${libraryId}/videos`, { title: title || 'Untitled' }, { headers: { 'AccessKey': apiKey, 'Content-Type': 'application/json' } });
    return { videoId: response.data.guid };
});

// --- RAZORPAY & KYC STATE MANAGEMENT ---

export const createTutorLinkedAccount = onCall(
    { secrets: ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET"] },
    async (request) => {
        if (!request.auth) throw new functions.https.HttpsError("unauthenticated", "Login required.");
        const keyId = process.env.RAZORPAY_KEY_ID;
        const keySecret = process.env.RAZORPAY_KEY_SECRET;
        const uid = request.auth.uid;

        const { businessType: payloadBusinessType, legalName: payloadLegalName } = request.data || {};

        try {
            const tutorRef = db.collection("users").doc(uid);
            const tutorDoc = await tutorRef.get();
            const tutorData = tutorDoc.data();

            let accountId = tutorData?.razorpay_account_id;
            const authHeader = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`;

            if (!accountId) {
                const bType = payloadBusinessType || tutorData?.taxDetails?.businessType || "individual";
                const mappedBusinessType = bType === "registered" ? "proprietorship" : "individual";
                const mappedLegalName = payloadLegalName || tutorData?.taxDetails?.legalName || tutorData?.name || "Independent Tutor";

                const createPayload = {
                    email: tutorData?.email || request.auth.token.email,
                    type: "standard",
                    reference_id: uid,
                    legal_business_name: mappedLegalName,
                    business_type: mappedBusinessType,
                    profile: { category: "education", subcategory: "e_learning" }
                };
                const response = await axios.post('https://api.razorpay.com/v2/accounts', createPayload, { headers: { 'Authorization': authHeader } });
                accountId = response.data.id;
                await tutorRef.update({ razorpay_account_id: accountId, kycStatus: 'PENDING' });
            } else if (tutorData?.kycStatus !== 'VERIFIED') {
                await tutorRef.update({ kycStatus: 'PENDING' });
            }

            const linkResponse = await axios.post(`https://api.razorpay.com/v2/accounts/${accountId}/login_links`, {}, { headers: { 'Authorization': authHeader } });
            return { success: true, onboardingUrl: linkResponse.data.short_url || linkResponse.data.url };
        } catch (error: any) {
            console.error(error);
            throw new functions.https.HttpsError("internal", error.message);
        }
    }
);

export const createRazorpayOrder = onCall(
    { secrets: ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET"] },
    async (request) => {
        if (!request.auth) throw new functions.https.HttpsError("unauthenticated", "Login required.");
        const { zoneId } = request.data;
        const keyId = process.env.RAZORPAY_KEY_ID;
        const keySecret = process.env.RAZORPAY_KEY_SECRET;

        try {
            const zoneDoc = await db.collection("zones").doc(zoneId).get();
            const zoneData = zoneDoc.data()!;
            const tutorDoc = await db.collection("users").doc(zoneData.createdBy).get();
            const tutorData = tutorDoc.data()!;

            const gross_paise = Math.round(zoneData.price * 100);
            const commissionRate = tutorData.commissionRate ?? 0.10;
            const platform_fee_paise = Math.round(gross_paise * commissionRate);
            const statutory_tax_paise = Math.round(gross_paise * 0.006); // 0.1% TDS + 0.5% TCS
            const tutor_transfer_paise = gross_paise - platform_fee_paise - statutory_tax_paise;

            const razorpay = new Razorpay({ key_id: keyId!, key_secret: keySecret! });
            const order = await razorpay.orders.create({
                amount: gross_paise,
                currency: "INR",
                transfers: [{ account: tutorData.razorpay_account_id, amount: tutor_transfer_paise, currency: "INR" }],
                notes: { zoneId, studentId: request.auth.uid }
            });
            return { id: order.id, amount: order.amount };
        } catch (error: any) {
            throw new functions.https.HttpsError("failed-precondition", error.message || "Razorpay order creation rejected");
        }
    }
);

export const razorpayRouteWebhook = onRequest(
    { secrets: ["RAZORPAY_WEBHOOK_SECRET"] },
    async (req, res) => {
        const signature = req.headers['x-razorpay-signature'] as string;
        const secret = process.env.RAZORPAY_WEBHOOK_SECRET!;
        const hmac = crypto.createHmac('sha256', secret).update(JSON.stringify(req.body)).digest('hex');
        if (hmac !== signature) { res.status(400).send('Invalid Signature'); return; }

        const event = req.body.event;
        const payload = req.body.payload;

        if (event === 'account.activated') {
            const tutorId = payload.account.entity.reference_id;
            if (tutorId) await db.collection('users').doc(tutorId).update({ kycStatus: "VERIFIED", razorpay_account_id: payload.account.entity.id });
        } else if (event === 'account.rejected') {
            const tutorId = payload.account.entity.reference_id;
            if (tutorId) await db.collection('users').doc(tutorId).update({ kycStatus: "FAILED" });
        } else if (event === 'payment.captured') {
            // Trigger Zoho Invoicing via Cloud Tasks
            const project = process.env.GCLOUD_PROJECT;
            const queue = 'zoho-invoicing-queue';
            const location = 'us-central1';
            const url = `https://${location}-${project}.cloudfunctions.net/processZohoInvoice`;
            const parent = tasksClient.queuePath(project!, location, queue);
            await tasksClient.createTask({ parent, task: { httpRequest: { httpMethod: 'POST', url, body: Buffer.from(JSON.stringify(req.body)).toString('base64'), headers: { 'Content-Type': 'application/json' } } } });
        }
        res.status(200).send('OK');
    }
);

// --- ZOHO INVOICING WORKER ---

export const processZohoInvoice = onRequest(async (req, res) => {
    const payment = req.body.payload.payment.entity;
    const tutorId = payment.notes.tutorId;
    const tutorDoc = await db.collection('users').doc(tutorId).get();
    const tutorData = tutorDoc.data()!;
    const platformFee = parseInt(payment.notes.platformFee || '0');

    try {
        const refreshToken = process.env.ZOHO_REFRESH_TOKEN;
        const clientId = process.env.ZOHO_CLIENT_ID;
        const clientSecret = process.env.ZOHO_CLIENT_SECRET;
        const authRes = await axios.post("https://accounts.zoho.in/oauth/v2/token", null, { params: { refresh_token: refreshToken, client_id: clientId, client_secret: clientSecret, grant_type: "refresh_token" } });
        const accessToken = authRes.data.access_token;

        // Create Invoice in Zoho for Platform Commission
        await axios.post('https://books.zoho.in/api/v3/invoices', {
            customer_name: tutorData.name,
            line_items: [{ name: "Platform Commission", rate: platformFee / 100, quantity: 1 }],
            date: new Date().toISOString().split('T')[0]
        }, { headers: { 'Authorization': `Zoho-oauthtoken ${accessToken}`, 'X-com-zoho-invoice-organizationid': process.env.ZOHO_ORG_ID } });

        res.status(200).send('Invoice Processed');
    } catch (error: any) {
        console.error(error);
        res.status(500).send('Invoicing Failed');
    }
});

// --- PDF WATERMARKING ---

export const serveSecurePdf = onRequest({ cors: true }, async (req, res) => {
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
    { secrets: ["BUNNY_API_KEY"] },
    async (request) => {
        if (!request.auth) {
            throw new functions.https.HttpsError("unauthenticated", "Login required for account deletion.");
        }

        const uid = request.auth.uid;
        const libraryId = process.env.BUNNY_LIBRARY_ID;
        const apiKey = process.env.BUNNY_API_KEY;

        console.log(`Starting permanent deletion for user: ${uid}`);

        try {
            // 1. Cleanup Bunny.net Videos
            const tutorVideosSnapshot = await db.collection("tutor_videos").where("tutorId", "==", uid).get();
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
