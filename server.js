const express = require('express');
const https = require('https');
const { twiml: { VoiceResponse } } = require('twilio');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

const ULTRAVOX_API_KEY = process.env.ULTRAVOX_API_KEY;
const ULTRAVOX_API_URL = 'https://api.ultravox.ai/api/calls';

const ULTRAVOX_CALL_CONFIG = {
  model: 'fixie-ai/ultravox',
  voice: 'Tanya-English',
  firstSpeaker: {
    agent: 'd854cd64-d94e-4d1b-9ea1-4fd0dc739364'
  },
  medium: {
    "twilio": {}
  }
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
console.log('UltraVox call response:', ultravoxCall);

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
app.post('/', async (req, res) => {
  try {
    const twiml = new VoiceResponse();

    // Trigger UltraVox Call
    await createUltravoxCall();

    // Respond with TwiML to speak to caller
    twiml.say('Connecting you now. Please hold.');

    res.type('text/xml');
    res.send(twiml.toString());
  } catch (error) {
    console.error('Error handling incoming root POST:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
