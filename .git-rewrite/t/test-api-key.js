const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config();

console.log('🔑 Testing Claude API key validity...');
console.log('API Key (first 20 chars):', process.env.ANTHROPIC_API_KEY.substring(0, 20) + '...');

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

async function testAPIKey() {
    try {
        // Try with the default model (should be claude-3-sonnet-20240229 or similar)
        const response = await anthropic.messages.create({
            model: 'claude-3-sonnet-20240229',  // Try the base model
            max_tokens: 50,
            messages: [{
                role: 'user',
                content: 'Hello, Claude! Just testing the connection.'
            }]
        });
        
        console.log('✅ API Key is working!');
        console.log('Response:', response.content[0].text);
        console.log('Model used:', response.model);
        console.log('Usage:', response.usage);
        
    } catch (error) {
        console.log('❌ API Key test failed:');
        console.log('Error type:', error.name);
        console.log('Error message:', error.message);
        console.log('Status:', error.status);
        
        if (error.message.includes('not_found_error')) {
            console.log('\n🤔 Possible solutions:');
            console.log('1. Check if your account has access to Claude models');
            console.log('2. Verify the API key is correct');
            console.log('3. Check if account has sufficient credits');
        }
    }
}

testAPIKey();