import React, { useState, useEffect } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../utils/firebase';

export default function SubscribeButton() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Dynamically load Razorpay checkout script
    useEffect(() => {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        document.body.appendChild(script);
        return () => {
            document.body.removeChild(script);
        };
    }, []);

    const handleSubscribe = async (e?: React.MouseEvent) => {
        if (e) e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            // 1. Call Backend to create Razorpay Order
            const createOrder = httpsCallable(functions, 'createRazorpayOrder');
            const result = await createOrder({
                amount: '100000', // ₹1,000 in paise
                tutorId: 'TEST_TUTOR_ID' // TODO: Replace with actual tutor ID from context/props
            });

            const orderData = result.data as any;

            if (!orderData || !orderData.id) {
                throw new Error("Failed to create Razorpay order.");
            }

            // 2. Initialize Razorpay Options
            const options = {
                key: process.env.REACT_APP_RAZORPAY_KEY_ID || 'TEST_KEY_ID', // Enter the Key ID generated from the Dashboard
                amount: orderData.amount, // Amount is in currency subunits. Default currency is INR. Hence, 50000 refers to 50000 paise
                currency: orderData.currency,
                name: "Nunma Academy",
                description: "Tutor Subscription Payment",
                image: "https://nunma.app/logo.png", // Replace with actual logo URL
                order_id: orderData.id, // This is a sample Order ID. Pass the `id` obtained in the response of Step 1
                handler: function (response: any) {
                    // This function handles the success callback. 
                    // To keep things simple currently, just alert.
                    // Ideally, verify the payment signature on the backend as well.
                    alert(`Payment Successful! Payment ID: ${response.razorpay_payment_id}`);
                    console.log("Razorpay Success Response:", response);
                },
                prefill: {
                    name: "Test Student",
                    email: "student@example.com",
                    contact: "9999999999"
                },
                theme: {
                    color: "#040457"
                }
            };

            // 3. Open Razorpay Checkout Modal
            const rzp = new (window as any).Razorpay(options);

            rzp.on('payment.failed', function (response: any) {
                console.error("Payment Failed:", response.error);
                setError(`Payment Failed: ${response.error.description}`);
            });

            rzp.open();

        } catch (err: any) {
            console.error("Subscription error:", err);
            setError(err.message || "An unexpected error occurred. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center gap-4">
            <button
                onClick={handleSubscribe}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors disabled:opacity-50"
            >
                {isLoading ? 'Processing...' : 'Subscribe Now'}
            </button>
            {error && (
                <p className="text-red-500 text-sm mt-2">{error}</p>
            )}
        </div>
    );
}
