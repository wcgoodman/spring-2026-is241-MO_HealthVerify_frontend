/*
    Spring 2026 IS 241.210 - Team MO HealthVerify
    Time record history listing
*/

(function () {
    var API_BASE_URL = "http://localhost:8080";
    var HISTORY_URL = API_BASE_URL + "/api/auth/timetracking/history";
    var TYPES_URL = API_BASE_URL + "/api/auth/timetracking/types";

    var message = document.getElementById("historyMessage");
    var tableBody = document.getElementById("historyTableBody");

    if (!message || !tableBody) {
        return;
    }

    function setMessage(text, type) {
        message.textContent = text || "";
        message.className = "page-message";
        if (type) {
            message.classList.add(type);
        }
    }

    function parseJsonSafely(text) {
        if (!text) return [];
        try {
            return JSON.parse(text);
        } catch (err) {
            return [];
        }
    }

    function fetchJson(url) {
        return fetch(url, {
            method: "GET",
            headers: {"Content-Type": "application/json"},
            credentials: "include"
        }).then(function (response) {
            return response.text().then(function (text) {
                return {
                    ok: response.ok,
                    status: response.status,
                    data: parseJsonSafely(text)
                };
            });
        });
    }

    function formatDateTime(value) {
        if (!value) return "";
        var dt = new Date(value);
        if (Number.isNaN(dt.getTime())) return value;
        return dt.toLocaleString();
    }

    function getSortTime(record) {
        if (!record || !record.timeRecordStartingDatetime) return 0;
        var dt = new Date(record.timeRecordStartingDatetime);
        return Number.isNaN(dt.getTime()) ? 0 : dt.getTime();
    }

    function renderRows(records, typeMap) {
        tableBody.innerHTML = "";
        if (!records.length) {
            var emptyRow = document.createElement("tr");
            emptyRow.innerHTML = '<td colspan="3">No time records found.</td>';
            tableBody.appendChild(emptyRow);
            return;
        }

        records.forEach(function (record) {
            var typeId = record.timeRecordTypeId;
            var resolvedType = typeMap[String(typeId)] || typeMap[typeId] || typeId || "";
            var row = document.createElement("tr");
            row.innerHTML = [
                "<td>" + formatDateTime(record.timeRecordStartingDatetime) + "</td>",
                "<td>" + formatDateTime(record.timeRecordEndingDatetime) + "</td>",
                "<td>" + resolvedType + "</td>"
            ].join("");
            tableBody.appendChild(row);
        });
    }

    function loadHistory() {
        setMessage("Loading time record history...", "pending");
        Promise.all([fetchJson(HISTORY_URL), fetchJson(TYPES_URL)])
            .then(function (results) {
                var historyResult = results[0];
                var typesResult = results[1];

                if (!historyResult.ok) {
                    if (historyResult.status === 401) {
                        throw new Error("Please sign in to view time record history.");
                    }
                    throw new Error("Unable to load time record history (" + historyResult.status + ").");
                }

                var typeMap = {};
                if (typesResult.ok && Array.isArray(typesResult.data)) {
                    typesResult.data.forEach(function (typeRow) {
                        if (typeRow && typeRow.timeRecordTypeId != null && typeRow.timeRecordType) {
                            typeMap[String(typeRow.timeRecordTypeId)] = typeRow.timeRecordType;
                        }
                    });
                }

                var records = Array.isArray(historyResult.data) ? historyResult.data.slice() : [];
                records.sort(function (a, b) {
                    return getSortTime(b) - getSortTime(a);
                });
                renderRows(records, typeMap);
                setMessage("Loaded " + records.length + " record(s).", "success");
            })
            .catch(function (err) {
                renderRows([], {});
                setMessage((err && err.message) || "Unable to load time record history.", "error");
            });
    }

    loadHistory();
})();
