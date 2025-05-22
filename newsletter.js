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

    // Only show popup if not already subscribed or dismissed
    if (getCookie('newsletter_hide') === '1') return;

    // Create popup HTML
    const popup = document.createElement('div');
    popup.innerHTML = `
        <div id="newsletter-popup" style="
            position:fixed;top:0;left:0;width:100vw;height:100vh;
            background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;z-index:9999;">
            <div style="background:#fff;padding:2em 1.5em 1.5em 1.5em;border-radius:10px;box-shadow:0 2px 16px #0003;max-width:370px;width:100%;text-align:center;">
                <h2 style="margin-top:0;">✨ Join our Newsletter!</h2>
                <p style="color:#444;margin-bottom:1em;">
                    Get updates on new features, exclusive links, and a chance to be selected for beta testing and more!
                </p>
                <form id="newsletter-form" style="margin-bottom:0.5em;">
                    <input type="text" id="newsletter-name" placeholder="Your Name" required style="width:100%;margin-bottom:0.7em;padding:0.6em;font-size:1em;">
                    <input type="email" id="newsletter-email" placeholder="Your Email" required style="width:100%;margin-bottom:0.7em;padding:0.6em;font-size:1em;">
                    <button type="submit" style="width:100%;padding:0.8em;font-size:1em;background:#007bff;color:#fff;border:none;border-radius:4px;cursor:pointer;">Subscribe</button>
                </form>
                <button id="newsletter-close" style="margin-top:0.5em;width:100%;padding:0.7em;font-size:1em;background:#eee;border:none;border-radius:4px;cursor:pointer;">No Thanks</button>
                <div id="newsletter-message" style="margin-top:1em;color:green;display:none;"></div>
                <div style="margin-top:1.2em;font-size:0.95em;color:#666;">
                    <ul style="text-align:left;max-width:320px;margin:0 auto;padding-left:1.2em;">
                        <li>Be the first to know about new features and updates</li>
                        <li>Get exclusive links and early access</li>
                        <li>Chance to be selected for beta testing</li>
                        <li>And much more!</li>
                    </ul>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(popup);

    // Close popup and set cookie if user clicks "No Thanks"
    document.getElementById('newsletter-close').onclick = function() {
        setCookie('newsletter_hide', '1', 365);
        document.getElementById('newsletter-popup').remove();
    };

    // Handle form submit
    document.getElementById('newsletter-form').onsubmit = function(e) {
        e.preventDefault();
        const name = document.getElementById('newsletter-name').value.trim();
        const email = document.getElementById('newsletter-email').value.trim();
        const messageDiv = document.getElementById('newsletter-message');
        if (!name || !email) {
            messageDiv.textContent = 'Please enter your name and a valid email.';
            messageDiv.style.color = 'red';
            messageDiv.style.display = 'block';
            return;
        }
        fetch('https://moving-badly-cheetah.ngrok-free.app/newsletter', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify({ name, email, timestamp: new Date().toISOString() })
        }).then(() => {
            messageDiv.textContent = '🎉 Thank you for subscribing! Check your inbox for updates soon.';
            messageDiv.style.color = 'green';
            messageDiv.style.display = 'block';
            setCookie('newsletter_hide', '1', 365);
            setTimeout(() => {
                document.getElementById('newsletter-popup').remove();
            }, 2200);
        }).catch(() => {
            messageDiv.textContent = 'There was an error. Please try again.';
            messageDiv.style.color = 'red';
            messageDiv.style.display = 'block';
        });
    };
})();
