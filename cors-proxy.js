const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

// Custom CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight OPTIONS requests
  if (req.method === 'OPTIONS') {
    res.status(200).send();
    return;
  }
  
  next();
});

// Proxy middleware
app.use('/', createProxyMiddleware({
  target: 'http://localhost:8283',
  changeOrigin: true,
  logLevel: 'warn',
  followRedirects: false, // Don't follow redirects automatically
  onProxyRes: (proxyRes, req, res) => {
    // Add CORS headers to all responses
    proxyRes.headers['access-control-allow-origin'] = '*';
    proxyRes.headers['access-control-allow-methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
    proxyRes.headers['access-control-allow-headers'] = 'Content-Type, Authorization';
    
    // Handle redirects manually to keep them within our proxy
    if (proxyRes.statusCode === 307 && proxyRes.headers.location) {
      const location = proxyRes.headers.location;
      // Replace the target server URL with our proxy URL
      const newLocation = location.replace('http://localhost:8283', 'http://localhost:8284');
      proxyRes.headers.location = newLocation;
      console.log(`Redirecting: ${location} -> ${newLocation}`);
    }
  }
}));

const PORT = 8284;
app.listen(PORT, () => {
  console.log(`CORS proxy server running on http://localhost:${PORT}`);
  console.log(`Proxying requests to http://localhost:8283`);
});