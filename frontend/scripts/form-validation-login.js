/*
    Spring 2026 IS 241.210 - Team MO HealthVerify
    Written by Davis Ly
 */

function togglePassword(fieldId) {
    let field = document.getElementById(fieldId);
    if (!field) return;
    field.type = field.type === "password" ? "text" : "password";
}

(function () {
    let form = document.getElementById("loginForm");
    let username = document.getElementById("username");
    let password = document.getElementById("password");
    let usernameError = document.getElementById("usernameError");
    let passwordError = document.getElementById("passwordError");
    let authMessage = document.getElementById("authMessage");
    let signInButton = document.getElementById("signInButton");
    let touched = {};
    let isSubmitting = false;

    if (!form || !username || !password || !signInButton) return;

    // Email regex from registration script family: supports common valid local-part characters.
    let emailPattern = new RegExp("^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(?:\\.[A-Za-z0-9-]+)*\\.[A-Za-z]{2,}$");
    let pwPattern = /^.{8,64}$/;

    function setError(el, show) {
        if (!el) return;
        if (show) el.classList.add("error");
        else el.classList.remove("error");
    }

    function validateField(id) {
        let el = document.getElementById(id);
        let valid = true;

        if (id === "username") {
            valid = el && emailPattern.test(el.value.trim());
            if (usernameError) {
                usernameError.textContent = touched.username && !valid ? "Enter a valid email address." : "";
            }
        } else if (id === "password") {
            valid = el && pwPattern.test(el.value);
            if (passwordError) {
                passwordError.textContent = touched.password && !valid ? "Password must be 8-64 characters." : "";
            }
        }

        setError(el, !!touched[id] && !valid);
        return valid;
    }

    function validateAll() {
        let usernameValid = validateField("username");
        let passwordValid = validateField("password");
        return usernameValid && passwordValid;
    }

    function updateSubmitState() {
        signInButton.disabled = isSubmitting || !validateAll();
    }

    function clearAuthMessage() {
        if (authMessage) authMessage.textContent = "";
    }

    function setAuthMessage(message) {
        if (authMessage) authMessage.textContent = message;
    }

    ["username", "password"].forEach(function (id) {
        let el = document.getElementById(id);
        if (!el) return;

        el.addEventListener("focus", function () {
            touched[id] = true;
            validateField(id);
            clearAuthMessage();
            updateSubmitState();
        });

        el.addEventListener("input", function () {
            if (id === "username") {
                el.value = el.value.toLowerCase();
            }
            validateField(id);
            clearAuthMessage();
            updateSubmitState();
        });

        el.addEventListener("blur", function () {
            validateField(id);
            updateSubmitState();
        });
    });

    form.addEventListener("submit", function (e) {
        e.preventDefault();
        touched.username = true;
        touched.password = true;
        clearAuthMessage();

        if (!validateAll()) {
            updateSubmitState();
            if (!validateField("username")) username.focus();
            else if (!validateField("password")) password.focus();
            return;
        }

        isSubmitting = true;
        signInButton.textContent = "Signing In...";
        updateSubmitState();

        let payload = {
            email: username.value.trim().toLowerCase(),
            password: password.value
        };





        // Temporary dev override credential.
        if (payload.email === "dly5@my.stlcc.edu" && payload.password === "testing1") {
            isSubmitting = false;
            signInButton.textContent = "Sign In";
            updateSubmitState();
            window.location.href = "home.html";
            return;
        }




        fetch("http://localhost:8080/api/auth/login", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(payload)
        })
            .then(function (response) {
                return response.text().then(function (text) {
                    let data = {};
                    if (text) {
                        try {
                            data = JSON.parse(text);
                        } catch (err) {
                            data = {};
                        }
                    }
                    return {ok: response.ok, data: data};
                });
            })
            .then(function (result) {
                let isSuccess = result.ok && result.data && result.data.success === true;
                if (!isSuccess) {
                    setAuthMessage((result.data && result.data.message) || "Sign in failed. Please check your username and password.");
                    return;
                }

                window.location.href = "home.html";
            })
            .catch(function() {
                setAuthMessage("Unable to reach login service. Please try again.");
            })
            .finally(function () {
                isSubmitting = false;
                signInButton.textContent = "Sign In";
                updateSubmitState();
            });
    });

    updateSubmitState();
})();
