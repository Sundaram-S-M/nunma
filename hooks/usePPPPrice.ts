import { useState, useEffect } from 'react';
import { PPP_RATES, EXCHANGE_RATES } from '../config/ppp_rates';

interface PPPPrice {
    price: string;
    currency: string;
    isPPPApplied: boolean;
    originalPrice: string;
    countryCode: string;
    isLoading: boolean;
}

export const usePPPPrice = (baseUSD: number | string): PPPPrice => {
    const [pppData, setPPPData] = useState<PPPPrice>({
        price: baseUSD.toString(),
        currency: 'USD',
        isPPPApplied: false,
        originalPrice: baseUSD.toString(),
        countryCode: '',
        isLoading: true,
    });

    useEffect(() => {
        const fetchCountry = async () => {
            try {
                const response = await fetch('https://ipapi.co/json/');
                const data = await response.json();
                const countryCode = data.country_code;
                const discountFactor = PPP_RATES[countryCode] || 1.0;

                let finalPrice = Number(baseUSD);
                let currency = 'USD';
                let isPPPApplied = false;

                if (countryCode === 'IN' && discountFactor < 1.0) {
                    // Apply PPP for India
                    finalPrice = finalPrice * discountFactor * EXCHANGE_RATES['INR'];
                    currency = 'INR';
                    isPPPApplied = true;
                }

                setPPPData({
                    price: isPPPApplied ? Math.round(finalPrice).toString() : baseUSD.toString(),
                    currency,
                    isPPPApplied,
                    originalPrice: baseUSD.toString(),
                    countryCode,
                    isLoading: false
                });

            } catch (error) {
                console.error("Failed to fetch country for PPP:", error);
                setPPPData(prev => ({ ...prev, isLoading: false }));
            }
        };

        fetchCountry();
    }, [baseUSD]);

    return pppData;
};
