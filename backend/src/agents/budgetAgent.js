const { runAgent } = require('./agentService');
const { SYSTEM_PROMPTS } = require('./systemPrompts');
const { budgetToolsSchema } = require('../tools/toolDefinitions');

async function execute(messagesHistory, onToolCall) {
    return runAgent(SYSTEM_PROMPTS.BUDGET, messagesHistory, budgetToolsSchema, onToolCall);
}

module.exports = { execute };