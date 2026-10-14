const sessions = new Map();

function getSessionHistory(sessionId) {
    if (!sessions.has(sessionId)) {
        sessions.set(sessionId, []);
    }

    return sessions.get(sessionId);
}

function clearSession(sessionId) {
    sessions.set(sessionId, []);
}

module.exports = { getSessionHistory, clearSession };
