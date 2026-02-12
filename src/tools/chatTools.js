const { tool } = require('ai');
const { z } = require('zod');
const { supabase } = require('../config/supabase');

const OrganizationAssetsTool = tool({
    description: `Retrieves security findings, source_data,total_findings,source, and asset details from the database for an organization, including cloud assets (AWS/Azure/GCP), infrastructure issues, recent security assessments, and comparison of findings over time`,

    parameters: z.object({
        organization_id: z.string().describe("The organization ID to query"),
    }),

    execute: async ({ organization_id, query = '' }) => {
        console.log(`OrganizationAssets tool called | org=${organization_id} | query="${query}"`);
        console.log(`Querying for organization_id=${organization_id}`);

        try {
            const tenDaysAgo = new Date();
            tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

            const supabaseQuery = supabase
                .from('scan_details')
                .select('findings,source,source_data,created_at')
                .eq('organization_id', organization_id)
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
                .slice(0, 15) // Limit scans for AI context to save time
                .map(a => {
                    let filteredFindings = a.findings;

                    if (query && Array.isArray(filteredFindings)) {
                        const searchLower = query.toLowerCase();
                        filteredFindings = filteredFindings.filter(f =>
                            (f.title || '').toLowerCase().includes(searchLower) ||
                            (f.description || '').toLowerCase().includes(searchLower) ||
                            (f.severity || '').toLowerCase().includes(searchLower) ||
                            (f.category || '').toLowerCase().includes(searchLower)
                        );
                    }

                    const counts = { critical: 0, high: 0, medium: 0, low: 0, unknown: 0 };
                    if (Array.isArray(filteredFindings)) {
                        filteredFindings.forEach(f => {
                            const sev = (f.severity || 'unknown').toLowerCase();
                            if (sev.includes('critical')) counts.critical++;
                            else if (sev.includes('high')) counts.high++;
                            else if (sev.includes('medium')) counts.medium++;
                            else if (sev.includes('low')) counts.low++;
                            else counts.unknown++;
                        });
                    }

                    const findingsToSummarize = Array.isArray(filteredFindings) ? filteredFindings.slice(0, 5) : [];
                    const sourceDataToSummarize = Array.isArray(a.source_data) ? a.source_data.slice(0, 5) : [];

                    const findingsSummary = summarizeFindings(findingsToSummarize);
                    const sourceDataSummary = summarizeSourceData(sourceDataToSummarize);

                    return {
                        id: a.id,
                        source: a.source || 'Unknown',
                        summary_counts: counts,
                        findings_count: Array.isArray(filteredFindings) ? filteredFindings.length : 0,
                        top_findings: findingsSummary,
                        source_data_count: Array.isArray(a.source_data) ? a.source_data.length : 0,
                        source_data_sample: sourceDataSummary
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
    description: "Retrieves organization compliance framework details, regulatory status, adherence, gaps, and security standards (e.g., SOC 2, ISO 27001, HIPAA, PCI-DSS).",

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
    description: "Retrieves organization risk details and standards, including risk posture.",

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

const chatTools = {
    OrganizationAssets: OrganizationAssetsTool,
    framework: FrameworkTool,
    risk: RiskTool
};

// const OpenaiTool = tool({
//     description: `Analyzes security data and generates professional reports and insights.
//     IMPORTANT: This tool should ONLY be called AFTER retrieving data from OrganizationAssets or Framework tools.
//     It takes the raw data from those tools and produces a conversational, analyst-quality response.
//     The AI will automatically determine the report type and format based on the data provided.`,

//     parameters: z.object({
//         prompt: z.any().describe("The complete result object from OrganizationAssets or Framework tools."),
//         user_query: z.string().optional().describe("The original user question to focus the summary/report on.")
//     }),

//     execute: async ({ prompt, user_query = '' }) => {
//         console.log(`OpenAI analysis tool called | query context: "${user_query}"`);

//         let processedData;
//         if (typeof prompt === 'string') {
//             try {
//                 processedData = JSON.parse(prompt);
//             } catch (e) {
//                 processedData = { data: prompt };
//             }
//         } else {
//             processedData = prompt;
//         }

//         const totalCount = processedData?.total_count || 0;
//         const results = processedData?.results || [];
//         const sourceTool = processedData?.toolname || 'unknown';
//         const organizationId = processedData?.organization_id || 'N/A';

//         console.log(`Processing ${results?.length || 0} items through AI | Source: ${sourceTool}`);

//         try {

//             const analysisPrompt = `
// You are a Senior Cloud Security Consultant.

// Directly answer the user's question or generate a professional summary based on the provided security context.

// ### CONTEXT:
// - Organization ID: ${organizationId}
// - Source Tool: ${sourceTool}
// - Scans Analyzed: ${totalCount}
// - User Question: "${user_query}"

// ### INSTRUCTIONS:
// - **SPEED & FOCUS**: The user needs a quick, relevant answer. Use the aggregated "summary_counts" to provide a high-level overview immediately.
// - **CLEAN OUTPUT**: DO NOT include technical IDs (ARNs, findings IDs, or internal record IDs).
// - If the user asked for a "report", structure it with an Executive Summary, a Table of Severity Counts, top findings, and Actionable Remediation.
// - Use professional, punchy analyst tone. No fluff.

// ### SECURITY DATA:
// ${JSON.stringify(results, null, 2)}

// Provide your analysis in Markdown.
// `;

//             console.log(`Calling OpenAI for analysis...`);

//             const aiResult = await generateText({
//                 model,
//                 prompt: analysisPrompt,
//                 temperature: 0.7,
//                 maxTokens: 2000,
//             });

//             const conversationalResponse = aiResult.text || "Unable to generate analysis at this time.";

//             console.log(`AI analysis completed (${conversationalResponse.length} characters)`);

//             return {
//                 success: true,
//                 analysis_complete: true,
//                 conversational_response: conversationalResponse,
//                 processed_by: sourceTool,
//                 metadata: {
//                     total_items: totalCount,
//                     organization_id: organizationId,
//                     source_tool: sourceTool,
//                     processedAt: new Date().toISOString()
//                 }
//             };

//         } catch (error) {
//             console.error('Error in OpenAI analysis:', error);

//             return {
//                 success: false,
//                 error: true,
//                 conversational_response: `I found ${totalCount} items but encountered an error during analysis. Please try again.`,
//                 error_message: error.message,
//             };
//         }
//     },
// });



module.exports = {
    chatTools
};