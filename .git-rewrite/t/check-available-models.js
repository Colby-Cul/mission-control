const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config();

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

// Let's try the current model names from Anthropic's documentation
const currentModels = [
    'claude-3-5-sonnet-20241022',
    'claude-3-5-haiku-20241022', 
    'claude-3-opus-20240229',
    'claude-3-sonnet-20240229',
    'claude-3-haiku-20240307',
    // Try some potential newer versions
    'claude-3-5-sonnet-latest',
    'claude-3-5-haiku-latest',
    'claude-3-5-sonnet',
    'claude-3-5-haiku',
    'claude-3-opus',
    'claude-3-sonnet',
    'claude-3-haiku'
];

async function testModel(modelName) {
    try {
        console.log(`Testing: ${modelName}`);
        const response = await anthropic.messages.create({
            model: modelName,
            max_tokens: 20,
            messages: [{
                role: 'user',
                content: 'Say "OK" if this works'
            }]
        });
        
        console.log(`✅ SUCCESS: ${modelName}`);
        console.log(`   Response: ${response.content[0].text}`);
        console.log(`   Usage: ${JSON.stringify(response.usage)}\n`);
        return modelName;
    } catch (error) {
        if (error.status === 404) {
            console.log(`❌ NOT FOUND: ${modelName}`);
        } else {
            console.log(`❌ ERROR: ${modelName} - ${error.message}`);
        }
        return null;
    }
}

async function findWorkingModels() {
    console.log('🔍 Checking available Claude models...\n');
    
    const workingModels = [];
    
    for (const model of currentModels) {
        const result = await testModel(model);
        if (result) {
            workingModels.push(result);
        }
        await new Promise(resolve => setTimeout(resolve, 500)); // Rate limiting
    }
    
    console.log('\n📋 WORKING MODELS:');
    if (workingModels.length > 0) {
        workingModels.forEach(model => console.log(`  ✅ ${model}`));
        
        console.log('\n🎯 Recommended model mapping:');
        const best = workingModels[0]; // Use first working model
        console.log(`  claude-opus: "${best}"`);
        console.log(`  claude-sonnet: "${best}"`); 
        console.log(`  claude-haiku: "${best}"`);
    } else {
        console.log('  ❌ No working models found');
        console.log('\n💡 This could mean:');
        console.log('  1. API key needs activation');
        console.log('  2. Different model names are used');
        console.log('  3. Account needs billing setup');
    }
}

findWorkingModels();