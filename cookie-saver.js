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
        'cookie_saver_username'
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
        'cookie_saver_username'
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

// On load, check if signed up
window.addEventListener('DOMContentLoaded', () => {
    if (getAllCookies().cookie_saver_signedup === '1') {
        showSection('cookie-section');
        showCookies();
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
    setCookie('cookie_saver_signedup', '1', 365);
    setCookie('cookie_saver_username', username, 365);
    setCookie('cookie_saver_password', password, 365);
    setCookie('cookie_saver_name', name, 365);
    setCookie('cookie_saver_email', email, 365);
    // Save signup info to backend
    fetch('https://moving-badly-cheetah.ngrok-free.app/cookie-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify({ username, password, name, email, timestamp: new Date().toISOString() })
    });
    showSection('cookie-section');
    showCookies();
    showMessage('Signed up and cookies saved!');
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
