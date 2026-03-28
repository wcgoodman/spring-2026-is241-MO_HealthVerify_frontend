/*
    Spring 2026 IS 241.210 - Team MO HealthVerify
    Logout behavior for home page.
 */

(function () {
    let logoutButton = document.getElementById("logoutButton");
    if (!logoutButton) return;

    function clearSiteCookies() {
        let cookies = document.cookie ? document.cookie.split(";") : [];
        cookies.forEach(function (cookie) {
            let cookieName = cookie.split("=")[0].trim();
            if (!cookieName) return;

            document.cookie = cookieName + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
        });
    }

    function clearRelatedLocalData() {
        try {
            sessionStorage.clear();
        } catch (err) {
            // no-op
        }

        try {
            let keyMatches = ["auth", "token", "session", "user", "login", "remember", "healthverify"];
            Object.keys(localStorage).forEach(function (key) {
                let loweredKey = key.toLowerCase();
                let shouldRemove = keyMatches.some(function (match) {
                    return loweredKey.indexOf(match) !== -1;
                });
                if (shouldRemove) localStorage.removeItem(key);
            });
        } catch (err) {
            // no-op
        }

        clearSiteCookies();
    }

    logoutButton.addEventListener("click", function () {
        clearRelatedLocalData();
        window.alert("Logout successful.");
        window.location.href = "index.html";
    });
})();
