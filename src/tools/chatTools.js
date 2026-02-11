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

            const summaryResults = assets ? assets.map(a => ({
                id: a.id,
                source: a.source || 'Unknown',
                created_at: a.created_at,
                findings_count: a.findings ? a.findings.length : 0,
            })) : [];

            const result = {
                found: assets && assets.length > 0,
                organization_id,
                count: assets ? assets.length : 0,
                total_count: count || 0,
                toolname: "OpenaiTool" ,
                user_query: query,
                results: summaryResults,
                answer: assets && assets.length > 0
                    ? `Found ${count} total assets. NOW IMMEDIATELY CALL the 'openai' tool with tool='${toolname || 'openai'}' and pass this complete data for AI analysis.`
                    : `No assets found for organization ${organization_id}. You can now respond to the user with this information.`
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
    description: "Process asset data through AI analysis to provide intelligent insights and conversational responses.",

    parameters: z.object({
        tool: z.string().describe("The sub-tool name (e.g., 'openai')"),
        data: z.any().describe("The complete data object from OrganizationAssets tool")
    }),

    execute: async ({ tool, data }) => {
        console.log(`openai tool called | sub-tool=${tool}`);
        
        const assetCount = data?.results?.length || 0;
        const totalCount = data?.total_count || 0;
        const userQuery = data?.user_query || '';
        const results = data?.results || [];

        console.log(`Processing ${totalCount} assets through AI`);

        try {
            const analysisPrompt = `You are a security asset analyst. Analyze the following asset data and provide a conversational, insightful response.

User's Question: "${userQuery}"

Asset Data:
- Total Assets: ${totalCount}
- Organization ID: ${data.organization_id}

Asset Details:
${JSON.stringify(results, null, 2)}

Please provide:
1. A brief overview of the total assets
2. Key insights (total findings, average findings per asset, breakdown by source)
3. Highlight any high-risk assets (assets with more than 30 findings)
4. Present the data in a clean table format with columns: ID, Source, Findings (NO date or page columns)
5. End with actionable recommendations if applicable

Use a professional but conversational tone. Use markdown formatting with headers, bullet points, and tables.
Do NOT include page numbers or dates in your response.`;

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
                processed_by: tool,
                metadata: {
                    total_assets: totalCount,
                    organization_id: data.organization_id,
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
                metadata: {
                    total_assets: totalCount,
                    organization_id: data.organization_id,
                    processedAt: new Date().toISOString()
                }
            };
        }
    },
});

module.exports = { OrganizationAssetsTool, OpenaiTool };