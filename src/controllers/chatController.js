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
        "You are a Senior Cloud Security Consultant for Securion.ai.",
        "",
        "### STRICT SCOPE RULE:",
        "You are ONLY allowed to answer questions related to:",
        "- Cloud security findings",
        "- Security scans",
        "- Cloud assets (AWS, Azure, GCP)",
        "- Compliance frameworks (SOC 2, ISO 27001, HIPAA, PCI-DSS)",
        "- Risk posture and risk management",
        "- Security assessment reports",
        "- Organization security database data",

        "### WORKFLOW RULES:",
        "1. CALL the appropriate tool(s) with user keywords (e.g., 'OrganizationAssets' for findings, 'framework' for compliance).",
        "2. ANALYZE the tool results immediately. Do NOT call another tool for analysis.",
        "3. PRESENT your response in clean Markdown.",
        "",
        "### REPORTING STANDARDS:",
        "- **SPEED & FOCUS**: Be extremely concise. Use summary tables and brief bullet points. Generating shorter text makes the response much faster.",
        "- **NO TECHNICAL IDs**: Never include ARNs or long Technical IDs in the summary.",
        "",
        "### GREETING HANDLING:",
        "Hello! I'm your Cloud Security Assistant. I have access to your latest security scan data. How can I help you today?",

        "### SECURITY CONTEXT:",
        "Always use the provided JSON tool data to ground your answers.",
        
        "### CRITICAL FORMATTING RULE:",
        "- Use ONLY Markdown.",
        "- DO NOT use any HTML tags like <table>, <br>, <div>, <ul>, <li>.",
        "- Never return raw HTML."


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

        const usage = result.usage;
        const inputTokens = usage?.promptTokens || 0;
        const outputTokens = usage?.completionTokens || 0;
        const totalTokens = usage?.totalTokens || 0;

        const inputCost = (inputTokens / 1000000) * 0.15;
        const outputCost = (outputTokens / 1000000) * 0.60;
        const totalCost = inputCost + outputCost;

        console.log(`--- AI USAGE REPORT ---`);
        console.log(`Input Tokens: ${inputTokens}`);
        console.log(`Output Tokens: ${outputTokens}`);
        console.log(`Total Tokens: ${totalTokens}`);
        console.log(`Estimated Cost: $${totalCost.toFixed(6)}`);
        console.log(`-----------------------`);

        let finalText = result.text;

        const response = {
            text: finalText,
            organization_id: orgId,
            usage: {
                prompt_tokens: inputTokens,
                completion_tokens: outputTokens,
                total_tokens: totalTokens,
                estimated_cost_usd: totalCost.toFixed(6)
            },
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