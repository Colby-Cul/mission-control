// Test Mission Control connectivity
require('dotenv').config();

const os = require('os');

function getNetworkIP() {
    const interfaces = os.networkInterfaces();
    
    for (const name of Object.keys(interfaces)) {
        for (const interface of interfaces[name]) {
            if (!interface.internal && interface.family === 'IPv4') {
                return interface.address;
            }
        }
    }
    return 'localhost';
}

const networkIP = getNetworkIP();
const port = process.env.PORT || 9093;

console.log('\n🔍 Mission Control Connection Test');
console.log('=====================================');
console.log(`📍 Network IP: ${networkIP}`);
console.log(`🚪 Port: ${port}`);
console.log(`🌐 Remote URL: http://${networkIP}:${port}`);
console.log(`🏠 Local URL: http://localhost:${port}`);

// Test local connection
const http = require('http');

const testLocal = new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}/health`, (res) => {
        resolve(res.statusCode === 200 ? '✅ LOCAL: Working' : `❌ LOCAL: Error ${res.statusCode}`);
    });
    req.on('error', () => resolve('❌ LOCAL: Connection failed'));
    req.setTimeout(3000, () => {
        req.destroy();
        resolve('❌ LOCAL: Timeout');
    });
});

testLocal.then(result => {
    console.log(result);
    
    console.log('\n📋 TROUBLESHOOTING CHECKLIST:');
    console.log('□ Laptop on same WiFi as Mac mini?');
    console.log('□ Using correct URL: http://' + networkIP + ':' + port);
    console.log('□ Mac firewall allowing Node.js?');
    console.log('□ Router not blocking device communication?');
    
    console.log('\n🚨 MOST COMMON FIX:');
    console.log('System Preferences → Security & Privacy → Firewall');
    console.log('→ Firewall Options → Allow Node.js incoming connections');
    
    console.log('\n💡 Quick test from laptop:');
    console.log(`ping ${networkIP}`);
    console.log(`curl http://${networkIP}:${port}/health`);
});