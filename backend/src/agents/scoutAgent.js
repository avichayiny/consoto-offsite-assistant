const { runAgent } = require('./agentService');
const { SYSTEM_PROMPTS } = require('./systemPrompts');
const { scoutToolsSchema } = require('../tools/toolDefinitions');

async function execute(messagesHistory, onToolCall) {
    return runAgent(SYSTEM_PROMPTS.SCOUT, messagesHistory, scoutToolsSchema, onToolCall);
}

module.exports = { execute };