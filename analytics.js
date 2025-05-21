// Collect user info and send to backend for logging

(function() {
    // Helper to parse OS and browser from user agent
    function getOS() {
        const ua = navigator.userAgent;
        if (/windows phone/i.test(ua)) return "Windows Phone";
        if (/windows/i.test(ua)) return "Windows";
        if (/android/i.test(ua)) return "Android";
        if (/linux/i.test(ua)) return "Linux";
        if (/iPhone|iPad|iPod/i.test(ua)) return "iOS";
        if (/mac/i.test(ua)) return "MacOS";
        return "Unknown";
    }

    function getBrowser() {
        const ua = navigator.userAgent;
        if (/chrome|crios/i.test(ua)) return "Chrome";
        if (/firefox|fxios/i.test(ua)) return "Firefox";
        if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) return "Safari";
        if (/edg/i.test(ua)) return "Edge";
        if (/opr\//i.test(ua)) return "Opera";
        return "Unknown";
    }

    // Fetch IP address from a public API
    function fetchIP() {
        return fetch("https://api.ipify.org?format=json")
            .then(res => res.json())
            .then(data => data.ip)
            .catch(() => "Unavailable");
    }

    // Send collected data to backend
    function sendAnalytics(data) {
        fetch("https://339a-72-129-179-229.ngrok-free.app/collect", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        })
        .then(res => {
            // Optional: log for debugging
            // console.log("Analytics sent", res.status);
        })
        .catch((err) => {
            // Optional: log error for debugging
            // console.error("Analytics error", err);
        });
    }

    // Main
    fetchIP().then(ip => {
        const payload = {
            ip: ip,
            os: getOS(),
            browser: getBrowser(),
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
            page: window.location.pathname
        };
        sendAnalytics(payload);
    });
})();
