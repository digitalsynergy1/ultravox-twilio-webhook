const express = require('express');
const https = require('https');
const { twiml: { VoiceResponse } } = require('twilio');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

const ULTRAVOX_API_KEY = process.env.ULTRAVOX_API_KEY;
const ULTRAVOX_API_URL = 'https://api.ultravox.ai/api/calls';

const ULTRAVOX_CALL_CONFIG = {
    systemPrompt: 'You are a helpful phone support agent. Ask the caller their name and how you can help.',
    model: 'fixie-ai/ultravox',
    voice: 'Mark',
    temperature: 0.3,
    firstSpeaker: 'FIRST_SPEAKER_AGENT',
    medium: { "twilio": {} }
};

async function createUltravoxCall() {
    return new Promise((resolve, reject) => {
        const req = https.request(ULTRAVOX_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': ULTRAVOX_API_KEY
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        });

        req.on('error', reject);
        req.write(JSON.stringify(ULTRAVOX_CALL_CONFIG));
        req.end();
    });
}

app.post('/incoming', async (req, res) => {
    try {
        const ultravoxCall = await createUltravoxCall();
        const response = new VoiceResponse();
        const connect = response.connect();
        connect.stream({ url: ultravoxCall.joinUrl });
        res.type('text/xml');
        res.send(response.toString());
    } catch (error) {
        console.error('Error connecting to Ultravox:', error);
        const response = new VoiceResponse();
        response.say('Sorry, there was an error connecting your call.');
        res.type('text/xml');
        res.send(response.toString());
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
