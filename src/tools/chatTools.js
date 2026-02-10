const { tool } = require('ai');
const { z } = require('zod');

const OrganizationAssetsTool = tool({
    description: "Get a list of organization assets from table analysis",

    parameters: z.object({
        query: z.string().describe("The question the user is asking about organization assets"),
        organization_id: z.string().describe("The user pass organization_id field ")
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

module.exports = { OrganizationAssetsTool };