# Bot Status Integration Guide

Your website now displays live status indicators for all 3 bots. Here's what you need to add to each bot's code.

## What the Website Shows:
- **Green dot** = Bot is online ✅
- **Yellow dot** = Bot is under maintenance 🔧
- **Red dot** = Bot is offline ❌

Each bot periodically fetches status from your bot code, updating every 30 seconds.

---

## CAT CAFE ECONOMY BOT

Add this to your bot initialization code (where you connect to Discord):

```javascript
const express = require('express');
const app = express();

// Add this near your bot setup
let botStatus = 'offline';

client.on('ready', () => {
  botStatus = 'online';
  console.log(`Cat Cafe Bot logged in as ${client.user.tag}`);
});

client.on('disconnect', () => {
  botStatus = 'offline';
});

// Add this status endpoint (run on port 3001)
app.get('/api/status', (req, res) => {
  res.json({ status: botStatus });
});

const PORT = process.env.CAT_CAFE_PORT || 3001;
app.listen(PORT, () => {
  console.log(`Cat Cafe status server running on port ${PORT}`);
});
```

**To set maintenance mode**, add a command:
```javascript
// Slash command to toggle maintenance
client.on('interactionCreate', async (interaction) => {
  if (interaction.commandName === 'maintenance') {
    if (interaction.user.id !== 'YOUR_DISCORD_ID') return;
    
    const mode = interaction.options.getString('mode');
    botStatus = mode; // 'online', 'maintenance', or 'offline'
    await interaction.reply(`Status changed to: ${mode}`);
  }
});
```

---

## MEOW BOT

Add this to your bot code:

```javascript
const express = require('express');
const app = express();

let botStatus = 'offline';

client.on('ready', () => {
  botStatus = 'online';
  console.log(`Meow Bot logged in as ${client.user.tag}`);
});

client.on('disconnect', () => {
  botStatus = 'offline';
});

app.get('/api/status', (req, res) => {
  res.json({ status: botStatus });
});

const PORT = process.env.MEOW_BOT_PORT || 3002;
app.listen(PORT, () => {
  console.log(`Meow Bot status server running on port ${PORT}`);
});
```

---

## MEOW MANAGER

Add this to your bot code:

```javascript
const express = require('express');
const app = express();

let botStatus = 'offline';

client.on('ready', () => {
  botStatus = 'online';
  console.log(`Meow Manager logged in as ${client.user.tag}`);
});

client.on('disconnect', () => {
  botStatus = 'offline';
});

app.get('/api/status', (req, res) => {
  res.json({ status: botStatus });
});

const PORT = process.env.MEOW_MANAGER_PORT || 3003;
app.listen(PORT, () => {
  console.log(`Meow Manager status server running on port ${PORT}`);
});
```

---

## Setup Instructions

1. **Add Express.js to your bot dependencies:**
   ```bash
   npm install express
   ```

2. **Update your bot's main file** with one of the code snippets above (depending on which bot)

3. **Set environment variables** (optional - uses defaults if not set):
   ```
   CAT_CAFE_PORT=3001
   MEOW_BOT_PORT=3002
   MEOW_MANAGER_PORT=3003
   ```

4. **Test the status endpoint:**
   - Cat Cafe: `http://localhost:3001/api/status`
   - Meow Bot: `http://localhost:3002/api/status`
   - Meow Manager: `http://localhost:3003/api/status`

   Should return: `{"status":"online"}` (or "offline"/"maintenance")

5. **For maintenance mode**, you can:
   - Use a slash command (example code above)
   - Manually set `botStatus = 'maintenance'` before deploying updates

---

## CORS Note

If your website is on a different domain, you may need to add CORS headers:

```javascript
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
```

---

## Testing

Once set up, your website will automatically:
- Show "Loading..." initially
- Update to "Online" when bot connects
- Update to "Offline" if bot disconnects
- Show "Maintenance" if you set that status
- Refresh every 30 seconds

**No changes needed to your website code** - it's already configured to fetch from ports 3001, 3002, 3003!
