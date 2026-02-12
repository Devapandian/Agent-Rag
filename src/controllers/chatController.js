const { openai } = require('@ai-sdk/openai');
const { generateText } = require('ai');
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
        "### YOUR ROLE:",
        "You help users analyze their organization's security posture by retrieving data and providing insights.",
        "",
        "### WORKFLOW RULES:",
        "1. IDENTIFY what the user is asking for based on their query",
        "2. CALL the appropriate data retrieval tool(s) with the user's keywords:",
        "   - Use 'OrganizationAssets' for findings/vulnerabilities. Pass specifically requested keywords to the 'query' parameter.",
        "   - Use 'framework' for compliance/standards.",
        "3. AFTER receiving data, ALWAYS call 'openai' tool:",
        "   - Pass the complete tool result to 'prompt'.",
        "   - Pass the user's original question to 'user_query'.",
        "4. PRESENT the 'conversational_response' from the openai tool directly to the user.",
        "",
        "### CRITICAL RULES:",
        "- NEVER stop after just calling a data retrieval tool",
        "- ALWAYS pass the complete tool result to 'openai' for analysis",
        "- The 'openai' tool contains AI analysis - DO NOT create your own analysis",
        "- Present the 'conversational_response' field from openai as your final answer",
        "",

    ].join("\n");
};

exports.prompt = async (req, res) => {
    try {
        const { query, organization_id } = req.body;

        if (!query) {
            return res.status(400).json({ message: 'Query required' });
        }

        const orgId = organization_id;

        console.log(`Query="${query}" | Org=${orgId}`);

        const promptWithContext = [
            `Organization ID: ${orgId}`,
            `User Question: ${query}`
        ].filter(Boolean).join("\n");

        const system = SystemPrompt();

        console.log(`Calling AI SDK with dynamic tool selection...`);

        const result = await generateText({
            model,
            system,
            prompt: promptWithContext,
            maxSteps: 10,
            maxToolRoundtrips: 5,
            tools: chatTools,
            toolChoice: 'auto',
        });

        console.log(`AI finished. Finish Reason: ${result.finishReason}`);
        console.log(`Steps taken: ${result.steps?.length || 'N/A'}`);
        console.log(`Text length: ${result.text?.length || 0}`);


        let finalText = result.text;

        const response = {
            text: finalText,
            organization_id: orgId,
            steps_count: result.steps?.length || 0
        };

        console.log('Response prepared successfully.');
        return res.json(response);

    } catch (err) {
        console.error('Error in prompt:', err.message);
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