document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURATION ---
    // ここにデプロイしたGoogle Apps ScriptのウェブアプリURLを貼り付けてください
    const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxQvXr8rI3UtFwDYBwuuFoxV2nSXiN0DZi-M_3kAoMOL0A3M8KCMf-fdi19622nYFPawg/exec';

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
        // 5秒後にメッセージを消去
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
        if (!GAS_WEB_APP_URL || GAS_WEB_APP_URL.includes('YOUR_GOOGLE_APPS_SCRIPT')) {
            showStatusMessage('バックエンドURLが正しく設定されていません。', true);
            return;
        }

        const buttons = [clockInBtn, clockOutBtn, reportTaskBtn, logoutBtn];
        buttons.forEach(btn => btn.disabled = true);

        showStatusMessage(`通信中...`);

        try {
            // mode: 'no-cors' を使用することで、ブラウザによる通信遮断を回避します
            await fetch(GAS_WEB_APP_URL, {
                method: 'POST',
                mode: 'no-cors', 
                headers: {
                    'Content-Type': 'text/plain',
                },
                body: JSON.stringify({
                    userId: currentUserId,
                    action: action
                })
            });

            // no-corsモードではレスポンス内容を解析できないため、
            // fetchがエラーにならなければ「成功」として画面を更新します
            let successMsg = '';
            if (action === 'clock_in') {
                isClockedIn = true;
                localStorage.setItem(`clockStatus_${currentUserId}`, 'in');
                successMsg = '出勤を記録しました。';
            } else if (action === 'clock_out') {
                isClockedIn = false;
                localStorage.removeItem(`clockStatus_${currentUserId}`);
                successMsg = '退勤を記録しました。';
            } else if (action === 'report_task') {
                successMsg = '課題完了を報告しました。';
            }

            showStatusMessage(successMsg, false);
            updateClockButtons();

        } catch (error) {
            console.error('Submission error:', error);
            showStatusMessage(`通信エラーが発生しました。`, true);
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