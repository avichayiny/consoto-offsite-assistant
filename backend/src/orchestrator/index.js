const { runAgent } = require('../agents/agentService');
const { SYSTEM_PROMPTS } = require('../agents/systemPrompts');
const consotoData = require('../data/consotoData.json');

const supportedAgents = ['SCOUT', 'WEATHER', 'BUDGET', 'ITINERARY'];

async function handleChat(userMessage, conversationHistory, onStatusUpdate) {
    onStatusUpdate('Analyzing request...');

    const routedResponse = await runAgent(SYSTEM_PROMPTS.ROUTER, [
        ...conversationHistory,
        { role: 'user', content: userMessage }
    ]);
    let agentName = routedResponse.trim().toUpperCase();
    if (!supportedAgents.includes(agentName)) {
        agentName = 'SCOUT';
    }

    onStatusUpdate(`Routing to ${agentName} agent...`);
    let agentPrompt = SYSTEM_PROMPTS[agentName];
    if (agentName === 'ITINERARY') {
        agentPrompt = agentPrompt.replace(
            '[TEAM_DATA_PLACEHOLDER]',
            JSON.stringify(consotoData.platformTeam)
        );
    }

    conversationHistory.push({ role: 'user', content: userMessage });
    const onToolCall = tools => onStatusUpdate(`Using tools: ${tools.join(', ')}...`);
    const finalResponse = await runAgent(agentPrompt, conversationHistory, onToolCall);
    conversationHistory.push({ role: 'assistant', content: finalResponse });

    return finalResponse;
}

module.exports = { handleChat };
