// Simple test server to diagnose network connectivity issues
const http = require('http');
const os = require('os');

function getNetworkIP() {
    const interfaces = os.networkInterfaces();
    console.log('🔍 Available Network Interfaces:');
    
    for (const name of Object.keys(interfaces)) {
        console.log(`\n📡 Interface: ${name}`);
        for (const interface of interfaces[name]) {
            if (interface.family === 'IPv4') {
                console.log(`  IPv4: ${interface.address} ${interface.internal ? '(internal)' : '(external)'}`);
                if (!interface.internal) {
                    return interface.address;
                }
            }
        }
    }
    return null;
}

const networkIP = getNetworkIP();
const port = 8888; // Simple port

console.log(`\n🚀 Starting simple test server...`);
console.log(`📍 Network IP: ${networkIP}`);
console.log(`🚪 Port: ${port}`);

const server = http.createServer((req, res) => {
    res.writeHead(200, { 
        'Content-Type': 'text/html',
        'Access-Control-Allow-Origin': '*'
    });
    res.end(`
    <html>
        <head><title>Connection Test Success!</title></head>
        <body style="font-family: Arial; text-align: center; margin-top: 100px;">
            <h1 style="color: green;">✅ CONNECTION SUCCESSFUL!</h1>
            <p>Your laptop can reach the Mac mini!</p>
            <p><strong>Server IP:</strong> ${networkIP}</p>
            <p><strong>Server Port:</strong> ${port}</p>
            <p><strong>Request from:</strong> ${req.connection.remoteAddress}</p>
            <hr>
            <p>Now we know the network path works!</p>
        </body>
    </html>
    `);
    
    console.log(`📱 Connection from: ${req.connection.remoteAddress} at ${new Date().toLocaleTimeString()}`);
});

server.listen(port, '0.0.0.0', () => {
    console.log(`\n✅ Test server running!`);
    console.log(`🌐 Test from laptop: http://${networkIP}:${port}`);
    console.log(`🏠 Test locally: http://localhost:${port}`);
    console.log(`\nPress Ctrl+C to stop`);
});

server.on('error', (err) => {
    console.error(`❌ Server error: ${err.message}`);
    if (err.code === 'EADDRINUSE') {
        console.log(`Port ${port} is busy. Trying port ${port + 1}...`);
        server.listen(port + 1, '0.0.0.0');
    }
});