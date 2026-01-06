// --- SECURITY SUITE START ---

// 1. Disable Right-Click
document.addEventListener('contextmenu', event => event.preventDefault());

// 2. Block Keyboard Shortcuts (F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U, Ctrl+Shift+C)
document.addEventListener('keydown', function(e) {
    if(e.key === 'F12') {
        e.preventDefault();
        return false;
    }
    
    if(e.ctrlKey && e.shiftKey) {
        const key = e.key.toUpperCase();
        if(key === 'I' || key === 'J' || key === 'C') {
            e.preventDefault();
            return false;
        }
    }
    
    if(e.ctrlKey && e.key.toLowerCase() === 'u') {
        e.preventDefault();
        return false;
    }
});

// 3. DevTools Detection (Dimension Monitoring)
function detectDevTools() {
    const threshold = 160; 
    const widthDiff = window.outerWidth - window.innerWidth > threshold;
    const heightDiff = window.outerHeight - window.innerHeight > threshold;

    const warningEl = document.getElementById('devtools-warning');
    
    if (widthDiff || heightDiff) {
        if(warningEl && warningEl.classList.contains('hidden')) {
            warningEl.classList.remove('hidden');
        }
    } else {
        if(warningEl && !warningEl.classList.contains('hidden')) {
            warningEl.classList.add('hidden');
        }
    }
}

setInterval(detectDevTools, 500);

// --- SECURITY SUITE END ---

// CONFIGURATION
const API_BASE = 'https://broad-base-cf81.gegidzezviad05.workers.dev'; 
const MOCK_PASSWORD = 'da7mu_admin_2025';
const STORAGE_KEY = 'da7mu_auth_token';

let authToken = null;
let charts = {};
let currentPeriod = 30;
let autoRefreshInterval = null;

// --- Core Functions ---

function checkLogin() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if(stored === MOCK_PASSWORD) {
        authToken = stored;
        unlockDashboard();
    }
}

function attemptLogin() {
    const input = document.getElementById('admin-pass').value;
    if(input === MOCK_PASSWORD) {
        localStorage.setItem(STORAGE_KEY, input);
        authToken = input;
        unlockDashboard();
    } else {
        document.getElementById('login-error').classList.remove('hidden');
        shakeElement(document.querySelector('.glass'));
    }
}

function unlockDashboard() {
    const loginScreen = document.getElementById('login-screen');
    const appContent = document.getElementById('app-content');
    
    loginScreen.style.opacity = '0';
    setTimeout(() => {
        loginScreen.classList.add('hidden');
        appContent.classList.remove('hidden');
        setTimeout(() => {
            appContent.style.opacity = '1';
            appContent.style.transform = 'scale(1)';
            appContent.style.filter = 'blur(0)';
        }, 50);
    }, 500);
    
    initCharts();
    loadAnalytics();
    startClock();
    
    // Auto-refresh every 30 seconds
    autoRefreshInterval = setInterval(loadAnalytics, 30000);
}

function logout() {
    localStorage.removeItem(STORAGE_KEY);
    if (autoRefreshInterval) clearInterval(autoRefreshInterval);
    location.reload();
}

function switchTab(tab) {
    const dashboard = document.getElementById('view-dashboard');
    const keys = document.getElementById('view-keys');
    const keyless = document.getElementById('view-keyless');
    const active = document.getElementById('view-active');
    
    const navBtns = {
        dashboard: document.getElementById('nav-dashboard'),
        keys: document.getElementById('nav-keys'),
        keyless: document.getElementById('nav-keyless'),
        active: document.getElementById('nav-active')
    };
    
    // Hide all views
    if (dashboard) dashboard.classList.add('hidden');
    if (keys) keys.classList.add('hidden');
    if (keyless) keyless.classList.add('hidden');
    if (active) active.classList.add('hidden');
    
    // Remove active from all nav buttons
    Object.values(navBtns).forEach(btn => {
        if(btn) {
            btn.classList.remove('bg-primary/10', 'text-primary', 'border-primary/20');
            btn.classList.add('text-gray-400', 'border-transparent');
        }
    });
    
    // Show selected view and activate button
    switch(tab) {
        case 'dashboard':
            if (dashboard) dashboard.classList.remove('hidden');
            if (navBtns.dashboard) {
                navBtns.dashboard.classList.add('bg-primary/10', 'text-primary', 'border-primary/20');
                navBtns.dashboard.classList.remove('text-gray-400', 'border-transparent');
            }
            document.getElementById('page-title').textContent = 'Dashboard Overview';
            loadAnalytics();
            break;
        case 'keys':
            if (keys) keys.classList.remove('hidden');
            if (navBtns.keys) {
                navBtns.keys.classList.add('bg-primary/10', 'text-primary', 'border-primary/20');
                navBtns.keys.classList.remove('text-gray-400', 'border-transparent');
            }
            document.getElementById('page-title').textContent = 'Key Management';
            fetchKeys();
            break;
        case 'keyless':
            if (keyless) keyless.classList.remove('hidden');
            if (navBtns.keyless) {
                navBtns.keyless.classList.add('bg-primary/10', 'text-primary', 'border-primary/20');
                navBtns.keyless.classList.remove('text-gray-400', 'border-transparent');
            }
            document.getElementById('page-title').textContent = 'Keyless Mode';
            loadKeylessStatus();
            break;
        case 'active':
            if (active) {
                active.classList.remove('hidden');
                if (navBtns.active) {
                    navBtns.active.classList.add('bg-primary/10', 'text-primary', 'border-primary/20');
                    navBtns.active.classList.remove('text-gray-400', 'border-transparent');
                }
            }
            document.getElementById('page-title').textContent = 'Active Sessions';
            loadActiveSessions();
            break;
    }
}

function refreshData() {
    const currentView = document.querySelector('#view-dashboard:not(.hidden)') ? 'dashboard' :
                       document.querySelector('#view-keys:not(.hidden)') ? 'keys' :
                       document.querySelector('#view-active:not(.hidden)') ? 'active' : 'keyless';
    
    showToast('Refreshing data...', 'success');
    
    switch(currentView) {
        case 'dashboard':
            loadAnalytics();
            break;
        case 'keys':
            fetchKeys();
            break;
        case 'active':
            loadActiveSessions();
            break;
        case 'keyless':
            loadKeylessStatus();
            break;
    }
}

function setPeriod(days) {
    currentPeriod = days;
    document.querySelectorAll('.period-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    loadAnalytics();
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toast-msg');
    toastMsg.textContent = message;
    
    toast.style.transform = 'translateY(0)';
    
    setTimeout(() => {
        toast.style.transform = 'translateY(200px)';
    }, 3000);
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('Copied to clipboard!');
    });
}

function copyText(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('Copied: ' + text);
    });
}

function startClock() {
    const clockEl = document.getElementById('clock');
    if (!clockEl) return;
    
    function updateClock() {
        const now = new Date();
        clockEl.textContent = now.toLocaleTimeString('en-US', { hour12: false });
    }
    
    updateClock();
    setInterval(updateClock, 1000);
}

// --- Data Handling ---

async function apiCall(endpoint, method = 'POST', body = {}) {
    const startTime = Date.now();
    try {
        const res = await fetch(`\( {API_BASE} \){endpoint}`, {
            method,
            headers: { 'Content-Type': 'application/json', 'Admin-Pass': authToken },
            body: method !== 'GET' ? JSON.stringify(body) : undefined
        });
        
        const ping = Date.now() - startTime;
        const pingEl = document.getElementById('stat-ping');
        if(pingEl) pingEl.textContent = `${ping}ms`;
        
        return await res.json();
    } catch(e) {
        showToast('Connection Failed', 'error');
        return { success: false };
    }
}

async function loadAnalytics() {
    const data = await apiCall('/api/admin/analytics', 'POST', { period: currentPeriod });
    if(data.success) {
        animateValue('stat-clicks', data.clicks);
        animateValue('stat-checkpoints', data.checkpoints);
        animateValue('stat-keys', data.keys);
        animateValue('stat-streak', data.executions || 0);
        animateValue('stat-active-now', data.active_now || 0);
        
        updateCharts(data);
    }
}

async function fetchKeys() {
    const query = document.getElementById('key-search').value;
    const tbody = document.getElementById('keys-table-body');
    
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 40px;"><div class="flex justify-center"><div class="spinner"></div></div></td></tr>`;

    const data = await apiCall('/api/admin/keys/list', 'POST', { query });
    
    tbody.innerHTML = '';
    if(!data.success || data.keys.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 30px; color: #6b7280;">No keys found.</td></tr>`;
        return;
    }

    data.keys.forEach(k => {
        const isBan = k.status === 'Banned';
        const hwidDisplay = (k.hwid && k.hwid !== 'Not bound') 
            ? `<span class="text-primary font-mono">${k.hwid.substring(0,12)}...</span>` 
            : `<span class="text-gray-500">Unbound</span>`;
        const dateDisplay = k.expires_at ? new Date(k.expires_at).toLocaleDateString() : 'Lifetime';
        const badgeClass = isBan ? 'bg-red-500/10 text-red-500 border-red-500/20' : 
                          (k.status === 'Active' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 
                          'bg-gray-500/10 text-gray-500 border-gray-500/20');

        // Desktop row
        const row = `
            <tr class="hidden md:table-row border-b border-gray-800 hover:bg-white/5 transition-colors">
                <td class="px-6 py-4">
                    <span class="text-primary font-mono cursor-pointer hover:text-blue-400" onclick="copyToClipboard('\( {k.key_value}')"> \){k.key_value.substring(0, 16)}...</span>
                </td>
                <td class="px-6 py-4 text-gray-400">${k.user_id}</td>
                <td class="px-6 py-4">
                    <div class="flex flex-col gap-1">
                        <span class="px-2 py-1 rounded text-xs border \( {badgeClass} inline-block w-fit"> \){k.status}</span>
                        <span class="text-sm">${hwidDisplay}</span>
                    </div>
                </td>
                <td class="px-6 py-4 text-gray-400 text-sm">${dateDisplay}</td>
                <td class="px-6 py-4 text-right">
                    ${!isBan ? 
                        `<button onclick="actionKey('ban', '${k.key_value}')" class="px-3 py-1.5 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition text-sm border border-red-500/20">Ban</button>` :
                        `<button onclick="actionKey('unban', '${k.key_value}')" class="px-3 py-1.5 bg-green-500/10 text-green-500 rounded-lg hover:bg-green-500/20 transition text-sm border border-green-500/20">Unban</button>`
                    }
                    <button onclick="actionKey('delete', '${k.key_value}')" class="ml-2 px-2 py-1.5 hover:bg-red-500/10 rounded-lg transition">🗑️</button>
                </td>
            </tr>
        `;
        
        // Mobile card
        const mobileCard = `
            <div class="md:hidden glass-card p-4 rounded-xl border border-gray-800">
                <div class="flex justify-between items-start mb-3">
                    <div class="flex-1">
                        <div class="text-primary font-mono text-sm mb-1 cursor-pointer" onclick="copyToClipboard('\( {k.key_value}')"> \){k.key_value.substring(0, 12)}...</div>
                        <div class="text-gray-500 text-xs">${k.user_id}</div>
                    </div>
                    <span class="px-2 py-1 rounded text-xs border \( {badgeClass}"> \){k.status}</span>
                </div>
                <div class="space-y-2 text-sm">
                    <div class="flex justify-between">
                        <span class="text-gray-500">HWID:</span>
                        ${hwidDisplay}
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-500">Expires:</span>
                        <span class="text-gray-400">${dateDisplay}</span>
                    </div>
                </div>
                <div class="flex gap-2 mt-3">
                    ${!isBan ? 
                        `<button onclick="actionKey('ban', '${k.key_value}')" class="flex-1 px-3 py-2 bg-red-500/10 text-red-500 rounded-lg text-sm border border-red-500/20">Ban</button>` :
                        `<button onclick="actionKey('unban', '${k.key_value}')" class="flex-1 px-3 py-2 bg-green-500/10 text-green-500 rounded-lg text-sm border border-green-500/20">Unban</button>`
                    }
                    <button onclick="actionKey('delete', '${k.key_value}')" class="px-3 py-2 hover:bg-red-500/10 rounded-lg">🗑️</button>
                </div>
            </div>
        `;
        
        tbody.insertAdjacentHTML('beforeend', row + mobileCard);
    });
}

async function loadActiveSessions() {
    const tbody = document.getElementById('active-sessions-body');
    
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 40px;"><div class="flex justify-center"><div class="spinner"></div></div></td></tr>`;

    const data = await apiCall('/api/admin/active/sessions', 'POST', {});
    
    tbody.innerHTML = '';
    if(!data.success || data.sessions.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-8 text-gray-500">No active sessions in the last 5 minutes</td></tr>`;
        return;
    }

    data.sessions.forEach(session => {
        const timeAgo = getTimeAgo(new Date(session.last_used));
        
        // Desktop row
        const row = `
            <tr class="hidden md:table-row border-b border-gray-800 hover:bg-white/5 transition-colors">
                <td class="px-6 py-4 text-gray-300">${session.user_id}</td>
                <td class="px-6 py-4">
                    <code class="text-primary font-mono text-sm">${session.hwid.substring(0, 16)}...</code>
                </td>
                <td class="px-6 py-4">
                    <code class="text-gray-400 font-mono text-sm cursor-pointer hover:text-gray-300" onclick="copyToClipboard('\( {session.key_value}')"> \){session.key_value.substring(0, 12)}...</code>
                </td>
                <td class="px-6 py-4 text-gray-400 text-sm">${timeAgo}</td>
                <td class="px-6 py-4 text-gray-400 text-sm">${session.clicks}</td>
            </tr>
        `;
        
        // Mobile card
        const mobileCard = `
            <div class="md:hidden glass-card p-4 rounded-xl border border-gray-800">
                <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center gap-2">
                        <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span class="text-white font-medium">${session.user_id}</span>
                    </div>
                    <span class="text-xs text-gray-500">${timeAgo}</span>
                </div>
                <div class="space-y-2 text-sm">
                    <div class="flex justify-between">
                        <span class="text-gray-500">HWID:</span>
                        <code class="text-primary font-mono text-xs">${session.hwid.substring(0, 12)}...</code>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-500">Key:</span>
                        <code class="text-gray-400 font-mono text-xs cursor-pointer" onclick="copyToClipboard('\( {session.key_value}')"> \){session.key_value.substring(0, 12)}...</code>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-500">Clicks:</span>
                        <span class="text-gray-400">${session.clicks}</span>
                    </div>
                </div>
            </div>
        `;
        
        tbody.insertAdjacentHTML('beforeend', row + mobileCard);
    });
}

function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
}

async function loadKeylessStatus() {
    const data = await apiCall('/api/admin/keyless/status', 'POST', {});
    if (data.success) {
        const toggle = document.getElementById('keyless-toggle');
        const statusText = document.getElementById('keyless-status-text');
        
        toggle.checked = data.status;
        
        if (data.status) {
            statusText.innerHTML = '<i class="fa-solid fa-circle text-green-500 mr-2"></i> ACTIVE';
            statusText.setAttribute('data-status', 'true');
        } else {
            statusText.innerHTML = '<i class="fa-solid fa-circle text-red-500 mr-2"></i> INACTIVE';
            statusText.setAttribute('data-status', 'false');
        }
    }
}

async function toggleKeyless() {
    const toggle = document.getElementById('keyless-toggle');
    const newStatus = toggle.checked ? 'on' : 'off';
    
    const data = await apiCall('/api/admin/keyless/toggle', 'POST', { status: newStatus });
    
    if (data.success) {
        showToast(`Keyless mode ${newStatus === 'on' ? 'enabled' : 'disabled'}`, 'success');
        loadKeylessStatus();
    } else {
        showToast('Failed to toggle keyless mode', 'error');
        toggle.checked = !toggle.checked;
    }
}

function filterKeys() {
    fetchKeys();
}

function openKeyCreationModal() {
    const modal = document.getElementById('modal-key-creation');
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.style.opacity = '1';
        modal.querySelector('.glass').style.transform = 'scale(1)';
    }, 10);
}

function closeKeyCreationModal() {
    const modal = document.getElementById('modal-key-creation');
    modal.style.opacity = '0';
    modal.querySelector('.glass').style.transform = 'scale(0.95)';
    setTimeout(() => modal.classList.add('hidden'), 300);
}

function closeKeyDisplayModal() {
    const modal = document.getElementById('modal-key-display');
    modal.style.opacity = '0';
    modal.querySelector('.glass').style.transform = 'scale(0.95)';
    setTimeout(() => modal.classList.add('hidden'), 300);
}

async function submitKeyGeneration() {
    const userIdInput = document.getElementById('key-user-id');
    const durationSelect = document.getElementById('key-duration');
    const submitBtn = document.getElementById('submit-key-gen');
    
    const userId = userIdInput.value.trim() || 'Admin-Generated';
    const durationMinutes = parseInt(durationSelect.value);
    const durationDays = durationMinutes / 1440; // Convert minutes to days
    
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating...';
    
    const data = await apiCall('/api/admin/keys/generate', 'POST', {
        user_id: userId,
        duration_days: durationDays
    });
    
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fa-solid fa-plus"></i> Generate Key';
    
    if (data.success) {
        closeKeyCreationModal();
        
        // Show key in display modal
        const displayModal = document.getElementById('modal-key-display');
        const keyDisplay = document.getElementById('new-key-display');
        const expiryDisplay = document.getElementById('new-key-expiry-display');
        
        keyDisplay.textContent = data.key;
        expiryDisplay.textContent = data.expires_at === 'Lifetime' ? 'Lifetime Access' : `Expires: ${new Date(data.expires_at).toLocaleString()}`;
        
        displayModal.classList.remove('hidden');
        setTimeout(() => {
            displayModal.style.opacity = '1';
            displayModal.querySelector('.glass').style.transform = 'scale(1)';
        }, 10);
        
        // Reset form
        userIdInput.value = '';
        durationSelect.value = '1440';
        
        showToast('Key generated successfully!', 'success');
    } else {
        showToast('Failed to generate key', 'error');
    }
}

function copyNewKey() {
    const keyDisplay = document.getElementById('new-key-display');
    copyToClipboard(keyDisplay.textContent);
}

async function actionKey(action, key) {
    if(!confirm(`Are you sure you want to ${action} this key?`)) return;
    const endpoint = `/api/admin/keys/${action}`;
    const data = await apiCall(endpoint, 'POST', { key });
    if(data.success) {
        showToast(`Key ${action} successful`, 'success');
        fetchKeys();
    } else {
        showToast(`Failed to ${action}`, 'error');
    }
}

// --- Helpers ---
function animateValue(id, end) {
    const obj = document.getElementById(id);
    if(!obj) return;
    if(obj.innerText == end) return;
    obj.innerText = end.toLocaleString(); 
}

function shakeElement(el) {
    el.style.transform = 'translateX(10px)';
    setTimeout(() => el.style.transform = 'translateX(-10px)', 100);
    setTimeout(() => el.style.transform = 'translateX(0)', 200);
}

function initCharts() {
    const ctxOverview = document.getElementById('mainChart');
    if (!ctxOverview) return;
    
    charts.mainChart = new Chart(ctxOverview.getContext('2d'), {
        type: 'line',
        data: {
            labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5'],
            datasets: [
                {
                    label: 'Injections',
                    data: [100, 150, 200, 400, 900],
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    tension: 0.4,
                    fill: true,
                    borderWidth: 2
                },
                {
                    label: 'HWID Checks',
                    data: [80, 120, 160, 320, 640],
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    fill: true,
                    borderWidth: 2
                },
                {
                    label: 'Keys',
                    data: [50, 75, 100, 200, 400],
                    borderColor: '#f59e0b',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    tension: 0.4,
                    fill: true,
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: { 
                    display: true,
                    position: 'top',
                    labels: {
                        color: '#9ca3af',
                        usePointStyle: true,
                        padding: 20
                    }
                },
                tooltip: { 
                    mode: 'index', 
                    intersect: false,
                    backgroundColor: '#111827',
                    titleColor: '#f3f4f6',
                    bodyColor: '#9ca3af',
                    borderColor: '#1f2937',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: true,
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + context.parsed.y.toLocaleString();
                        }
                    }
                }
            },
            scales: {
                y: { 
                    beginAtZero: true,
                    grid: { 
                        color: '#1f2937',
                        drawBorder: false
                    },
                    ticks: { 
                        color: '#9ca3af',
                        padding: 8
                    },
                    border: {
                        display: false
                    }
                },
                x: {
                    grid: { 
                        color: '#1f2937',
                        drawBorder: false
                    },
                    ticks: { 
                        color: '#9ca3af',
                        padding: 8
                    },
                    border: {
                        display: false
                    }
                }
            }
        }
    });
}

function updateCharts(data) {
    if (!charts.mainChart) return;
    
    if(data.history) {
        charts.mainChart.data.labels = data.history.labels || charts.mainChart.data.labels;
        charts.mainChart.data.datasets[0].data = data.history.clicks || charts.mainChart.data.datasets[0].data;
        charts.mainChart.data.datasets[1].data = data.history.checkpoints || charts.mainChart.data.datasets[1].data;
        charts.mainChart.data.datasets[2].data = data.history.keys || charts.mainChart.data.datasets[2].data;
        charts.mainChart.update('none');
    }
}

// Initialize
window.addEventListener('DOMContentLoaded', () => {
    checkLogin();
});
