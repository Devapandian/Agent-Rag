const { tool } = require('ai');
const { z } = require('zod');
const { supabase } = require('../config/supabase');
const { openai } = require('@ai-sdk/openai');
const { generateText } = require('ai');

const model = openai('gpt-4o-mini', {
    structuredOutputs: false
});

const OrganizationAssetsTool = tool({
    description: "Get a list of organization assets from Supabase database.",

    parameters: z.object({
        query: z.string().describe("The user's query about assets"),
        organization_id: z.string().describe("The organization ID to query"),
        toolname: z.string().optional().default('openai').describe("The tool name to use for processing (default: openai)")
    }),

    execute: async ({ organization_id, query, toolname }) => {
        console.log(
            ` OrganizationAssets tool called | org=${organization_id} | query="${query}" | toolname=${toolname}`
        );

        console.log(`Querying Supabase for organization_id=${organization_id}`);

        try {
            let supabaseQuery = supabase
                .from('scan_details')
                .select('findings,source,total_findings,source_data, created_at', { count: 'exact' })
                .eq('organization_id', organization_id)
                .limit(100)
                .order('created_at', { ascending: false });

            const { data: assets, error, count } = await supabaseQuery;
            console.log(`Supabase query completed with ${assets?.length || 0} results`);
            if (error) {
                console.error(' Supabase error:', error);
                return {
                    found: false,
                    error: true,
                    message: `Database error: ${error.message}. Please try again or contact support.`,
                    organization_id,
                    toolname
                };
            }
            console.log(`Processing ${assets?.length || 0} assets for response formatting`);


            const summaryResults = assets ? assets.map(a => {
                const findingsSnippet = Array.isArray(a.findings)
                    ? a.findings.slice(0, 20).map(f => ({
                        title: Object.values(f)[0] || 'Unnamed Finding',
                        severity: f.severity || 'Unknown',
                        description: JSON.stringify(f).substring(0, 100)
                    }))
                    : [];

                const sourceSummary = a.source_data ? {
                    type: a.source_data.type || a.source_data.provider || 'Unknown',
                    region: a.source_data.region || 'N/A'
                } : null;

                return {
                    id: a.id,
                    source: a.source || 'Unknown',
                    findings_count: a.findings ? (Array.isArray(a.findings) ? a.findings.length : 0) : (a.total_findings || 0),
                    vulnerabilities: findingsSnippet,
                    source_context: sourceSummary
                };
            }) : [];

            console.log(`Formatted ${summaryResults.length} assets for AI analysis`);
            const result = {
                organization_id,
                total_count: count || 0,
                user_query: query,
                results: summaryResults
            };



            console.log(` OrganizationAssets: Found ${result.total_count} assets`);


            return result;

        } catch (error) {
            console.error(' Unexpected error in OrganizationAssets:', error);
            return {
                found: false,
                error: true,
                message: `Unexpected error occurred: ${error.message}`,
                organization_id,
                toolname
            };
        }
    },
});

const OpenaiTool = tool({
    description: "Summarizes given text into a concise report, run only user initiated report generation requests, dont run automatically after scans, or tool executions, or conversations. IMPORTANT: Choose the correct report_type based on the context",

    parameters: z.object({
        prompt: z.any().describe("The data or prompt to analyze. Usually follows the format { results, total_count, organization_id, user_query }.")
    }),

    execute: async ({ prompt }) => {
        console.log(`openai tool called with prompt: ${typeof prompt === 'object' ? JSON.stringify(prompt) : prompt}`);

        let processedData;
        if (typeof prompt === 'string') {
            try {
                processedData = JSON.parse(prompt);
            } catch (e) {
                processedData = { user_query: prompt };
            }
        } else {
            processedData = prompt;
        }

        const totalCount = processedData?.total_count || 0;
        const userQuery = processedData?.user_query || '';
        const results = processedData?.results || [];

        console.log(`Processing ${results?.length || 0} assets through AI`);


        try {
            const analysisPrompt = `You are a professional Cloud Security Consultant AI assistant specializing in AWS, Azure, and GCP infrastructure security. 

Analyze the following security findings and assets to provide a conversational, insightful response that directly addresses the user's query.

### CORE INSTRUCTIONS:
1. **Vulnerability Focus**: The main context of this analysis is the **vulnerabilities (findings)**. Discuss the specific issues listed in the 'vulnerabilities' array (which includes titles, severities, and descriptions).
2. **Table Format Triggers**: ALWAYS use a **markdown table** if the user query contains keywords like "compare", "list", "show", "last X days", "last X months", or "overview", even if "table" isn't explicitly mentioned.
3. **Table Structure**: If using a table, include these columns: ID, Source (include Region/Type if in source_context), Findings Count, Top Vulnerabilities (titles/severity).

User's Question: "${userQuery}"

Contextual Data:
- Total Assets/Scans: ${totalCount}
- Organization ID: ${processedData.organization_id}

Findings Summary (Detailed Vulnerability Context):
${JSON.stringify(results, null, 2)}


Expected Response Content:
1. A brief professional overview of the current security posture.
2. A detailed analysis of the vulnerabilities found (the 'mean vulnerability' context).
3. If keywords suggest comparison or listing, provide a clear COMPARISON TABLE.
4. Highlight critical/high-risk items (findings_count > 30).
5. Actionable, cloud-native recommendations (AWS/Azure/GCP specific if applicable).

Use a professional consultant tone. Do NOT include dates or page numbers.`;



            console.log(` Calling AI for analysis...`);

            const aiResult = await generateText({
                model,
                prompt: analysisPrompt,
                temperature: 0.7,
                maxTokens: 2000,
            });

            const conversationalResponse = aiResult.text || "Unable to generate analysis at this time.";

            console.log(` AI analysis completed (${conversationalResponse.length} characters)`);

            return {
                success: true,
                analysis_complete: true,
                conversational_response: conversationalResponse,
                processed_by: processedData?.tool || 'openai',
                metadata: {
                    total_assets: totalCount,
                    organization_id: processedData?.organization_id,
                    user_query: userQuery,
                    processedAt: new Date().toISOString()
                }
            };


        } catch (error) {
            console.error(' Error in openai AI analysis:', error);

            return {
                success: false,
                error: true,
                conversational_response: `I found ${totalCount} assets but encountered an error during analysis. Please try again.`,
                error_message: error.message,

            };
        }
    },
});

const chatTools = {
    OrganizationAssets: OrganizationAssetsTool,
    openai: OpenaiTool
};

module.exports = {
    chatTools
};
