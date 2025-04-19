// CompanyRTS/static/utils.js

/**
 * Logs a message to the console and the log panel in the UI.
 * @param {string} message The message to log.
 */
export function log(message) {
    const logElement = document.getElementById('log');
    if (logElement) {
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const maxLogEntries = 50; // Keep log panel tidy
        const newEntry = document.createElement('div');
        newEntry.textContent = `${time}: ${message}`;
        logElement.insertBefore(newEntry, logElement.firstChild);
        while (logElement.childElementCount > maxLogEntries) {
            logElement.removeChild(logElement.lastChild);
        }
    }
    console.log(message); // Also log to browser console
}

// Add any other utility functions here and export them if needed