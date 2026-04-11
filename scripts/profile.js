/*
    Spring 2026 IS 241.210 - Team MO HealthVerify
    Written by Davis Ly
 */

(function () {
    let profileStore = window.moHealthVerifyProfileStore;
    let form = document.getElementById("profileForm");
    let firstName = document.getElementById("profileFirstName");
    let lastName = document.getElementById("profileLastName");
    let email = document.getElementById("profileEmail");
    let datetimeRegistered = document.getElementById("profileDatetimeRegistered");
    let lastLogin = document.getElementById("profileLastLogin");
    let pageMessage = document.getElementById("profileMessage");

    if (!profileStore || !form) return;

    function formatDate(value) {
        if (!value) return "Not available";

        let parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) return "Not available";

        return parsed.toLocaleString();
    }

    function setMessage(message, type) {
        if (!pageMessage) return;

        pageMessage.textContent = message || "";
        pageMessage.className = "page-message";
        if (type) pageMessage.classList.add(type);
    }

    function hydrateForm() {
        let profile = profileStore.read();

        firstName.value = profile.firstName || "";
        lastName.value = profile.lastName || "";
        email.value = profile.email || "";
        datetimeRegistered.value = formatDate(profile.datetimeRegistered);
        lastLogin.value = formatDate(profile.lastLogin);

        if (!profile.email) {
            setMessage("No saved profile data was found yet. Sign in or register first, then update this page.", "pending");
            return;
        }

        setMessage("Profile data is stored locally in this frontend until a profile API is available.", "pending");
    }

    form.addEventListener("submit", function (event) {
        event.preventDefault();

        let trimmedFirstName = firstName.value.trim();
        let trimmedLastName = lastName.value.trim();
        let trimmedEmail = email.value.trim().toLowerCase();

        if (!trimmedFirstName || !trimmedLastName || !trimmedEmail) {
            setMessage("First name, last name, and email are required.", "error");
            return;
        }

        profileStore.merge({
            firstName: trimmedFirstName,
            lastName: trimmedLastName,
            email: trimmedEmail
        });

        hydrateForm();
        setMessage("Profile saved locally.", "success");
    });

    hydrateForm();
})();
