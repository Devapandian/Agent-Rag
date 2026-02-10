const { isOrganizationAssetsTool } = require('./src/tools/chatTools');

async function testTool() {
    console.log("Testing isOrganizationAssetsTool...");
    try {
        const result = await isOrganizationAssetsTool.execute({
            organization_id: "org-123",
            query: "What are my high criticality assets?"
        });
        console.log("Result:", JSON.stringify(result, null, 2));

        if (result.found && result.query === "What are my high criticality assets?" && result.answer) {
            console.log("✅ Verification Successful: Tool returned expected fields.");
        } else {
            console.log("❌ Verification Failed: Missing or incorrect fields in result.");
        }
    } catch (error) {
        console.error("❌ Verification Failed: Error during tool execution.", error);
    }
}

testTool();
