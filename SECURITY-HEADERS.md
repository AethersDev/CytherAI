# Security Headers Configuration

## Overview

This document specifies the recommended HTTP security headers for deploying the CytherAI production website. These headers enforce a strong security posture consistent with the "sealed artifact" philosophy.

## Required Headers

### 1. Content Security Policy (CSP)

**Purpose:** Prevent XSS, data injection, and unauthorized resource loading.

**Recommended Configuration:**

```
Content-Security-Policy:
  default-src 'none';
  script-src 'self';
  style-src 'self';
  img-src 'self' data:;
  font-src 'self';
  connect-src 'self';
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
  upgrade-insecure-requests;
```

**Explanation:**
- `default-src 'none'` - Block everything by default (whitelist approach)
- `script-src 'self'` - Only allow scripts from same origin (our JS files)
- `style-src 'self'` - Only allow styles from same origin (our CSS files)
- `img-src 'self' data:` - Images from same origin + data URIs (for inline SVG)
- `font-src 'self'` - Fonts from same origin only
- `connect-src 'self'` - Only allow fetch/XHR to same origin
- `frame-ancestors 'none'` - Prevent clickjacking (no embedding in iframes)
- `base-uri 'self'` - Restrict base tag URLs
- `form-action 'self'` - Forms can only submit to same origin
- `upgrade-insecure-requests` - Automatically upgrade HTTP to HTTPS

**Note:** If you need inline styles or scripts, use nonces:
```
Content-Security-Policy: script-src 'self' 'nonce-RANDOM_VALUE';
```
Generate a new nonce per request and add it to inline script tags:
```html
<script nonce="RANDOM_VALUE">...</script>
```

---

### 2. X-Content-Type-Options

**Purpose:** Prevent MIME-type sniffing attacks.

```
X-Content-Type-Options: nosniff
```

Forces browsers to respect declared Content-Type headers.

---

### 3. Referrer-Policy

**Purpose:** Control referrer information sent with requests (privacy protection).

```
Referrer-Policy: no-referrer
```

**Options:**
- `no-referrer` - Never send referrer (maximum privacy)
- `strict-origin-when-cross-origin` - Balanced option if you need some analytics

**Recommendation:** Use `no-referrer` to align with zero-tracking claim.

---

### 4. Permissions-Policy

**Purpose:** Disable unnecessary browser features (reduces attack surface).

```
Permissions-Policy:
  geolocation=(),
  microphone=(),
  camera=(),
  payment=(),
  usb=(),
  magnetometer=(),
  gyroscope=(),
  accelerometer=(),
  ambient-light-sensor=(),
  autoplay=(),
  encrypted-media=(),
  fullscreen=(self),
  picture-in-picture=()
```

**Explanation:**
- `()` - Disables feature for all origins
- `(self)` - Allows feature for same origin only

Only `fullscreen` is enabled (for user convenience).

---

### 5. X-Frame-Options

**Purpose:** Prevent clickjacking (legacy, CSP `frame-ancestors` is preferred).

```
X-Frame-Options: DENY
```

---

### 6. Strict-Transport-Security (HSTS)

**Purpose:** Force HTTPS and prevent downgrade attacks.

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

**Explanation:**
- `max-age=31536000` - Enforce HTTPS for 1 year
- `includeSubDomains` - Apply to all subdomains
- `preload` - Opt-in to browser HSTS preload list

**Important:** Only enable after confirming HTTPS is working correctly.

---

### 7. X-XSS-Protection (Legacy)

**Purpose:** Enable browser XSS filters (deprecated, CSP is preferred).

```
X-XSS-Protection: 0
```

**Recommendation:** Set to `0` (disabled) to avoid conflicts with CSP. Modern browsers rely on CSP instead.

---

### 8. Cache-Control

**Purpose:** Control caching behavior.

**For HTML pages:**
```
Cache-Control: no-cache, no-store, must-revalidate
```

**For static assets (CSS, JS, images):**
```
Cache-Control: public, max-age=31536000, immutable
```

Use versioned filenames for cache busting (e.g., `cytherai.v1.css`).

---

## Implementation Examples

### Nginx

```nginx
# /etc/nginx/sites-available/cytherai.com

server {
    listen 443 ssl http2;
    server_name cytherai.com;

    # SSL Configuration
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security Headers
    add_header Content-Security-Policy "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests;" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=(), payment=(), usb=(), fullscreen=(self)" always;
    add_header X-Frame-Options "DENY" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

    # Root directory
    root /var/www/cytherai;
    index index.html;

    # Serve HTML with no-cache
    location ~ \.html$ {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # Serve static assets with long cache
    location ~* \.(css|js|svg|png|jpg|jpeg|woff2?)$ {
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # Default location
    location / {
        try_files $uri $uri/ =404;
    }
}

# HTTP redirect to HTTPS
server {
    listen 80;
    server_name cytherai.com;
    return 301 https://$server_name$request_uri;
}
```

---

### Apache (.htaccess)

```apache
# Enable HTTPS redirect
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# Security Headers
Header always set Content-Security-Policy "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests;"
Header always set X-Content-Type-Options "nosniff"
Header always set Referrer-Policy "no-referrer"
Header always set Permissions-Policy "geolocation=(), microphone=(), camera=(), payment=(), usb=(), fullscreen=(self)"
Header always set X-Frame-Options "DENY"
Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"

# Cache Control
<FilesMatch "\.(html)$">
    Header set Cache-Control "no-cache, no-store, must-revalidate"
</FilesMatch>

<FilesMatch "\.(css|js|svg|png|jpg|woff2)$">
    Header set Cache-Control "public, max-age=31536000, immutable"
</FilesMatch>
```

---

### Cloudflare Workers (Edge)

```javascript
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const response = await fetch(request)
  const newHeaders = new Headers(response.headers)

  // Security Headers
  newHeaders.set('Content-Security-Policy', "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests;")
  newHeaders.set('X-Content-Type-Options', 'nosniff')
  newHeaders.set('Referrer-Policy', 'no-referrer')
  newHeaders.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=(), usb=(), fullscreen=(self)')
  newHeaders.set('X-Frame-Options', 'DENY')
  newHeaders.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders
  })
}
```

---

## Verification

### 1. securityheaders.com

Visit [https://securityheaders.com](https://securityheaders.com) and enter your domain.
Target grade: **A+**

### 2. Browser DevTools

1. Open DevTools → Network tab
2. Reload page
3. Click on document request (e.g., `index.html`)
4. View Response Headers
5. Confirm all security headers are present

### 3. curl Command

```bash
curl -I https://cytherai.com
```

Expected output should include all headers above.

---

## HSTS Preload Submission

Once HSTS is stable (6+ months), submit to browser preload lists:

1. Visit [https://hstspreload.org](https://hstspreload.org)
2. Enter domain: `cytherai.com`
3. Confirm requirements met
4. Submit for inclusion

---

## Monitoring

**Recommended Tools:**
- [Mozilla Observatory](https://observatory.mozilla.org)
- [SecurityHeaders.com](https://securityheaders.com)
- [SSL Labs](https://www.ssllabs.com/ssltest/)

**Frequency:** Check monthly or after configuration changes.

---

## Notes

- **Test First:** Implement in staging environment before production
- **CSP Violations:** Monitor browser console for CSP violation reports
- **Backward Compatibility:** These headers are supported in all modern browsers (IE11+)
- **Progressive Enhancement:** Site should remain functional even if headers fail (defense in depth)

---

## References

- [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/)
- [MDN: HTTP Headers](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers)
- [Content Security Policy Reference](https://content-security-policy.com/)
