const { tool } = require('ai');
const { z } = require('zod');
const { supabase } = require('../config/supabase');

const OrganizationAssetsTool = tool({
    description: "Get a list of organization assets from Supabase database. This is the first step in retrieving asset information.",

    parameters: z.object({
        query: z.string().describe("The user's query about assets"),
        organization_id: z.string().describe("The organization ID to query"),
        page: z.number().optional().default(1).describe("Page number for pagination (default: 1)"),
        date_filter: z.string().optional().describe("Optional date filter for assets (format: YYYY-MM-DD)")
    }),

    execute: async ({ organization_id, query, page, date_filter }) => {
        console.log(
            `📊 OrganizationAssets tool called | org=${organization_id} | query="${query}" | page=${page} | date=${date_filter || 'none'}`
        );

        // Validate and sanitize page number
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
                    page: validPage
                };
            }

            // Process and summarize results
            const summaryResults = assets ? assets.map(a => ({
                id: a.id,
                source: a.source || 'Unknown',
                created_at: a.created_at,
                findings_count: a.findings ? a.findings.length : 0,
                // Add any other relevant fields you want to display
            })) : [];

            const result = {
                found: assets && assets.length > 0,
                organization_id,
                count: assets ? assets.length : 0,
                total_count: count || 0,
                page: validPage,
                results: summaryResults,
                answer: assets && assets.length > 0
                    ? `Found ${assets.length} assets on page ${validPage} (total ${count} assets). NOW IMMEDIATELY CALL the 'openi' tool with this complete data object before responding to the user. Do not skip this step.`
                    : `No assets found for organization ${organization_id} with the given criteria. You can now respond to the user with this information.`
            };

            console.log(`✅ OrganizationAssets: Found ${result.count} assets (total: ${count})`);
            console.log(`📦 Result size: ${JSON.stringify(result).length} characters`);

            return result;

        } catch (error) {
            console.error('❌ Unexpected error in OrganizationAssets:', error);
            return {
                found: false,
                error: true,
                message: `Unexpected error occurred: ${error.message}`,
                organization_id,
                page: validPage
            };
        }
    },
});

const OpeniTool = tool({
    description: "Submit data for further AI processing via OpenI. This is the second mandatory step after retrieving assets.",

    parameters: z.object({
        tool: z.string().describe("The sub-tool name (use 'openia')"),
        data: z.any().describe("The complete data object from OrganizationAssets tool")
    }),

    execute: async ({ tool, data }) => {
        console.log(`🔧 openi tool called | sub-tool=${tool}`);
        
        // Log data preview
        const dataString = JSON.stringify(data);
        const preview = dataString.length > 500 
            ? dataString.substring(0, 500) + '...' 
            : dataString;
        console.log(`📥 Data received (${dataString.length} chars):`, preview);

        // Extract metadata for confirmation
        const assetCount = data?.results?.length || data?.count || 0;
        const totalCount = data?.total_count || 0;
        const page = data?.page || 1;
        
        console.log(`✅ Processing: ${assetCount} assets (page ${page}, total ${totalCount})`);

        // Simulate processing (you can add actual OpenI API call here)
        const result = {
            success: true,
            message: `Data processing complete. ${assetCount} assets have been processed. You can NOW present these assets to the user in a well-formatted Markdown table.`,
            ready_to_respond: true,
            asset_data: data, // Include full data so AI can reference it
            metadata: {
                assets_on_page: assetCount,
                total_assets: totalCount,
                current_page: page,
                processed_by: tool,
                processedAt: new Date().toISOString()
            }
        };

        console.log(`✅ openi tool completed successfully`);
        return result;
    },
});

module.exports = { OrganizationAssetsTool, OpeniTool };