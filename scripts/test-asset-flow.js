const { prompt } = require('../src/controllers/chatController');

async function testFlow() {
    const req = {
        body: {
            "query": "Show my assets details",
            "toolname": "OrganizationAssets",
            "organization_id": "f37ae534-f6ab-4d9f-b333-090a4e9bd3ac"
        }
    };

    const res = {
        status: function (code) {
            this.statusCode = code;
            return this;
        },
        json: function (data) {
            console.log('Response:', JSON.stringify(data, null, 2));
        }
    };

    console.log('Starting Asset Flow Test...');
    await prompt(req, res);
}

testFlow();
