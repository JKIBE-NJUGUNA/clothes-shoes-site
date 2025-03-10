const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 5000;

// M-Pesa credentials from Daraja API
token_url = "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials";

const consumerKey = process.env.MPESA_CONSUMER_KEY;
const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
const shortCode = process.env.MPESA_SHORTCODE;
const passKey = process.env.MPESA_PASSKEY;
const callbackUrl = "https://yourdomain.com/callback";

// Function to get access token
async function getAccessToken() {
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
    
    try {
        const response = await axios.get(token_url, {
            headers: { Authorization: `Basic ${auth}` },
        });
        return response.data.access_token;
    } catch (error) {
        console.error("Error fetching access token", error);
        throw new Error("Failed to get access token");
    }
}

// Route to initiate payment
app.post("/stk-push", async (req, res) => {
    const { phone, amount } = req.body;
    if (!phone || !amount) return res.status(400).json({ error: "Phone and amount required" });
    
    try {
        const accessToken = await getAccessToken();
        const timestamp = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
        const password = Buffer.from(shortCode + passKey + timestamp).toString("base64");

        const stkRequest = {
            BusinessShortCode: shortCode,
            Password: password,
            Timestamp: timestamp,
            TransactionType: "CustomerPayBillOnline",
            Amount: amount,
            PartyA: phone,
            PartyB: shortCode,
            PhoneNumber: phone,
            CallBackURL: callbackUrl,
            AccountReference: "E-Commerce",
            TransactionDesc: "Payment for order"
        };
        
        const stkResponse = await axios.post("https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest", stkRequest, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        
        res.json(stkResponse.data);
    } catch (error) {
        console.error("M-Pesa STK Push Error", error);
        res.status(500).json({ error: "Failed to initiate payment" });
    }
});

app.listen(PORT, () => console.log(`M-Pesa server running on port ${PORT}`));
