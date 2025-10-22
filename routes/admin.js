
const express = require('express');
const { connectDB } = require('../db');
let router = express.Router();

router.post('/verify', (req, res) => {
    const { passcode } = req.body;
    if (passcode === 'darex123') {
        res.json({ success: true });
    } else {
        res.json({ success: false });
    }
});

router.post('/delete', async (req, res) => {
    try {
        const { sessionIds } = req.body;
        const database = await connectDB();
        const sessions = database.collection('sessions');
        
        const result = await sessions.deleteMany({ 
            sessionId: { $in: sessionIds } 
        });
        
        res.json({ 
            success: true, 
            deletedCount: result.deletedCount 
        });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/extend', async (req, res) => {
    try {
        const { sessionIds, months } = req.body;
        const database = await connectDB();
        const sessions = database.collection('sessions');
        
        const extensionMs = months * 30 * 24 * 60 * 60 * 1000;
        
        const result = await sessions.updateMany(
            { sessionId: { $in: sessionIds } },
            { $set: { expiresAt: new Date(Date.now() + extensionMs) } }
        );
        
        res.json({ 
            success: true, 
            modifiedCount: result.modifiedCount 
        });
    } catch (error) {
        console.error('Extend error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/', async (req, res) => {
    try {
        const database = await connectDB();
        const sessions = database.collection('sessions');
        
        const allSessions = await sessions.find({}).sort({ createdAt: -1 }).toArray();
        
        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin - Session Manager</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #000;
            color: #fff;
            padding: 20px;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
        }
        
        .header {
            background: rgba(255, 255, 255, 0.05);
            padding: 30px;
            border-radius: 12px;
            margin-bottom: 30px;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        h1 {
            font-size: 2rem;
            margin-bottom: 10px;
        }
        
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .stat-card {
            background: rgba(255, 255, 255, 0.05);
            padding: 20px;
            border-radius: 8px;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .stat-card h3 {
            color: #9ca3af;
            font-size: 0.875rem;
            margin-bottom: 8px;
        }
        
        .stat-card p {
            font-size: 2rem;
            font-weight: 700;
        }
        
        .search-box {
            width: 100%;
            padding: 12px 20px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            color: #fff;
            font-size: 1rem;
            margin-bottom: 20px;
        }
        
        .search-box:focus {
            outline: none;
            border-color: rgba(255, 255, 255, 0.3);
        }
        
        .action-bar {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
            flex-wrap: wrap;
        }
        
        .action-btn {
            padding: 10px 20px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.3s ease;
            font-size: 0.875rem;
        }
        
        .action-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        .btn-delete {
            background: #ef4444;
            color: #fff;
        }
        
        .btn-delete:hover:not(:disabled) {
            background: #dc2626;
        }
        
        .btn-extend {
            background: #10b981;
            color: #fff;
        }
        
        .btn-extend:hover:not(:disabled) {
            background: #059669;
        }
        
        .btn-select {
            background: rgba(255, 255, 255, 0.1);
            color: #fff;
        }
        
        .btn-select:hover {
            background: rgba(255, 255, 255, 0.2);
        }
        
        .table-container {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 12px;
            overflow: hidden;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
        }
        
        thead {
            background: rgba(255, 255, 255, 0.1);
        }
        
        th {
            padding: 15px;
            text-align: left;
            font-weight: 600;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        td {
            padding: 15px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
        
        tr:hover {
            background: rgba(255, 255, 255, 0.03);
        }
        
        .session-id {
            font-family: 'Courier New', monospace;
            background: rgba(255, 255, 255, 0.1);
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.875rem;
        }
        
        .phone-number {
            font-family: 'Courier New', monospace;
            color: #60a5fa;
            font-size: 0.875rem;
        }
        
        .copy-btn {
            background: #fff;
            color: #000;
            border: none;
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.875rem;
            font-weight: 600;
            transition: all 0.3s ease;
        }
        
        .copy-btn:hover {
            background: #e5e7eb;
            transform: translateY(-2px);
        }
        
        .date {
            color: #9ca3af;
            font-size: 0.875rem;
        }
        
        .no-data {
            text-align: center;
            padding: 60px 20px;
            color: #6b7280;
        }
        
        .expired {
            color: #ef4444;
            font-size: 0.75rem;
            font-weight: 600;
        }
        
        .active {
            color: #10b981;
            font-size: 0.75rem;
            font-weight: 600;
        }
        
        .checkbox-cell {
            width: 40px;
        }
        
        input[type="checkbox"] {
            width: 18px;
            height: 18px;
            cursor: pointer;
        }
        
        .modal {
            display: flex;
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.8);
            align-items: center;
            justify-content: center;
        }
        
        .modal-content {
            background: #1a1a1a;
            padding: 40px;
            border-radius: 12px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            max-width: 400px;
            width: 90%;
        }
        
        .modal-content h2 {
            margin-bottom: 20px;
            text-align: center;
        }
        
        .modal-content input {
            width: 100%;
            padding: 12px;
            margin-bottom: 20px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            color: #fff;
            font-size: 1rem;
        }
        
        .modal-content input:focus {
            outline: none;
            border-color: rgba(255, 255, 255, 0.3);
        }
        
        .modal-content button {
            width: 100%;
            padding: 12px;
            background: #fff;
            color: #000;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .modal-content button:hover {
            background: #e5e7eb;
        }
        
        .error-message {
            color: #ef4444;
            text-align: center;
            margin-bottom: 10px;
            font-size: 0.875rem;
        }
        
        .hidden {
            display: none !important;
        }
        
        @media (max-width: 768px) {
            .table-container {
                overflow-x: auto;
            }
            
            table {
                min-width: 1000px;
            }
        }
    </style>
</head>
<body>
    <div id="passcodeModal" class="modal">
        <div class="modal-content">
            <h2>🔐 Admin Access</h2>
            <p style="color: #9ca3af; text-align: center; margin-bottom: 20px;">Enter passcode to continue</p>
            <div id="errorMessage" class="error-message hidden"></div>
            <input type="password" id="passcodeInput" placeholder="Enter passcode" autocomplete="off">
            <button onclick="verifyPasscode()">Access Admin</button>
        </div>
    </div>

    <div id="mainContent" class="hidden">
        <div class="container">
            <div class="header">
                <h1>🔐 Session Manager</h1>
                <p style="color: #9ca3af; margin-top: 10px;">View and manage all SUBZERO MD sessions</p>
            </div>
            
            <div class="stats">
                <div class="stat-card">
                    <h3>Total Sessions</h3>
                    <p>${allSessions.length}</p>
                </div>
                <div class="stat-card">
                    <h3>Active Sessions</h3>
                    <p>${allSessions.filter(s => new Date(s.expiresAt) > new Date()).length}</p>
                </div>
                <div class="stat-card">
                    <h3>Expired Sessions</h3>
                    <p>${allSessions.filter(s => new Date(s.expiresAt) <= new Date()).length}</p>
                </div>
            </div>
            
            <input type="text" class="search-box" id="searchBox" placeholder="Search by Session ID or Phone Number...">
            
            <div class="action-bar">
                <button class="action-btn btn-select" onclick="selectAll()">Select All</button>
                <button class="action-btn btn-select" onclick="deselectAll()">Deselect All</button>
                <button class="action-btn btn-delete" id="deleteBtn" onclick="deleteSelected()" disabled>Delete Selected</button>
                <button class="action-btn btn-extend" id="extend1Btn" onclick="extendSelected(1)" disabled>Extend 1 Month</button>
                <button class="action-btn btn-extend" id="extend3Btn" onclick="extendSelected(3)" disabled>Extend 3 Months</button>
            </div>
            
            <div class="table-container">
                ${allSessions.length > 0 ? `
                <table id="sessionTable">
                    <thead>
                        <tr>
                            <th class="checkbox-cell"><input type="checkbox" id="selectAllCheckbox" onchange="toggleSelectAll()"></th>
                            <th>Session ID</th>
                            <th>Phone Number</th>
                            <th>Status</th>
                            <th>Created At</th>
                            <th>Expires At</th>
                            <th>Data Size</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${allSessions.map(session => {
                            const isExpired = new Date(session.expiresAt) <= new Date();
                            const dataSize = session.b64Data ? (session.b64Data.length / 1024).toFixed(2) : '0';
                            const phoneNumber = session.phoneNumber || 'N/A';
                            
                            return `
                            <tr data-session-id="${session.sessionId}">
                                <td class="checkbox-cell">
                                    <input type="checkbox" class="session-checkbox" value="${session.sessionId}" onchange="updateActionButtons()">
                                </td>
                                <td>
                                    <span class="session-id">Ice~${session.sessionId}</span>
                                </td>
                                <td>
                                    <span class="phone-number">${phoneNumber}</span>
                                </td>
                                <td>
                                    <span class="${isExpired ? 'expired' : 'active'}">
                                        ${isExpired ? '⚠️ EXPIRED' : '✅ ACTIVE'}
                                    </span>
                                </td>
                                <td class="date">${new Date(session.createdAt).toLocaleString()}</td>
                                <td class="date">${new Date(session.expiresAt).toLocaleString()}</td>
                                <td>${dataSize} KB</td>
                                <td>
                                    <button class="copy-btn" onclick="copySessionId('Darex~${session.sessionId}')">
                                        Copy ID
                                    </button>
                                </td>
                            </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
                ` : `
                <div class="no-data">
                    <p style="font-size: 3rem; margin-bottom: 10px;">📭</p>
                    <p>No sessions found</p>
                </div>
                `}
            </div>
        </div>
    </div>
    
    <script>
        async function verifyPasscode() {
            const passcode = document.getElementById('passcodeInput').value;
            const errorMsg = document.getElementById('errorMessage');
            
            try {
                const response = await fetch('/admin/verify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ passcode })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    document.getElementById('passcodeModal').classList.add('hidden');
                    document.getElementById('mainContent').classList.remove('hidden');
                } else {
                    errorMsg.textContent = '❌ Incorrect passcode';
                    errorMsg.classList.remove('hidden');
                }
            } catch (error) {
                errorMsg.textContent = '❌ Error verifying passcode';
                errorMsg.classList.remove('hidden');
            }
        }
        
        document.getElementById('passcodeInput').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                verifyPasscode();
            }
        });
        
        function copySessionId(sessionId) {
            navigator.clipboard.writeText(sessionId).then(() => {
                const btn = event.target;
                const originalText = btn.textContent;
                btn.textContent = '✓ Copied!';
                btn.style.background = '#10b981';
                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.style.background = '';
                }, 2000);
            });
        }
        
        function selectAll() {
            document.querySelectorAll('.session-checkbox').forEach(cb => {
                cb.checked = true;
            });
            document.getElementById('selectAllCheckbox').checked = true;
            updateActionButtons();
        }
        
        function deselectAll() {
            document.querySelectorAll('.session-checkbox').forEach(cb => {
                cb.checked = false;
            });
            document.getElementById('selectAllCheckbox').checked = false;
            updateActionButtons();
        }
        
        function toggleSelectAll() {
            const isChecked = document.getElementById('selectAllCheckbox').checked;
            document.querySelectorAll('.session-checkbox').forEach(cb => {
                cb.checked = isChecked;
            });
            updateActionButtons();
        }
        
        function updateActionButtons() {
            const checkedBoxes = document.querySelectorAll('.session-checkbox:checked');
            const hasSelection = checkedBoxes.length > 0;
            
            document.getElementById('deleteBtn').disabled = !hasSelection;
            document.getElementById('extend1Btn').disabled = !hasSelection;
            document.getElementById('extend3Btn').disabled = !hasSelection;
        }
        
        async function deleteSelected() {
            const checkedBoxes = document.querySelectorAll('.session-checkbox:checked');
            const sessionIds = Array.from(checkedBoxes).map(cb => cb.value);
            
            if (sessionIds.length === 0) return;
            
            if (!confirm(\`Are you sure you want to delete \${sessionIds.length} session(s)?\`)) {
                return;
            }
            
            try {
                const response = await fetch('/admin/delete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sessionIds })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    alert(\`Successfully deleted \${data.deletedCount} session(s)\`);
                    location.reload();
                } else {
                    alert('Error deleting sessions');
                }
            } catch (error) {
                alert('Error deleting sessions');
            }
        }
        
        async function extendSelected(months) {
            const checkedBoxes = document.querySelectorAll('.session-checkbox:checked');
            const sessionIds = Array.from(checkedBoxes).map(cb => cb.value);
            
            if (sessionIds.length === 0) return;
            
            if (!confirm(\`Extend \${sessionIds.length} session(s) by \${months} month(s)?\`)) {
                return;
            }
            
            try {
                const response = await fetch('/admin/extend', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sessionIds, months })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    alert(\`Successfully extended \${data.modifiedCount} session(s)\`);
                    location.reload();
                } else {
                    alert('Error extending sessions');
                }
            } catch (error) {
                alert('Error extending sessions');
            }
        }
        
        const searchBox = document.getElementById('searchBox');
        const table = document.getElementById('sessionTable');
        
        if (searchBox && table) {
            searchBox.addEventListener('input', function() {
                const searchTerm = this.value.toLowerCase();
                const rows = table.querySelectorAll('tbody tr');
                
                rows.forEach(row => {
                    const sessionId = row.getAttribute('data-session-id').toLowerCase();
                    const phoneNumber = row.querySelector('.phone-number').textContent.toLowerCase();
                    
                    if (sessionId.includes(searchTerm) || phoneNumber.includes(searchTerm) || searchTerm === '') {
                        row.style.display = '';
                    } else {
                        row.style.display = 'none';
                    }
                });
            });
        }
    </script>
</body>
</html>
        `;
        
        res.send(html);
    } catch (error) {
        console.error('Admin route error:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            details: error.message
        });
    }
});

module.exports = router;
