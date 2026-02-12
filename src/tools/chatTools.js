const { tool } = require('ai');
const { z } = require('zod');
const { supabase } = require('../config/supabase');
const { openai } = require('@ai-sdk/openai');
const { generateText } = require('ai');

const model = openai('gpt-4o-mini', {
    structuredOutputs: false
});

const OrganizationAssetsTool = tool({
    description: `Retrieves security findings, source_data,total_findings,source, and asset details from the database for an organization, including cloud assets (AWS/Azure/GCP), infrastructure issues, recent security assessments, and comparison of findings over time`,

    parameters: z.object({
        organization_id: z.string().describe("The organization ID to query"),
    }),

    execute: async ({ organization_id }) => {
        console.log(`OrganizationAssets tool called | org=${organization_id}`);
        console.log(`Querying  for organization_id=${organization_id}`);

        try {
            const tenDaysAgo = new Date();
            tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

            const supabaseQuery = supabase
                .from('scan_details')
                .select('findings,source,source_data,created_at')
                .order('created_at', { ascending: false })
                .limit(50)

            const { data: assets, error } = await supabaseQuery;
            console.log(` query completed with ${assets?.length || 0} results`);

            if (error) {
                console.error(' error:', error);
                return {
                    found: false,
                    error: true,
                    message: `Database error: ${error.message}. Please try again or contact support.`,
                    organization_id,
                    toolname: 'OrganizationAssets'
                };
            }

            console.log(`Processing ${assets?.length || 0} assets for response formatting`);

            const summarizeFindings = (arr) => {
                if (!Array.isArray(arr)) return [];
                return arr.slice(0, 40).map(f => ({
                    id: f.id || f.findings_id || 'N/A',
                    title: f.title || f.name || 'No Title',
                    severity: f.severity || f.priority || 'Unknown',
                    description: (f.description || f.desc || '').substring(0, 150),
                    resource: f.resource_id || (f.resource?.name || 'Unknown'),
                    start_time: f.start_time || f.createdAt || f.time_dt || null,
                    remediation: f.remediation?.desc || f.remediation || null,
                    category: f.category || f.type_name || null,
                    status: f.status || f.workflowState || 'Unknown',
                }));
            };

            const summarizeSourceData = (arr) => {
                if (!Array.isArray(arr)) return [];
                return arr.slice(0, 40).map(s => ({
                    id: s.id || s.arn || 'N/A',
                    type: s.type || s.resource_type || 'Unknown',
                    region: s.region || 'Unknown',
                    status: s.status || s.recordState || 'N/A',
                    last_updated: s.last_updated || s.updatedAt || null,
                    name: s.name || s.resource_name_full || null,
                    account: s.account || s.awsAccountId || null,
                    description: s.description || null,
                    source: s.source || null
                }));
            };

            const summaryResults = (assets || [])
                .slice(0, 40) 
                .map(a => {
                    const findingsSummary = summarizeFindings(a.findings);
                    const sourceDataSummary = summarizeSourceData(a.source_data);

                    return {
                        id: a.id,
                        source: a.source || 'Unknown',
                        created_at: a.created_at,
                        findings_count: findingsSummary.length,
                        findings: findingsSummary,
                        source_data_count: sourceDataSummary.length,
                        source_data: sourceDataSummary
                    };
                });


            console.log(
                `Formatted ${JSON.stringify(summaryResults)} assets for AI analysis`
            );
            const result = {
                organization_id,
                total_count: assets.length || 0,
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
        console.log(`Querying  for organization_id=${organization_id}`);

        try {
            let supabaseQuery = supabase
                .from('organization_frameworks')
                .select('*,frameworks(id,name)')
                .eq('organization_id', organization_id)

            const { data: frameworks, error, count } = await supabaseQuery;
            console.log(` query completed with ${frameworks?.length || 0} results`);

            if (error) {
                console.error(' error:', error);
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


const RiskTool = tool({
    description: `Retrieves organization risk details and standards.
    Use this tool when users ask about:
    - risk Posture`,

    parameters: z.object({
        organization_id: z.string().describe("The organization ID to query"),
    }),

    execute: async ({ organization_id }) => {
        console.log(`Risk tool called | org=${organization_id}`);
        console.log(`Querying  for organization_id=${organization_id}`);

        try {
            let supabaseQuery = supabase
                .from('organization_risks')
                .select('*,risks(id,risk)')
                .eq('organization_id', organization_id)
                .limit(10)

            const { data: risks, error, count } = await supabaseQuery;
            console.log(` query completed with ${risks?.length || 0} results`);

            if (error) {
                console.error(' error:', error);
                return {
                    found: false,
                    error: true,
                    message: `Database error: ${error.message}. Please try again or contact support.`,
                    organization_id,
                    toolname: 'risk'
                };
            }

            console.log(`Processing ${risks?.length || 0} risk for response formatting`);

            const result = {
                organization_id,
                total_count: count || 0,
                results: risks || [],
                toolname: 'risk'
            };

            console.log(`Risk: Found ${result.total_count} risk`);
            return result;

        } catch (error) {
            console.error('Unexpected error in risk:', error);
            return {
                found: false,
                error: true,
                message: `Unexpected error occurred: ${error.message}`,
                organization_id,
                toolname: 'risk'
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

            const analysisPrompt = `
You are a Senior Cloud Security Consultant.

Generate a PROFESSIONAL LAST 10 DAYS SECURITY REPORT.

### Report Requirements:
- Executive Summary
- Total Findings in Last 10 Days
- Trend Observations
- High Risk Areas
- Source-wise Breakdown (use table)
- Actionable Remediation Plan
- Risk Level Assessment

Total Scans (Last 10 Days): ${totalCount}

Security Data:
${JSON.stringify(results, null, 2)}

Write as a board-level security report.
Avoid generic text.
`;

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
    framework: FrameworkTool,
    risk: RiskTool
};

module.exports = {
    chatTools
};