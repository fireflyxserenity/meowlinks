const express = require('express');
const fs = require('fs');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Twitch API Configuration
const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID || 'i8doijnvc4wkt0q5et2fb7ucb7mng7';
const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET; // Required
const BOT_USERNAME = process.env.BOT_USERNAME || 'your_bot_username';
const BOT_ACCESS_TOKEN = process.env.BOT_ACCESS_TOKEN;

// Validate required environment variables
if (!TWITCH_CLIENT_SECRET) {
    console.error('ERROR: TWITCH_CLIENT_SECRET environment variable is required');
    process.exit(1);
}

// Route to handle authorization code exchange and bot joining
app.post('/api/authorize-bot', async (req, res) => {
    try {
        const { code, redirect_uri } = req.body;
        
        console.log('Received authorization request:', { code: code?.substring(0, 8) + '...', redirect_uri });
        
        // Step 1: Exchange authorization code for access token
        const tokenResponse = await axios.post('https://id.twitch.tv/oauth2/token', {
            client_id: TWITCH_CLIENT_ID,
            client_secret: TWITCH_CLIENT_SECRET,
            code: code,
            grant_type: 'authorization_code',
            redirect_uri: redirect_uri
        });
        
        const { access_token } = tokenResponse.data;
        console.log('Got access token for user');
        
        // Step 2: Get user information
        const userResponse = await axios.get('https://api.twitch.tv/helix/users', {
            headers: {
                'Authorization': `Bearer ${access_token}`,
                'Client-Id': TWITCH_CLIENT_ID
            }
        });
        
        const userData = userResponse.data.data[0];
        console.log('User data:', userData.display_name);
        
        // Step 3: Join the user's channel with your bot
        // This requires your bot to be running and connected to Twitch IRC
        await joinChannel(userData.login);
        
        res.json({
            success: true,
            message: 'Bot successfully added to channel',
            channel: userData.display_name,
            user_id: userData.id
        });
        
    } catch (error) {
        console.error('Authorization error:', error.response?.data || error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to process authorization',
            details: error.response?.data || error.message
        });
    }
});

// Function to join a channel (you'll need to implement this with your bot logic)
async function joinChannel(channelName) {
    // Save the channel name to a file for the bot to read and join
    const filePath = './channels_to_join.txt';
    try {
        // Append channel name if not already present
        let channels = [];
        if (fs.existsSync(filePath)) {
            channels = fs.readFileSync(filePath, 'utf-8').split('\n').map(c => c.trim()).filter(Boolean);
        }
        if (!channels.includes(channelName)) {
            fs.appendFileSync(filePath, channelName + '\n');
            console.log(`Added channel to join list: ${channelName}`);
        } else {
            console.log(`Channel already in join list: ${channelName}`);
        }
    } catch (err) {
        console.error('Error writing channel to file:', err);
    }
    return true;
}

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Meow Bot Auth API is running' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Meow Bot Auth API running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;
