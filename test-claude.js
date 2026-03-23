const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config();

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

async function testModel(modelName) {
    try {
        console.log(`Testing model: ${modelName}`);
        const response = await anthropic.messages.create({
            model: modelName,
            max_tokens: 100,
            messages: [{
                role: 'user',
                content: 'Hello! Please respond with "Model working: [model name]"'
            }]
        });
        
        console.log(`✅ ${modelName}: ${response.content[0].text}`);
        return true;
    } catch (error) {
        console.log(`❌ ${modelName}: ${error.message}`);
        return false;
    }
}

async function testAllModels() {
    console.log('🎯 Testing Claude API models...\n');
    
    const models = [
        'claude-3-5-sonnet-20241022',
        'claude-3-5-sonnet-20250116', 
        'claude-3-haiku-20240307',
        'claude-3-5-haiku-20241022',
        'claude-3-opus-20240229',
        'claude-3-sonnet-20240229'
    ];
    
    for (const model of models) {
        await testModel(model);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limiting
    }
}

testAllModels().then(() => {
    console.log('\n🏁 Model testing complete!');
}).catch(console.error);