const { openai } = require('@ai-sdk/openai');
const { generateText, tool } = require('ai');
const { z } = require('zod');
require('dotenv').config();

const model = openai('gpt-4o-mini');

async function test() {
    console.log('Starting SDK test...');
    const result = await generateText({
        model,
        experimental_maxSteps: 5,
        tools: {
            getWeather: tool({
                description: 'Get weather',
                parameters: z.object({ city: z.string() }),
                execute: async ({ city }) => {
                    console.log(`Tool called for ${city}`);
                    return `It's sunny in ${city}`;
                }
            })
        },
        prompt: 'What is the weather in London? Call the tool and then tell me.'
    });

    console.log('Finish Reason:', result.finishReason);
    console.log('Text:', result.text);
    console.log('Steps:', result.steps ? result.steps.length : 'undefined');
}

test().catch(console.error);
