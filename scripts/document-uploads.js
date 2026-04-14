/*
    Spring 2026 IS 241.210 - Team MO HealthVerify
    Document upload handling
*/

(function () {
    const MAX_BYTES = 15 * 1024 * 1024;
    const ALLOWED_EXTENSIONS = [
        ".doc", ".docx",
        ".xls", ".xlsx", ".xlsm",
        ".pdf",
        ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".tif", ".tiff"
    ];

    const uploadList = document.getElementById("uploadList");
    const addUploadButton = document.getElementById("addUpload");
    const uploadAllButton = document.getElementById("uploadAll");
    const pageMessage = document.getElementById("pageMessage");
    const API_BASE_URL = "http://localhost:8080";

    if (!uploadList || !addUploadButton || !uploadAllButton || !pageMessage) {
        return;
    }

    let uploadIndex = 0;

    function setPageMessage(message, type) {
        pageMessage.textContent = message;
        pageMessage.className = "page-message";
        if (type) {
            pageMessage.classList.add(type);
        }
    }

    function clearPageMessage() {
        pageMessage.textContent = "";
        pageMessage.className = "page-message";
    }

    function buildUploadCard() {
        uploadIndex += 1;
        const card = document.createElement("div");
        card.className = "upload-card";
        card.dataset.index = String(uploadIndex);

        const accepted = ALLOWED_EXTENSIONS.join(",");

        card.innerHTML = [
            '<div class="upload-row">',
            '  <div class="upload-field">',
            '    <label for="desc-' + uploadIndex + '">Description</label>',
            '    <input id="desc-' + uploadIndex + '" type="text" maxlength="160" placeholder="Work schedule from 2/1/26 to 2/28/26"/>',
            '  </div>',
            '  <div class="upload-field">',
            '    <label for="file-' + uploadIndex + '">Select file</label>',
            '    <input id="file-' + uploadIndex + '" type="file" accept="' + accepted + '"/>',
            '  </div>',
            "</div>",
            '<div class="upload-meta">',
            '  <span class="upload-hint">One file per upload. Maximum size 15 MB.</span>',
            '  <button class="link-button remove-upload" type="button">Remove</button>',
            "</div>",
            '<div class="upload-status" aria-live="polite"></div>'
        ].join("");

        const removeButton = card.querySelector(".remove-upload");
        if (removeButton) {
            removeButton.addEventListener("click", function () {
                card.remove();
            });
        }
        return card;
    }

    function ensureAtLeastOneCard() {
        if (uploadList.children.length === 0) {
            uploadList.appendChild(buildUploadCard());
        }
    }

    function normalizeExtension(fileName) {
        const lastDot = fileName.lastIndexOf(".");
        if (lastDot === -1) return "";
        return fileName.slice(lastDot).toLowerCase();
    }

    function setCardStatus(card, message, type) {
        const status = card.querySelector(".upload-status");
        if (!status) return;
        status.textContent = message;
        status.className = "upload-status";
        if (type) {
            status.classList.add(type);
        }
    }

    function validateCard(card) {
        const desc = card.querySelector("input[type='text']");
        const fileInput = card.querySelector("input[type='file']");
        const description = desc ? desc.value.trim() : "";
        const file = fileInput && fileInput.files ? fileInput.files[0] : null;

        if (!description) {
            setCardStatus(card, "Please enter a description for this document.", "error");
            return null;
        }

        if (!file) {
            setCardStatus(card, "Please choose a file to upload.", "error");
            return null;
        }

        const extension = normalizeExtension(file.name);
        if (!ALLOWED_EXTENSIONS.includes(extension)) {
            setCardStatus(card, "File type not allowed. Choose a supported document or image.", "error");
            return null;
        }

        if (file.size > MAX_BYTES) {
            setCardStatus(card, "File is too large. Maximum size is 15 MB.", "error");
            return null;
        }

        setCardStatus(card, "Ready to upload.", "ready");
        return { description: description, file: file };
    }

    function readFileAsBase64(file) {
        return new Promise(function (resolve, reject) {
            const reader = new FileReader();
            reader.onload = function () {
                const result = typeof reader.result === "string" ? reader.result : "";
                const parts = result.split(",");
                resolve(parts.length > 1 ? parts[1] : "");
            };
            reader.onerror = function () {
                reject(new Error("Unable to read file."));
            };
            reader.readAsDataURL(file);
        });
    }

    function buildFriendlyError(response, text) {
        if (response && response.status) {
            const status = response.status;
            if (status === 404) {
                return "Upload failed (404). Upload service not available.";
            }
            if (status === 413) {
                return "Upload failed. File exceeds the server size limit.";
            }
            if (status >= 500) {
                return "Upload failed. Server error occurred.";
            }
            return "Upload failed (" + status + ").";
        }
        if (text) {
            const normalized = text.replace(/<[^>]*>/g, "").trim();
            if (normalized.length > 0 && normalized.length <= 160) {
                return normalized;
            }
        }
        return "Upload failed.";
    }

    function uploadDocument(card, payload) {
        setCardStatus(card, "Uploading...", "pending");
        return readFileAsBase64(payload.file)
            .then(function (base64Contents) {
                const body = {
                    descriptive_name: payload.description,
                    file_name: payload.file.name,
                    file_data: base64Contents
                };
                return fetch(API_BASE_URL + "/api/auth/upload", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify(body)
                });
            })
            .then(function (response) {
                if (response.ok) {
                    setCardStatus(card, "Upload successful.", "success");
                    return;
                }
                return response.text().then(function (text) {
                    throw new Error(buildFriendlyError(response, text));
                });
            })
            .catch(function (err) {
                setCardStatus(card, err.message || "Upload failed.", "error");
                throw err;
            });
    }

    function toggleButtons(isDisabled) {
        addUploadButton.disabled = isDisabled;
        uploadAllButton.disabled = isDisabled;
    }

    addUploadButton.addEventListener("click", function () {
        clearPageMessage();
        uploadList.appendChild(buildUploadCard());
    });

    uploadAllButton.addEventListener("click", function () {
        clearPageMessage();
        ensureAtLeastOneCard();

        const cards = Array.prototype.slice.call(uploadList.children);
        const payloads = [];

        cards.forEach(function (card) {
            const payload = validateCard(card);
            if (payload) {
                payloads.push({ card: card, payload: payload });
            }
        });

        if (payloads.length !== cards.length) {
            setPageMessage("Fix the highlighted issues before uploading.", "error");
            return;
        }

        toggleButtons(true);
        setPageMessage("Uploading documents...", "pending");

        const uploads = payloads.map(function (entry) {
            return uploadDocument(entry.card, entry.payload);
        });

        Promise.allSettled(uploads).then(function (results) {
            const allSuccess = results.every(function (result) {
                return result.status === "fulfilled";
            });
            if (allSuccess) {
                setPageMessage("All documents uploaded successfully. Reloading...", "success");
                setTimeout(function () {
                    window.location.reload();
                }, 1200);
                return;
            }

            setPageMessage("Some uploads failed. Review the messages above and try again.", "error");
            toggleButtons(false);
        });
    });

    uploadList.appendChild(buildUploadCard());
})();
