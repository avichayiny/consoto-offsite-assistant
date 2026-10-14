const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');
const { calculateAndCheckPolicy } = require('../tools/budgetTool');
const { checkDatesAndHolidays } = require('../tools/calendarTool');
const { getWeatherForecast } = require('../tools/weatherTool');
const { searchPlaces } = require('../tools/placesTool');
const { GEMINI_MODELS, GROQ_MODELS } = require('../config/models');

const toolHandlers = {
    calculateAndCheckPolicy,
    checkDatesAndHolidays,
    getWeatherForecast,
    searchPlaces
};

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function isRateLimitError(error) {
    return error.status === 429
        || error.response?.status === 429
        || /\b429\b/.test(error.message || '');
}

function toGeminiHistory(messagesHistory) {
    return messagesHistory.map(message => ({
        role: message.role === 'assistant' || message.role === 'model' ? 'model' : 'user',
        parts: Array.isArray(message.parts)
            ? message.parts
            : [{ text: String(message.content ?? '') }]
    }));
}

function getLatestUserMessage(messagesHistory) {
    for (let index = messagesHistory.length - 1; index >= 0; index -= 1) {
        const message = messagesHistory[index];
        if (message.role !== 'user') continue;
        if (typeof message.content === 'string') return { index, text: message.content };
        if (Array.isArray(message.parts)) {
            return { index, text: message.parts.map(part => part.text || '').join('') };
        }
    }
    throw new Error('messagesHistory must include a user message');
}

function toGroqHistory(messagesHistory) {
    if (!Array.isArray(messagesHistory)) return [];
    return messagesHistory.map(message => ({
        role: message.role === 'assistant' || message.role === 'model' ? 'assistant' : 'user',
        content: typeof message.content === 'string'
            ? message.content
            : Array.isArray(message.parts)
                ? message.parts.map(part => part.text || '').join('')
                : ''
    }));
}

async function sendGeminiMessage(chat, message) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
            return await chat.sendMessage(message);
        } catch (error) {
            if (!isRateLimitError(error) || attempt === 1) throw error;
            await delay(1000 * (2 ** attempt));
        }
    }
    throw new Error('Gemini request exhausted its retry attempts');
}

async function executeFunctionCall(functionCall) {
    const handler = toolHandlers[functionCall.name];
    if (!handler) throw new Error(`Unknown tool: ${functionCall.name}`);
    const args = functionCall.args || {};
    switch (functionCall.name) {
        case 'calculateAndCheckPolicy':
            return handler(args.destination, args.days, args.nights);
            
        case 'checkDatesAndHolidays':
            return handler(args.destination, args.startDate, args.endDate);
            
        case 'getWeatherForecast':
           
            const dest = args.destination || args.city;
            return handler(dest, args.startDate, args.endDate);
            
        case 'searchPlaces':
            return handler(args.city || args.destination, args.tag);
            
        default:
            throw new Error(`Unsupported tool: ${functionCall.name}`);
    }
}

async function runGeminiModel(generativeAI, modelName, systemInstruction, messagesHistory, toolsSchema, onToolCall) {
    const { index: promptIndex, text: prompt } = getLatestUserMessage(messagesHistory);
    
    const modelConfig = { model: modelName, systemInstruction };
    if (toolsSchema && toolsSchema.length > 0) { 
        modelConfig.tools = [{ functionDeclarations: toolsSchema }]; 
    }

    const model = generativeAI.getGenerativeModel(modelConfig);
    
  
    const contents = toGeminiHistory(messagesHistory.slice(0, promptIndex));
    contents.push({ role: 'user', parts: [{ text: prompt }] });

    console.log(`[DEBUG] Sending prompt to Gemini model: ${modelName}`);
    
  
    async function fetchWithRetry(currentContents) {
        for (let attempt = 0; attempt < 2; attempt += 1) {
            try {
                return await model.generateContent({ contents: currentContents });
            } catch (error) {
                if (!isRateLimitError(error) || attempt === 1) throw error;
                await delay(1000 * (2 ** attempt));
            }
        }
    }

    let result = await fetchWithRetry(contents);
    console.log(`[DEBUG] Gemini responded.`);

    while (true) {
        const response = result.response;
        const functionCalls = response.functionCalls();

        if (!functionCalls?.length) {
            return response.text();
        }

        if (onToolCall) {
            onToolCall(functionCalls.map(call => call.name));
        }

      
        contents.push(response.candidates[0].content);

        const functionResponses = [];
        for (const functionCall of functionCalls) {
            const toolResult = await executeFunctionCall(functionCall);
            functionResponses.push({
                functionResponse: {
                    name: functionCall.name,
                    response: { result: toolResult }
                }
            });
        }
        
    
        contents.push({ role: 'user', parts: functionResponses });
        
        console.log(`[DEBUG] Sending tool results back to Gemini...`);
        result = await fetchWithRetry(contents);
    }
}

async function runGroqFallback(systemInstruction, messagesHistory, toolsSchema, onToolCall) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error('GROQ_API_KEY is not configured');
    
    const messages = [
        { role: 'system', content: systemInstruction },
        ...toGroqHistory(messagesHistory)
    ];

    const requestBody = {
        model: GROQ_MODELS[0],
        messages: messages
    };

    if (toolsSchema && toolsSchema.length > 0) {
        requestBody.tools = toolsSchema.map(tool => ({
            type: 'function',
            function: {
                name: tool.name,
                description: tool.description,
                parameters: tool.parameters
            }
        }));
        requestBody.tool_choice = 'auto';
    }

    try {
        console.log(`[DEBUG] Sending request to Groq model: ${GROQ_MODELS[0]}`);
        let response = await axios.post(
            'https://api.groq.com/openai/v1/chat/completions',
            requestBody,
            { headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' } }
        );

        let responseMessage = response.data.choices[0].message;

        if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
            if (onToolCall) {
                onToolCall(responseMessage.tool_calls.map(tc => tc.function.name));
            }
            
            messages.push(responseMessage);
            
            for (const toolCall of responseMessage.tool_calls) {
                const args = JSON.parse(toolCall.function.arguments);
                const toolResult = await executeFunctionCall({ name: toolCall.function.name, args });
                
                messages.push({
                    role: 'tool',
                    tool_call_id: toolCall.id,
                    name: toolCall.function.name,
                    content: JSON.stringify(toolResult)
                });
            }
            
            console.log(`[DEBUG] Sending tool results back to Groq...`);
            const followUpBody = { model: GROQ_MODELS[0], messages: messages };
            if (toolsSchema && toolsSchema.length > 0) {
                followUpBody.tools = toolsSchema.map(tool => ({
                    type: 'function',
                    function: {
                        name: tool.name,
                        description: tool.description,
                        parameters: tool.parameters
                    }
                }));
            }

            response = await axios.post(
                'https://api.groq.com/openai/v1/chat/completions',
                followUpBody,
                { headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' } }
            );
            return response.data.choices[0].message.content;
        }

        return responseMessage.content;
    } catch (error) {
        console.error(`[DEBUG] Groq failed:`, error.response?.data || error.message);
        throw new Error('All configured AI providers failed to generate a response');
    }
}

async function runAgent(systemInstruction, messagesHistory, toolsSchema = null, onToolCall) {
    const history = Array.isArray(messagesHistory) ? messagesHistory : [];
    for (const modelName of GEMINI_MODELS) {
        try {
            if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not configured');
            const generativeAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            return await runGeminiModel(generativeAI, modelName, systemInstruction, history, toolsSchema, onToolCall);
        } catch (error) {
            console.warn(`Gemini model ${modelName} failed:`, error.message);
        }
    }
    
    console.warn('All Gemini models failed; falling back to Groq as primary engine.');
    return runGroqFallback(systemInstruction, history, toolsSchema, onToolCall);
}

module.exports = { runAgent };