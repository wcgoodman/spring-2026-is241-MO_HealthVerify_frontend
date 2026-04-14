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
    let clearProfileButton = document.getElementById("clearProfileButton");
    let pageMessage = document.getElementById("profileMessage");
    let PROFILE_FETCH_URL = "http://localhost:8080/api/auth/profile";
    let PROFILE_UPDATE_URL = "http://localhost:8080/api/auth/profile/update";

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

    function normalizeProfile(profile) {
        return {
            firstName: profile && profile.firstName ? profile.firstName : "",
            lastName: profile && profile.lastName ? profile.lastName : "",
            email: profile && profile.email ? profile.email : "",
            datetimeRegistered: profile && profile.datetimeRegistered ? profile.datetimeRegistered : "",
            lastLogin: profile && profile.lastLogin ? profile.lastLogin : ""
        };
    }

    function applyProfileToForm(profile) {
        firstName.value = profile.firstName || "";
        lastName.value = profile.lastName || "";
        email.value = profile.email || "";
        datetimeRegistered.value = formatDate(profile.datetimeRegistered);
        lastLogin.value = formatDate(profile.lastLogin);
    }

    function hydrateForm() {
        let profile = normalizeProfile(profileStore.read());
        applyProfileToForm(profile);

        if (!profile.email) {
            setMessage("No saved profile data was found yet. Sign in or register first, then update this page.", "pending");
            return;
        }

        setMessage("Profile data is stored locally in this frontend until a profile API is available.", "pending");
    }

    function parseJsonSafely(response) {
        return response.text().then(function (text) {
            if (!text) return {};

            try {
                return JSON.parse(text);
            } catch (err) {
                return {};
            }
        });
    }

    function buildProfileFromResponse(payload) {
        let source = payload && payload.profile ? payload.profile : payload;
        if (payload && payload.user) {
            source = payload.user;
        }
        return normalizeProfile(source || {});
    }

    function loadProfileFromBackend() {
        setMessage("Loading profile from backend...", "pending");

        return fetch(PROFILE_FETCH_URL, {
            method: "GET",
            headers: {"Content-Type": "application/json"},
            credentials: "include"
        })
            .then(function (response) {
                return parseJsonSafely(response).then(function (data) {
                    return {ok: response.ok, data: data};
                });
            })
            .then(function (result) {
                if (!result.ok) {
                    throw new Error((result.data && result.data.message) || "Unable to load profile.");
                }

                let backendProfile = buildProfileFromResponse(result.data);
                let storedProfile = profileStore.read();
                let mergedProfile = profileStore.merge({
                    firstName: backendProfile.firstName || storedProfile.firstName || "",
                    lastName: backendProfile.lastName || storedProfile.lastName || "",
                    email: backendProfile.email || storedProfile.email || "",
                    datetimeRegistered: backendProfile.datetimeRegistered || storedProfile.datetimeRegistered || "",
                    lastLogin: backendProfile.lastLogin || storedProfile.lastLogin || ""
                });

                applyProfileToForm(normalizeProfile(mergedProfile));
                setMessage("Profile loaded from backend.", "success");
            })
            .catch(function (error) {
                hydrateForm();
                setMessage((error && error.message) || "Unable to load profile from backend. Showing saved local data instead.", "error");
            });
    }

    if (clearProfileButton) {
        clearProfileButton.addEventListener("click", function () {
            profileStore.clear();
            applyProfileToForm(normalizeProfile({}));
            setMessage("Saved local profile data cleared.", "success");
        });
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

        let payload = {
            firstName: trimmedFirstName,
            lastName: trimmedLastName,
            email: trimmedEmail
        };

        setMessage("Saving profile to backend...", "pending");

        fetch(PROFILE_UPDATE_URL, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            credentials: "include",
            body: JSON.stringify(payload)
        })
            .then(function (response) {
                return parseJsonSafely(response).then(function (data) {
                    return {ok: response.ok, data: data};
                });
            })
            .then(function (result) {
                if (!result.ok) {
                    throw new Error((result.data && result.data.message) || "Unable to update profile.");
                }

                let savedProfile = buildProfileFromResponse(result.data);
                let mergedProfile = profileStore.merge({
                    firstName: savedProfile.firstName || payload.firstName,
                    lastName: savedProfile.lastName || payload.lastName,
                    email: savedProfile.email || payload.email,
                    datetimeRegistered: savedProfile.datetimeRegistered || profileStore.read().datetimeRegistered || "",
                    lastLogin: savedProfile.lastLogin || profileStore.read().lastLogin || ""
                });

                applyProfileToForm(normalizeProfile(mergedProfile));
                setMessage((result.data && result.data.message) || "Profile updated successfully.", "success");
            })
            .catch(function (error) {
                profileStore.merge(payload);
                applyProfileToForm(normalizeProfile(profileStore.read()));
                setMessage((error && error.message) || "Unable to update profile in backend. Local profile was updated instead.", "error");
            });
    });

    hydrateForm();
    loadProfileFromBackend();
})();
