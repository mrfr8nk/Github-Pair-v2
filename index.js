const express = require('express');
const path = require('path');
const app = express();
__path = process.cwd()
const bodyParser = require("body-parser");
const PORT = process.env.PORT || 5000;
const { 
  qrRoute,
  pairRoute,
  adminRoute
} = require('./routes');
const { getSession } = require('./db');
require('events').EventEmitter.defaultMaxListeners = 2000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));


app.use('/qr', qrRoute);
app.use('/code', pairRoute);
app.use('/admin', adminRoute);

app.get('/pair', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'pair.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


app.get('/health', (req, res) => {
    res.json({
        status: 200,
        success: true,
        service: 'subzero-Md Session',
        timestamp: new Date().toISOString()
    });
});

app.get('/session/:id', async (req, res) => {
    try {
        const sessionId = req.params.id;
        
        console.log(`[SESSION API] Received request for session ID: ${sessionId}`);
        
        if (!sessionId || sessionId.length !== 6) {
            console.log(`[SESSION API] Invalid session ID length: ${sessionId?.length}`);
            return res.status(400).json({ 
                error: 'Invalid session ID format. Expected 6 characters.' 
            });
        }
        
        const sessionData = await getSession(sessionId);
        
        if (!sessionData) {
            console.log(`[SESSION API] Session not found in database: ${sessionId}`);
            return res.status(404).json({ 
                error: 'Session not found or expired. Please generate a new session ID.',
                sessionId: sessionId
            });
        }
        
        console.log(`[SESSION API] Session found, returning data for: ${sessionId}`);
        res.json({
            success: true,
            sessionId: 'Ice*' + sessionId,
            session: sessionData
        });
    } catch (error) {
        console.error('[SESSION API] Error:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            details: error.message
        });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`
Deployment Successful!

 Sub CREDS Running on http://0.0.0.0:` + PORT)
})

module.exports = app
