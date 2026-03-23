const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config();

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

async function checkAccountStatus() {
    console.log('🔍 Checking account status and API key validity...');
    console.log('API Key format:', process.env.ANTHROPIC_API_KEY.substring(0, 25) + '...');
    
    try {
        // Try the most basic possible request with a very simple model name
        console.log('\n1️⃣ Testing with minimal request...');
        
        const response = await anthropic.messages.create({
            model: 'claude-3-sonnet-20240229',
            max_tokens: 10,
            messages: [{
                role: 'user',
                content: 'Hi'
            }]
        });
        
        console.log('✅ Success! Model is working.');
        console.log('Response:', response.content[0].text);
        
    } catch (error) {
        console.log('❌ Request failed with details:');
        console.log('Status Code:', error.status);
        console.log('Error Type:', error.error?.type);
        console.log('Error Message:', error.error?.message);
        console.log('Full Error:', JSON.stringify(error, null, 2));
        
        if (error.status === 401) {
            console.log('\n🚨 AUTHENTICATION ERROR:');
            console.log('- API key is invalid or expired');
            console.log('- Check if the key was copied correctly');
            console.log('- Verify the key is active in Anthropic Console');
        }
        
        if (error.status === 403) {
            console.log('\n🚨 PERMISSION ERROR:');
            console.log('- Account may not have access to Claude models');
            console.log('- Billing may need to be set up');
            console.log('- Account may need approval for API access');
        }
        
        if (error.status === 404) {
            console.log('\n🚨 MODEL NOT FOUND:');
            console.log('- Model name may be incorrect');
            console.log('- Account may not have access to any models');
            console.log('- API key may be for a different service');
        }
        
        if (error.status === 429) {
            console.log('\n🚨 RATE LIMIT:');
            console.log('- Too many requests');
            console.log('- Wait and try again');
        }
        
        console.log('\n💡 Next steps:');
        console.log('1. Visit https://console.anthropic.com/');
        console.log('2. Check account status and billing');
        console.log('3. Verify API key permissions');
        console.log('4. Check available models in console');
    }
}

checkAccountStatus();