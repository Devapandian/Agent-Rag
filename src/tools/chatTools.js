const { tool } = require('ai');
const { z } = require('zod');
const { supabase } = require('../config/supabase');
const { openai } = require('@ai-sdk/openai');
const { generateText } = require('ai');

const model = openai('gpt-4o-mini', {
    structuredOutputs: false
});

const OrganizationAssetsTool = tool({
    description: `Retrieves security scan findings, vulnerabilities, and asset details for an organization. 
    Use this tool when users ask about:
    - Security findings or vulnerabilities
    - Cloud assets (AWS, Azure, GCP)
    - Security scans or scan results
    - Infrastructure security issues
    - Recent security assessments
    - Comparing security findings over time`,

    parameters: z.object({
        organization_id: z.string().describe("The organization ID to query"),
    }),

    execute: async ({ organization_id }) => {
        console.log(`OrganizationAssets tool called | org=${organization_id}`);
        console.log(`Querying Supabase for organization_id=${organization_id}`);

        try {
            let supabaseQuery = supabase
                .from('scan_details')
                .select('findings,source,total_findings,source_data,created_at', { count: 'exact' })
                .eq('organization_id', organization_id)
                .limit(100)
                .order('created_at', { ascending: false });

            const { data: assets, error, count } = await supabaseQuery;
            console.log(`Supabase query completed with ${assets?.length || 0} results`);

            if (error) {
                console.error('Supabase error:', error);
                return {
                    found: false,
                    error: true,
                    message: `Database error: ${error.message}. Please try again or contact support.`,
                    organization_id,
                    toolname: 'OrganizationAssets'
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
                    source_context: sourceSummary,
                    created_at: a.created_at
                };
            }) : [];

            console.log(`Formatted ${summaryResults.length} assets for AI analysis`);

            const result = {
                organization_id,
                total_count: count || 0,
                results: summaryResults,
                toolname: 'OrganizationAssets'
            };

            console.log(`OrganizationAssets: Found ${result.total_count} assets`);
            return result;

        } catch (error) {
            console.error('Unexpected error in OrganizationAssets:', error);
            return {
                found: false,
                error: true,
                message: `Unexpected error occurred: ${error.message}`,
                organization_id,
                toolname: 'OrganizationAssets'
            };
        }
    },
});


const FrameworkTool = tool({
    description: `Retrieves organization compliance framework details and standards.
    Use this tool when users ask about:
    - Compliance frameworks (SOC 2, ISO 27001, HIPAA, PCI-DSS, etc.)
    - Regulatory compliance status
    - Framework adherence or implementation
    - Compliance gaps or requirements
    - Security standards and policies`,

    parameters: z.object({
        organization_id: z.string().describe("The organization ID to query"),
    }),

    execute: async ({ organization_id }) => {
        console.log(`Framework tool called | org=${organization_id}`);
        console.log(`Querying Supabase for organization_id=${organization_id}`);

        try {
            let supabaseQuery = supabase
                .from('organization_frameworks')
                .select('*')
                .eq('organization_id', organization_id)
                .limit(100);

            const { data: frameworks, error, count } = await supabaseQuery;
            console.log(`Supabase query completed with ${frameworks?.length || 0} results`);

            if (error) {
                console.error('Supabase error:', error);
                return {
                    found: false,
                    error: true,
                    message: `Database error: ${error.message}. Please try again or contact support.`,
                    organization_id,
                    toolname: 'framework'
                };
            }

            console.log(`Processing ${frameworks?.length || 0} frameworks for response formatting`);

            const result = {
                organization_id,
                total_count: count || 0,
                results: frameworks || [],
                toolname: 'framework'
            };

            console.log(`Framework: Found ${result.total_count} frameworks`);
            return result;

        } catch (error) {
            console.error('Unexpected error in Framework:', error);
            return {
                found: false,
                error: true,
                message: `Unexpected error occurred: ${error.message}`,
                organization_id,
                toolname: 'framework'
            };
        }
    },
});


const OpenaiTool = tool({
    description: `Analyzes security data and generates professional reports and insights.
    IMPORTANT: This tool should ONLY be called AFTER retrieving data from OrganizationAssets or Framework tools.
    It takes the raw data from those tools and produces a conversational, analyst-quality response.
    The AI will automatically determine the report type and format based on the data provided.`,

    parameters: z.object({
        prompt: z.any().describe("The complete result object from OrganizationAssets or Framework tools. Must include: results, total_count, organization_id, and toolname fields.")
    }),

    execute: async ({ prompt }) => {
        console.log(`OpenAI analysis tool called`);

        let processedData;
        if (typeof prompt === 'string') {
            try {
                processedData = JSON.parse(prompt);
            } catch (e) {
                processedData = { data: prompt };
            }
        } else {
            processedData = prompt;
        }

        const totalCount = processedData?.total_count || 0;
        const results = processedData?.results || [];
        const sourceTool = processedData?.toolname || 'unknown';
        const organizationId = processedData?.organization_id || 'N/A';

        console.log(`Processing ${results?.length || 0} items through AI | Source: ${sourceTool}`);

        try {
            // Determine context type based on source tool
            const contextType = sourceTool === 'framework' ? 'compliance frameworks' : 'security findings and vulnerabilities';

            const analysisPrompt = `You are a professional Cloud Security and Compliance Consultant AI assistant specializing in AWS, Azure, and GCP infrastructure security.

Analyze the following ${contextType} data to provide a conversational, insightful response.

### CORE INSTRUCTIONS:
1. **Context Awareness**: This data comes from the '${sourceTool}' data source
2. **Focus**: ${sourceTool === 'framework' ? 'Analyze compliance frameworks, gaps, and recommendations' : 'Focus on vulnerabilities, findings, their severities, and security implications'}
3. **Table Format**: Use markdown tables when data involves comparisons, listings, or time-based analysis
4. **Professional Tone**: Write as a consultant providing actionable insights

Organization ID: ${organizationId}
Total Items: ${totalCount}

Data for Analysis:
${JSON.stringify(results, null, 2)}

Expected Response Content:
1. A brief professional overview of the current security posture.
2. A detailed analysis of the vulnerabilities found (the 'mean vulnerability' context).
3. If keywords suggest comparison or listing, provide a clear COMPARISON TABLE.
4. Highlight critical/high-risk items .
5. Provide actionable, specific recommendations (cloud-native where applicable)

Use a professional consultant tone. Avoid unnecessary preambles.`;

            console.log(`Calling OpenAI for analysis...`);

            const aiResult = await generateText({
                model,
                prompt: analysisPrompt,
                temperature: 0.7,
                maxTokens: 2000,
            });

            const conversationalResponse = aiResult.text || "Unable to generate analysis at this time.";

            console.log(`AI analysis completed (${conversationalResponse.length} characters)`);

            return {
                success: true,
                analysis_complete: true,
                conversational_response: conversationalResponse,
                processed_by: sourceTool,
                metadata: {
                    total_items: totalCount,
                    organization_id: organizationId,
                    source_tool: sourceTool,
                    processedAt: new Date().toISOString()
                }
            };

        } catch (error) {
            console.error('Error in OpenAI analysis:', error);

            return {
                success: false,
                error: true,
                conversational_response: `I found ${totalCount} items but encountered an error during analysis. Please try again.`,
                error_message: error.message,
            };
        }
    },
});

const chatTools = {
    OrganizationAssets: OrganizationAssetsTool,
    openai: OpenaiTool,
    framework: FrameworkTool
};

module.exports = {
    chatTools
};