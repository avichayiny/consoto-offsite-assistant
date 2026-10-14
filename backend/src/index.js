const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { handleChat } = require('./orchestrator');
const { getSessionHistory } = require('./utils/stateManager');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/api/chat/stream', async (req, res) => {
    const { message } = req.query;
    const sessionId = req.query.sessionId || 'default-session';

    res.set({
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    });
    res.flushHeaders();

    const onStatusUpdate = statusText => {
        res.write(`data: ${JSON.stringify({ type: 'status', content: statusText })}\n\n`);
    };

    const history = getSessionHistory(sessionId);
    try {
        const finalResponse = await handleChat(message, history, onStatusUpdate);
        res.write(`data: ${JSON.stringify({ type: 'message', content: finalResponse })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
    } catch (error) {
        console.error('Failed to handle chat stream:', error);
        res.write(`data: ${JSON.stringify({ type: 'error', content: 'Failed to process chat request' })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
    }
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'Consoto Orchestrator is running' });
});

app.listen(PORT, () => {
    console.log(`Backend server is running on http://localhost:${PORT}`);
});