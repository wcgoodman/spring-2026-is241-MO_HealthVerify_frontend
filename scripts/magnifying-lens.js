/*
    Spring 2026 IS 241.210 - Team MO HealthVerify
    Written by Davis Ly
 */

(function () {
    const LENS_WIDTH = 260;
    const LENS_HEIGHT = 170;
    const LENS_MIN_WIDTH = 200;
    const LENS_MIN_HEIGHT = 120;
    const LENS_MAX_WIDTH = 600;
    const LENS_MAX_HEIGHT = 420;
    const LENS_PADDING = 12;
    const ZOOM_LEVEL = 2.0;
    const PRIORITY_SELECTOR = ".top-link, a, h1, h2, h3, h4, h5, h6, p, label, span, button, li, td, th, input, textarea, select, img";

    let lensButton;
    let lens;
    let lensContent;
    let isMagnifierOn = false;
    let latestMouseEvent = null;
    let frameRequested = false;
    let cachedTarget = null;
    let cachedPreview = null;

    function createMagnifierUi() {
        lensButton = document.getElementById("magnifierToggle");
        if (!lensButton) {
            lensButton = document.createElement("button");
            lensButton.type = "button";
            lensButton.id = "magnifierToggle";
            lensButton.className = "magnifier-toggle";
            lensButton.setAttribute("aria-pressed", "false");
            lensButton.setAttribute("aria-label", "Toggle magnifier");
            lensButton.title = "Toggle magnifier";
            lensButton.textContent = "Magnifier";
            document.body.appendChild(lensButton);
        }

        lens = document.getElementById("magnifierLens");
        if (!lens) {
            lens = document.createElement("div");
            lens.id = "magnifierLens";
            lens.className = "magnifier-lens";
            lens.style.width = LENS_WIDTH + "px";
            lens.style.height = LENS_HEIGHT + "px";

            lensContent = document.createElement("div");
            lensContent.className = "magnifier-content";
            lens.appendChild(lensContent);
            document.body.appendChild(lens);
        } else {
            lensContent = lens.querySelector(".magnifier-content");
        }

        updateMagnifierLabel();
    }

    function canMagnifyElement(el) {
        if (!el || !el.tagName) return false;
        const tag = el.tagName.toLowerCase();
        if (tag === "script" || tag === "style" || tag === "html" || tag === "body") return false;
        if (el.id === "magnifierLens" || el.id === "magnifierToggle") return false;
        return true;
    }

    function toElement(node) {
        if (!node) return null;
        if (node.nodeType === Node.ELEMENT_NODE) return node;
        if (node.nodeType === Node.TEXT_NODE) return node.parentElement;
        return null;
    }

    function findBestTarget(e) {
        const direct = toElement(e.target);
        const pointed = toElement(document.elementFromPoint(e.clientX, e.clientY));
        const candidates = [direct, pointed];

        for (let i = 0; i < candidates.length; i++) {
            let candidate = candidates[i];
            if (!candidate) continue;

            if (candidate.closest) {
                const priority = candidate.closest(PRIORITY_SELECTOR);
                if (priority) candidate = priority;
            }

            while (candidate && !canMagnifyElement(candidate)) {
                candidate = candidate.parentElement;
            }
            if (!candidate) continue;

            const rect = candidate.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) return candidate;
        }

        return null;
    }

    function copyComputedStyles(source, clone) {
        const computed = window.getComputedStyle(source);
        if (computed.cssText) {
            clone.style.cssText = computed.cssText;
        } else {
            for (let i = 0; i < computed.length; i++) {
                const prop = computed[i];
                clone.style.setProperty(prop, computed.getPropertyValue(prop), computed.getPropertyPriority(prop));
            }
        }
    }

    function syncFormValue(source, clone) {
        const tag = source.tagName ? source.tagName.toLowerCase() : "";
        if (tag === "input") {
            clone.value = source.value;
            clone.checked = source.checked;
        } else if (tag === "textarea") {
            clone.value = source.value;
        } else if (tag === "select") {
            clone.selectedIndex = source.selectedIndex;
        }
    }

    function cloneWithStyles(target) {
        const clone = target.cloneNode(true);

        if (clone.removeAttribute) {
            clone.removeAttribute("id");
            const cloneWithIds = clone.querySelectorAll("[id]");
            for (let i = 0; i < cloneWithIds.length; i++) {
                cloneWithIds[i].removeAttribute("id");
            }
        }

        copyComputedStyles(target, clone);
        syncFormValue(target, clone);

        const sourceChildren = target.children;
        const cloneChildren = clone.children;
        for (let i = 0; i < sourceChildren.length; i++) {
            copyStylesRecursively(sourceChildren[i], cloneChildren[i]);
        }

        const sourceFields = target.querySelectorAll("input, textarea, select");
        const cloneFields = clone.querySelectorAll("input, textarea, select");
        for (let i = 0; i < sourceFields.length; i++) {
            syncFormValue(sourceFields[i], cloneFields[i]);
        }

        return clone;
    }

    function copyStylesRecursively(source, clone) {
        if (!source || !clone) return;
        copyComputedStyles(source, clone);
        const sourceChildren = source.children;
        const cloneChildren = clone.children;
        for (let i = 0; i < sourceChildren.length; i++) {
            copyStylesRecursively(sourceChildren[i], cloneChildren[i]);
        }
    }

    function hideLens() {
        if (!lens || !lensContent) return;
        lens.classList.remove("visible");
        lensContent.innerHTML = "";
    }

    function updateLensFromEvent(e) {
        if (!isMagnifierOn) {
            hideLens();
            return;
        }

        const target = findBestTarget(e);
        if (!target) {
            hideLens();
            return;
        }

        const rect = target.getBoundingClientRect();
        if (!rect.width || !rect.height) {
            hideLens();
            return;
        }

        if (target !== cachedTarget) {
            cachedTarget = target;
            cachedPreview = cloneWithStyles(target);
        }

        const previewNode = cachedPreview;
        if (!previewNode) {
            hideLens();
            return;
        }

        const offsetX = e.clientX - rect.left;
        const offsetY = e.clientY - rect.top;

        lensContent.innerHTML = "";
        previewNode.style.width = rect.width + "px";
        previewNode.style.height = rect.height + "px";
        lensContent.appendChild(previewNode);
        lensContent.style.transformOrigin = "top left";

        const maxWidth = Math.min(LENS_MAX_WIDTH, window.innerWidth - 24);
        const maxHeight = Math.min(LENS_MAX_HEIGHT, window.innerHeight - 24);
        const lensWidth = Math.min(Math.max(rect.width * ZOOM_LEVEL + LENS_PADDING * 2, LENS_MIN_WIDTH), maxWidth);
        const lensHeight = Math.min(Math.max(rect.height * ZOOM_LEVEL + LENS_PADDING * 2, LENS_MIN_HEIGHT), maxHeight);
        const lensHalfW = lensWidth / 2;
        const lensHalfH = lensHeight / 2;
        lensContent.style.transform =
            "translate(" +
            (lensHalfW - offsetX * ZOOM_LEVEL) +
            "px, " +
            (lensHalfH - offsetY * ZOOM_LEVEL) +
            "px) scale(" +
            ZOOM_LEVEL +
            ")";

        lens.style.width = lensWidth + "px";
        lens.style.height = lensHeight + "px";

        const padding = 8;
        const maxLeft = window.innerWidth - lensWidth - padding;
        const maxTop = window.innerHeight - lensHeight - padding;
        const lensLeft = Math.min(Math.max(e.clientX + 16, padding), maxLeft);
        const lensTop = Math.min(Math.max(e.clientY + 16, padding), maxTop);

        lens.style.left = lensLeft + "px";
        lens.style.top = lensTop + "px";
        lens.classList.add("visible");
    }

    function scheduleUpdate(e) {
        latestMouseEvent = e;
        if (frameRequested) return;

        frameRequested = true;
        window.requestAnimationFrame(function () {
            frameRequested = false;
            if (latestMouseEvent) updateLensFromEvent(latestMouseEvent);
        });
    }

    function toggleMagnifier() {
        isMagnifierOn = !isMagnifierOn;
        lensButton.setAttribute("aria-pressed", isMagnifierOn ? "true" : "false");
        lensButton.classList.toggle("active", isMagnifierOn);
        document.body.classList.toggle("magnifier-mode", isMagnifierOn);
        updateMagnifierLabel();
        if (!isMagnifierOn) hideLens();
    }

    function updateMagnifierLabel() {
        if (!lensButton) return;
        lensButton.textContent = isMagnifierOn ? "Magnifier On" : "Magnifier";
        lensButton.title = "Toggle magnifier";
    }

    function init() {
        createMagnifierUi();
        lensButton.addEventListener("click", toggleMagnifier);

        document.addEventListener("pointermove", scheduleUpdate);
        document.addEventListener("pointerleave", hideLens);
        window.addEventListener("scroll", hideLens, {passive: true});
        window.addEventListener("blur", hideLens);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
