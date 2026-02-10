const { openai } = require('@ai-sdk/openai');
const { generateText } = require('ai');
const { OrganizationAssetsTool } = require('../tools/chatTools');
require('dotenv').config();

const model = openai('gpt-4o-mini', {
    structuredOutputs: false 
});

console.log('OpenAI client initialized successfully.');

const buildSystemPrompt = () => {
    return [
        "You are Rag Assistant, the official virtual assistant for Rag.",
        "You help users with organization assets.",
        "",
        "MUST call the OrganizationAssets tool for any asset-related question.",
        "Never guess asset data.",
    ].join("\n");
};

exports.prompt = async (req, res) => {
    try {
        const { query, toolname } = req.body;

        if (!query) {
            return res.status(400).json({ message: 'Query required' });
        }

        console.log(`[Chat] Query="${query}" | Tool=${toolname || 'AUTO'}`);

        const result = await generateText({
            model,
            system: buildSystemPrompt(),
            prompt: query,
            tools: {
                OrganizationAssets: OrganizationAssetsTool
            },
            
        });
      return result.text;
        result.pipeTextStreamToResponse(res);
        console.log('[Chat] Response streaming started');

    } catch (err) {
        console.error('Error in prompt:', err);
        if (!res.headersSent) {
            res.status(500).json({ message: 'Internal server error' });
        }
    }
};