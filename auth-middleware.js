// Mission Control Authentication Middleware
const crypto = require('crypto');

class MissionControlAuth {
    constructor() {
        // Generate secure session secret if not provided
        this.sessionSecret = process.env.SESSION_SECRET || this.generateSecureSecret();
        this.activeSessions = new Map();
        this.authTokens = new Map();
        this.rateLimiter = new Map();
        
        // Default credentials (should be changed)
        this.credentials = {
            username: process.env.MC_USERNAME || 'admin',
            password: process.env.MC_PASSWORD || this.generateSecurePassword()
        };
        
        console.log(`🔐 Mission Control Security Initialized`);
        if (!process.env.MC_PASSWORD) {
            console.log(`🔑 Default Password: ${this.credentials.password}`);
            console.log(`⚠️  Change this in .env file: MC_PASSWORD=your_secure_password`);
        }
    }

    generateSecureSecret() {
        return crypto.randomBytes(32).toString('hex');
    }

    generateSecurePassword() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
        let password = '';
        for (let i = 0; i < 16; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
    }

    // Rate limiting middleware
    rateLimit(req, res, next) {
        const clientIP = req.ip || req.connection.remoteAddress;
        const now = Date.now();
        const windowMs = 15 * 60 * 1000; // 15 minutes
        const maxAttempts = 50; // 50 requests per 15 minutes

        if (!this.rateLimiter.has(clientIP)) {
            this.rateLimiter.set(clientIP, { count: 1, resetTime: now + windowMs });
            return next();
        }

        const clientData = this.rateLimiter.get(clientIP);
        
        if (now > clientData.resetTime) {
            clientData.count = 1;
            clientData.resetTime = now + windowMs;
            return next();
        }

        if (clientData.count >= maxAttempts) {
            return res.status(429).json({
                error: 'Too many requests',
                message: 'Rate limit exceeded. Try again later.',
                resetTime: clientData.resetTime
            });
        }

        clientData.count++;
        next();
    }

    // Authentication middleware
    authenticate(req, res, next) {
        // Debug logging
        console.log(`🔍 Auth middleware - Path: ${req.path}, Method: ${req.method}`);
        
        // Skip auth for login page, health check, and static assets (CSS/JS/icons only)
        if (req.path === '/login' || 
            req.path === '/auth' || 
            req.path === '/health' ||
            req.path === '/debug/auth-test' ||
            req.path.startsWith('/static/') ||
            req.path.endsWith('.css') ||
            req.path.endsWith('.js') ||
            req.path.endsWith('.ico') ||
            req.path.endsWith('.woff') ||
            req.path.endsWith('.woff2') ||
            req.path.endsWith('.png') ||
            req.path.endsWith('.svg')) {
            console.log(`✅ Skipping auth for: ${req.path}`);
            return next();
        }

        const token = req.headers.authorization?.split(' ')[1] || 
                     req.cookies?.auth_token ||
                     req.query.token ||
                     req.body?.token;

        if (!token) {
            return this.redirectToLogin(req, res);
        }

        const session = this.authTokens.get(token);
        if (!session || session.expires < Date.now()) {
            this.authTokens.delete(token);
            return this.redirectToLogin(req, res);
        }

        // Extend session
        session.expires = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
        req.user = session.user;
        next();
    }

    redirectToLogin(req, res) {
        if (req.xhr || req.path.startsWith('/api/')) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        res.redirect('/login');
    }

    // Login handler
    async handleLogin(req, res) {
        const { username, password } = req.body;
        
        if (username === this.credentials.username && 
            password === this.credentials.password) {
            
            const token = crypto.randomBytes(32).toString('hex');
            const session = {
                user: { username },
                expires: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
                createdAt: new Date(),
                ip: req.ip
            };
            
            this.authTokens.set(token, session);
            
            // Set cookie - auto-detect secure based on request protocol
            const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
            res.cookie('auth_token', token, {
                httpOnly: false, // Allow JavaScript access for client-side cookie setting
                secure: isSecure,
                sameSite: 'lax',
                maxAge: 24 * 60 * 60 * 1000 // 24 hours
            });
            
            console.log(`🔐 User authenticated: ${username} from ${req.ip}`);
            
            res.json({ 
                success: true, 
                token,
                message: 'Authentication successful' 
            });
        } else {
            console.log(`🚫 Failed login attempt: ${username} from ${req.ip}`);
            res.status(401).json({ 
                error: 'Invalid credentials',
                message: 'Username or password incorrect' 
            });
        }
    }

    // Logout handler
    handleLogout(req, res) {
        const token = req.cookies?.auth_token || req.headers.authorization?.split(' ')[1];
        if (token) {
            this.authTokens.delete(token);
        }
        res.clearCookie('auth_token');
        res.json({ success: true, message: 'Logged out successfully' });
    }

    // Clean expired sessions
    cleanupSessions() {
        const now = Date.now();
        for (const [token, session] of this.authTokens.entries()) {
            if (session.expires < now) {
                this.authTokens.delete(token);
            }
        }
    }

    // Get session info
    getSessionInfo() {
        return {
            activeSessions: this.authTokens.size,
            rateLimit: this.rateLimiter.size
        };
    }
}

module.exports = MissionControlAuth;