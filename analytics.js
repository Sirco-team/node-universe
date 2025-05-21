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

    // Fetch IP and geolocation info from IPinfo Lite API (free)
    function fetchGeoInfo() {
        return fetch("https://api.ipinfo.io/lite/me?token=c311e5ab3893df", {
            headers: {
                "Accept": "application/json"
            }
        })
        .then(res => res.json())
        .catch(() => ({}));
    }

    // Send collected data to backend
    function sendAnalytics(data) {
        fetch("https://moving-badly-cheetah.ngrok-free.app/collect", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "ngrok-skip-browser-warning": "true"
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
    fetchGeoInfo().then(geo => {
        const payload = {
            ip: geo.ip || "Unavailable",
            os: getOS(),
            browser: getBrowser(),
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
            page: window.location.pathname,
            country: geo.country || geo.country_code || "Unavailable",
            city: geo.city || "Unavailable", // Not available in Lite, will be "Unavailable"
            hostname: geo.as_domain || "Unavailable",
            isp: geo.as_name || geo.asn || "Unavailable",
            asn: geo.asn || "Unavailable",
            continent: geo.continent || geo.continent_code || "Unavailable"
        };
        sendAnalytics(payload);
    });
})();
