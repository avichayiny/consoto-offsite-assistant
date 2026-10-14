const { runAgent } = require('../agents/agentService');
const { SYSTEM_PROMPTS } = require('../agents/systemPrompts');
const consotoData = require('../data/consotoData.json');


const scoutAgent = require('../agents/scoutAgent');
const weatherAgent = require('../agents/weatherAgent');
const budgetAgent = require('../agents/budgetAgent');
const itineraryAgent = require('../agents/itineraryAgent');

const supportedAgents = ['SCOUT', 'WEATHER', 'BUDGET', 'ITINERARY'];

async function handleChat(userMessage, conversationHistory, onStatusUpdate) {
    onStatusUpdate('Analyzing request...');


    const routedResponse = await runAgent(SYSTEM_PROMPTS.ROUTER, [
        ...conversationHistory,
        { role: 'user', content: userMessage }
    ]);
    
    let agentName = 'SCOUT'; 
    const upperResponse = routedResponse.toUpperCase();
    
    for (const agent of supportedAgents) {
        if (upperResponse.includes(agent)) {
            agentName = agent;
            break;
        }
    }

    onStatusUpdate(`Routing to ${agentName} agent...`);


    conversationHistory.push({ role: 'user', content: userMessage });
    
    const onToolCall = tools => onStatusUpdate(`Using tools: ${tools.join(', ')}...`);
    let finalResponse;

   
    switch (agentName) {
        case 'WEATHER':
            finalResponse = await weatherAgent.execute(conversationHistory, onToolCall);
            break;
        case 'BUDGET':
            finalResponse = await budgetAgent.execute(conversationHistory, onToolCall);
            break;
        case 'ITINERARY':
            const itineraryPrompt = SYSTEM_PROMPTS.ITINERARY.replace(
                '[TEAM_DATA_PLACEHOLDER]',
                JSON.stringify(consotoData.platformTeam)
            );
            finalResponse = await itineraryAgent.execute(itineraryPrompt, conversationHistory, onToolCall);
            break;
        case 'SCOUT':
        default:
            finalResponse = await scoutAgent.execute(conversationHistory, onToolCall);
            break;
    }

    conversationHistory.push({ role: 'assistant', content: finalResponse });
    return finalResponse;
}

module.exports = { handleChat };