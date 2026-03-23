# Mission Control Remote Access Guide

## 🌐 Access Your Mission Control from Any Device

### **LOCAL ACCESS (Same Computer):**
- **URL:** http://localhost:8093

### **REMOTE ACCESS (Other Devices on Your Network):**
- **URL:** http://192.168.1.29:8093

## 📱 **COMPATIBLE DEVICES:**
✅ **iPhone/iPad** - Safari, Chrome  
✅ **Android Phone/Tablet** - Chrome, Samsung Internet  
✅ **Laptop/Desktop** - Any modern browser  
✅ **Smart TV Browser** (if available)  
✅ **Any device on your WiFi network**

## 🔧 **SETUP INSTRUCTIONS:**

### **1. Find Your Network IP:**
Your current network IP is: **192.168.1.29**

### **2. Access from Mobile Device:**
1. Connect to the **same WiFi network** as your Mac mini
2. Open any web browser
3. Go to: **http://192.168.1.29:8093**
4. Bookmark it for quick access!

### **3. Access from Another Computer:**
1. Ensure it's on the **same network**
2. Open browser and navigate to: **http://192.168.1.29:8093**

## 🚨 **SECURITY NOTES:**
- **Network Only**: Only accessible on your local network (secure)
- **No Internet Exposure**: Not accessible from outside your home/office
- **Private Network**: Your Mission Control stays within your trusted network

## 🔍 **TROUBLESHOOTING:**

### **Can't Connect?**
1. **Check WiFi**: Ensure device is on same network as your Mac mini
2. **Check Firewall**: Mac firewall might be blocking the port
3. **Check IP**: Network IP might change (run the get-network-ip script again)

### **Get Current IP Address:**
```bash
cd mission-control
node get-network-ip.js
```

### **Firewall Issues (if needed):**
1. System Preferences → Security & Privacy → Firewall
2. Click "Firewall Options"
3. Allow "Node" or add port 8093

## 📊 **FEATURES AVAILABLE REMOTELY:**
✅ **Full Mission Control Interface**  
✅ **Live Task Management**  
✅ **Real-time Agent Activity Feed**  
✅ **Kanban Board Drag & Drop**  
✅ **Navigation Between Sections**  
✅ **WebSocket Live Updates**  

## 📝 **QUICK ACCESS LINKS:**

**Local Network URLs:**
- **Main Interface:** http://192.168.1.29:8093
- **Tabbed Version:** http://192.168.1.29:8093/tabbed  
- **Grid Version:** http://192.168.1.29:8093/grid

**Local Computer URLs:**
- **Main Interface:** http://localhost:8093
- **Tabbed Version:** http://localhost:8093/tabbed
- **Grid Version:** http://localhost:8093/grid

---

**🎯 Now you can manage your agent empire from anywhere in your home/office!**