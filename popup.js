/**
 * SilentTube — popup.js
 * Security-hardened production popup script.
 *
 * Security guarantees:
 *  - No inline event handlers — all listeners attached via addEventListener
 *  - All values stored as explicit booleans — Boolean(checkbox.checked)
 *  - Storage reads validated through sanitizeSettings()
 *  - Tab URL validated before sending any message to content script
 *  - Messages typed as { type: 'SETTINGS_UPDATED' } — content.js validates type
 *  - Version string from manifest read safely and set via textContent
 *  - Zero network calls, zero eval(), zero innerHTML
 */
(function () {
    'use strict';

    // ─── CONSTANTS ────────────────────────────────────────────────────────────

    /**
     * Allowlist of valid setting keys. Any key not in this list is ignored.
     * Shared contract with content.js — both must use identical keys.
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

    // ─── SECURITY HELPERS ─────────────────────────────────────────────────────

    /**
     * Validates and sanitizes raw data from chrome.storage.sync.
     * Defaults all settings to true (hidden) — values that are not
     * strictly boolean false are treated as ON.
     *
     * @param {Object} raw — Untrusted raw object from storage
     * @returns {Object} — Safe object with only boolean values per valid key
     */
    function sanitizeSettings(raw) {
        const safe = {};
        for (const key of VALID_KEYS) {
            safe[key] = raw[key] === false ? false : true;
        }
        return safe;
    }

    // ─── STORAGE ──────────────────────────────────────────────────────────────

    /**
     * Loads settings from chrome.storage.sync and applies them to
     * all toggle checkboxes. Defaults to true (hidden) for any missing key.
     */
    function loadSettings() {
        try {
            chrome.storage.sync.get(VALID_KEYS, (raw) => {
                if (chrome.runtime.lastError) {
                    console.warn('SilentTube: load error —', chrome.runtime.lastError.message);
                    return;
                }
                const settings = sanitizeSettings(raw || {});
                for (const key of VALID_KEYS) {
                    const checkbox = document.getElementById(key);
                    if (checkbox) {
                        checkbox.checked = settings[key];
                    }
                }
            });
        } catch (e) {
            console.warn('SilentTube: storage unavailable —', e.message);
        }
    }

    /**
     * Persists a single setting to chrome.storage.sync.
     * Value is explicitly cast to boolean — never stores strings or numbers.
     *
     * @param {string} key   — Setting key (must be in VALID_KEYS)
     * @param {boolean} value — Sanitized boolean value
     */
    function saveSetting(key, value) {
        if (!VALID_KEYS.includes(key)) return; // Reject unknown keys
        try {
            // Explicit boolean cast — cannot store non-boolean types
            chrome.storage.sync.set({ [key]: Boolean(value) }, () => {
                if (chrome.runtime.lastError) {
                    console.warn('SilentTube: save error —', chrome.runtime.lastError.message);
                    return;
                }
                notifyYouTubeTab();
            });
        } catch (e) {
            console.warn('SilentTube: storage unavailable —', e.message);
        }
    }

    // ─── MESSAGING ────────────────────────────────────────────────────────────

    /**
     * Sends a typed message to the active YouTube tab's content script.
     *
     * Security: validates that the active tab URL contains 'youtube.com'
     * before sending. Uses a structured message type so content.js can
     * validate the message contract on its end.
     */
    function notifyYouTubeTab() {
        try {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (chrome.runtime.lastError) return;
                const tab = tabs && tabs[0];
                if (!tab || !tab.id) return;
                // Validate URL before sending any message
                if (typeof tab.url !== 'string' || !tab.url.includes('youtube.com')) return;

                chrome.tabs.sendMessage(tab.id, { type: 'SETTINGS_UPDATED' })
                    .catch(() => {
                        // Expected when the content script isn't loaded yet
                        // (e.g., the tab hasn't navigated to YouTube yet).
                        // Do not log — this is not an error condition.
                    });
            });
        } catch (e) {
            // Extension context may be unavailable in edge cases
            console.warn('SilentTube: messaging unavailable —', e.message);
        }
    }

    // ─── UI ───────────────────────────────────────────────────────────────────

    /**
     * Displays the extension version in the footer.
     * Uses textContent — never innerHTML.
     */
    function displayVersion() {
        try {
            const manifest = chrome.runtime.getManifest();
            const versionEl = document.getElementById('version');
            if (versionEl && manifest && manifest.version) {
                // Safe: textContent cannot execute scripts
                versionEl.textContent = 'v' + manifest.version;
            }
        } catch (e) {
            // Non-critical — version display failure is acceptable
        }
    }

    /**
     * Registers change listeners on all toggle checkboxes.
     * All event listeners are attached via addEventListener — no
     * inline onclick/onchange attributes in popup.html.
     */
    function registerToggleListeners() {
        for (const key of VALID_KEYS) {
            const checkbox = document.getElementById(key);
            if (!checkbox) continue;
            checkbox.addEventListener('change', () => {
                saveSetting(key, checkbox.checked);
            });
        }
    }

    // ─── INIT ─────────────────────────────────────────────────────────────────

    try {
        document.addEventListener('DOMContentLoaded', () => {
            displayVersion();
            loadSettings();
            registerToggleListeners();
        });
    } catch (e) {
        console.warn('SilentTube popup: initialization error —', e.message);
    }

})(); // End IIFE — no globals leak
