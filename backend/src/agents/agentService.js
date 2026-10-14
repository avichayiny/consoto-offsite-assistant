const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');
const { calculateAndCheckPolicy } = require('../tools/budgetTool');
const { checkDatesAndHolidays } = require('../tools/calendarTool');
const { getWeatherForecast } = require('../tools/weatherTool');
const { agentTools } = require('../tools/toolDefinitions');
const { GEMINI_MODELS, GROQ_MODELS } = require('../config/models');

const toolHandlers = {
    calculateAndCheckPolicy,
    checkDatesAndHolidays,
    getWeatherForecast
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
        role: message.role === 'assistant' || message.role === 'model'
            ? 'model'
            : 'user',
        parts: Array.isArray(message.parts)
            ? message.parts
            : [{ text: String(message.content ?? '') }]
    }));
}

function getLatestUserMessage(messagesHistory) {
    for (let index = messagesHistory.length - 1; index >= 0; index -= 1) {
        const message = messagesHistory[index];
        if (message.role !== 'user') {
            continue;
        }

        if (typeof message.content === 'string') {
            return { index, text: message.content };
        }

        if (Array.isArray(message.parts)) {
            return {
                index,
                text: message.parts.map(part => part.text || '').join('')
            };
        }
    }

    throw new Error('messagesHistory must include a user message');
}

function toGroqHistory(messagesHistory) {
    if (!Array.isArray(messagesHistory)) {
        return [];
    }

    return messagesHistory.map(message => ({
        role: message.role === 'assistant' || message.role === 'model'
            ? 'assistant'
            : 'user',
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
            if (!isRateLimitError(error) || attempt === 1) {
                throw error;
            }

            await delay(1000 * (2 ** attempt));
        }
    }

    throw new Error('Gemini request exhausted its retry attempts');
}

async function executeFunctionCall(functionCall) {
    const handler = toolHandlers[functionCall.name];
    if (!handler) {
        throw new Error(`Gemini requested an unknown tool: ${functionCall.name}`);
    }

    const args = functionCall.args || {};
    switch (functionCall.name) {
        case 'calculateAndCheckPolicy':
            return handler(args.destination, args.days, args.nights);
        case 'checkDatesAndHolidays':
        case 'getWeatherForecast':
            return handler(args.destination, args.startDate, args.endDate);
        default:
            throw new Error(`Gemini requested an unsupported tool: ${functionCall.name}`);
    }
}

async function runGeminiModel(
    generativeAI,
    modelName,
    systemInstruction,
    messagesHistory,
    onToolCall
) {
    const { index: promptIndex, text: prompt } = getLatestUserMessage(messagesHistory);
    const model = generativeAI.getGenerativeModel({
        model: modelName,
        systemInstruction,
        tools: [{ functionDeclarations: agentTools }]
    });
    const chat = model.startChat({
        history: toGeminiHistory(messagesHistory.slice(0, promptIndex))
    });

    let result = await sendGeminiMessage(chat, prompt);
    while (true) {
        const response = result.response;
        const functionCalls = response.functionCalls();

        if (!functionCalls?.length) {
            return response.text();
        }

        if (onToolCall && typeof onToolCall === 'function') {
            onToolCall(functionCalls.map(call => call.name));
        }

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

        result = await sendGeminiMessage(chat, functionResponses);
    }
}

async function runGroqFallback(systemInstruction, messagesHistory) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        throw new Error('GROQ_API_KEY is not configured');
    }

    const history = toGroqHistory(messagesHistory);
    const messages = [
        {
            role: 'system',
            content: `${systemInstruction}\n\nYou are running in degraded mode without tools. Do not claim to have checked live weather, holidays, or budget policy.`
        },
        ...history
    ];

    for (const model of GROQ_MODELS) {
        try {
            const response = await axios.post(
                'https://api.groq.com/openai/v1/chat/completions',
                {
                    model,
                    messages
                },
                {
                    headers: {
                        Authorization: `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            const text = response.data?.choices?.[0]?.message?.content;
            if (typeof text !== 'string' || !text.trim()) {
                throw new Error(`Groq model ${model} returned an empty response`);
            }

            return `[Degraded mode: tools are unavailable] ${text}`;
        } catch (error) {
            console.warn(`Groq model ${model} failed:`, error.message);
        }
    }

    throw new Error('All configured AI providers failed to generate a response');
}

async function runAgent(systemInstruction, messagesHistory, onToolCall) {
    const history = Array.isArray(messagesHistory) ? messagesHistory : [];

    for (const modelName of GEMINI_MODELS) {
        try {
            if (!process.env.GEMINI_API_KEY) {
                throw new Error('GEMINI_API_KEY is not configured');
            }

            const generativeAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            return await runGeminiModel(
                generativeAI,
                modelName,
                systemInstruction,
                history,
                onToolCall
            );
        } catch (error) {
            console.warn(`Gemini model ${modelName} failed:`, error.message);
        }
    }

    console.warn('All Gemini models failed; falling back to Groq in degraded mode.');
    return runGroqFallback(systemInstruction, history);
}

module.exports = { runAgent };
