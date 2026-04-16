const { MongoClient } = require('mongodb');
const { uploadSessionToGitHub, getSessionFromGitHub } = require('./github-storage');

let client = null;
let db = null;
let indexesCreated = false;

async function connectDB() {
    if (db) return db;
    
    try {
        const uri = process.env.MONGODB_URI || 
  'mongodb+srv://darexmucheri:cMd7EoTwGglJGXwR@cluster0.uwf6z.mongodb.net/gh?retryWrites=true&w=majority&appName=Cluster0';

        if (!uri) {
            throw new Error('MONGODB_URI environment variable is not set');
        }

        client = new MongoClient(uri);
        await client.connect();
        db = client.db('sessions_db');
        console.log('Connected to MongoDB successfully');
        
        if (!indexesCreated) {
            await ensureIndexes();
            indexesCreated = true;
        }
        
        return db;
    } catch (error) {
        console.error('MongoDB connection error:', error);
        throw error;
    }
}

async function ensureIndexes() {
    try {
        const database = await connectDB();
        const sessions = database.collection('sessions');
        
        await sessions.createIndex({ sessionId: 1 }, { unique: true });
        await sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
        
        console.log('MongoDB indexes created successfully');
    } catch (error) {
        console.error('Index creation error:', error);
    }
}

async function storeSession(sessionId, credsData, phoneNumber = null) {
    const database = await connectDB();
    const sessions = database.collection('sessions');
    
    try {
        console.log(`[DB] Attempting to store session: ${sessionId}`);
        
        // Upload to GitHub first
        const githubUrl = await uploadSessionToGitHub(sessionId, credsData);
        
        // Store mapping in MongoDB with shorter data
        const result = await sessions.insertOne({
            sessionId,
            githubUrl,
            phoneNumber,
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        });
        
        console.log(`[DB] Session mapping stored successfully: ${sessionId}`, result.insertedId);
        
        // Verify the session was stored
        const verification = await sessions.findOne({ sessionId });
        if (!verification) {
            throw new Error('Session storage verification failed');
        }
        
        return sessionId;
    } catch (error) {
        console.error(`[DB] Error storing session ${sessionId}:`, error);
        if (error.code === 11000) {
            throw new Error('SESSION_ID_DUPLICATE');
        }
        throw error;
    }
}

async function getSession(sessionId) {
    const database = await connectDB();
    const sessions = database.collection('sessions');
    
    const session = await sessions.findOne({ sessionId });
    
    if (!session) {
        return null;
    }
    
    // Fetch the actual session data from GitHub
    const sessionData = await getSessionFromGitHub(sessionId);
    return sessionData;
}

async function generateUniqueSessionId(length = 6) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    
    let sessionId;
    let maxAttempts = 10;
    let attempts = 0;
    
    while (attempts < maxAttempts) {
        sessionId = '';
        for (let i = 0; i < length; i++) {
            sessionId += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        
        try {
            const database = await connectDB();
            const sessions = database.collection('sessions');
            const existing = await sessions.findOne({ sessionId });
            
            if (!existing) {
                return sessionId;
            }
        } catch (error) {
            console.error('Error checking session ID uniqueness:', error);
        }
        
        attempts++;
    }
    
    throw new Error('Failed to generate unique session ID after maximum attempts');
}

async function getAllSessions() {
    const database = await connectDB();
    const sessions = database.collection('sessions');
    
    const allSessions = await sessions.find({}).toArray();
    return allSessions;
}

module.exports = {
    connectDB,
    storeSession,
    getSession,
    generateUniqueSessionId,
    getAllSessions
};
