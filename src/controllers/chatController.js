const { openai } = require('@ai-sdk/openai');
const {
    streamText,
    stepCountIs,
    createUIMessageStream,
    pipeUIMessageStreamToResponse,
    UI_MESSAGE_STREAM_HEADERS,
} = require('ai');
const { faqTool, isOrganizationAssetsTool } = require('../tools/chatTools');
require('dotenv').config();

const apiKey = process.env.OPENAI_API_KEY || "";
if (!apiKey) {
    console.error('ERROR: OPENAI_API_KEY is not defined in .env file.');
}


console.log('Google Generative AI client initialized successfully.');
const model = openai('gpt-4o-mini');

const buildSystemPrompt = () => {
    return [
        "You are Rag Assistant, the official virtual assistant for Rag — a credit counselling services company based in Chennai, India.",
        "Your role is to help customers with questions related to credit scores, CIBIL reports, credit counselling, loans, and personal finance.",
        "",
        "When to call the FAQ tool:",
        "- MUST call the FAQ tool whenever the customer asks anything about credit scores, CIBIL, loans, credit counselling, Rag services, or personal finance. Always use the tool first before answering — do not guess or answer from memory.",
        "",
        "When to call the Organization Assets tool:",
        "- MUST call the isOrganizationAssets tool whenever the customer asks about organization assets, inventory, or what assets the company manages. Always use the tool first to get accurate analysis. Pass the organization_id (infer if possible or ask) and the customer's query as the 'query' parameter.",
        "",
        "When NOT to call tools:",
        "- If the customer is just greeting you (hello, hi, good morning, etc.) — respond directly without calling any tool.",
        "- If the customer is asking about a topic completely unrelated to finance or credit — respond directly without calling any tool.",
        "",
        "Guidelines:",
        "- If the customer greets you, respond warmly and professionally. Introduce yourself as Rag Assistant and ask how you can help them today.",
        "- Always maintain a polite, professional, and reassuring tone.",
        "- If the customer asks about a topic not related to finance or credit counselling, gently reply: 'Thank you for your question! I'm best suited to help with finance and credit-related topics. Feel free to ask me anything about credit scores, CIBIL, or our services — I'm happy to assist.'",
        "- Never provide advice on topics outside of finance and credit counselling.",
    ].join("\n");
};

exports.prompt = async (req, res) => {
    try {
        if (!req.body) {
            return res.status(400).json({
                status: 'fail',
                message: 'Request body is missing. Ensure Content-Type is application/json.'
            });
        }

        const { query } = req.body;
        if (!query) {
            return res.status(400).json({ status: 'fail', message: 'Query is required' });
        }

        const systemPrompt = buildSystemPrompt();

        res.set(UI_MESSAGE_STREAM_HEADERS);

        const result = await streamText({
            model: model,
            tools: {
                faq: faqTool,
                isOrganizationAssets: isOrganizationAssetsTool
            },
            toolConfig: {
                functionCallingConfig: { mode: "AUTO" }
            },
            maxSteps: 5,
            prompt: query,
            system: systemPrompt,
        });

        result.pipeTextStreamToResponse(res);

        console.log('Streaming response initiated.');
    } catch (error) {
        console.error("Error in prompt:", error);
        if (!res.headersSent) {
            res.status(500).json({ status: 'error', message: 'Internal server error' });
        }
    }
};

