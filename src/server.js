const express = require('express');
const twilio = require('twilio');
const OpenAI = require('openai');
const axios = require('axios');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

// Initialize services
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Store active calls
const activeCalls = new Map();

// Restaurant reservation caller endpoint
app.post('/make-reservation', async (req, res) => {
  try {
    const { 
      restaurant_name, 
      restaurant_phone, 
      date, 
      time, 
      party_size, 
      special_requests = '' 
    } = req.body;

    console.log(`Starting reservation call for ${restaurant_name}`);

    // Generate call context
    const callContext = {
      restaurant_name,
      date,
      time,
      party_size,
      special_requests,
      caller_name: "Craig Aron",
      caller_phone: process.env.CRAIG_PHONE,
      conversation_state: "greeting",
      call_start: new Date().toISOString()
    };

    // Initiate Twilio call
    const call = await twilioClient.calls.create({
      to: restaurant_phone,
      from: process.env.TWILIO_PHONE_NUMBER,
      url: `${req.protocol}://${req.get('host')}/voice-handler`,
      statusCallback: `${req.protocol}://${req.get('host')}/call-status`,
      record: true
    });

    activeCalls.set(call.sid, callContext);

    res.json({
      success: true,
      call_id: call.sid,
      message: `Calling ${restaurant_name} for reservation`
    });

  } catch (error) {
    console.error('Error making reservation call:', error);
    res.status(500).json({ error: 'Failed to initiate call' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.listen(port, () => {
  console.log(`Restaurant caller service running on port ${port}`);
});

module.exports = app;
