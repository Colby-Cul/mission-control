# LAPTOP CONNECTION TEST

## 🧪 **STEP-BY-STEP LAPTOP TEST**

### **1. Network Connectivity Test**
Open **Command Prompt** (Windows) or **Terminal** (Mac/Linux) on your laptop:

```bash
ping 192.168.1.29
```
**Expected Result:** Should show replies (packets received)
**If fails:** Devices are on different networks or router blocking

### **2. Port Connectivity Test**
```bash
curl -v http://192.168.1.29:9093/health
```
**Expected Result:** HTTP 200 response with JSON
**If fails:** Port is blocked or server not listening

### **3. Web Browser Test**
Open browser on laptop and go to:
```
http://192.168.1.29:9093
```
**Expected Result:** Mission Control login page
**If fails:** Network or DNS issue

### **4. Alternative Test - Different Port**
If still failing, try this temporary fix:
- Edit `.env` file on Mac mini: `PORT=8080`
- Restart server
- Test: `http://192.168.1.29:8080`

## 🔍 **DIAGNOSTIC COMMANDS**

Run these on your **laptop** and report results:

```bash
# Test 1: Can reach Mac mini at all?
ping 192.168.1.29

# Test 2: Can reach the specific port?
telnet 192.168.1.29 9093
# OR on Mac/Linux:
nc -zv 192.168.1.29 9093

# Test 3: What's the laptop's network?
ipconfig /all          # Windows
ifconfig               # Mac/Linux

# Test 4: Direct HTTP test
curl -I http://192.168.1.29:9093
```

## 📋 **REPORT BACK**
Tell me which of these work/fail:
- [ ] Ping successful?
- [ ] Port 9093 reachable?
- [ ] Browser shows login page?
- [ ] Same WiFi network name?