// Test Claude integration via OpenClaw
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');

const execAsync = promisify(exec);

async function testClaudeViaOpenClaw() {
    console.log('🧪 Testing Claude integration via OpenClaw...\n');
    
    const prompt = `You are Mission Control's Executive Assistant Bot. 
    
Task: Analyze this request - "Schedule a meeting with the team for project review"

Please provide a brief, professional response as the Executive Assistant would.`;
    
    try {
        // Create temp file for clean input
        const tempFile = `/tmp/mc_test_${Date.now()}.txt`;
        fs.writeFileSync(tempFile, prompt);
        
        console.log('📤 Sending task to Claude via OpenClaw...');
        
        // Read the prompt and escape it properly
        const promptContent = fs.readFileSync(tempFile, 'utf8');
        const escapedPrompt = promptContent.replace(/"/g, '\\"').replace(/'/g, "'\"'\"'");
        
        // Call OpenClaw agent command with session ID
        const sessionId = `mc-test-${Date.now()}`;
        const command = `openclaw agent --message "${escapedPrompt}" --session-id ${sessionId} --timeout 30 --local`;
        
        const { stdout, stderr } = await execAsync(command, { timeout: 40000 });
        
        // Clean up
        try { fs.unlinkSync(tempFile); } catch (e) { /* ignore */ }
        
        console.log('✅ Claude via OpenClaw SUCCESS!');
        console.log('📝 Response:', stdout.trim().substring(0, 200) + '...\n');
        
        return true;
        
    } catch (error) {
        console.error('❌ Claude via OpenClaw FAILED:', error.message);
        return false;
    }
}

async function testOllama() {
    console.log('🧪 Testing Ollama local model...\n');
    
    try {
        console.log('📤 Sending task to Ollama...');
        // Use proper file input for Ollama
        const tempFile = `/tmp/ollama_test_${Date.now()}.txt`;
        fs.writeFileSync(tempFile, 'You are TaskMaster Bot. Task: Create a simple daily schedule. Respond briefly.');
        
        const { stdout } = await execAsync(`cat "${tempFile}" | ollama run llama3.2:3b`, { timeout: 20000 });
        
        // Clean up
        try { fs.unlinkSync(tempFile); } catch (e) { /* ignore */ }
        
        console.log('✅ Ollama SUCCESS!');
        console.log('📝 Response:', stdout.trim().substring(0, 150) + '...\n');
        
        return true;
        
    } catch (error) {
        console.error('❌ Ollama FAILED:', error.message);
        return false;
    }
}

async function runTests() {
    console.log('🚀 Testing Mission Control AI Integration\n');
    
    const claudeWorks = await testClaudeViaOpenClaw();
    const ollamaWorks = await testOllama();
    
    console.log('📊 RESULTS:');
    console.log(`   • Claude via OpenClaw: ${claudeWorks ? '✅ Working' : '❌ Failed'}`);
    console.log(`   • Ollama Local: ${ollamaWorks ? '✅ Working' : '❌ Failed'}`);
    
    if (claudeWorks || ollamaWorks) {
        console.log('\n🎉 Mission Control has working AI integration!');
    } else {
        console.log('\n⚠️  Mission Control AI needs debugging');
    }
    
    process.exit(0);
}

runTests().catch(console.error);