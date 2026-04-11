/*
    Spring 2026 IS 241.210 - Team MO HealthVerify
    Written by Davis Ly
 */

(function (window) {
    let PROFILE_KEY = "moHealthVerifyProfile";

    function readProfile() {
        try {
            let rawValue = window.localStorage.getItem(PROFILE_KEY);
            if (!rawValue) return {};

            let parsedValue = JSON.parse(rawValue);
            return parsedValue && typeof parsedValue === "object" ? parsedValue : {};
        } catch (err) {
            return {};
        }
    }

    function writeProfile(profile) {
        try {
            window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile || {}));
        } catch (err) {
            // no-op
        }
    }

    function mergeProfile(partialProfile) {
        let currentProfile = readProfile();
        let nextProfile = Object.assign({}, currentProfile, partialProfile || {});
        writeProfile(nextProfile);
        return nextProfile;
    }

    window.moHealthVerifyProfileStore = {
        key: PROFILE_KEY,
        read: readProfile,
        write: writeProfile,
        merge: mergeProfile
    };
})(window);
