const { openai } = require('@ai-sdk/openai');
const { generateText, stepCountIs } = require('ai');
const { chatTools } = require('../tools/chatTools');
require('dotenv').config();

const model = openai('gpt-4o-mini', {
    structuredOutputs: false
});

console.log('OpenAI client initialized successfully.');

const SystemPrompt = () => {
    return [
        "You are Rag Assistant, the official virtual assistant for Rag.",
        "",
        "### CRITICAL WORKFLOW - FOLLOW EXACTLY:",
        "Step 1: When asked about assets, call the 'OrganizationAssets' tool",
        "Step 2: IMMEDIATELY after receiving OrganizationAssets results, call openai tool with:",
        "   - prompt: (the complete result from OrganizationAssets)",
        `Step 3: The openai tool will return a 'conversational_response' - present that response DIRECTLY to the user`,
        "",
        "### IMPORTANT:",
        "- You MUST complete ALL three steps for every asset query",
        "- DO NOT stop after calling OrganizationAssets",
        `- DO NOT create your own response - use the 'conversational_response' from openai`,
        "- The tool uses AI to analyze the data and generate insights",
        "",
        "### WORKFLOW:",
        `OrganizationAssets → openai (AI analysis happens here) → present conversational_response to user`,
    ].join("\n");
};

exports.prompt = async (req, res) => {
    try {
        const { query, toolname, organization_id } = req.body;

        if (!query) {
            return res.status(400).json({ message: 'Query required' });
        }

        const orgId = organization_id;
        const tool = toolname;

        console.log(`Query="${query}" | Org=${orgId} | Tool=${tool}`);

        const promptWithContext = [
            `Organization ID: ${orgId}.`,
            `Tool Name: ${tool}.`,
            `User Question: ${query}`
        ].filter(Boolean).join(" ");

        const system = SystemPrompt();

        console.log(`Calling AI SDK ...`);

        const result = await generateText({
            model,
            system,
            prompt: promptWithContext,
            maxSteps: 5,
            maxToolRoundtrips: 3,
            tools: chatTools,
        });

        console.log(` AI finished. Finish Reason: ${result.finishReason}`);
        console.log(` Steps taken: ${result.steps?.length || 'N/A'}`);
        console.log(`Text length: ${result.text?.length || 0}`);

        const toolCallsMade = [];
        const toolResultsReceived = [];

        if (result.toolCalls && result.toolCalls.length > 0) {
            result.toolCalls.forEach(tc => toolCallsMade.push(tc.toolName));
            console.log(' Tool calls made:', toolCallsMade);
        }

        if (result.toolResults && result.toolResults.length > 0) {
            result.toolResults.forEach(tr => {
                const toolName = tr.toolName || tr.toolCall?.toolName || 'unknown';
                toolResultsReceived.push(toolName);
            });
            console.log(' Tool results received:', toolResultsReceived);
        }

        let finalText = result.text;


        const response = {
            text: finalText,
            organization_id: orgId,
            toolname: tool
        };


        console.log(' Response prepared successfully.');
        return res.json(response);

    } catch (err) {
        console.error(' Error in prompt:', err.message);
        if (err.data && err.data.error) {
            console.error('API Error Details:', JSON.stringify(err.data.error, null, 2));
        }
        if (err.stack) {
            console.error('Stack trace:', err.stack);
        }

        if (!res.headersSent) {
            res.status(500).json({
                message: 'Internal server error',
                error: err.message,
            });
        }
    }
};