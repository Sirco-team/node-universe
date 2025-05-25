let BACKEND_URL = '';
fetch('/backend.json')
    .then(res => res.json())
    .then(cfg => {
        BACKEND_URL = cfg.url.replace(/\/$/, '');
        main();
    });

function main() {
(function() {
    // Helper to set a cookie
    function setCookie(name, value, days) {
        let expires = "";
        if (days) {
            const date = new Date();
            date.setTime(date.getTime() + (days*24*60*60*1000));
            expires = "; expires=" + date.toUTCString();
        }
        document.cookie = name + "=" + (value || "")  + expires + "; path=/";
    }
    // Helper to get a cookie
    function getCookie(name) {
        const nameEQ = name + "=";
        const ca = document.cookie.split(';');
        for(let i=0;i < ca.length;i++) {
            let c = ca[i];
            while (c.charAt(0)==' ') c = c.substring(1,c.length);
            if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
        }
        return null;
    }

    // Helper to delete a cookie
    function deleteCookie(name) {
        document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    }

    // Helper to get name/email from cookies
    function getUserNewsletterInfo() {
        return {
            name: getCookie('newsletter_name'),
            email: getCookie('newsletter_email')
        };
    }

    // Only show the newsletter popup, not the unsub popup
    setTimeout(() => {
        showNewsletterPopup();
    }, 3000);

    function showNewsletterPopup() {
        // Create popup HTML
        const popup = document.createElement('div');
        popup.innerHTML = `
            <div id="newsletter-popup" style="
                position:fixed;top:0;left:0;width:100vw;height:100vh;
                background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;z-index:9999;
                font-family: Arial, sans-serif;">
                <div style="
                    background:#fff;
                    padding:32px 28px 18px 28px;
                    border-radius:12px;
                    box-shadow:0 4px 16px rgba(0,0,0,0.18);
                    max-width:370px;
                    width:95vw;
                    text-align:center;
                    margin: 0 10px;
                ">
                    <h2 style="margin-top:0;margin-bottom:0.5em;color:#007bff;">Join our Newsletter</h2>
                    <p style="margin-bottom:1.5em;color:#333;font-size:1.05em;">
                        In this newsletter you will get news about Code Universe, new URLs, and sometimes we need beta testers so you might be one.
                    </p>
                    <form id="newsletter-form" style="display:flex;flex-direction:column;gap:0.8em;">
                        <label for="newsletter-name" style="font-size:0.97em;color:#555;text-align:left;margin-bottom:-0.5em;margin-left:2px;">
                            * Your full name
                        </label>
                        <input type="text" id="newsletter-name" placeholder="Your Name" required 
                            style="padding:0.7em 1em;font-size:1em;border:1px solid #ccc;border-radius:6px;">
                        <input type="email" id="newsletter-email" placeholder="Your Email" required 
                            style="padding:0.7em 1em;font-size:1em;border:1px solid #ccc;border-radius:6px;">
                        <button type="submit" style="
                            padding:0.8em 0;
                            font-size:1em;
                            border-radius:6px;
                            background-color:#007bff;
                            color:white;
                            border:none;
                            cursor:pointer;
                            margin-top:0.3em;
                            transition:background 0.2s;
                        " onmouseover="this.style.backgroundColor='#0056b3'" onmouseout="this.style.backgroundColor='#007bff'">
                            Subscribe
                        </button>
                    </form>
                    <button id="newsletter-close" style="
                        margin-top:1.2em;
                        width:100%;
                        padding:0.7em 0;
                        font-size:1em;
                        border-radius:6px;
                        background-color:#f4f4f4;
                        color:#007bff;
                        border:1px solid #007bff;
                        cursor:pointer;
                        transition:background 0.2s,color 0.2s;
                    " onmouseover="this.style.backgroundColor='#e6f0ff';this.style.color='#0056b3'" onmouseout="this.style.backgroundColor='#f4f4f4';this.style.color='#007bff'">
                        No Thanks
                    </button>
                    <div style="margin-top:0.7em;">
                        <label style="font-size:0.92em;color:#555;cursor:pointer;">
                            <input type="checkbox" id="newsletter-hide-checkbox" style="margin-right:6px;vertical-align:middle;">
                            Don't show again
                        </label>
                    </div>
                    <div id="newsletter-message" style="margin-top:1em;color:green;display:none;font-weight:bold;"></div>
                    <div style="margin-top:1.2em;font-size:0.82em;color:#888;">
                        We don't share any data like your name or email.
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(popup);

        document.getElementById('newsletter-close').onclick = function() {
            const dontShow = document.getElementById('newsletter-hide-checkbox').checked;
            if (dontShow) setCookie('newsletter_hide', '1', 365);
            document.getElementById('newsletter-popup').remove();
        };

        function showNewsletterErrorNotification() {
            if (document.getElementById('newsletter-error-notification')) return;
            const notif = document.createElement('div');
            notif.id = 'newsletter-error-notification';
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

        document.getElementById('newsletter-form').onsubmit = function(e) {
            e.preventDefault();
            const name = document.getElementById('newsletter-name').value.trim();
            const email = document.getElementById('newsletter-email').value.trim();
            fetch(BACKEND_URL + '/newsletter', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true'
                },
                body: JSON.stringify({ name, email, timestamp: new Date().toISOString() })
            }).then(() => {
                document.getElementById('newsletter-message').textContent = 'Thank you for subscribing!';
                document.getElementById('newsletter-message').style.display = 'block';
                setCookie('newsletter_hide', '1', 365);
                setCookie('newsletter_name', name, 365);
                setCookie('newsletter_email', email, 365);
                setTimeout(() => {
                    document.getElementById('newsletter-popup').remove();
                }, 2000);
            }).catch(() => {
                document.getElementById('newsletter-message').textContent = 'There was an error. Please try again.';
                document.getElementById('newsletter-message').style.display = 'block';
                showNewsletterErrorNotification();
            });
        };
    }
})();
}
