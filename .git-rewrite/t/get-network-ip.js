// Get network IP for remote access
const os = require('os');

function getNetworkIP() {
    const interfaces = os.networkInterfaces();
    
    for (const name of Object.keys(interfaces)) {
        for (const interface of interfaces[name]) {
            // Skip internal and non-IPv4 addresses
            if (!interface.internal && interface.family === 'IPv4') {
                return interface.address;
            }
        }
    }
    return 'localhost';
}

require('dotenv').config();

const networkIP = getNetworkIP();
console.log(`Network IP: ${networkIP}`);
console.log(`Remote URL: http://${networkIP}:${process.env.PORT || 9093}`);