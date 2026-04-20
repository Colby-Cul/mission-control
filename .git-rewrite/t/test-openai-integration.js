// Test the new OpenAI integration with credits
const OpenAI = require('openai');
require('dotenv').config();

async function testOpenAIIntegration() {
    console.log('🧪 Testing OpenAI Integration with Fresh Credits...\n');
    
    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });
    
    try {
        console.log('📤 Testing GPT-4o-mini for cost optimization...');
        
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: 'You are TaskMaster Bot from Mission Control. Respond professionally and efficiently.' },
                { role: 'user', content: 'Mission Control task: Create a simple project timeline for "Website Redesign" with 3 phases. Be concise and professional.' }
            ],
            max_tokens: 200,
            temperature: 0.7
        });
        
        console.log('✅ OpenAI GPT-4o-mini SUCCESS!');
        console.log('📝 Response:', response.choices[0].message.content);
        console.log('\n💰 Token Usage:', {
            prompt_tokens: response.usage.prompt_tokens,
            completion_tokens: response.usage.completion_tokens,
            total_tokens: response.usage.total_tokens
        });
        
        // Calculate cost (GPT-4o-mini: $0.15/1M input, $0.60/1M output)
        const inputCost = (response.usage.prompt_tokens / 1000000) * 0.15;
        const outputCost = (response.usage.completion_tokens / 1000000) * 0.60;
        const totalCost = inputCost + outputCost;
        
        console.log('💸 Actual Cost:', {
            input_cost: `$${inputCost.toFixed(8)}`,
            output_cost: `$${outputCost.toFixed(8)}`,
            total_cost: `$${totalCost.toFixed(8)}`
        });
        
        console.log('\n🎯 Cost Comparison:');
        console.log('   • GPT-4o-mini:', `$${totalCost.toFixed(8)}`);
        console.log('   • Claude Sonnet equivalent:', `$${(response.usage.total_tokens / 1000000 * 3).toFixed(8)}`);
        console.log('   • Cost savings:', `${((1 - totalCost / (response.usage.total_tokens / 1000000 * 3)) * 100).toFixed(1)}%`);
        
        return true;
        
    } catch (error) {
        console.error('❌ OpenAI Test Failed:', error.message);
        return false;
    }
}

async function testCostOptimization() {
    console.log('\n🧪 Testing Mission Control Cost Optimization...\n');
    
    const MissionControlDashboard = require('./dashboard');
    const dashboard = new MissionControlDashboard();
    
    // Test simple task (should route to Ollama - FREE)
    console.log('📝 Test 1: Simple task routing...');
    const simpleTask = {
        id: 'test-simple',
        department: 'operations',
        type: 'schedule_reminder',
        payload: { message: 'Daily standup', time: '9:00 AM' },
        requiredCapabilities: ['scheduling'],
        priority: 'low',
        botId: 'scheduler'
    };
    
    const route1 = dashboard.selectCostOptimalModel('ollama-auto', simpleTask);
    console.log(`   → Routing: ollama-auto → ${route1.provider}:${route1.model} (Cost: $${route1.cost}/token)`);
    
    // Test medium task (should route to OpenAI)
    console.log('📝 Test 2: Medium task routing...');
    const mediumTask = {
        id: 'test-medium',
        department: 'operations',
        type: 'task_analysis',
        payload: { task: 'Analyze team productivity' },
        requiredCapabilities: ['analysis'],
        priority: 'medium',
        botId: 'taskmaster'
    };
    
    const route2 = dashboard.selectCostOptimalModel('gpt-4o-mini', mediumTask);
    console.log(`   → Routing: gpt-4o-mini → ${route2.provider}:${route2.model} (Cost: $${route2.cost}/token)`);
    
    // Test executive task (should route to Claude premium)
    console.log('📝 Test 3: Executive task routing...');
    const executiveTask = {
        id: 'test-executive',
        department: 'executive',
        type: 'strategic_planning',
        payload: { project: 'Q2 business strategy' },
        requiredCapabilities: ['strategic_planning'],
        priority: 'high',
        botId: 'executive-assistant'
    };
    
    const route3 = dashboard.selectCostOptimalModel('claude-opus', executiveTask);
    console.log(`   → Routing: claude-opus → ${route3.provider}:${route3.model} (Cost: $${route3.cost}/token)`);
    
    console.log('\n🎯 COST OPTIMIZATION SUMMARY:');
    console.log(`   • Simple tasks: ${route1.provider} (${((1 - route1.cost / 0.000003) * 100).toFixed(1)}% cheaper than Claude)`);
    console.log(`   • Medium tasks: ${route2.provider} (${((1 - route2.cost / 0.000003) * 100).toFixed(1)}% cheaper than Claude)`);
    console.log(`   • Executive tasks: ${route3.provider} (Premium quality maintained)`);
    
    process.exit(0);
}

async function runTests() {
    const openaiWorking = await testOpenAIIntegration();
    
    if (openaiWorking) {
        await testCostOptimization();
    } else {
        console.log('\n⚠️ OpenAI integration needs debugging');
        process.exit(1);
    }
}

runTests().catch(console.error);