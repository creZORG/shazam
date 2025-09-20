
'use server';

import { format } from 'date-fns';

interface StkPushPayload {
    phoneNumber: string;
    amount: number;
    orderId: string;
}

// Function to get Daraja API access token
async function getAccessToken(): Promise<string | null> {
    const consumerKey = process.env.MPESA_CONSUMER_KEY;
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET;

    if (!consumerKey || !consumerSecret) {
        console.error("M-Pesa consumer key or secret is not set.");
        return null;
    }

    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
    
    try {
        const response = await fetch('https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${auth}`
            }
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error('Failed to get M-Pesa access token:', response.status, errorBody);
            return null;
        }

        const data = await response.json();
        return data.access_token;
    } catch (error) {
        console.error('Error fetching M-Pesa access token:', error);
        return null;
    }
}


/**
 * Initiates an STK push request to the Safaricom Daraja API.
 */
export async function initiateStkPush(payload: StkPushPayload): Promise<{ success: boolean; checkoutRequestId?: string; error?: string; }> {
    console.log("Attempting to initiate STK push for:", payload);
    
    const accessToken = await getAccessToken();
    if (!accessToken) {
        return { success: false, error: "Could not authenticate with M-Pesa API." };
    }

    const shortcode = process.env.MPESA_SHORTCODE;
    const passkey = process.env.MPESA_PASSKEY;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;

    if (!appUrl) {
      return { success: false, error: "NEXT_PUBLIC_APP_URL environment variable is not set. Cannot determine callback URL." };
    }

    const callbackURL = `${appUrl}/api/mpesa-callback`;
    console.log("Using M-Pesa Callback URL:", callbackURL);


    if (!shortcode || !passkey || !callbackURL) {
        return { success: false, error: "M-Pesa shortcode, passkey, or callback URL is not configured." };
    }

    const timestamp = format(new Date(), 'yyyyMMddHHmmss');
    const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');

    // Format phone number to Safaricom's required format
    let formattedPhoneNumber = payload.phoneNumber.startsWith('+') ? payload.phoneNumber.substring(1) : payload.phoneNumber;
    if (formattedPhoneNumber.startsWith('0')) {
        formattedPhoneNumber = `254${formattedPhoneNumber.substring(1)}`;
    }

    const requestBody = {
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline', // or 'CustomerBuyGoodsOnline'
        Amount: payload.amount,
        PartyA: formattedPhoneNumber,
        PartyB: shortcode,
        PhoneNumber: formattedPhoneNumber,
        CallBackURL: callbackURL,
        AccountReference: payload.orderId,
        TransactionDesc: `Payment for order ${payload.orderId}`
    };

    try {
        const response = await fetch('https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify(requestBody),
        });

        const data = await response.json();

        if (response.ok && (data.ResponseCode === '0' || !data.ResponseCode)) {
             console.log("STK Push initiated successfully:", data);
            return {
                success: true,
                checkoutRequestId: data.CheckoutRequestID
            };
        } else {
             console.error("STK Push initiation failed:", data);
            const errorMessage = data.errorMessage || 'Failed to initiate M-Pesa payment.';
            return {
                success: false,
                error: `${errorMessage} (Callback URL used: ${callbackURL})`
            };
        }

    } catch (error) {
        console.error("Error during STK push initiation:", error);
        return { success: false, error: 'An unexpected server error occurred.' };
    }
}

    