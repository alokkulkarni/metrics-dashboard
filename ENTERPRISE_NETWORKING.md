# Enterprise Networking Solutions for Metrics Dashboard

This document provides enterprise-friendly alternatives to `devtunnel` for exposing the frontend (localhost:3000) to other team members in an enterprise environment.

## Current Setup

- **Frontend**: Available at `http://localhost:3000` and `http://192.168.86.42:3000`
- **Backend**: Available at `http://localhost:3001` with CORS configured for multiple origins
- **Database**: PostgreSQL running in Docker

## Working Solutions

### 1. Local Network Access (Recommended) ✅

**Access URL**: `http://192.168.86.42:3000`

**Requirements**:
- Users must be on the same local network (WiFi/LAN)
- Firewall allows traffic on ports 3000 and 3001

**Pros**:
- No external dependencies
- Fast and secure (local network only)
- No login requirements
- Enterprise-friendly

**Cons**:
- Limited to local network users
- Requires firewall configuration in some environments

**Setup Complete**: 
- ✅ Frontend configured with `host: '0.0.0.0'` in `vite.config.ts`
- ✅ Backend CORS configured to accept `http://192.168.86.42:3000`
- ✅ Docker containers accessible via local network

### 2. VS Code Port Forwarding

**Access**: Via VS Code's built-in port forwarding feature

**Steps**:
1. In VS Code, open the **Ports** panel (View → Terminal → Ports)
2. Click **Forward a Port** (or **+** button)
3. Enter `3000` for the frontend port
4. Choose **Public** or **Private** visibility
5. Share the generated URL with team members

**Pros**:
- Integrated with VS Code
- Automatic HTTPS
- Easy to set up
- Authentication via Microsoft/GitHub account

**Cons**:
- Requires VS Code and appropriate extensions
- May require Microsoft/GitHub authentication

### 3. SSH Tunneling

**Command for team members**:
```bash
ssh -L 3000:localhost:3000 -L 3001:localhost:3001 username@192.168.86.42
```

**Access**: `http://localhost:3000` on team member's machine

**Pros**:
- Secure (SSH encryption)
- No external services
- Works across networks

**Cons**:
- Requires SSH access to your machine
- More complex setup for non-technical users

### 4. localtunnel (Alternative to ngrok)

**Installation**:
```bash
npm install -g localtunnel
```

**Usage**:
```bash
# Terminal 1 - Frontend tunnel
lt --port 3000 --subdomain myapp-frontend

# Terminal 2 - Backend tunnel  
lt --port 3001 --subdomain myapp-backend
```

**Pros**:
- Simple to set up
- No account required
- Shareable URLs

**Cons**:
- External service dependency
- May be blocked by enterprise firewalls
- Potential security concerns with external tunneling

### 5. serveo.net (SSH-based tunneling)

**Usage**:
```bash
# Frontend tunnel
ssh -R 80:localhost:3000 serveo.net

# Backend tunnel  
ssh -R 80:localhost:3001 serveo.net
```

**Pros**:
- No installation required (uses SSH)
- No account registration
- Automatic HTTPS

**Cons**:
- External service dependency
- May be blocked by enterprise firewalls

## Implementation Status

### ✅ Completed Configurations

1. **Backend CORS Configuration** (`backend/src/index.ts`):
   ```typescript
   function getAllowedOrigins(): string[] {
     const envOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
     const baseOrigins = [
       'http://localhost:3000',
       process.env.FRONTEND_URL || 'http://localhost:3000'
     ];
     
     // Add local network IP
     const localIP = '192.168.86.42';
     baseOrigins.push(`http://${localIP}:3000`);
     
     return [...baseOrigins, ...envOrigins];
   }
   ```

2. **Frontend Network Configuration** (`frontend/vite.config.ts`):
   ```typescript
   export default defineConfig({
     plugins: [react()],
     host: '0.0.0.0', // Allow connections from network
     server: {
       port: 3000,
       host: '0.0.0.0'
     }
   });
   ```

3. **Environment Configuration** (`backend/.env`):
   ```bash
   ALLOWED_ORIGINS=http://localhost:3000,http://192.168.86.42:3000
   FRONTEND_URL=http://localhost:3000
   ```

### 🔧 Environment Variables Template

Update `backend/.env` to add additional origins:

```bash
# Multiple origins supported - comma separated
ALLOWED_ORIGINS=http://localhost:3000,http://192.168.86.42:3000,https://your-tunnel-url.com

# Add dev tunnel URLs when needed
# ALLOWED_ORIGINS=http://localhost:3000,https://abc123-3000.tunnelservice.ms

# Add VS Code port forwarding URLs when needed  
# ALLOWED_ORIGINS=http://localhost:3000,https://abc123-3000.app.github.dev
```

## Testing the Solutions

### Local Network Access Test
```bash
# Test frontend accessibility
curl -s http://192.168.86.42:3000 | head -5

# Test CORS configuration
curl -H "Origin: http://192.168.86.42:3000" -H "Access-Control-Request-Method: GET" -X OPTIONS http://localhost:3001/api/boards -v
```

### Adding New Origins
When using any tunneling solution, add the tunnel URL to the `ALLOWED_ORIGINS` environment variable:

1. Update `backend/.env`:
   ```bash
   ALLOWED_ORIGINS=http://localhost:3000,http://192.168.86.42:3000,https://your-new-tunnel-url.com
   ```

2. Rebuild the backend:
   ```bash
   docker-compose down backend
   docker-compose build --no-cache backend  
   docker-compose up -d backend
   ```

## Recommendations by Use Case

| Use Case | Recommended Solution | Complexity | Security |
|----------|---------------------|------------|----------|
| Same office/network | Local Network Access | Low | High |
| Remote team members | VS Code Port Forwarding | Medium | High |
| Technical team | SSH Tunneling | High | High |
| Quick demos | localtunnel | Low | Medium |
| No account setup | serveo.net | Low | Medium |

## Security Considerations

1. **Local Network**: Most secure, traffic stays within network
2. **SSH Tunneling**: Encrypted, requires proper SSH key management
3. **VS Code Forwarding**: Requires Microsoft/GitHub authentication
4. **External Tunnels**: Consider data sensitivity before using

## Firewall Configuration

For local network access, ensure these ports are open:
- **Port 3000**: Frontend access
- **Port 3001**: Backend API access (if needed for direct API testing)

## Troubleshooting

### CORS Issues
- Verify the origin URL is in `ALLOWED_ORIGINS`
- Rebuild backend after environment changes
- Check browser developer tools for specific CORS errors

### Network Access Issues
- Verify firewall settings
- Test with `curl` first before browser
- Ensure Docker containers are bound to `0.0.0.0`

### Container Health Issues
- Check container logs: `docker-compose logs <service>`
- Verify inter-container communication
- Restart containers if needed: `docker-compose restart`
