const { Octokit } = require('@octokit/rest');

function validateGitHubConfig() {
    const token = process.env.GITHUB_TOKEN;
    const owner = process.env.GITHUB_USERNAME || 'darex-ofc';
    const repo = process.env.GITHUB_REPO || 'gh-creds';
    
    if (!token) {
        throw new Error('GITHUB_TOKEN environment variable is not set');
    }
    if (!owner) {
        throw new Error('GITHUB_USERNAME environment variable is not set');
    }
    if (!repo) {
        throw new Error('GITHUB_REPO environment variable is not set');
    }
    
    return { token, owner, repo };
}

const config = validateGitHubConfig();
const octokit = new Octokit({
    auth: config.token
});

const owner = config.owner;
const repo = config.repo;

async function uploadSessionToGitHub(sessionId, sessionData) {
    try {
        console.log(`[GitHub] Uploading session ${sessionId} to GitHub...`);
        
        const filePath = `sessions/${sessionId}.json`;
        const content = Buffer.from(JSON.stringify(sessionData, null, 2)).toString('base64');
        
        // Check if file already exists
        let sha = null;
        try {
            const { data: existingFile } = await octokit.rest.repos.getContent({
                owner,
                repo,
                path: filePath
            });
            sha = existingFile.sha;
            console.log(`[GitHub] File exists, will update it`);
        } catch (error) {
            if (error.status !== 404) {
                throw error;
            }
            console.log(`[GitHub] Creating new file`);
        }
        
        const params = {
            owner,
            repo,
            path: filePath,
            message: `Add session ${sessionId}`,
            content
        };
        
        if (sha) {
            params.sha = sha;
            params.message = `Update session ${sessionId}`;
        }
        
        await octokit.rest.repos.createOrUpdateFileContents(params);
        
        console.log(`[GitHub] Session ${sessionId} uploaded successfully`);
        
        // Return the raw GitHub URL for the session file
        const githubUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/sessions/${sessionId}.json`;
        return githubUrl;
        
    } catch (error) {
        console.error(`[GitHub] Error uploading session ${sessionId}:`, error.message);
        throw error;
    }
}

async function getSessionFromGitHub(sessionId) {
    try {
        console.log(`[GitHub] Fetching session ${sessionId} from GitHub...`);
        
        const filePath = `sessions/${sessionId}.json`;
        
        const { data } = await octokit.rest.repos.getContent({
            owner,
            repo,
            path: filePath
        });
        
        if (data.content) {
            const content = Buffer.from(data.content, 'base64').toString('utf-8');
            const sessionData = JSON.parse(content);
            console.log(`[GitHub] Session ${sessionId} retrieved successfully`);
            return sessionData;
        }
        
        return null;
    } catch (error) {
        if (error.status === 404) {
            console.log(`[GitHub] Session ${sessionId} not found`);
            return null;
        }
        console.error(`[GitHub] Error fetching session ${sessionId}:`, error.message);
        throw error;
    }
}

async function deleteSessionFromGitHub(sessionId) {
    try {
        console.log(`[GitHub] Deleting session ${sessionId} from GitHub...`);
        
        const filePath = `sessions/${sessionId}.json`;
        
        // Get the file SHA first
        const { data: file } = await octokit.rest.repos.getContent({
            owner,
            repo,
            path: filePath
        });
        
        await octokit.rest.repos.deleteFile({
            owner,
            repo,
            path: filePath,
            message: `Delete session ${sessionId}`,
            sha: file.sha
        });
        
        console.log(`[GitHub] Session ${sessionId} deleted successfully`);
        return true;
    } catch (error) {
        if (error.status === 404) {
            console.log(`[GitHub] Session ${sessionId} not found for deletion`);
            return false;
        }
        console.error(`[GitHub] Error deleting session ${sessionId}:`, error.message);
        throw error;
    }
}

module.exports = {
    uploadSessionToGitHub,
    getSessionFromGitHub,
    deleteSessionFromGitHub
};
