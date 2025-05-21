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
            <div style="background:#fff;padding:2em;border-radius:8px;box-shadow:0 2px 8px #0002;max-width:350px;width:100%;">
                <h3>Join our Newsletter</h3>
                <form id="newsletter-form">
                    <input type="text" id="newsletter-name" placeholder="Your Name" required style="width:100%;margin-bottom:1em;padding:0.5em;">
                    <input type="email" id="newsletter-email" placeholder="Your Email" required style="width:100%;margin-bottom:1em;padding:0.5em;">
                    <button type="submit" style="width:100%;padding:0.7em;">Subscribe</button>
                </form>
                <button id="newsletter-close" style="margin-top:1em;width:100%;">No Thanks</button>
                <div id="newsletter-message" style="margin-top:1em;color:green;display:none;"></div>
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
        fetch('https://moving-badly-cheetah.ngrok-free.app/newsletter', {
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
            setTimeout(() => {
                document.getElementById('newsletter-popup').remove();
            }, 2000);
        }).catch(() => {
            document.getElementById('newsletter-message').textContent = 'There was an error. Please try again.';
            document.getElementById('newsletter-message').style.display = 'block';
        });
    };
})();
