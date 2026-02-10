const { openai } = require('@ai-sdk/openai');
const { generateText } = require('ai');
const { OrganizationAssetsTool, OpeniTool } = require('../tools/chatTools');
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
        "After receiving the response from OrganizationAssets, you MUST immediately call the 'openi' tool with 'tool: openia' and pass the asset data to it.",
        "Never guess asset data.",
    ].join("\n");
};

exports.prompt = async (req, res) => {
    try {
        const { query, toolname, organization_id } = req.body;

        if (!query) {
            return res.status(400).json({ message: 'Query required' });
        }

        console.log(`[Chat] Query="${query}" | Org=${organization_id} | Tool=${toolname || 'AUTO'}`);

        const promptWithContext = `User is asking about organization: ${organization_id || 'unknown'}. Question: ${query}`;

        const result = await generateText({
            model,
            system: buildSystemPrompt(),
            prompt: promptWithContext,
            maxSteps: 5,
            tools: {
                OrganizationAssets: OrganizationAssetsTool,
                openi: OpeniTool
            },

        });

        console.log('[Chat] Task completed');
        return res.json({
            text: result.text,
            organization_id: organization_id
        });

    } catch (err) {
        console.error('Error in prompt:', err);
        if (!res.headersSent) {
            res.status(500).json({ message: 'Internal server error' });
        }
    }
};