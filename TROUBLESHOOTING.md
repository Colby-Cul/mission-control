# Mission Control Remote Access Troubleshooting

## 🚨 **CONNECTION ERROR FROM LAPTOP**

### **CURRENT STATUS:**
- ✅ Server is running: `localhost:9093`
- ✅ Network IP: `192.168.1.29:9093`
- ✅ Authentication working locally

---

## 🔍 **TROUBLESHOOTING STEPS:**

### **1. VERIFY NETWORK CONNECTION**
**Both devices must be on the SAME WiFi network:**
- Mac mini: Check WiFi network name
- Laptop: Ensure connected to identical network
- **Different networks = No access**

### **2. TEST CORRECT URL**
Use the exact URL from your laptop:
```
http://192.168.1.29:9093
```
**Common mistakes:**
- Using `localhost:9093` (only works on Mac mini)
- Wrong port number
- Using old IP address

### **3. MAC FIREWALL CHECK**
Mac might be blocking incoming connections:

**Option A - System Preferences:**
1. System Preferences → Security & Privacy
2. Click "Firewall" tab
3. If firewall is ON:
   - Click "Firewall Options"
   - Look for "Node" or "node"
   - Enable "Allow incoming connections"
   - OR add port 9093

**Option B - Terminal (on Mac mini):**
```bash
# Check firewall status
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate

# If needed, allow Node.js
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /usr/local/bin/node
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --unblock /usr/local/bin/node
```

### **4. ROUTER ISOLATION CHECK**
Some routers block device-to-device communication:
- Check router "AP Isolation" or "Client Isolation" 
- Should be DISABLED for Mission Control access
- Contact network admin if on corporate network

### **5. NETWORK DISCOVERY**
From your laptop, test if you can reach the Mac:

**Windows:**
```cmd
ping 192.168.1.29
telnet 192.168.1.29 9093
```

**Mac/Linux:**
```bash
ping 192.168.1.29
nc -zv 192.168.1.29 9093
```

### **6. IP ADDRESS CHANGES**
Network IP can change when router restarts:

**Get current IP (run on Mac mini):**
```bash
cd mission-control
node get-network-ip.js
```

---

## 🔧 **QUICK FIXES:**

### **Fix 1: Restart Mission Control**
```bash
# Kill current server
pkill -f "node dashboard.js"

# Restart
cd mission-control
node dashboard.js &
```

### **Fix 2: Disable Mac Firewall Temporarily**
1. System Preferences → Security & Privacy → Firewall
2. Click lock to make changes
3. Turn firewall OFF temporarily
4. Test access from laptop
5. Turn back ON and configure properly

### **Fix 3: Try Different Port**
If 9093 is blocked, edit `.env`:
```
PORT=8080
```
Then restart server.

---

## 📱 **ALTERNATIVE ACCESS METHODS:**

### **Method 1: SSH Tunnel**
If direct access fails, create SSH tunnel:
```bash
# From laptop
ssh -L 8080:localhost:9093 your-username@192.168.1.29
# Then access: http://localhost:8080
```

### **Method 2: VPN Access**
Use VPN if on different networks:
- Both devices connect to same VPN
- Use VPN IP instead of local IP

---

## 🔍 **DIAGNOSTIC COMMANDS:**

Run these on Mac mini to gather info:
```bash
# Check server status
curl http://localhost:9093/health

# Get network info
ifconfig | grep inet

# Check what's listening on port
lsof -i :9093

# Test external access (if you know laptop IP)
curl -I http://192.168.1.29:9093/health
```

---

## 📞 **CONTACT INFO:**
If still having issues:
1. Check Mac Console app for errors
2. Try accessing from phone first (simpler test)
3. Ensure both devices show same WiFi network name
4. Consider using Ethernet connection temporarily

---

**Most common cause: MAC FIREWALL blocking Node.js connections**
**Second most common: Devices on different WiFi networks**