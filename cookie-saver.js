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
    showAllSiteData();
    addRefreshButton();
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

// Add error notification function
function showCookieSaverErrorNotification() {
    if (document.getElementById('cookie-saver-error-notification')) return;
    const notif = document.createElement('div');
    notif.id = 'cookie-saver-error-notification';
    notif.textContent = 'error 362 if you see this agen report to owner';
    notif.style.position = 'fixed';
    notif.style.top = '18px';
    notif.style.right = '18px';
    notif.style.background = '#ff4444';
    notif.style.color = 'white';
    notif.style.padding = '12px 22px';
    notif.style.borderRadius = '8px';
    notif.style.boxShadow = '0 2px 8px rgba(0,0,0,0.18)';
    notif.style.fontSize = '1em';
    notif.style.zIndex = 99999;
    notif.style.fontFamily = 'Arial,sans-serif';
    document.body.appendChild(notif);
    setTimeout(() => {
        notif.remove();
    }, 5000);
}

// Show all data stored on the site, including IndexedDB
function showAllSiteData() {
    // Show cookies
    const cookies = getUserCookies();
    const cookieTbody = document.querySelector('#cookie-table tbody');
    cookieTbody.innerHTML = '';
    const keys = Object.keys(cookies);
    if (keys.length === 0) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 2;
        td.textContent = 'No cookies found.';
        tr.appendChild(td);
        cookieTbody.appendChild(tr);
    } else {
        keys.forEach(key => {
            const tr = document.createElement('tr');
            const tdName = document.createElement('td');
            tdName.textContent = key;
            const tdValue = document.createElement('td');
            tdValue.textContent = cookies[key];
            tr.appendChild(tdName);
            tr.appendChild(tdValue);
            cookieTbody.appendChild(tr);
        });
    }

    // Show localStorage
    let localTable = document.getElementById('localstorage-table');
    if (!localTable) {
        localTable = document.createElement('table');
        localTable.id = 'localstorage-table';
        localTable.style = 'width:100%;border-collapse:collapse;margin-bottom:1em;background:#f4f4f4;border-radius:4px;overflow-x:auto;';
        localTable.innerHTML = `
            <thead>
                <tr><th>LocalStorage Key</th><th>Value</th></tr>
            </thead>
            <tbody></tbody>
        `;
        document.getElementById('cookie-table').parentNode.appendChild(localTable);
    }
    const localTbody = localTable.querySelector('tbody');
    localTbody.innerHTML = '';
    if (localStorage.length === 0) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 2;
        td.textContent = 'No localStorage data found.';
        tr.appendChild(td);
        localTbody.appendChild(tr);
    } else {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            const tr = document.createElement('tr');
            const tdKey = document.createElement('td');
            tdKey.textContent = key;
            const tdValue = document.createElement('td');
            tdValue.textContent = localStorage.getItem(key);
            tr.appendChild(tdKey);
            tr.appendChild(tdValue);
            localTbody.appendChild(tr);
        }
    }

    // Show sessionStorage
    let sessionTable = document.getElementById('sessionstorage-table');
    if (!sessionTable) {
        sessionTable = document.createElement('table');
        sessionTable.id = 'sessionstorage-table';
        sessionTable.style = 'width:100%;border-collapse:collapse;margin-bottom:1em;background:#f4f4f4;border-radius:4px;overflow-x:auto;';
        sessionTable.innerHTML = `
            <thead>
                <tr><th>SessionStorage Key</th><th>Value</th></tr>
            </thead>
            <tbody></tbody>
        `;
        document.getElementById('cookie-table').parentNode.appendChild(sessionTable);
    }
    const sessionTbody = sessionTable.querySelector('tbody');
    sessionTbody.innerHTML = '';
    if (sessionStorage.length === 0) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 2;
        td.textContent = 'No sessionStorage data found.';
        tr.appendChild(td);
        sessionTbody.appendChild(tr);
    } else {
        for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            const tr = document.createElement('tr');
            const tdKey = document.createElement('td');
            tdKey.textContent = key;
            const tdValue = document.createElement('td');
            tdValue.textContent = sessionStorage.getItem(key);
            tr.appendChild(tdKey);
            tr.appendChild(tdValue);
            sessionTbody.appendChild(tr);
        }
    }

    // Show IndexedDB (best effort, read-only)
    let idbDiv = document.getElementById('idb-data');
    if (!idbDiv) {
        idbDiv = document.createElement('div');
        idbDiv.id = 'idb-data';
        idbDiv.style = 'margin-bottom:1em;font-size:0.97em;';
        document.getElementById('cookie-table').parentNode.appendChild(idbDiv);
    }
    idbDiv.innerHTML = '<b>IndexedDB Data:</b><br><span style="color:#888;">Loading...</span>';

    if (!window.indexedDB) {
        idbDiv.innerHTML = '<b>IndexedDB Data:</b><br><span style="color:#888;">IndexedDB not supported in this browser.</span>';
        return;
    }

    // List all databases (works in modern browsers)
    if (indexedDB.databases) {
        indexedDB.databases().then(dbs => {
            if (!dbs.length) {
                idbDiv.innerHTML = '<b>IndexedDB Data:</b><br><span style="color:#888;">No IndexedDB databases found.</span>';
                return;
            }
            idbDiv.innerHTML = '<b>IndexedDB Data:</b>';
            dbs.forEach(dbInfo => {
                const dbName = dbInfo.name;
                const dbVersion = dbInfo.version;
                const dbBlock = document.createElement('div');
                dbBlock.style.margin = '0.5em 0 0.5em 0.5em';
                dbBlock.innerHTML = `<span style="color:#007bff;">${dbName}</span> (v${dbVersion})<br><span style="color:#888;">Loading stores...</span>`;
                idbDiv.appendChild(dbBlock);

                // Open each DB and list object stores and a sample of their data
                const req = indexedDB.open(dbName);
                req.onsuccess = function(event) {
                    const db = event.target.result;
                    let stores = Array.from(db.objectStoreNames);
                    if (!stores.length) {
                        dbBlock.innerHTML += '<br><span style="color:#888;">No object stores.</span>';
                        return;
                    }
                    dbBlock.innerHTML = `<span style="color:#007bff;">${dbName}</span> (v${dbVersion})<br>`;
                    stores.forEach(storeName => {
                        dbBlock.innerHTML += `<b style="color:#333;">&nbsp;&nbsp;${storeName}</b>: `;
                        try {
                            const tx = db.transaction(storeName, 'readonly');
                            const store = tx.objectStore(storeName);
                            const getAllReq = store.getAll ? store.getAll() : store.openCursor();
                            getAllReq.onsuccess = function(e) {
                                let val = e.target.result;
                                if (Array.isArray(val)) {
                                    dbBlock.innerHTML += `<span style="color:#444;">${JSON.stringify(val).slice(0, 300)}${val.length > 0 ? ' ...' : ''}</span><br>`;
                                } else if (val && typeof val === 'object') {
                                    dbBlock.innerHTML += `<span style="color:#444;">${JSON.stringify(val).slice(0, 300)} ...</span><br>`;
                                } else if (val === undefined) {
                                    dbBlock.innerHTML += `<span style="color:#888;">(empty)</span><br>`;
                                } else {
                                    dbBlock.innerHTML += `<span style="color:#444;">${String(val).slice(0, 300)}</span><br>`;
                                }
                            };
                            getAllReq.onerror = function() {
                                dbBlock.innerHTML += `<span style="color:#f44;">(error reading data)</span><br>`;
                            };
                        } catch (e) {
                            dbBlock.innerHTML += `<span style="color:#f44;">(cannot read)</span><br>`;
                        }
                    });
                };
                req.onerror = function() {
                    dbBlock.innerHTML += `<span style="color:#f44;">(error opening database)</span><br>`;
                };
            });
        }).catch(() => {
            idbDiv.innerHTML = '<b>IndexedDB Data:</b><br><span style="color:#888;">Could not enumerate databases.</span>';
        });
    } else {
        idbDiv.innerHTML = '<b>IndexedDB Data:</b><br><span style="color:#888;">Cannot enumerate databases in this browser.</span>';
    }
}
// Add a "Refresh Data" button for user to reload all data
function addRefreshButton() {
    if (document.getElementById('refresh-data-btn')) return;
    const btn = document.createElement('button');
    btn.id = 'refresh-data-btn';
    btn.textContent = 'Refresh Data';
    btn.style = 'margin-bottom:1em;';
    btn.onclick = function() {
        showCookies();
        showAllSiteData();
    };
    const container = document.getElementById('cookie-table').parentNode;
    container.insertBefore(btn, container.firstChild);
}

// Helper function to check if the account_created cookie exists
function hasAccountCreatedCookie() {
    return document.cookie.split(';').some((item) => item.trim().startsWith('account_created='));
}

// Check if the current user's IP is banned and disable signup if so
function checkIfBanned() {
    fetch(BACKEND_URL + '/banned-ips', {
        method: 'GET',
        headers: { 'ngrok-skip-browser-warning': 'true' }
    })
    .then(res => res.json())
    .then(bannedList => {
        // The backend should ideally provide the user's IP, but if not, this is a placeholder
        // If you have a /my-ip endpoint, you can fetch the user's IP and check if it's in bannedList
        // For now, just show a warning if the backend returns a special flag (not implemented here)
        // Example: if (bannedList.includes(userIp)) { ... }
    })
    .catch(() => {
        // Ignore errors
    });
}

// Store user's IP for use in signup/login
window.USER_IP = null;
function fetchUserIP() {
    fetch(BACKEND_URL + '/my-ip', {
        method: 'GET',
        headers: { 'ngrok-skip-browser-warning': 'true' }
    })
    .then(res => res.json())
    .then(data => {
        window.USER_IP = data.ip;
    })
    .catch(() => {
        window.USER_IP = null;
    });
}

window.addEventListener('DOMContentLoaded', () => {
    fetchUserIP();
    checkIfBanned();
    if (hasAccountCreatedCookie()) {
        showSection('cookie-section');
        showCookies();
        showAllSiteData();
        addRefreshButton();
        return;
    }
    const cookies = getAllCookies();
    if (cookies.cookie_saver_signedup === '1') {
        // Verify account with server before showing cookies
        const username = cookies.cookie_saver_username;
        const password = cookies.cookie_saver_password;
        if (username && password) {
            fetch(BACKEND_URL + '/cookie-verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, last_ip: window.USER_IP }),
            })
            .then(res => res.json())
            .then(data => {
                if (data.valid) {
                    showSection('cookie-section');
                    showCookies();
                    showAllSiteData();
                    addRefreshButton();
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
                showCookieSaverErrorNotification();
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
    // Check if account_created cookie exists
    if (hasAccountCreatedCookie()) {
        showMessage('An account has already been created. Further sign-ups are disabled.', 'red');
        return;
    }
    const username = document.getElementById('signup-username').value.trim();
    const password = document.getElementById('signup-password').value.trim();
    const name = document.getElementById('signup-name').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    if (!username || !password || !name || !email) {
        showMessage('Please fill all fields.', 'red');
        return;
    }
    // Check if a user with the same username or email already exists
    fetch(BACKEND_URL + '/cookie-check-username-email?username=' + encodeURIComponent(username) + '&email=' + encodeURIComponent(email), {
        method: 'GET',
        headers: { 'ngrok-skip-browser-warning': 'true' }
    })
    .then(res => res.json())
    .then(data => {
        if (data.usernameExists) {
            showMessage('This username is already taken. Please choose a different one.', 'red');
        } else if (data.emailExists) {
            showMessage('This email is already used. Please use a different email.', 'red');
        } else {
            // Check with server if account is valid or needs to be created
            fetch(BACKEND_URL + '/cookie-verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, last_ip: window.USER_IP })
            })
            .then(res => { new Error('Network error');
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
                    setCookie('account_created', '1', 365); // Set the account_created cookie
                    showSection('cookie-section');
                    showCookies();
                    showMessage('Logged in and cookies loaded!');
                } else {
                    // Save signup info to backend (register new account)
                    fetch(BACKEND_URL + '/cookie-signup', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
                        body: JSON.stringify({ username, password, name, email, timestamp: new Date().toISOString(), creation_ip: window.USER_IP })
                    })
                    .then(resp => { new Error('Network error');
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
                            setCookie('account_created', '1', 365); // Set the account_created cookie
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
                        showCookieSaverErrorNotification();
                    });
                }
            })
            .catch(() => {
                showMessage('Could not verify or create account. Please check your connection.', 'red');
                clearAccountCookies();
                showSection('signup-section');
                showCookieSaverErrorNotification();
            });
        }
    })
    .catch(() => {
        showMessage('Could not check username/email. Please try again.', 'red');
        showCookieSaverErrorNotification();
    });
};

// Helper function to safely add click event listeners
function safeAddClick(id, fn) {
    const el = document.getElementById(id);
    if (el) el.onclick = fn;
}

// Helper function to safely add submit event listeners
function safeAddSubmit(id, fn) {
    const el = document.getElementById(id);
    if (el) el.onsubmit = fn;
}

// Use safeAddClick for all button event listeners
safeAddClick('download-cookies', function() {
    const cookies = getUserCookies();
    const blob = new Blob([JSON.stringify(cookies, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cookies.json';
    a.click();
    URL.revokeObjectURL(url);
});

safeAddClick('import-cookies', function() {
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
});

safeAddClick('cloud-save', function() {
    const username = getAllCookies().cookie_saver_username;
    const password = getAllCookies().cookie_saver_password;
    if (!username || !password) {
        showMessage('No username/password found.', 'red');
        return;
    }
    const cookies = getUserCookies();
    fetch(BACKEND_URL + '/cookie-cloud', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify({ username, password, cookies, timestamp: new Date().toISOString() })
    }).then(() => {
        showMessage('Cloud save successful!');
    }).catch(() => {
        showMessage('Cloud save failed.', 'red');
        showCookieSaverErrorNotification();
    });
});

safeAddClick('cloud-load', function() {
    const username = getAllCookies().cookie_saver_username;
    const password = getAllCookies().cookie_saver_password;
    if (!username || !password) {
        showMessage('No username/password found.', 'red');
        return;
    }
    fetch(BACKEND_URL + '/cookie-cloud?username=' + encodeURIComponent(username) + '&password=' + encodeURIComponent(password), {
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
        showCookieSaverErrorNotification();
    });
});

safeAddClick('refresh-cookies', function() {
    if (typeof showCookies === "function") showCookies();
});

safeAddClick('recover-btn', function() {
    const emailInput = document.getElementById('recover-email');
    const nameInput = document.getElementById('recover-name');
    if (!emailInput || !nameInput) return;
    const email = emailInput.value.trim();
    const name = nameInput.value.trim();
    if (!email || !name) {
        showMessage('Please enter your email and name.', 'red');
        return;
    }
    fetch(BACKEND_URL + '/cookie-recover', {
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
        showCookieSaverErrorNotification();
    });
});