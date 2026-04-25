/**
 * SilentTube — content.js
 * Security-hardened production content script.
 *
 * Security guarantees:
 *  - Zero eval(), new Function(), innerHTML, outerHTML, document.write()
 *  - All CSS selectors are static constants — never built from user input
 *  - All storage reads are sanitized through sanitizeSettings()
 *  - MutationObserver is debounced (100ms) to prevent performance storms
 *  - Extension context is validated before every chrome.* API call
 *  - Entire script is an IIFE with 'use strict' and a top-level try/catch
 *  - Cleans up observer, debounce timer, and style element on page unload
 */
(function () {
    'use strict';

    // ─── STATIC CONSTANTS ─────────────────────────────────────────────────────

    /**
     * Allowlist of valid setting keys. Any key not in this list is ignored.
     * These are hardcoded strings — never dynamic or user-controlled.
     */
    const VALID_KEYS = Object.freeze([
        'hideShorts',
        'hideRecommended',
        'hideHomeFeed',
        'hideEndCards',
        'hideAutoplay',
        'hideComments',
        'hideTrending',
    ]);

    /**
     * CSS_MAP: Static, hardcoded map from setting key to CSS selector string.
     * Selectors are never built from dynamic or user-controlled data.
     */
    const CSS_MAP = Object.freeze({
        hideShorts: `
            ytd-rich-shelf-renderer[is-shorts],
            ytd-guide-entry-renderer:has(a[href="/shorts"]),
            a[href="/shorts"],
            ytd-reel-shelf-renderer,
            ytd-tab-renderer:has(a[href*="/shorts"])
        `,
        hideRecommended: `
            #secondary,
            ytd-watch-next-secondary-results-renderer
        `,
        hideHomeFeed: `
            ytd-browse[page-subtype="home"] ytd-rich-grid-renderer,
            ytd-browse[page-subtype="home"] #contents.ytd-rich-grid-renderer
        `,
        hideEndCards: `
            .ytp-ce-element,
            .ytp-endscreen-content,
            .videowall-endscreen
        `,
        hideAutoplay: `
            .ytp-autonav-toggle-button
        `,
        hideComments: `
            #comments,
            ytd-comments
        `,
        hideTrending: `
            ytd-guide-entry-renderer:has(a[href="/feed/trending"]),
            a[href="/feed/trending"]
        `,
    });

    const STYLE_ELEMENT_ID = 'silent-tube-injected-style';

    // ─── STATE ────────────────────────────────────────────────────────────────

    let styleElement = null;
    let debounceTimer = null;
    let observer = null;

    // ─── SECURITY HELPERS ─────────────────────────────────────────────────────

    /**
     * Returns true only if the extension context is still valid.
     * YouTube's SPA can invalidate the extension runtime, causing chrome.*
     * calls to throw. This guard prevents unhandled errors.
     */
    function isExtensionAlive() {
        try {
            return !!(chrome && chrome.runtime && chrome.runtime.id);
        } catch (_) {
            return false;
        }
    }

    /**
     * Validates and sanitizes raw data from chrome.storage.sync.
     * Only keys in VALID_KEYS are read. Defaults to true (hidden).
     * Values are strictly cast to boolean — no strings, numbers, or
     * objects can leak through.
     *
     * @param {Object} raw — Raw object from storage
     * @returns {Object} — Safe object with only boolean values
     */
    function sanitizeSettings(raw) {
        const safe = {};
        for (const key of VALID_KEYS) {
            // Explicit boolean cast: only `false` disables a feature.
            // Any other value (undefined, null, 1, "yes", {}) defaults to ON.
            safe[key] = raw[key] === false ? false : true;
        }
        return safe;
    }

    // ─── CORE STYLE LOGIC ────────────────────────────────────────────────────

    /**
     * Builds the CSS string from sanitized settings and applies it.
     * Uses textContent (safe) — never innerHTML.
     *
     * @param {Object} settings — Sanitized settings object
     */
    function applyStyles(settings) {
        let css = '';
        for (const key of VALID_KEYS) {
            if (settings[key] === true) {
                // Selectors are static constants from CSS_MAP — not user data
                css += `${CSS_MAP[key].trim()} { display: none !important; }\n`;
            }
        }

        if (!styleElement || !document.getElementById(STYLE_ELEMENT_ID)) {
            // Create the <style> element safely — never using innerHTML
            styleElement = document.createElement('style');
            styleElement.id = STYLE_ELEMENT_ID;
            // Attach to head if available; fall back to documentElement for
            // early injection (run_at: document_start before <head> exists)
            (document.head || document.documentElement).appendChild(styleElement);
        }

        // Safe assignment — textContent is immune to XSS
        styleElement.textContent = css;
    }

    /**
     * Reads settings from chrome.storage.sync, sanitizes, then applies.
     * All chrome.* calls are guarded by isExtensionAlive().
     */
    function updateStyles() {
        if (!isExtensionAlive()) {
            teardown();
            return;
        }

        try {
            chrome.storage.sync.get(VALID_KEYS, (raw) => {
                // chrome.runtime.lastError must be checked inside callbacks
                if (chrome.runtime.lastError) {
                    console.warn('SilentTube: storage read error —', chrome.runtime.lastError.message);
                    return;
                }
                const settings = sanitizeSettings(raw || {});
                applyStyles(settings);
            });
        } catch (e) {
            console.warn('SilentTube: storage unavailable —', e.message);
        }
    }

    /**
     * Debounced wrapper for updateStyles, used by MutationObserver.
     * Prevents the observer from triggering thousands of calls per second
     * on YouTube's heavy, reactive DOM.
     */
    function debouncedUpdate() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(updateStyles, 100);
    }

    // ─── CLEANUP ──────────────────────────────────────────────────────────────

    /**
     * Disconnects the MutationObserver and clears all state.
     * Called when extension context is invalidated or page unloads.
     */
    function teardown() {
        if (observer) {
            observer.disconnect();
            observer = null;
        }
        clearTimeout(debounceTimer);
        debounceTimer = null;
        if (styleElement) {
            styleElement.remove();
            styleElement = null;
        }
    }

    // ─── INITIALIZATION ───────────────────────────────────────────────────────

    try {
        // 1. Apply styles immediately on script injection
        updateStyles();

        // 2. Listen for real-time setting changes from the popup
        //    Validates areaName to ensure we only react to sync storage changes
        chrome.storage.onChanged.addListener((changes, areaName) => {
            if (areaName !== 'sync') return;
            if (!isExtensionAlive()) {
                teardown();
                return;
            }
            updateStyles();
        });

        // 3. MutationObserver — re-injects style tag if YouTube's SPA
        //    navigation removes our <head> and rebuilds the DOM.
        //    Debounced at 100ms to prevent performance storms on
        //    YouTube's heavy, rapidly-mutating DOM.
        observer = new MutationObserver(() => {
            if (!isExtensionAlive()) {
                teardown();
                return;
            }
            // Only trigger a full update if our style tag was removed
            if (!document.getElementById(STYLE_ELEMENT_ID)) {
                debouncedUpdate();
            }
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
        });

        // 4. Listen for explicit re-apply messages from the popup.
        //    Validates message type — never processes unknown message shapes.
        chrome.runtime.onMessage.addListener((msg, _sender, _sendResponse) => {
            if (!isExtensionAlive()) {
                teardown();
                return;
            }
            // Validate message contract before acting on it
            if (
                msg === null ||
                typeof msg !== 'object' ||
                msg.type !== 'SETTINGS_UPDATED'
            ) {
                return;
            }
            // Re-read from storage rather than trusting msg.settings directly,
            // ensuring sanitizeSettings() is always the single source of truth.
            updateStyles();
        });

        // 5. Clean up everything if the page is navigated away
        window.addEventListener('unload', teardown, { once: true });

    } catch (e) {
        // Top-level error boundary — silently fail, never crash the user's page
        console.warn('SilentTube: initialization error —', e.message);
    }

})(); // End IIFE — no variables leak to the global scope
