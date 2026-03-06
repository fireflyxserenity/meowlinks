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

// Admin Panel Configuration
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'change_me_immediately';
const activeSessions = new Map(); // Store active sessions: token -> { createdAt, expiresAt }

// Validate required environment variables
if (!TWITCH_CLIENT_SECRET) {
    console.error('ERROR: TWITCH_CLIENT_SECRET environment variable is required');
    process.exit(1);
}

// ============ ADMIN AUTHENTICATION ENDPOINTS ============

// Verify admin password and create session
app.post('/api/admin/verify', (req, res) => {
    const { password } = req.body;
    
    if (password === ADMIN_PASSWORD) {
        // Generate a random token
        const token = require('crypto').randomBytes(32).toString('hex');
        const expiresAt = Date.now() + (24 * 60 * 60 * 1000); // 24 hour expiration
        
        activeSessions.set(token, { createdAt: Date.now(), expiresAt });
        
        res.json({ 
            success: true, 
            token: token,
            message: 'Authentication successful'
        });
    } else {
        res.status(401).json({ 
            success: false, 
            message: 'Invalid password' 
        });
    }
});

// Verify if a token is valid
function isValidToken(token) {
    if (!activeSessions.has(token)) return false;
    const session = activeSessions.get(token);
    if (Date.now() > session.expiresAt) {
        activeSessions.delete(token);
        return false;
    }
    return true;
}

// Middleware to check admin token
function requireAdminToken(req, res, next) {
    const token = req.headers['x-admin-token'];
    if (!token || !isValidToken(token)) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
}

// ============ BOT STATUS MANAGEMENT ============

// Load bot statuses from file
function loadBotStatuses() {
    const statusFile = './bot-statuses.json';
    try {
        if (fs.existsSync(statusFile)) {
            return JSON.parse(fs.readFileSync(statusFile, 'utf-8'));
        }
    } catch (err) {
        console.error('Error loading bot statuses:', err);
    }
    // Default statuses
    return {
        'cat-cafe': 'offline',
        'meow-bot': 'offline',
        'meow-manager': 'offline'
    };
}

// Save bot statuses to file
function saveBotStatuses(statuses) {
    const statusFile = './bot-statuses.json';
    try {
        fs.writeFileSync(statusFile, JSON.stringify(statuses, null, 2));
    } catch (err) {
        console.error('Error saving bot statuses:', err);
    }
}

let botStatuses = loadBotStatuses();

// Get all bot statuses
app.get('/api/bot-statuses', (req, res) => {
    res.json(botStatuses);
});

// Get single bot status
app.get('/api/bot-status/:botId', (req, res) => {
    const { botId } = req.params;
    if (botStatuses.hasOwnProperty(botId)) {
        res.json({ botId, status: botStatuses[botId] });
    } else {
        res.status(404).json({ error: 'Bot not found' });
    }
});

// Set bot status (admin only)
app.post('/api/bot-status/:botId', requireAdminToken, (req, res) => {
    const { botId } = req.params;
    const { status } = req.body;
    
    if (!botStatuses.hasOwnProperty(botId)) {
        return res.status(404).json({ error: 'Bot not found' });
    }
    
    const validStatuses = ['online', 'offline', 'maintenance', 'purfecting'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }
    
    botStatuses[botId] = status;
    saveBotStatuses(botStatuses);
    
    res.json({ 
        success: true, 
        botId, 
        status: botStatuses[botId],
        message: `${botId} status updated to ${status}`
    });
});

// ============ BOT STATUS ENDPOINTS ============
app.post('/api/authorize-bot', async (req, res) => {
    try {
        const { code, redirect_uri } = req.body;
        
        console.log('--- API REQUEST RECEIVED ---');
        console.log('Request body:', req.body);
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
        console.log('User data:', userData.display_name, userData.login);
        
        // Step 3: Join the user's channel with your bot
        console.log('About to call joinChannel with:', userData.login);
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
    console.log('--- ATTEMPTING TO WRITE TO FILE ---');
    console.log('Channel name:', channelName);
    console.log('File path:', filePath);
    try {
        // Append channel name if not already present
        let channels = [];
        if (fs.existsSync(filePath)) {
            channels = fs.readFileSync(filePath, 'utf-8').split('\n').map(c => c.trim()).filter(Boolean);
            console.log('Existing channels in file:', channels);
        } else {
            console.log('File does not exist, will create new one');
        }
        if (!channels.includes(channelName)) {
            fs.appendFileSync(filePath, channelName + '\n');
            console.log(`Successfully added channel to join list: ${channelName}`);
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
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Meow Bot Auth API running on port ${PORT} and listening on all interfaces`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;
