import React, { useState, useEffect, useRef } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../utils/firebase';

export default function SubscribeButton() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const razorpayScriptReady = useRef(false);

    // Dynamically load Razorpay checkout script and track when it's ready
    useEffect(() => {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        script.onload = () => { razorpayScriptReady.current = true; };
        script.onerror = () => {
            alert('Failed to load Razorpay payment script. Please check your internet connection and try again.');
        };
        document.body.appendChild(script);
        return () => {
            razorpayScriptReady.current = false;
            document.body.removeChild(script);
        };
    }, []);

    const handleSubscribe = async (e?: React.MouseEvent) => {
        if (e) e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            // Guard: ensure the Razorpay script has fully loaded before proceeding
            if (!razorpayScriptReady.current || !(window as any).Razorpay) {
                throw new Error('Razorpay payment script has not loaded yet. Please wait a moment and try again.');
            }

            // 1. Call Backend to create Razorpay Order
            const createOrder = httpsCallable(functions, 'createRazorpayOrder');
            const result = await createOrder({
                amount: '100000', // ₹1,000 in paise
                tutorId: 'TEST_TUTOR_ID' // TODO: Replace with actual tutor ID from context/props
            });

            const orderData = result.data as any;

            if (!orderData || !orderData.id) {
                throw new Error('Failed to create Razorpay order. The server returned an invalid response.');
            }

            // 2. Initialize Razorpay Options
            const options = {
                key: import.meta.env.VITE_RAZORPAY_KEY_ID || import.meta.env.VITE_RAZORPAY_KEY || 'TEST_KEY_ID',
                amount: orderData.amount,
                currency: orderData.currency,
                name: 'Nunma Academy',
                description: 'Tutor Subscription Payment',
                image: 'https://nunma.app/logo.png',
                order_id: orderData.id,
                handler: function (response: any) {
                    alert(`Payment Successful! Payment ID: ${response.razorpay_payment_id}`);
                    console.log('Razorpay Success Response:', response);
                },
                prefill: {
                    name: 'Test Student',
                    email: 'student@example.com',
                    contact: '9999999999'
                },
                theme: {
                    color: '#040457'
                }
            };

            // 3. Open Razorpay Checkout Modal
            const rzp = new (window as any).Razorpay(options);

            rzp.on('payment.failed', function (response: any) {
                console.error('Payment Failed:', response.error);
                setError(`Payment Failed: ${response.error.description}`);
            });

            rzp.open();

        } catch (err: any) {
            console.error('Razorpay Order Error:', err);
            alert(`Checkout failed to initialize. Check the console for details.\n\nError: ${err.message || 'Unknown error'}`);
            setError(err.message || 'An unexpected error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center gap-4">
            <button
                onClick={handleSubscribe}
                disabled={isLoading}
                className="bg-[#1a1a4e] hover:shadow-[0_0_15px_#c2f575] text-white font-semibold py-2 px-6 rounded-lg transition-all disabled:opacity-50"
            >
                {isLoading ? 'Processing...' : 'Subscribe Now'}
            </button>
            {error && (
                <p className="text-red-500 text-sm mt-2">{error}</p>
            )}
        </div>
    );
}
