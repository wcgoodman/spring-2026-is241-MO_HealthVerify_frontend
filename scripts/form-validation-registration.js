/*
    Spring 2026 IS 241.210 - Team MO HealthVerify
    Written by Davis Ly, with some tweaks from William Goodman
 */

function togglePassword(fieldId) {
    let field = document.getElementById(fieldId);
    field.type = field.type === "password" ? "text" : "password";
}

// Validation and submit handling
(function () {
    let form = document.getElementById('signupForm');
    let firstName = document.getElementById('firstName');
    let lastName = document.getElementById('lastName');
    let email = document.getElementById('email');
    let emailError = document.getElementById('emailError');
    let password = document.getElementById('password');
    let confirmPassword = document.getElementById('confirmPassword');
    let securityQuestion = document.getElementById('securityQuestion');
    let securityAnswer = document.getElementById('securityAnswer');
    let terms = document.getElementById('terms');
    let signupButton = document.getElementById('signupButton');

    let touched = {};

    // Email regex: allows + in local-part and requires a TLD
    let emailPattern = new RegExp("^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(?:\\.[A-Za-z0-9-]+)*\\.[A-Za-z]{2,}$");
    let pwPattern = /^.{8,64}$/;

    function setError(el, show) {
        if (!el) return;
        if (show) el.classList.add('error');
        else el.classList.remove('error');
    }

    function validateField(id) {
        let el = document.getElementById(id);
        let valid;

        switch (id) {
            case 'firstName':
            case 'lastName':
            case 'securityAnswer':
                valid = el && el.value && el.value.trim().length > 0;
                break;
            case 'email':
                valid = el && emailPattern.test(el.value.trim());
                if (touched.email) {
                    emailError.textContent = valid ? '' : '*Please enter a valid email address.';
                }
                break;
            case 'password':
                valid = el && pwPattern.test(el.value);
                break;
            case 'confirmPassword':
                valid = confirmPassword && (confirmPassword.value === password.value) && pwPattern.test(confirmPassword.value);
                break;
            case 'securityQuestion':
                valid = el && el.value && el.value !== '';
                break;
            case 'terms':
                valid = terms && terms.checked;
                break;
            default:
                valid = true;
        }

        // Only show visual error if field has been touched at least once
        let showVisual = !!touched[id];
        if (id === 'email') setError(el, showVisual && !valid);
        else if (id === 'terms') {
            // checkbox uses parent label highlighting
            let cb = document.getElementById('terms');
            if (cb) cb.classList.toggle('error', showVisual && !valid);
        } else {
            setError(el, showVisual && !valid);
        }

        return valid;
    }

    function validateAll() {
        let ids = ['firstName', 'lastName', 'email', 'password', 'confirmPassword', 'securityQuestion', 'securityAnswer', 'terms'];
        let allValid = true;
        ids.forEach(function (id) {
            let ok = validateField(id);
            if (!ok) allValid = false;
        });
        return allValid;
    }

    function updateSubmitState() {
        let allValid = validateAll();
        signupButton.disabled = !allValid;
        return allValid;
    }

    // Attach focus handlers to mark touched
    ['firstName', 'lastName', 'email', 'password', 'confirmPassword', 'securityQuestion', 'securityAnswer'].forEach(function (id) {
        let el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('focus', function () {
            touched[id] = true;
            validateField(id);
            updateSubmitState();
        });
        el.addEventListener('input', function () {
            if (id === 'email') {
                el.value = el.value.toLowerCase();
            }
            validateField(id);
            updateSubmitState();
        });
        el.addEventListener('blur', function () {
            validateField(id);
            updateSubmitState();
        });
    });

    // checkbox change
    if (terms) {
        terms.addEventListener('change', function () {
            touched['terms'] = true;
            validateField('terms');
            updateSubmitState();
        });
    }

    // Prevent submission unless valid
    form.addEventListener('submit', function (e) {
        e.preventDefault();
        // mark all fields as touched so errors show if any
        ['firstName', 'lastName', 'email', 'password', 'confirmPassword', 'securityQuestion', 'securityAnswer', 'terms'].forEach(function (id) {
            touched[id] = true;
        });
        if (!updateSubmitState()) {
            // focus first invalid
            let ids = ['firstName', 'lastName', 'email', 'password', 'confirmPassword', 'securityQuestion', 'securityAnswer', 'terms'];
            for (let i = 0; i < ids.length; i++) {
                if (!validateField(ids[i])) {
                    let el = document.getElementById(ids[i]);
                    if (el && typeof el.focus === 'function') el.focus();
                    break;
                }
            }
            return;
        }

        // Build payload and send to backend
        let payload = {
            firstName: firstName.value.trim(),
            lastName: lastName.value.trim(),
            email: email.value.trim().toLowerCase(),
            password: password.value,
            securityQuestion: securityQuestion.value,
            securityAnswer: securityAnswer.value.trim()
        };

        fetch('http://localhost:8080/api/auth/register', {// makes an HTTP request to your backend endpoint
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        })
            .then(response => {
                if (!response.ok) {
                    // If not ok, return the body promise (e.g., as JSON) to the next .then or .catch
                    return response.json().then(errorData => {
                        throw new Error(errorData.message || 'Unknown error occurred');
                    });
                }
                return response.json();
            })
            .then(data => {
                if (data && data.success) {
                    alert('Account registration successful!');
                    window.location.href = 'login.html'; // Redirect to login page after successful registration
                }
            })
            .catch(error => {
                // This catches network errors or the error thrown above
                alert('Error occurred: ' + error.message);
            });
    });

})();

// Password tooltip: show only for the main password field (not confirm password)
(function () {
    let pwField = document.getElementById('password');
    let pwTooltip = document.getElementById('passwordTooltip');
    if (!pwField || !pwTooltip) return;

    pwField.addEventListener('focus', function () {
        pwTooltip.classList.add('visible');
        pwTooltip.setAttribute('aria-hidden', 'false');
    });

    pwField.addEventListener('blur', function () {
        pwTooltip.classList.remove('visible');
        pwTooltip.setAttribute('aria-hidden', 'true');
    });
})();
