document.addEventListener('DOMContentLoaded', () => {
    // --- CONSTANTS & VARIABLES ---
    // ここにデプロイしたGoogle Apps ScriptのウェブアプリURLを貼り付けてください
    const GAS_WEB_APP_URL = 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE';

    const loginView = document.getElementById('login-view');
    const mainView = document.getElementById('main-view');
    const loginForm = document.getElementById('login-form');
    const displayUserId = document.getElementById('display-user-id');
    const statusMessage = document.getElementById('status-message');

    const clockInBtn = document.getElementById('clock-in-btn');
    const clockOutBtn = document.getElementById('clock-out-btn');
    const reportTaskBtn = document.getElementById('report-task-btn');
    const logoutBtn = document.getElementById('logout-btn');

    let currentUserId = null;
    let isClockedIn = false;

    // --- PWA Service Worker ---
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then(registration => console.log('Service Worker registered successfully.', registration))
            .catch(error => console.log('Service Worker registration failed.', error));
    }

    // --- UI HELPER FUNCTIONS ---
    function showStatusMessage(message, isError = false) {
        statusMessage.textContent = message;
        statusMessage.className = isError ? 'error' : 'success';
        // Clear message after 5 seconds
        setTimeout(() => {
            statusMessage.textContent = '';
            statusMessage.className = '';
        }, 5000);
    }

    function updateClockButtons() {
        if (isClockedIn) {
            clockInBtn.style.display = 'none';
            clockOutBtn.style.display = 'block';
        } else {
            clockInBtn.style.display = 'block';
            clockOutBtn.style.display = 'none';
        }
    }

    function showView(viewId) {
        document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
        document.getElementById(viewId).classList.add('active');
    }

    function login(userId) {
        currentUserId = userId;
        isClockedIn = localStorage.getItem(`clockStatus_${userId}`) === 'in';

        displayUserId.textContent = userId;
        updateClockButtons();
        showView('main-view');

        localStorage.setItem('lastUserId', userId);
    }

    function logout() {
        localStorage.removeItem('lastUserId');
        currentUserId = null;
        isClockedIn = false;
        showView('login-view');
        document.getElementById('user-id').value = '';
    }

    // --- API COMMUNICATION ---
    async function sendDataToGAS(action) {
        if (GAS_WEB_APP_URL === 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE') {
            showStatusMessage('バックエンドURLが設定されていません。script.jsを編集してください。', true);
            return;
        }

        const buttons = [clockInBtn, clockOutBtn, reportTaskBtn, logoutBtn];
        buttons.forEach(btn => btn.disabled = true);

        showStatusMessage(`${action.replace('_', '-')}...`);

        try {
            const response = await fetch(GAS_WEB_APP_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain', // GAS doPost requires text/plain for simple POST
                },
                body: JSON.stringify({
                    userId: currentUserId,
                    action: action
                })
            });

            const result = await response.json();

            if (result.status === 'success') {
                showStatusMessage(result.message, false);

                if (action === 'clock_in') {
                    isClockedIn = true;
                    localStorage.setItem(`clockStatus_${currentUserId}`, 'in');
                } else if (action === 'clock_out') {
                    isClockedIn = false;
                    localStorage.removeItem(`clockStatus_${currentUserId}`);
                }
                updateClockButtons();

            } else {
                throw new Error(result.message || '不明なエラーが発生しました。');
            }

        } catch (error) {
            showStatusMessage(`エラー: ${error.message}`, true);
        } finally {
            buttons.forEach(btn => btn.disabled = false);
        }
    }

    // --- EVENT LISTENERS ---
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const userId = document.getElementById('user-id').value.trim();
        if (userId) {
            login(userId);
        }
    });

    logoutBtn.addEventListener('click', logout);
    clockInBtn.addEventListener('click', () => sendDataToGAS('clock_in'));
    clockOutBtn.addEventListener('click', () => sendDataToGAS('clock_out'));
    reportTaskBtn.addEventListener('click', () => sendDataToGAS('report_task'));

    // --- INITIALIZATION ---
    const lastUserId = localStorage.getItem('lastUserId');
    if (lastUserId) {
        login(lastUserId);
    } else {
        showView('login-view');
    }
});