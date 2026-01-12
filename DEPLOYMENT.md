# CytherAI Production Deployment Guide

## Overview

This guide covers deploying the CytherAI production teaser website. The site is designed as a **static site** with zero external dependencies, making deployment straightforward.

---

## Prerequisites

- Web server (Nginx, Apache, or CDN with static hosting)
- SSL/TLS certificate for HTTPS
- Domain configured (e.g., cytherai.com)
- Git access to repository

---

## Quick Start

### Option 1: Simple Static Hosting

```bash
# 1. Clone repository
git clone https://github.com/yourusername/cytherai.git
cd cytherai

# 2. Use production HTML
cp index-production.html index.html

# 3. Deploy to web server
rsync -avz --exclude='.git' ./ user@server:/var/www/cytherai/

# 4. Configure web server (see sections below)

# 5. Test
curl -I https://cytherai.com
```

---

## File Structure

```
cytherai/
├── index.html                  # Homepage (use index-production.html)
├── css/
│   └── cytherai.css           # Main stylesheet
├── js/
│   ├── cytherai.js            # Core functionality
│   ├── command-palette.js     # Command palette
│   └── sealed-artifact.js     # Verification module
├── pages/
│   ├── brief.html             # Technical brief
│   ├── contact.html           # Contact form
│   ├── security.html          # Vulnerability disclosure
│   ├── privacy.html           # Privacy policy
│   └── terms.html             # Terms of service
├── assets/
│   └── images/
│       └── og-image.svg       # Social media preview
└── bots/
    └── cythector/             # Existing bot page (optional)
```

---

## Deployment Methods

### Method 1: Nginx (Recommended)

**1. Install Nginx**
```bash
sudo apt update
sudo apt install nginx
```

**2. Create Site Configuration**
```bash
sudo nano /etc/nginx/sites-available/cytherai.com
```

**3. Configuration File**
```nginx
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name cytherai.com www.cytherai.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/cytherai.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/cytherai.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Root Directory
    root /var/www/cytherai;
    index index.html;

    # Security Headers (see SECURITY-HEADERS.md for full config)
    add_header Content-Security-Policy "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests;" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=(), payment=(), usb=(), fullscreen=(self)" always;
    add_header X-Frame-Options "DENY" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

    # Caching Strategy
    location ~ \.html$ {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        try_files $uri $uri/ =404;
    }

    location ~* \.(css|js|svg|png|jpg|jpeg|woff2?)$ {
        add_header Cache-Control "public, max-age=31536000, immutable";
        try_files $uri =404;
    }

    # Default Location
    location / {
        try_files $uri $uri/ =404;
    }

    # Custom 404 (optional)
    error_page 404 /404.html;
    location = /404.html {
        internal;
    }
}

# HTTP to HTTPS Redirect
server {
    listen 80;
    listen [::]:80;
    server_name cytherai.com www.cytherai.com;
    return 301 https://$server_name$request_uri;
}
```

**4. Enable Site**
```bash
sudo ln -s /etc/nginx/sites-available/cytherai.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

### Method 2: Apache

**1. Create VirtualHost**
```bash
sudo nano /etc/apache2/sites-available/cytherai.com.conf
```

**2. Configuration**
```apache
<VirtualHost *:443>
    ServerName cytherai.com
    ServerAlias www.cytherai.com
    DocumentRoot /var/www/cytherai

    # SSL Configuration
    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/cytherai.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/cytherai.com/privkey.pem

    <Directory /var/www/cytherai>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    # Security Headers
    Header always set Content-Security-Policy "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests;"
    Header always set X-Content-Type-Options "nosniff"
    Header always set Referrer-Policy "no-referrer"
    Header always set X-Frame-Options "DENY"
    Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"

    # Error Log
    ErrorLog ${APACHE_LOG_DIR}/cytherai_error.log
    CustomLog ${APACHE_LOG_DIR}/cytherai_access.log combined
</VirtualHost>

<VirtualHost *:80>
    ServerName cytherai.com
    ServerAlias www.cytherai.com
    Redirect permanent / https://cytherai.com/
</VirtualHost>
```

**3. Enable Site**
```bash
sudo a2enmod ssl headers rewrite
sudo a2ensite cytherai.com
sudo apachectl configtest
sudo systemctl reload apache2
```

---

### Method 3: Cloudflare Pages / Netlify / Vercel

**Cloudflare Pages:**
```bash
# Install Wrangler CLI
npm install -g wrangler

# Login
wrangler login

# Deploy
wrangler pages publish . --project-name=cytherai
```

**Netlify:**
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod --dir=.
```

**Vercel:**
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

**Note:** For these platforms, security headers must be configured via:
- Cloudflare: `_headers` file
- Netlify: `netlify.toml` or `_headers` file
- Vercel: `vercel.json`

---

## SSL/TLS Certificate Setup

### Option 1: Let's Encrypt (Free)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Generate Certificate (Nginx)
sudo certbot --nginx -d cytherai.com -d www.cytherai.com

# Auto-renewal (cron)
sudo crontab -e
# Add line:
0 0 * * * certbot renew --quiet
```

### Option 2: Cloudflare (Free)

1. Add domain to Cloudflare
2. Update nameservers at registrar
3. SSL/TLS mode: "Full (strict)"
4. Universal SSL certificate auto-issued

---

## Pre-Deployment Checklist

Before deploying to production:

- [ ] **Replace placeholder content**
  - Update email addresses (contact@, security@, nda@)
  - Specify legal jurisdiction in terms.html and privacy.html
  - Update organization name in footer

- [ ] **Configure contact form backend**
  - Replace Formspree placeholder in contact.html
  - Or set up custom form handler (PHP, serverless function, etc.)

- [ ] **Update OG image** (optional)
  - Replace `/assets/images/og-image.svg` with branded image
  - Recommended size: 1200x630px

- [ ] **Set build hash**
  - In `js/sealed-artifact.js`, update `generateBuildHash()` with actual CI/CD hash
  - Or inject dynamically during build

- [ ] **Review all pages**
  - Proofread copy
  - Test all links
  - Verify no lorem ipsum or TODOs

---

## Post-Deployment Verification

### 1. Functional Tests
```bash
# Test HTTPS redirect
curl -I http://cytherai.com
# Should return: 301 Moved Permanently → https://

# Test security headers
curl -I https://cytherai.com
# Should include CSP, X-Frame-Options, etc.

# Test pages
curl -I https://cytherai.com/pages/brief.html
curl -I https://cytherai.com/pages/contact.html
```

### 2. Browser Tests
- [ ] Open https://cytherai.com
- [ ] Check DevTools → Network tab → No external requests
- [ ] Verify "Sealed Artifact Verification" shows 0 external requests
- [ ] Test command palette (Ctrl/Cmd+K)
- [ ] Test on mobile device

### 3. External Validation
- [ ] [SSL Labs Test](https://www.ssllabs.com/ssltest/): Grade A+
- [ ] [Security Headers](https://securityheaders.com): Grade A+
- [ ] [Lighthouse](https://developers.google.com/web/tools/lighthouse): Performance 90+
- [ ] [WAVE Accessibility](https://wave.webaim.org/): 0 errors

---

## Monitoring & Maintenance

### Log Monitoring (Nginx)
```bash
# Access logs
sudo tail -f /var/log/nginx/access.log

# Error logs
sudo tail -f /var/log/nginx/error.log

# Filter for 404s
grep "404" /var/log/nginx/access.log

# Filter for 500s
grep "500" /var/log/nginx/error.log
```

### Uptime Monitoring
Recommended services:
- [UptimeRobot](https://uptimerobot.com) (free)
- [Pingdom](https://www.pingdom.com)
- [StatusCake](https://www.statuscake.com)

**Configuration:**
- Monitor URL: https://cytherai.com
- Check interval: 5 minutes
- Alert on: HTTP status != 200

---

## Rollback Plan

If deployment fails:

**1. Quick Rollback (Nginx)**
```bash
# Restore previous version
sudo cp /var/www/cytherai.backup/index.html /var/www/cytherai/index.html
sudo systemctl reload nginx
```

**2. Git Rollback**
```bash
# Revert to previous commit
git revert HEAD
git push origin main

# Redeploy
./deploy.sh
```

---

## Performance Optimization

### 1. Enable Compression

**Nginx:**
```nginx
gzip on;
gzip_types text/plain text/css application/javascript application/json;
gzip_min_length 1000;
```

**Apache:**
```apache
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/html text/css application/javascript
</IfModule>
```

### 2. HTTP/2
Already enabled if using SSL with modern Nginx/Apache.

### 3. Brotli Compression (Optional)
```bash
# Install Brotli module (Nginx)
sudo apt install nginx-module-brotli

# Enable in nginx.conf
load_module modules/ngx_http_brotli_filter_module.so;
load_module modules/ngx_http_brotli_static_module.so;

# Configure
brotli on;
brotli_types text/plain text/css application/javascript;
```

---

## CDN Integration (Optional)

While not strictly necessary (site is already fast), you can add Cloudflare for DDoS protection:

**1. Add Site to Cloudflare**
- Sign up at cloudflare.com
- Add domain
- Update nameservers

**2. Configure Settings**
- SSL/TLS: Full (strict)
- Always Use HTTPS: On
- Auto Minify: HTML, CSS, JS
- Brotli: On

**3. Security**
- Firewall Rules: Block suspicious traffic
- Rate Limiting: Prevent abuse

---

## Backup Strategy

**Automated Backups:**
```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/backups/cytherai"
SOURCE_DIR="/var/www/cytherai"
DATE=$(date +%Y%m%d)

# Create backup
tar -czf $BACKUP_DIR/cytherai-$DATE.tar.gz $SOURCE_DIR

# Keep only last 30 backups
find $BACKUP_DIR -name "cytherai-*.tar.gz" -mtime +30 -delete

echo "Backup completed: cytherai-$DATE.tar.gz"
```

**Cron Schedule:**
```bash
# Daily backup at 2 AM
0 2 * * * /usr/local/bin/backup.sh
```

---

## Troubleshooting

### Issue: 404 on CSS/JS files

**Solution:**
```bash
# Check file permissions
ls -la /var/www/cytherai/css/
ls -la /var/www/cytherai/js/

# Fix if needed
sudo chmod 644 /var/www/cytherai/css/*.css
sudo chmod 644 /var/www/cytherai/js/*.js
```

### Issue: CSP blocks scripts

**Solution:**
- Check browser console for CSP violation details
- Verify CSP header matches local scripts
- Ensure all scripts are from same origin

### Issue: Mixed content warnings

**Solution:**
```bash
# Find HTTP resources
grep -r "http://" /var/www/cytherai/ --exclude-dir=.git

# Replace with HTTPS or relative URLs
```

---

## Scaling Considerations

Current setup handles:
- **Traffic:** Up to 10,000 concurrent users (with proper server specs)
- **Bandwidth:** Minimal (site is ~200KB compressed)
- **Requests:** Static content = highly cacheable

**If scaling needed:**
1. Add load balancer (Nginx, HAProxy)
2. Enable CDN (Cloudflare, Fastly)
3. Use multiple origin servers

---

## Support Contacts

- **Technical Issues:** devops@cytherai.com
- **Security:** security@cytherai.com
- **General:** contact@cytherai.com

---

## References

- [Nginx Documentation](https://nginx.org/en/docs/)
- [Apache Documentation](https://httpd.apache.org/docs/)
- [Let's Encrypt](https://letsencrypt.org/)
- [Security Headers Guide](./SECURITY-HEADERS.md)
- [QA Checklist](./QA-CHECKLIST.md)
