const { runAgent } = require('./agentService');
const { SYSTEM_PROMPTS } = require('./systemPrompts');
const { weatherToolsSchema } = require('../tools/toolDefinitions');

async function execute(messagesHistory, onToolCall) {
    
    const todayStr = new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });

    
    const weatherSystemPrompt = typeof SYSTEM_PROMPTS.WEATHER === 'function' 
        ? SYSTEM_PROMPTS.WEATHER(todayStr) 
        : SYSTEM_PROMPTS.WEATHER;

    return runAgent(weatherSystemPrompt, messagesHistory, weatherToolsSchema, onToolCall);
}

module.exports = { execute };