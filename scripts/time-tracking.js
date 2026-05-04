/*
    Spring 2026 IS 241.210 - Team MO HealthVerify
    Time tracking entry handling
*/

(function () {
    var API_BASE_URL = "http://localhost:8080";
    var TIME_TRACKING_URL = API_BASE_URL + "/api/auth/timetracking";
    var LOOKUP_ENDPOINTS = [
        API_BASE_URL + "/api/auth/lkp/time-record-types",
        API_BASE_URL + "/api/auth/lkp/time-record-type",
        API_BASE_URL + "/api/auth/lkp?type=TIME_RECORD_TYPE",
        API_BASE_URL + "/api/auth/timetracking/types"
    ];
    var MANUAL_TYPE_VALUE = "__manual__";
    var FALLBACK_TYPE_OPTIONS = [
        {id: "9001", label: "Filler Type 1"},
        {id: "9002", label: "Filler Type 2"}
    ];

    var listContainer = document.getElementById("timeRecordList");
    var addButton = document.getElementById("addTimeRecord");
    var submitButton = document.getElementById("submitTimeRecords");
    var clearButton = document.getElementById("clearTimeRecords");
    var pageMessage = document.getElementById("timeTrackingMessage");

    if (!listContainer || !addButton || !submitButton || !clearButton || !pageMessage) {
        return;
    }

    var timeRecordIndex = 0;
    var typeOptions = [];

    function setPageMessage(message, type) {
        pageMessage.textContent = message || "";
        pageMessage.className = "page-message";
        if (type) {
            pageMessage.classList.add(type);
        }
    }

    function clearPageMessage() {
        setPageMessage("", "");
    }

    function setCardStatus(card, message, type) {
        var status = card.querySelector(".upload-status");
        if (!status) return;
        status.textContent = message || "";
        status.className = "upload-status";
        if (type) {
            status.classList.add(type);
        }
    }

    function escapeHtml(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function parseJsonSafely(text) {
        if (!text) return {};
        try {
            return JSON.parse(text);
        } catch (err) {
            return {};
        }
    }

    function buildTypeSelectHtml(selectedValue) {
        var htmlParts = [
            '<option value="">Select type...</option>'
        ];

        typeOptions.forEach(function (item) {
            var selectedAttr = selectedValue === item.id ? ' selected="selected"' : "";
            htmlParts.push(
                '<option value="' + escapeHtml(item.id) + '" data-label="' + escapeHtml(item.label) + '"' + selectedAttr + ">" +
                escapeHtml(item.label) +
                "</option>"
            );
        });

        htmlParts.push(
            '<option value="' + MANUAL_TYPE_VALUE + '"' +
            (selectedValue === MANUAL_TYPE_VALUE ? ' selected="selected"' : "") +
            ">Other (enter text)</option>"
        );

        return htmlParts.join("");
    }

    function normalizeOptionId(source) {
        var candidates = [
            source && source.id,
            source && source.lkpId,
            source && source.valueId,
            source && source.typeId,
            source && source.timeRecordTypeId,
            source && source.time_record_type_id,
            source && source.code,
            source && source.key
        ];

        var id = "";
        candidates.some(function (candidate) {
            if (candidate === 0 || (candidate && String(candidate).trim() !== "")) {
                id = String(candidate);
                return true;
            }
            return false;
        });
        return id;
    }

    function normalizeOptionLabel(source) {
        var candidates = [
            source && source.label,
            source && source.name,
            source && source.description,
            source && source.display,
            source && source.timeRecordType,
            source && source.time_record_type,
            source && source.text,
            source && source.value
        ];

        var label = "";
        candidates.some(function (candidate) {
            if (candidate && String(candidate).trim() !== "") {
                label = String(candidate);
                return true;
            }
            return false;
        });
        return label;
    }

    function normalizeTypeOptions(payload) {
        var rows = [];
        if (Array.isArray(payload)) {
            rows = payload;
        } else if (payload && Array.isArray(payload.items)) {
            rows = payload.items;
        } else if (payload && Array.isArray(payload.data)) {
            rows = payload.data;
        } else if (payload && Array.isArray(payload.results)) {
            rows = payload.results;
        } else if (payload && Array.isArray(payload.values)) {
            rows = payload.values;
        } else if (payload && Array.isArray(payload.records)) {
            rows = payload.records;
        }

        var seen = {};
        return rows.map(function (row) {
            var id = normalizeOptionId(row);
            var label = normalizeOptionLabel(row);
            if (!id || !label) return null;
            return {id: id, label: label};
        }).filter(function (item) {
            if (!item) return false;
            if (seen[item.id]) return false;
            seen[item.id] = true;
            return true;
        });
    }

    function fetchLookupFromEndpoint(url) {
        return fetch(url, {
            method: "GET",
            headers: {"Content-Type": "application/json"},
            credentials: "include"
        }).then(function (response) {
            if (!response.ok) {
                throw new Error("Lookup fetch failed");
            }
            return response.text();
        }).then(function (text) {
            var payload = parseJsonSafely(text);
            var normalized = normalizeTypeOptions(payload);
            if (!normalized.length) {
                throw new Error("Lookup endpoint returned no options");
            }
            return normalized;
        });
    }

    function loadTimeRecordTypes() {
        function tryNext(index) {
            if (index >= LOOKUP_ENDPOINTS.length) {
                return Promise.reject(new Error("Unable to load lookup options"));
            }
            return fetchLookupFromEndpoint(LOOKUP_ENDPOINTS[index]).catch(function () {
                return tryNext(index + 1);
            });
        }

        setPageMessage("Loading time record types...", "pending");
        return tryNext(0).then(function (options) {
            typeOptions = options;
            refreshTypeSelectors();
            clearPageMessage();
        }).catch(function () {
            typeOptions = FALLBACK_TYPE_OPTIONS.slice();
            refreshTypeSelectors();
            setPageMessage("Lookup list unavailable. Using filler Time Record Types.", "pending");
        });
    }

    function setManualTypeVisibility(card) {
        var select = card.querySelector(".time-type-select");
        var manualInput = card.querySelector(".manual-time-type");
        if (!select || !manualInput) return;

        var showManual = select.value === MANUAL_TYPE_VALUE || typeOptions.length === 0;
        manualInput.style.display = showManual ? "block" : "none";
        if (!showManual) {
            manualInput.value = "";
        }
    }

    function applyTypeOptionsToCard(card) {
        var select = card.querySelector(".time-type-select");
        if (!select) return;
        var selectedValue = select.value;
        select.innerHTML = buildTypeSelectHtml(selectedValue);

        if (!select.value && typeOptions.length === 0) {
            select.value = MANUAL_TYPE_VALUE;
        }

        setManualTypeVisibility(card);
    }

    function refreshTypeSelectors() {
        var cards = Array.prototype.slice.call(listContainer.children);
        cards.forEach(function (card) {
            applyTypeOptionsToCard(card);
        });
    }

    function defaultEndToStartDay(card) {
        var startInput = card.querySelector(".start-time-input");
        var endInput = card.querySelector(".end-time-input");
        if (!startInput || !endInput || !startInput.value) return;

        if (!endInput.value || endInput.dataset.userEdited !== "true") {
            endInput.value = startInput.value;
            endInput.dataset.userEdited = "false";
            return;
        }

        var startDate = startInput.value.slice(0, 10);
        var endDate = endInput.value.slice(0, 10);
        if (startDate !== endDate && endInput.value.length >= 16) {
            endInput.value = startDate + "T" + endInput.value.slice(11, 16);
        }
    }

    function buildTimeRecordCard() {
        timeRecordIndex += 1;
        var card = document.createElement("div");
        card.className = "upload-card";
        card.dataset.index = String(timeRecordIndex);

        card.innerHTML = [
            '<div class="upload-row">',
            '  <div class="upload-field">',
            '    <label for="start-time-' + timeRecordIndex + '">Start Time</label>',
            '    <input id="start-time-' + timeRecordIndex + '" class="start-time-input" type="datetime-local"/>',
            "  </div>",
            '  <div class="upload-field">',
            '    <label for="end-time-' + timeRecordIndex + '">End Time</label>',
            '    <input id="end-time-' + timeRecordIndex + '" class="end-time-input" type="datetime-local"/>',
            "  </div>",
            "</div>",
            '<div class="upload-row">',
            '  <div class="upload-field">',
            '    <label for="time-type-' + timeRecordIndex + '">Time Record Type</label>',
            '    <select id="time-type-' + timeRecordIndex + '" class="time-type-select"></select>',
            '    <input class="manual-time-type" type="text" maxlength="120" placeholder="Enter time record type text"/>',
            "  </div>",
            "</div>",
            '<div class="upload-meta">',
            '  <span class="upload-hint">End Time defaults to the same day as Start Time.</span>',
            '  <button class="link-button remove-time-record" type="button">Remove</button>',
            "</div>",
            '<div class="upload-status" aria-live="polite"></div>'
        ].join("");

        var removeButton = card.querySelector(".remove-time-record");
        var startInput = card.querySelector(".start-time-input");
        var endInput = card.querySelector(".end-time-input");
        var typeSelect = card.querySelector(".time-type-select");

        if (removeButton) {
            removeButton.addEventListener("click", function () {
                card.remove();
            });
        }

        if (startInput) {
            startInput.addEventListener("change", function () {
                defaultEndToStartDay(card);
            });
            startInput.addEventListener("input", function () {
                defaultEndToStartDay(card);
            });
        }

        if (endInput) {
            endInput.dataset.userEdited = "false";
            endInput.addEventListener("input", function () {
                endInput.dataset.userEdited = "true";
            });
            endInput.addEventListener("change", function () {
                endInput.dataset.userEdited = "true";
            });
        }

        if (typeSelect) {
            typeSelect.addEventListener("change", function () {
                setManualTypeVisibility(card);
            });
        }

        applyTypeOptionsToCard(card);
        return card;
    }

    function ensureAtLeastOneCard() {
        if (listContainer.children.length === 0) {
            listContainer.appendChild(buildTimeRecordCard());
        }
    }

    function resetPage(keepMessage) {
        listContainer.innerHTML = "";
        timeRecordIndex = 0;
        if (!keepMessage) {
            clearPageMessage();
        }
        ensureAtLeastOneCard();
        refreshTypeSelectors();
    }

    function parseDateValue(value) {
        if (!value) return null;
        var parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    function normalizeTypeId(value) {
        if (/^-?\d+$/.test(value)) return Number(value);
        return value;
    }

    function validateCard(card) {
        var startInput = card.querySelector(".start-time-input");
        var endInput = card.querySelector(".end-time-input");
        var typeSelect = card.querySelector(".time-type-select");
        var manualTypeInput = card.querySelector(".manual-time-type");

        var startTime = startInput ? startInput.value : "";
        var endTime = endInput ? endInput.value : "";
        var selectedType = typeSelect ? typeSelect.value : "";
        var manualType = manualTypeInput ? manualTypeInput.value.trim() : "";

        if (!startTime) {
            setCardStatus(card, "Start Time is required.", "error");
            return null;
        }

        if (!endTime) {
            setCardStatus(card, "End Time is required.", "error");
            return null;
        }

        var startDate = parseDateValue(startTime);
        var endDate = parseDateValue(endTime);
        if (!startDate || !endDate) {
            setCardStatus(card, "Enter valid Start and End Time values.", "error");
            return null;
        }

        if (endDate.getTime() < startDate.getTime()) {
            setCardStatus(card, "End Time must be at or after Start Time.", "error");
            return null;
        }

        if (!selectedType) {
            setCardStatus(card, "Time Record Type is required.", "error");
            return null;
        }

        var payload = {
            timeRecordStartingDatetime: startTime,
            timeRecordEndingDatetime: endTime
        };

        if (selectedType === MANUAL_TYPE_VALUE || typeOptions.length === 0) {
            setCardStatus(card, "Select a saved Time Record Type.", "error");
            return null;
        } else {
            payload.timeRecordTypeId = normalizeTypeId(selectedType);
        }

        setCardStatus(card, "Ready to submit.", "ready");
        return payload;
    }

    function toggleButtons(disabled) {
        addButton.disabled = disabled;
        submitButton.disabled = disabled;
        clearButton.disabled = disabled;
    }

    addButton.addEventListener("click", function () {
        clearPageMessage();
        listContainer.appendChild(buildTimeRecordCard());
    });

    clearButton.addEventListener("click", function () {
        resetPage(false);
    });

    submitButton.addEventListener("click", function () {
        clearPageMessage();
        ensureAtLeastOneCard();

        var cards = Array.prototype.slice.call(listContainer.children);
        var payloadList = [];

        cards.forEach(function (card) {
            var payload = validateCard(card);
            if (payload) {
                payloadList.push(payload);
            }
        });

        if (payloadList.length !== cards.length) {
            setPageMessage("Fix the highlighted issues before submitting.", "error");
            return;
        }

        if (!window.confirm("Submit " + payloadList.length + " time record(s)?")) {
            return;
        }

        toggleButtons(true);
        setPageMessage("Submitting time records...", "pending");

        fetch(TIME_TRACKING_URL, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            credentials: "include",
            body: JSON.stringify(payloadList)
        })
            .then(function (response) {
                return response.text().then(function (text) {
                    return {
                        ok: response.ok,
                        status: response.status,
                        data: parseJsonSafely(text)
                    };
                });
            })
            .then(function (result) {
                if (!result.ok) {
                    throw new Error(
                        (result.data && result.data.message) ||
                        ("Submit failed (" + result.status + ").")
                    );
                }

                setPageMessage(
                    (result.data && result.data.message) || "Time records submitted successfully.",
                    "success"
                );
                resetPage(true);
            })
            .catch(function (error) {
                setPageMessage((error && error.message) || "Unable to submit time records.", "error");
            })
            .finally(function () {
                toggleButtons(false);
            });
    });

    ensureAtLeastOneCard();
    loadTimeRecordTypes();
})();
