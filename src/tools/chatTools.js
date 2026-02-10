const { tool } = require('ai');
const { z } = require('zod');
const { supabase } = require('../config/supabase');

const OrganizationAssetsTool = tool({
    description: "Get a list of organization assets from Supabase database. This is the first step in retrieving asset information.",

    parameters: z.object({
        query: z.string().describe("The user's query about assets"),
        organization_id: z.string().describe("The organization ID to query"),
        page: z.number().optional().default(1).describe("Page number for pagination (default: 1)"),
        date_filter: z.string().optional().describe("Optional date filter for assets (format: YYYY-MM-DD)"),
        toolname: z.string().optional().default('openia').describe("The tool name to use for processing (default: openia)")
    }),

    execute: async ({ organization_id, query, page, date_filter, toolname }) => {
        console.log(
            `📊 OrganizationAssets tool called | org=${organization_id} | query="${query}" | page=${page} | date=${date_filter || 'none'} | toolname=${toolname}`
        );

        const validPage = (typeof page === 'number' && !isNaN(page) && page > 0) ? page : 1;
        const pageSize = 10;
        const from = (validPage - 1) * pageSize;
        const to = from + pageSize - 1;

        console.log(`🔍 Querying Supabase: range(${from}, ${to}) for org=${organization_id}`);

        try {
            let supabaseQuery = supabase
                .from('scan_details')
                .select('*', { count: 'exact' })
                .eq('organization_id', organization_id)
                .order('created_at', { ascending: false })
                .range(from, to);

            if (date_filter) {
                console.log(`📅 Applying date filter: >= ${date_filter}`);
                supabaseQuery = supabaseQuery.gte('created_at', date_filter);
            }

            const { data: assets, error, count } = await supabaseQuery;

            if (error) {
                console.error('❌ Supabase error:', error);
                return {
                    found: false,
                    error: true,
                    message: `Database error: ${error.message}. Please try again or contact support.`,
                    organization_id,
                    page: validPage,
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
                page: validPage,
                toolname: toolname || 'openia',
                user_query: query, // Pass original query for context
                results: summaryResults,
                answer: assets && assets.length > 0
                    ? `Found ${assets.length} assets on page ${validPage} (total ${count} assets). NOW IMMEDIATELY CALL the 'openi' tool with tool='${toolname || 'openia'}' and pass this complete data along with the user's original query for intelligent analysis.`
                    : `No assets found for organization ${organization_id} with the given criteria. You can now respond to the user with this information.`
            };

            console.log(`✅ OrganizationAssets: Found ${result.count} assets (total: ${count})`);

            return result;

        } catch (error) {
            console.error('❌ Unexpected error in OrganizationAssets:', error);
            return {
                found: false,
                error: true,
                message: `Unexpected error occurred: ${error.message}`,
                organization_id,
                page: validPage,
                toolname
            };
        }
    },
});

const OpeniTool = tool({
    description: "Analyze and process asset data to provide intelligent insights and conversational responses based on the user's query.",

    parameters: z.object({
        tool: z.string().describe("The sub-tool name (e.g., 'openia')"),
        data: z.any().describe("The complete data object from OrganizationAssets tool")
    }),

    execute: async ({ tool, data }) => {
        console.log(`🔧 openi tool called | sub-tool=${tool}`);
        
        const assetCount = data?.results?.length || 0;
        const totalCount = data?.total_count || 0;
        const page = data?.page || 1;
        const organization_id = data?.organization_id || 'unknown';
        const userQuery = data?.user_query || '';
        const results = data?.results || [];

        console.log(`✅ Analyzing: ${assetCount} assets (page ${page}, total ${totalCount})`);

        // **ANALYSIS LOGIC**
        
        // 1. Group by source
        const sourceGroups = {};
        results.forEach(asset => {
            const source = asset.source || 'Unknown';
            if (!sourceGroups[source]) {
                sourceGroups[source] = {
                    count: 0,
                    totalFindings: 0,
                    assets: []
                };
            }
            sourceGroups[source].count++;
            sourceGroups[source].totalFindings += asset.findings_count || 0;
            sourceGroups[source].assets.push(asset);
        });

        // 2. Calculate statistics
        const totalFindings = results.reduce((sum, asset) => sum + (asset.findings_count || 0), 0);
        const avgFindings = assetCount > 0 ? (totalFindings / assetCount).toFixed(1) : 0;
        
        // 3. Find high-risk assets (more than 30 findings)
        const highRiskAssets = results.filter(asset => asset.findings_count > 30);
        
        // 4. Get most recent scan
        const mostRecent = results.length > 0 ? results[0].created_at : null;
        
        // 5. Get unique sources
        const sources = Object.keys(sourceGroups);
        const topSource = sources.reduce((max, source) => 
            sourceGroups[source].count > (sourceGroups[max]?.count || 0) ? source : max
        , sources[0]);

        // **BUILD CONVERSATIONAL RESPONSE**
        let analysis = '';

        // Header
        analysis += `I found **${assetCount} assets** on page ${page} (out of ${totalCount} total assets) for your organization.\n\n`;

        // Quick insights
        analysis += `### 📊 Quick Insights:\n`;
        analysis += `- **Total Findings**: ${totalFindings} security findings across all assets\n`;
        analysis += `- **Average Findings per Asset**: ${avgFindings}\n`;
        analysis += `- **Asset Sources**: ${sources.length} different sources (${sources.join(', ')})\n`;
        if (topSource) {
            analysis += `- **Most Common Source**: ${topSource} (${sourceGroups[topSource].count} assets)\n`;
        }
        if (mostRecent) {
            const recentDate = new Date(mostRecent).toLocaleDateString();
            analysis += `- **Most Recent Scan**: ${recentDate}\n`;
        }
        analysis += `\n`;

        // High-risk alert
        if (highRiskAssets.length > 0) {
            analysis += `### ⚠️ High-Risk Assets:\n`;
            analysis += `Found **${highRiskAssets.length} assets** with more than 30 findings that require immediate attention:\n`;
            highRiskAssets.forEach(asset => {
                const shortId = asset.id.substring(0, 8) + '...';
                analysis += `- **${asset.source}** (${shortId}): ${asset.findings_count} findings\n`;
            });
            analysis += `\n`;
        }

        // Source breakdown
        if (sources.length > 1) {
            analysis += `### 🔍 Breakdown by Source:\n`;
            Object.keys(sourceGroups).sort((a, b) => 
                sourceGroups[b].count - sourceGroups[a].count
            ).forEach(source => {
                const group = sourceGroups[source];
                analysis += `- **${source}**: ${group.count} assets, ${group.totalFindings} findings\n`;
            });
            analysis += `\n`;
        }

        // Detailed table
        analysis += `### 📋 Detailed Asset List:\n\n`;
        analysis += `| ID | Source | Created | Findings |\n`;
        analysis += `|----|--------|---------|----------|\n`;
        results.forEach(asset => {
            const shortId = asset.id.substring(0, 8) + '...';
            const created = new Date(asset.created_at).toLocaleDateString();
            analysis += `| ${shortId} | ${asset.source} | ${created} | ${asset.findings_count} |\n`;
        });
        analysis += `\n`;

        // Pagination info
        const totalPages = Math.ceil(totalCount / 10);
        if (totalPages > 1) {
            analysis += `---\n`;
            analysis += `📄 **Page ${page} of ${totalPages}** | `;
            if (page < totalPages) {
                analysis += `There are ${totalCount - (page * 10)} more assets available. `;
            }
            analysis += `\n\n`;
        }

        // Call to action
        if (highRiskAssets.length > 0) {
            analysis += `💡 **Recommendation**: Focus on the ${highRiskAssets.length} high-risk assets first to reduce your security exposure.\n`;
        }

        const result = {
            success: true,
            analysis_complete: true,
            conversational_response: analysis,
            metadata: {
                assets_on_page: assetCount,
                total_assets: totalCount,
                current_page: page,
                total_pages: totalPages,
                organization_id: organization_id,
                total_findings: totalFindings,
                avg_findings: parseFloat(avgFindings),
                high_risk_count: highRiskAssets.length,
                sources: sources,
                top_source: topSource,
                processed_by: tool,
                processedAt: new Date().toISOString()
            }
        };

        console.log(`✅ openi analysis completed | ${assetCount} assets analyzed | ${totalFindings} findings`);
        return result;
    },
});

module.exports = { OrganizationAssetsTool, OpeniTool };