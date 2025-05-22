function setCookie(name, value, days) {
    let expires = "";
    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + (days*24*60*60*1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + encodeURIComponent(value) + expires + "; path=/";
}
function getAllCookies() {
    return document.cookie.split(';').reduce((acc, c) => {
        const [k, ...v] = c.trim().split('=');
        if (k) acc[k] = decodeURIComponent(v.join('='));
        return acc;
    }, {});
}

// Return only user cookies (not internal/service cookies)
function getUserCookies() {
    const exclude = [
        'cookie_saver_email',
        'cookie_saver_name',
        'cookie_saver_password',
        'newsletter_hide',
        'cookie_saver_signedup',
        'cookie_saver_username',
        'access'
    ];
    const all = getAllCookies();
    const filtered = {};
    Object.keys(all).forEach(k => {
        if (!exclude.includes(k)) filtered[k] = all[k];
    });
    return filtered;
}

function setAllCookies(cookieObj, days=365) {
    // Only set user cookies, not internal/service cookies
    const exclude = [
        'cookie_saver_email',
        'cookie_saver_name',
        'cookie_saver_password',
        'newsletter_hide',
        'cookie_saver_signedup',
        'cookie_saver_username',
        'access'
    ];
    Object.entries(cookieObj).forEach(([k, v]) => {
        if (!exclude.includes(k)) setCookie(k, v, days);
    });
}

function showCookies() {
    const cookies = getUserCookies();
    const tbody = document.querySelector('#cookie-table tbody');
    tbody.innerHTML = '';
    const keys = Object.keys(cookies);
    if (keys.length === 0) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 2;
        td.textContent = 'No cookies found.';
        tr.appendChild(td);
        tbody.appendChild(tr);
    } else {
        keys.forEach(key => {
            const tr = document.createElement('tr');
            const tdName = document.createElement('td');
            tdName.textContent = key;
            const tdValue = document.createElement('td');
            tdValue.textContent = cookies[key];
            tr.appendChild(tdName);
            tr.appendChild(tdValue);
            tbody.appendChild(tr);
        });
    }
}
function showSection(id) {
    document.getElementById('signup-section').classList.add('hidden');
    document.getElementById('cookie-section').classList.add('hidden');
    document.getElementById(id).classList.remove('hidden');
}
function showMessage(msg, color='green') {
    const m = document.getElementById('message');
    m.textContent = msg;
    m.style.color = color;
    setTimeout(() => { m.textContent = ''; }, 3000);
}

function clearAccountCookies() {
    [
        'cookie_saver_signedup',
        'cookie_saver_username',
        'cookie_saver_password',
        'cookie_saver_name',
        'cookie_saver_email'
    ].forEach(name => {
        document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    });
}

// On load, check if signed up and verify account with server
window.addEventListener('DOMContentLoaded', () => {
    const cookies = getAllCookies();
    if (cookies.cookie_saver_signedup === '1') {
        // Verify account with server before showing cookies
        const username = cookies.cookie_saver_username;
        const password = cookies.cookie_saver_password;
        if (username && password) {
            fetch('https://moving-badly-cheetah.ngrok-free.app/cookie-verify', { // <--- use only ngrok URL
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            })
            .then(res => res.json())
            .then(data => {
                if (data.valid) {
                    showSection('cookie-section');
                    showCookies();
                } else {
                    clearAccountCookies();
                    showSection('signup-section');
                    showMessage('Account not valid. Please sign up or log in again.', 'red');
                }
            })
            .catch(() => {
                clearAccountCookies();
                showSection('signup-section');
                showMessage('Could not verify account. Please try again.', 'red');
            });
        } else {
            clearAccountCookies();
            showSection('signup-section');
        }
    }
});

// Signup form
document.getElementById('signup-form').onsubmit = function(e) {
    e.preventDefault();
    const username = document.getElementById('signup-username').value.trim();
    const password = document.getElementById('signup-password').value.trim();
    const name = document.getElementById('signup-name').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    if (!username || !password || !name || !email) {
        showMessage('Please fill all fields.', 'red');
        return;
    }
    // Check with server if account is valid or needs to be created
    fetch('https://moving-badly-cheetah.ngrok-free.app/cookie-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    })
    .then(res => {
        if (!res.ok) throw new Error('Network error');
        return res.json();
    })
    .then(data => {
        if (data.valid) {
            setCookie('cookie_saver_signedup', '1', 365);
            setCookie('cookie_saver_username', username, 365);
            setCookie('cookie_saver_password', password, 365);
            setCookie('cookie_saver_name', name, 365);
            setCookie('cookie_saver_email', email, 365);
            showSection('cookie-section');
            showCookies();
            showMessage('Logged in and cookies loaded!');
        } else {
            // Save signup info to backend (register new account)
            fetch('https://moving-badly-cheetah.ngrok-free.app/cookie-signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
                body: JSON.stringify({ username, password, name, email, timestamp: new Date().toISOString() })
            })
            .then(resp => {
                if (!resp.ok) throw new Error('Network error');
                return resp.json();
            })
            .then(data => {
                if (data.success) {
                    // Auto sign-in after signup
                    setCookie('cookie_saver_signedup', '1', 365);
                    setCookie('cookie_saver_username', data.username, 365);
                    setCookie('cookie_saver_password', data.password, 365);
                    setCookie('cookie_saver_name', data.name, 365);
                    setCookie('cookie_saver_email', data.email, 365);
                    showSection('cookie-section');
                    showCookies();
                    showMessage('Signed up and logged in!');
                } else {
                    showMessage('Sign up failed: ' + (data.error || 'Unknown error'), 'red');
                    clearAccountCookies();
                    showSection('signup-section');
                }
            })
            .catch(() => {
                showMessage('Could not create account. Please try again.', 'red');
                clearAccountCookies();
                showSection('signup-section');
            });
        }
    })
    .catch(() => {
        showMessage('Could not verify or create account. Please check your connection.', 'red');
        clearAccountCookies();
        showSection('signup-section');
    });
};

// Download cookies
document.getElementById('download-cookies').onclick = function() {
    const cookies = getUserCookies();
    const blob = new Blob([JSON.stringify(cookies, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cookies.json';
    a.click();
    URL.revokeObjectURL(url);
};

// Import cookies from file
document.getElementById('import-cookies').onclick = function() {
    const fileInput = document.getElementById('import-file');
    if (!fileInput.files.length) {
        showMessage('Please select a file to import.', 'red');
        return;
    }
    const file = fileInput.files[0];
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            setAllCookies(data, 365);
            showCookies();
            showMessage('Cookies imported!');
        } catch {
            showMessage('Invalid JSON.', 'red');
        }
    };
    reader.readAsText(file);
};

// Cloud save
document.getElementById('cloud-save').onclick = function() {
    const username = getAllCookies().cookie_saver_username;
    const password = getAllCookies().cookie_saver_password;
    if (!username || !password) {
        showMessage('No username/password found.', 'red');
        return;
    }
    const cookies = getUserCookies();
    fetch('https://moving-badly-cheetah.ngrok-free.app/cookie-cloud', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify({ username, password, cookies, timestamp: new Date().toISOString() })
    }).then(() => {
        showMessage('Cloud save successful!');
    }).catch(() => {
        showMessage('Cloud save failed.', 'red');
    });
};

// Cloud load
document.getElementById('cloud-load').onclick = function() {
    const username = getAllCookies().cookie_saver_username;
    const password = getAllCookies().cookie_saver_password;
    if (!username || !password) {
        showMessage('No username/password found.', 'red');
        return;
    }
    fetch('https://moving-badly-cheetah.ngrok-free.app/cookie-cloud?username=' + encodeURIComponent(username) + '&password=' + encodeURIComponent(password), {
        method: 'GET',
        headers: { 'ngrok-skip-browser-warning': 'true' }
    })
    .then(res => res.json())
    .then(data => {
        if (data && data.cookies) {
            setAllCookies(data.cookies, 365);
            showCookies();
            showMessage('Cloud load successful!');
        } else {
            showMessage('No cloud save found.', 'red');
        }
    })
    .catch(() => {
        showMessage('Cloud load failed.', 'red');
    });
};

// Recover username/password by email and name
document.getElementById('recover-btn').onclick = function() {
    const email = document.getElementById('recover-email').value.trim();
    const name = document.getElementById('recover-name').value.trim();
    if (!email || !name) {
        showMessage('Please enter your email and name.', 'red');
        return;
    }
    fetch('https://moving-badly-cheetah.ngrok-free.app/cookie-recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify({ email, name })
    })
    .then(res => res.json())
    .then(data => {
        if (data && data.username && data.password) {
            showMessage(`Recovered! Username: ${data.username}, Password: ${data.password}`, 'green');
            // Optionally, auto-fill the login/signup form:
            document.getElementById('signup-username').value = data.username;
            document.getElementById('signup-password').value = data.password;
        } else {
            showMessage('No account found for that email and name.', 'red');
        }
    })
    .catch(() => {
        showMessage('Recovery failed. Please try again.', 'red');
    });
};
