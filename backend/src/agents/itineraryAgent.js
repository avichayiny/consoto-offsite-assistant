const { runAgent } = require('./agentService');

async function execute(promptText, messagesHistory, onToolCall) {
    return runAgent(promptText, messagesHistory, null, onToolCall);
}

module.exports = { execute };