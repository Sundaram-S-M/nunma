import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X, Shield, Zap, Crown, ArrowRight } from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../utils/firebase';

const PricingPage: React.FC = () => {
    const navigate = useNavigate();
    const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
    const razorpayScriptReady = useRef(false);

    // Dynamically load Razorpay checkout script and track when it's ready
    useEffect(() => {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        script.onload = () => { razorpayScriptReady.current = true; };
        script.onerror = () => {
            alert('Failed to load Razorpay payment script. Check your connection.');
        };
        document.body.appendChild(script);
        return () => {
            razorpayScriptReady.current = false;
            document.body.removeChild(script);
        };
    }, []);

    const handleCheckout = async (e: React.MouseEvent, planId: string, amountPaise: number) => {
        e.preventDefault();
        setCheckoutLoading(planId);
        try {
            if (!razorpayScriptReady.current || !(window as any).Razorpay) {
                throw new Error('Razorpay payment script has not loaded yet. Please wait and try again.');
            }
            const createOrder = httpsCallable(functions, 'createRazorpayOrder');
            const result = await createOrder({ amount: String(amountPaise), planId });
            const orderData = result.data as any;
            if (!orderData || !orderData.id) {
                throw new Error('Failed to create Razorpay order. The server returned an invalid response.');
            }
            const options = {
                key: import.meta.env.VITE_RAZORPAY_KEY_ID || import.meta.env.VITE_RAZORPAY_KEY || 'TEST_KEY_ID',
                amount: orderData.amount,
                currency: orderData.currency,
                name: 'Nunma Academy',
                description: `${planId.charAt(0).toUpperCase() + planId.slice(1)} Plan Subscription`,
                image: 'https://nunma.app/logo.png',
                order_id: orderData.id,
                handler: function (response: any) {
                    alert(`Payment Successful! Payment ID: ${response.razorpay_payment_id}`);
                    console.log('Razorpay Success Response:', response);
                },
                prefill: { name: '', email: '', contact: '' },
                theme: { color: '#040457' },
            };
            const rzp = new (window as any).Razorpay(options);
            rzp.on('payment.failed', function (response: any) {
                console.error('Payment Failed:', response.error);
                alert(`Payment failed: ${response.error.description}`);
            });
            rzp.open();
        } catch (err: any) {
            console.error('Razorpay Order Error:', err);
            alert(`Checkout failed to initialize. Check the console for details.\n\nError: ${err.message || 'Unknown error'}`);
        } finally {
            setCheckoutLoading(null);
        }
    };

    const tiers = [
        {
            id: 'starter',
            name: 'Starter',
            badge: 'The Trojan Horse',
            price: '₹0',
            period: '/ month',
            description: 'Get hooked on the platform. Perfect for trying out the core features.',
            icon: <Shield className="w-6 h-6 text-gray-400" />,
            color: 'gray',
            features: [
                { name: '10% Platform Fee per transaction', included: true, highlight: true },
                { name: 'Max 100 Students', included: true },
                { name: '10 Streams / month (Up to 150 hours!)', included: true },
                { name: '3 GB Persistent Storage', included: true },
                { name: 'Add-ons Available', included: false },
            ],
            buttonText: 'Current Plan',
            buttonAction: (e: React.MouseEvent) => { e.preventDefault(); navigate('/dashboard'); },
            buttonVariant: 'outline',
        },
        {
            id: 'standard',
            name: 'Standard',
            badge: 'The Profit Engine',
            price: '₹1,499',
            period: '/ month',
            description: 'The sweet spot for the serious, everyday tutor.',
            icon: <Zap className="w-6 h-6 text-[#c2f575]" />,
            color: 'lime',
            popular: true,
            features: [
                { name: '5% Platform Fee per transaction', included: true, highlight: true },
                { name: 'Max 250 Students', included: true },
                { name: '25 Streams / month (Up to 375 hours!)', included: true },
                { name: '15 GB Persistent Storage', included: true },
                { name: 'Add-ons Available', included: true },
            ],
            buttonText: checkoutLoading === 'standard' ? 'Processing...' : 'Upgrade to Standard',
            buttonAction: (e: React.MouseEvent) => handleCheckout(e, 'standard', 149900), // ₹1,499 in paise
            buttonVariant: 'primary',
        },
        {
            id: 'premium',
            name: 'Premium',
            badge: 'The Heavyweight',
            price: '₹4,999',
            period: '/ month',
            description: 'For established coaching centers running daily batches.',
            icon: <Crown className="w-6 h-6 text-purple-400" />,
            color: 'purple',
            features: [
                { name: '2% Platform Fee per transaction', included: true, highlight: true },
                { name: 'Max 1,000 Students', included: true },
                { name: '60 Streams / month (Up to 900 hours!)', included: true },
                { name: '30 GB Persistent Storage', included: true },
                { name: 'Add-ons Available', included: true },
            ],
            buttonText: checkoutLoading === 'premium' ? 'Processing...' : 'Upgrade to Premium',
            buttonAction: (e: React.MouseEvent) => handleCheckout(e, 'premium', 499900), // ₹4,999 in paise
            buttonVariant: 'dark',
        }
    ];

    return (
        <div className="min-h-screen bg-[#fbfbfb] py-16 px-4 sm:px-6 lg:px-8 animate-in fade-in duration-500">
            <div className="max-w-7xl mx-auto">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <h2 className="text-[#c2f575] font-black tracking-widest uppercase text-sm mb-4">Pricing Plans</h2>
                    <h1 className="text-4xl md:text-6xl font-black text-[#040457] tracking-tighter mb-6">
                        Scale Your Teaching Empire
                    </h1>
                    <p className="text-xl text-gray-500 font-medium">
                        Choose the perfect plan to grow your audience and maximize your earnings.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">
                    {tiers.map((tier) => (
                        <div
                            key={tier.id}
                            className={`
                relative flex flex-col rounded-[2.5rem] bg-white p-8 
                ${tier.popular ? 'border-2 border-[#c2f575] shadow-2xl scale-105 z-10' : 'border border-gray-100 shadow-xl'}
                hover:shadow-2xl transition-all duration-300
              `}
                        >
                            {tier.popular && (
                                <div className="absolute top-0 right-10 -translate-y-1/2">
                                    <span className="bg-[#c2f575] text-[#040457] text-xs font-black uppercase tracking-widest py-2 px-4 rounded-full shadow-lg">
                                        Most Popular
                                    </span>
                                </div>
                            )}

                            <div className="mb-8">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-2xl font-black text-[#040457]">{tier.name}</h3>
                                    <div className={`
                    w-12 h-12 rounded-2xl flex items-center justify-center
                    ${tier.color === 'lime' ? 'bg-[#c2f575]/20' :
                                            tier.color === 'purple' ? 'bg-purple-100' : 'bg-gray-100'}
                  `}>
                                        {tier.icon}
                                    </div>
                                </div>
                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">
                                    "{tier.badge}"
                                </div>
                                <div className="flex items-baseline gap-2 mb-4">
                                    <span className="text-5xl font-black text-[#040457] tracking-tight">{tier.price}</span>
                                    <span className="text-gray-400 font-medium">{tier.period}</span>
                                </div>
                                <p className="text-sm text-gray-500 font-medium min-h-[40px]">
                                    {tier.description}
                                </p>
                            </div>

                            <div className="flex-1 space-y-4 mb-8">
                                {tier.features.map((feature, index) => (
                                    <div key={index} className="flex items-start gap-3">
                                        <div className={`mt-1 shrink-0 ${feature.included ? 'text-green-500' : 'text-gray-300'}`}>
                                            {feature.included ? <Check size={18} strokeWidth={3} /> : <X size={18} strokeWidth={3} />}
                                        </div>
                                        <span className={`text-sm ${feature.included ? 'text-gray-700 font-medium' : 'text-gray-400 line-through'} ${feature.highlight ? 'font-black text-[#040457]' : ''}`}>
                                            {feature.name}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={tier.buttonAction}
                                className={`
                  w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all
                  ${tier.buttonVariant === 'primary' ? 'bg-[#c2f575] text-[#040457] hover:bg-[#b0eb54] shadow-xl hover:shadow-[#c2f575]/40 hover:-translate-y-1' :
                                        tier.buttonVariant === 'dark' ? 'bg-[#040457] text-white hover:bg-black shadow-xl hover:shadow-[#040457]/40 hover:-translate-y-1' :
                                            'bg-white border-2 border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'}
                `}
                            >
                                {tier.buttonText}
                                {tier.buttonVariant !== 'outline' && <ArrowRight size={16} />}
                            </button>
                        </div>
                    ))}
                </div>

                <div className="mt-20 max-w-4xl mx-auto bg-indigo-50/50 rounded-[3rem] p-10 text-center border border-indigo-100">
                    <h3 className="text-2xl font-black text-[#040457] mb-4">Need more resources?</h3>
                    <p className="text-gray-600 font-medium mb-8 max-w-2xl mx-auto">
                        Standard and Premium users can easily purchase add-ons at any time to expand their limits without jumping to the next tier.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-6 justify-center">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex-1">
                            <h4 className="font-black text-[#040457] mb-2">Extra Storage Block</h4>
                            <p className="text-lg font-bold text-[#c2f575] mb-2">₹499 <span className="text-xs text-gray-400 font-normal">/ month</span></p>
                            <p className="text-sm text-gray-500">+50 GB Persistent Storage</p>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex-1">
                            <h4 className="font-black text-[#040457] mb-2">Extra Student Block</h4>
                            <p className="text-lg font-bold text-[#c2f575] mb-2">₹999 <span className="text-xs text-gray-400 font-normal">/ month</span></p>
                            <p className="text-sm text-gray-500">+50 Student Slots</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PricingPage;
