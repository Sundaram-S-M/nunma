/**
 * Razorpay Webhook Test Script
 * ----------------------------
 * This script simulates a Razorpay 'payment.captured' event.
 * Use it to verify that fulfillment logic (enrollment/subscription) works correctly.
 * 
 * Instructions:
 * 1. Ensure your functions emulator is running: firebase emulators:start --only functions
 * 2. Set the WEBHOOK_SECRET to match your local RAZORPAY_WEBHOOK_SECRET.
 * 3. Run: node scripts/test_razorpay_webhook.js
 */

const axios = require('axios');
const crypto = require('crypto');

const WEBHOOK_URL = 'http://localhost:5001/nunma-by-cursor/us-central1/razorpayWebhook';
const WEBHOOK_SECRET = 'your_local_webhook_secret_here'; // Must match RAZORPAY_WEBHOOK_SECRET

const payload = {
    event: 'payment.captured',
    payload: {
        payment: {
            entity: {
                id: 'pay_test_payment_id_123',
                order_id: 'order_test_order_id_123', // Update this to a real orderId from your Firestore
                amount: 149900,
                currency: 'INR',
                status: 'captured'
            }
        }
    }
};

const rawBody = JSON.stringify(payload);
const signature = crypto.createHmac('sha256', WEBHOOK_SECRET).update(rawBody).digest('hex');

async function testWebhook() {
    console.log(`[*] Sending signed webhook to ${WEBHOOK_URL}...`);
    try {
        const response = await axios.post(WEBHOOK_URL, payload, {
            headers: {
                'x-razorpay-signature': signature,
                'Content-Type': 'application/json'
            }
        });
        console.log('[+] Success:', response.data);
    } catch (error) {
        console.error('[!] Error:', error.response ? error.response.data : error.message);
    }
}

testWebhook();
