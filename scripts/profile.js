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
    let isMissouriResident = document.getElementById("profileIsMissouriResident");
    let dateOfBirth = document.getElementById("profileDateOfBirth");
    let address1 = document.getElementById("profileAddress1");
    let address2 = document.getElementById("profileAddress2");
    let addressCity = document.getElementById("profileAddressCity");
    let addressState = document.getElementById("profileAddressState");
    let addressZipCode = document.getElementById("profileAddressZipCode");
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

    function normalizeBooleanValue(value) {
        if (typeof value === "boolean") return value;
        if (typeof value !== "string") return null;

        let normalized = value.trim().toLowerCase();
        if (normalized === "true" || normalized === "yes" || normalized === "1") return true;
        if (normalized === "false" || normalized === "no" || normalized === "0") return false;
        return null;
    }

    function normalizeDateInputValue(value) {
        if (!value || typeof value !== "string") return "";

        let trimmed = value.trim();
        if (!trimmed) return "";
        if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

        let parsed = new Date(trimmed);
        if (Number.isNaN(parsed.getTime())) return "";
        return parsed.toISOString().slice(0, 10);
    }

    function coalesceString(primary, fallback) {
        if (typeof primary === "string" && primary.trim() !== "") return primary;
        if (typeof fallback === "string" && fallback.trim() !== "") return fallback;
        return "";
    }

    function coalesceBoolean(primary, fallback) {
        if (typeof primary === "boolean") return primary;
        if (typeof fallback === "boolean") return fallback;
        return null;
    }

    function normalizeProfile(profile) {
        return {
            firstName: profile && profile.firstName ? profile.firstName : "",
            lastName: profile && profile.lastName ? profile.lastName : "",
            email: profile && profile.email ? profile.email : "",
            isMissouriResident: normalizeBooleanValue(profile && profile.isMissouriResident),
            dateOfBirth: normalizeDateInputValue(profile && profile.dateOfBirth),
            address1: profile && profile.address1 ? profile.address1 : "",
            address2: profile && profile.address2 ? profile.address2 : "",
            addressCity: profile && profile.addressCity ? profile.addressCity : "",
            addressState: profile && profile.addressState ? profile.addressState : "",
            addressZipCode: profile && profile.addressZipCode ? profile.addressZipCode : "",
            datetimeRegistered: profile && profile.datetimeRegistered ? profile.datetimeRegistered : "",
            lastLogin: profile && profile.lastLogin ? profile.lastLogin : ""
        };
    }

    function applyProfileToForm(profile) {
        firstName.value = profile.firstName || "";
        lastName.value = profile.lastName || "";
        email.value = profile.email || "";
        isMissouriResident.value = profile.isMissouriResident === true ? "true" : profile.isMissouriResident === false ? "false" : "";
        dateOfBirth.value = profile.dateOfBirth || "";
        address1.value = profile.address1 || "";
        address2.value = profile.address2 || "";
        addressCity.value = profile.addressCity || "";
        addressState.value = profile.addressState || "";
        addressZipCode.value = profile.addressZipCode || "";
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

        setMessage("Profile data loaded from local storage. Connecting to backend now...", "pending");
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
                    firstName: coalesceString(backendProfile.firstName, storedProfile.firstName),
                    lastName: coalesceString(backendProfile.lastName, storedProfile.lastName),
                    email: coalesceString(backendProfile.email, storedProfile.email),
                    isMissouriResident: coalesceBoolean(backendProfile.isMissouriResident, storedProfile.isMissouriResident),
                    dateOfBirth: coalesceString(backendProfile.dateOfBirth, storedProfile.dateOfBirth),
                    address1: coalesceString(backendProfile.address1, storedProfile.address1),
                    address2: coalesceString(backendProfile.address2, storedProfile.address2),
                    addressCity: coalesceString(backendProfile.addressCity, storedProfile.addressCity),
                    addressState: coalesceString(backendProfile.addressState, storedProfile.addressState),
                    addressZipCode: coalesceString(backendProfile.addressZipCode, storedProfile.addressZipCode),
                    datetimeRegistered: coalesceString(backendProfile.datetimeRegistered, storedProfile.datetimeRegistered),
                    lastLogin: coalesceString(backendProfile.lastLogin, storedProfile.lastLogin)
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
        let selectedResidency = normalizeBooleanValue(isMissouriResident.value);
        let normalizedDateOfBirth = normalizeDateInputValue(dateOfBirth.value);
        let trimmedAddress1 = address1.value.trim();
        let trimmedAddress2 = address2.value.trim();
        let trimmedAddressCity = addressCity.value.trim();
        let trimmedAddressState = addressState.value.trim().toUpperCase();
        let trimmedAddressZipCode = addressZipCode.value.trim();

        if (!trimmedFirstName || !trimmedLastName || !trimmedEmail) {
            setMessage("First name, last name, and email are required.", "error");
            return;
        }

        let payload = {
            firstName: trimmedFirstName,
            lastName: trimmedLastName,
            email: trimmedEmail,
            isMissouriResident: selectedResidency,
            dateOfBirth: normalizedDateOfBirth,
            address1: trimmedAddress1,
            address2: trimmedAddress2,
            addressCity: trimmedAddressCity,
            addressState: trimmedAddressState,
            addressZipCode: trimmedAddressZipCode
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
                let existingProfile = profileStore.read();
                let mergedProfile = profileStore.merge({
                    firstName: coalesceString(savedProfile.firstName, payload.firstName),
                    lastName: coalesceString(savedProfile.lastName, payload.lastName),
                    email: coalesceString(savedProfile.email, payload.email),
                    isMissouriResident: coalesceBoolean(savedProfile.isMissouriResident, payload.isMissouriResident),
                    dateOfBirth: coalesceString(savedProfile.dateOfBirth, payload.dateOfBirth),
                    address1: coalesceString(savedProfile.address1, payload.address1),
                    address2: coalesceString(savedProfile.address2, payload.address2),
                    addressCity: coalesceString(savedProfile.addressCity, payload.addressCity),
                    addressState: coalesceString(savedProfile.addressState, payload.addressState),
                    addressZipCode: coalesceString(savedProfile.addressZipCode, payload.addressZipCode),
                    datetimeRegistered: coalesceString(savedProfile.datetimeRegistered, existingProfile.datetimeRegistered),
                    lastLogin: coalesceString(savedProfile.lastLogin, existingProfile.lastLogin)
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
