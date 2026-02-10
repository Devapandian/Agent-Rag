const { tool } = require('ai');
const { z } = require('zod');

const OrganizationAssetsTool = tool({
    description: "Get a list of organization assets from table analysis",

    parameters: z.object({
        query: z.string().describe("The query about assets"),
        organization_id: z.string().describe("The organization ID")
    }),

    execute: async ({ organization_id, query }) => {
        console.log(
            `OrganizationAssets tool called | org=${organization_id} | query=${query}`
        );

        const assets = [
            { id: 'as-001', name: 'Web Server', type: 'Compute', status: 'Active', criticality: 'High' },
            { id: 'as-002', name: 'Customer DB', type: 'Database', status: 'Active', criticality: 'Critical' },
            { id: 'as-003', name: 'Internal Wiki', type: 'Documentation', status: 'Maintenance', criticality: 'Low' },
            { id: 'as-004', name: 'Payment Gateway', type: 'Network', status: 'Active', criticality: 'Critical' },
            { id: 'as-005', name: 'File Storage', type: 'Storage', status: 'Active', criticality: 'Medium' },
        ];

        return {
            found: true,
            organization_id,
            count: assets.length,
            results: assets,
            answer: `I found ${assets.length} assets for organization ${organization_id}.`
        };
    },
});

const OpeniTool = tool({
    description: "Submit data for further AI processing via OpenI",

    parameters: z.object({
        tool: z.string().describe("The sub-tool name, e.g., 'openia'"),
        data: z.any().describe("The data to be processed")
    }),

    execute: async ({ tool, data }) => {
        console.log(`openi tool called | tool=${tool}`);

        return {
            success: true,
            message: `Data processed successfully by ${tool}.`,
            processedAt: new Date().toISOString()
        };
    },
});

module.exports = { OrganizationAssetsTool, OpeniTool };
