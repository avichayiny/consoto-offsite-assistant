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
    
    const upperResponse = routedResponse.toUpperCase();
    const selectedAgents = [];
    
    for (const agent of supportedAgents) {
        if (upperResponse.includes(agent)) {
            selectedAgents.push(agent);
        }
    }

    if (selectedAgents.length === 0) selectedAgents.push('SCOUT');

    onStatusUpdate(`Routing to: ${selectedAgents.join(' & ')}...`);

    conversationHistory.push({ role: 'user', content: userMessage });
    const onToolCall = tools => onStatusUpdate(`Using tools: ${tools.join(', ')}...`);
    
    let finalResponse = "";

   
    if (selectedAgents.includes('BUDGET') && selectedAgents.includes('ITINERARY')) {
        
       console.log('33333333333333333333333')
        onStatusUpdate('Budget Agent is executing budget tools...');
        const budgetOutput = await budgetAgent.execute(conversationHistory, onToolCall);
        
       console.log(budgetOutput)
        onStatusUpdate('Itinerary Agent is drafting the plan...');
        const itineraryPrompt = SYSTEM_PROMPTS.ITINERARY.replace(
            '[TEAM_DATA_PLACEHOLDER]',
            JSON.stringify(consotoData.platformTeam)
        ) + `\n\nOFFICIAL BUDGET AGENT REPORT (You must include these precise figures in your final response):\n${budgetOutput}`;

        finalResponse = await itineraryAgent.execute(itineraryPrompt, conversationHistory, onToolCall);
        
    } else {
      console.log(11111111111)
        const primaryAgent = selectedAgents[0];
        switch (primaryAgent) {
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
    }

    conversationHistory.push({ role: 'assistant', content: finalResponse });
    return finalResponse;
}

module.exports = { handleChat };