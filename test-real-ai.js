// Test the REAL AI system in Mission Control
const MissionControlDashboard = require('./dashboard');

async function testRealAI() {
    console.log('🧪 Testing REAL AI Mission Control System...\n');
    
    const dashboard = new MissionControlDashboard();
    
    // Test 1: Simple task (should route to Ollama - FREE)
    console.log('📝 TEST 1: Simple Task (should route to FREE Ollama)');
    const simpleTask = {
        id: 'test-simple',
        department: 'operations', 
        type: 'schedule_reminder',
        payload: { message: 'Test reminder', time: '9:00 AM' },
        requiredCapabilities: ['scheduling'],
        priority: 'low',
        botId: 'scheduler',
        botName: 'Scheduler Bot'
    };
    
    try {
        const result1 = await dashboard.callAIModel('ollama-auto', simpleTask);
        console.log(`✅ Simple Task Result:`, result1.success ? 'SUCCESS' : 'FAILED');
        console.log(`💰 Cost: $${result1.cost?.toFixed(8) || '0'}`);
        console.log(`🤖 Provider: ${result1.provider || 'unknown'}`);
        console.log(`📝 Response: ${result1.result?.substring(0, 100)}...\n`);
    } catch (error) {
        console.log(`❌ Simple Task Error:`, error.message, '\n');
    }
    
    // Test 2: Medium complexity task (should route to OpenAI or fallback to Claude)
    console.log('📝 TEST 2: Medium Task (should route to GPT-4o-mini or Claude)');
    const mediumTask = {
        id: 'test-medium',
        department: 'operations',
        type: 'task_analysis',
        payload: { task: 'Analyze team productivity metrics' },
        requiredCapabilities: ['analysis'],
        priority: 'medium',
        botId: 'taskmaster',
        botName: 'TaskMaster Bot'
    };
    
    try {
        const result2 = await dashboard.callAIModel('gpt-4o-mini', mediumTask);
        console.log(`✅ Medium Task Result:`, result2.success ? 'SUCCESS' : 'FAILED');
        console.log(`💰 Cost: $${result2.cost?.toFixed(8) || '0'}`);
        console.log(`🤖 Provider: ${result2.provider || 'unknown'}`);
        console.log(`📝 Response: ${result2.result?.substring(0, 100)}...\n`);
    } catch (error) {
        console.log(`❌ Medium Task Error:`, error.message, '\n');
    }
    
    // Test 3: Executive task (should route to Claude premium)
    console.log('📝 TEST 3: Executive Task (should route to Claude premium)');
    const executiveTask = {
        id: 'test-executive',
        department: 'executive',
        type: 'strategic_planning', 
        payload: { project: 'AI implementation strategy' },
        requiredCapabilities: ['strategic_planning'],
        priority: 'high',
        botId: 'executive-assistant',
        botName: 'Executive Assistant Bot'
    };
    
    try {
        const result3 = await dashboard.callAIModel('claude-opus', executiveTask);
        console.log(`✅ Executive Task Result:`, result3.success ? 'SUCCESS' : 'FAILED');
        console.log(`💰 Cost: $${result3.cost?.toFixed(8) || '0'}`);
        console.log(`🤖 Provider: ${result3.provider || 'unknown'}`);
        console.log(`📝 Response: ${result3.result?.substring(0, 100)}...\n`);
    } catch (error) {
        console.log(`❌ Executive Task Error:`, error.message, '\n');
    }
    
    console.log('🎯 REAL AI Test Complete!');
    process.exit(0);
}

// Run the test
testRealAI().catch(console.error);