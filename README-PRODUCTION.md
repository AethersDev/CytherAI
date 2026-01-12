# CytherAI Production Teaser Website

> Sovereign AI systems built as sealed artifacts: offline-capable, inspectable, and engineered for verification.

---

## 🎯 Project Overview

This is the production-ready teaser website for CytherAI, designed to be:

- **Zero External Dependencies:** No CDNs, no external fonts, no third-party scripts
- **Sealed Artifact:** Zero tracking, verifiable client-side
- **Progressively Enhanced:** Works without JavaScript, enhanced with JS
- **Accessible:** WCAG AA compliant, keyboard navigable, screen reader friendly
- **Fast:** < 200KB total, First Contentful Paint < 1.5s
- **Secure:** Strong CSP, security headers, HTTPS-only

---

## 📁 Project Structure

```
cytherai/
├── index-production.html      # Production homepage (USE THIS)
├── index.html                 # Original experimental version
│
├── css/
│   └── cytherai.css          # Main stylesheet (modular, clean)
│
├── js/
│   ├── cytherai.js           # Core functionality (nav, accessibility)
│   ├── command-palette.js    # Command palette (Ctrl/Cmd+K)
│   └── sealed-artifact.js    # Verification monitor (zero external requests)
│
├── pages/
│   ├── brief.html            # Technical overview
│   ├── contact.html          # Contact form
│   ├── security.html         # Vulnerability disclosure
│   ├── privacy.html          # Privacy policy
│   └── terms.html            # Terms of service
│
├── assets/
│   └── images/
│       └── og-image.svg      # Social media preview (self-hosted)
│
├── bots/
│   └── cythector/            # Existing bot page (preserved)
│
├── SECURITY-HEADERS.md       # Security headers configuration guide
├── QA-CHECKLIST.md           # Comprehensive QA checklist
├── DEPLOYMENT.md             # Deployment guide (Nginx, Apache, CDN)
└── README-PRODUCTION.md      # This file
```

---

## 🚀 Quick Start

### Local Development

```bash
# 1. Clone repository
git clone https://github.com/yourusername/cytherai.git
cd cytherai

# 2. Rename production file
cp index-production.html index.html

# 3. Start local server
python3 -m http.server 8000

# 4. Open browser
open http://localhost:8000
```

### Production Deployment

```bash
# See DEPLOYMENT.md for full guide

# Quick deploy to server
rsync -avz --exclude='.git' ./ user@server:/var/www/cytherai/

# Or use git
git pull origin main
```

---

## ✨ Key Features

### 1. Sealed Artifact Verification

Real-time monitoring of external requests using Performance API:
- **External Requests:** 0 (verified client-side)
- **External Origins:** NONE
- **Build Hash:** Displayed for reproducibility

Located on homepage in verification panel.

### 2. Command Palette

Protocol-style command interface:
- **Trigger:** `Ctrl+K` (Windows) or `Cmd+K` (Mac)
- **Commands:**
  - REQUEST BRIEFING
  - INITIATE CONTACT
  - OPEN THREAT MODEL
  - COPY CONTACT EMAIL
  - GENERATE ARTIFACT REPORT
- **Navigation:** Arrow keys, Enter to execute, Escape to close

### 3. Progressive Disclosure

Click-to-expand modules for architecture details:
- **Deployment Model:** On-premises, air-gapped, sovereign
- **Threat Model:** Security posture, adversary assumptions
- **Guarantees:** What we claim (zero dependencies, deterministic builds)
- **Limitations:** What we won't claim (alpha status, not production-ready)

### 4. Progressive Enhancement

Site works without JavaScript:
- Navigation functional
- Content readable
- Forms submittable
- Disclosure modules expand (native `<details>` element)

JavaScript adds:
- Command palette
- Smooth scrolling
- Enhanced animations
- Sealed artifact verification

---

## 🎨 Design System

### Colors

```css
--bg-primary: #050508;      /* Deep black */
--text-primary: #f5f5f0;    /* Warm white */
--gold: #d4af37;            /* Sovereign gold accent */
--border-accent: rgba(212, 175, 55, 0.2);
```

### Typography

```css
--font-sans: 'Inter', system-ui, sans-serif;
--font-mono: 'SF Mono', 'Monaco', 'Consolas', monospace;
```

No external fonts loaded. Falls back to system fonts.

### Motion

Respects `prefers-reduced-motion`:
- Animations disabled when user requests reduced motion
- Background effects hidden
- Instant transitions

---

## 🔒 Security

### Zero External Dependencies

Verified via:
1. DevTools Network tab (filter by domain)
2. Sealed Artifact Verification panel (homepage)
3. Performance API query:
   ```javascript
   performance.getEntriesByType('resource').filter(r => {
     const url = new URL(r.name);
     return url.origin !== window.location.origin;
   }).length  // = 0
   ```

### Security Headers

Strong security posture (see `SECURITY-HEADERS.md`):
- **CSP:** `default-src 'none'` (whitelist approach)
- **HSTS:** `max-age=31536000; includeSubDomains; preload`
- **Referrer-Policy:** `no-referrer`
- **Permissions-Policy:** All unnecessary features blocked

Target Grade: **A+** on [securityheaders.com](https://securityheaders.com)

---

## ♿ Accessibility

### WCAG AA Compliance

- **Color Contrast:** All text meets 4.5:1 minimum (most exceed 9:1)
- **Keyboard Navigation:** Full site navigable without mouse
- **Screen Readers:** Semantic HTML, ARIA labels where needed
- **Focus Indicators:** Visible focus states with glow rings
- **Skip Links:** "Skip to main content" link for keyboard users

### Testing

```bash
# Automated accessibility testing
npx pa11y http://localhost:8000
npx pa11y http://localhost:8000/pages/brief.html

# Manual testing
# - Tab through all interactive elements
# - Test with screen reader (NVDA, VoiceOver)
# - Enable reduced motion preference
```

---

## 📊 Performance

### Target Metrics

- **First Contentful Paint:** < 1.5s
- **Largest Contentful Paint:** < 2.5s
- **Cumulative Layout Shift:** < 0.1
- **Total Page Size:** < 200KB (compressed)

### Lighthouse Scores

Target:
- Performance: 90+
- Accessibility: 100
- Best Practices: 100
- SEO: 100

### Optimization

- Minimal JavaScript (< 50KB total)
- Self-hosted assets (no CDN latency)
- Aggressive caching for static assets (max-age=31536000)
- No-cache for HTML (allows instant updates)

---

## 🧪 Testing

### QA Checklist

See `QA-CHECKLIST.md` for comprehensive testing guide.

**Quick Smoke Test:**
```bash
# 1. Zero external requests
# Open DevTools → Network → Reload
# Verify: Only localhost requests

# 2. Works without JS
# DevTools → Settings → Disable JavaScript
# Verify: Navigation, content, forms work

# 3. Mobile responsive
# DevTools → Device Toolbar → iPhone SE
# Verify: Readable, tappable, no horizontal scroll

# 4. Keyboard navigation
# Tab through all elements
# Verify: Focus visible, command palette opens (Ctrl+K)

# 5. Security headers
curl -I https://cytherai.com | grep CSP
```

---

## 🌐 Browser Support

**Tested & Supported:**
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile Safari (iOS 14+)
- Mobile Chrome (Android)

**Graceful Degradation:**
- Site functional in older browsers
- Progressive enhancement for modern features

---

## 📝 Content Guidelines

### Tone & Voice

- **Protocol-like:** Use "INITIATE CONTACT", not "Sign Up"
- **Honest:** "Alpha status, not production-ready" (no overselling)
- **Technical:** Assume technical audience (CTO/CEO level)
- **Sparse:** High-signal, minimal marketing fluff

### Copy Examples

✅ **Good:**
- "REQUEST BRIEFING"
- "No tracking. Plain email. Response window 24–48h."
- "Offline-capable AI systems engineered for verification"

❌ **Avoid:**
- "Get Started"
- "Join thousands of happy customers!"
- "The world's best AI system"

---

## 🔧 Customization

### Before Deployment

**1. Update Placeholder Content:**
- [ ] Email addresses in `pages/contact.html` (contact@, security@, nda@)
- [ ] Legal jurisdiction in `pages/terms.html` and `pages/privacy.html`
- [ ] Organization name in footer

**2. Configure Contact Form:**
- [ ] Replace Formspree placeholder in `pages/contact.html`
- [ ] Or implement custom backend (PHP, serverless function, etc.)

**3. Set Build Hash (Optional):**
- [ ] Update `js/sealed-artifact.js` with CI/CD build hash
- [ ] Or inject dynamically during build

**4. Add Real OG Image (Optional):**
- [ ] Replace `assets/images/og-image.svg` with PNG (1200x630px)

---

## 📦 Deployment

See `DEPLOYMENT.md` for full guide.

**Quick Nginx Setup:**
```bash
# 1. Deploy files
rsync -avz ./ user@server:/var/www/cytherai/

# 2. Configure Nginx (see DEPLOYMENT.md)

# 3. Obtain SSL certificate
sudo certbot --nginx -d cytherai.com

# 4. Test
curl -I https://cytherai.com
```

---

## 📚 Documentation

- **SECURITY-HEADERS.md** - Security headers configuration
- **QA-CHECKLIST.md** - Comprehensive testing checklist
- **DEPLOYMENT.md** - Deployment guide (Nginx, Apache, CDN)
- **README-PRODUCTION.md** - This file

---

## 🐛 Known Issues

None currently. Report issues to: contact@cytherai.com

---

## 📄 License

[Specify License - e.g., MIT, Apache 2.0, Proprietary]

---

## 🤝 Contributing

This is a production teaser site. Contributions limited to:
- Bug fixes (security, accessibility, performance)
- Documentation improvements

For major changes, open an issue first.

---

## 📞 Support

- **General:** contact@cytherai.com
- **Security:** security@cytherai.com
- **Technical:** devops@cytherai.com

---

## 🏆 Credits

**Design Philosophy:** Sealed artifact aesthetic, zero external dependencies
**Built With:** Vanilla HTML, CSS, JavaScript (no frameworks)
**Inspired By:** Terminal interfaces, classified documents, mathematical rigor

---

## 📈 Roadmap

- [x] Production-ready HTML/CSS/JS
- [x] Zero external dependencies
- [x] Command palette
- [x] Sealed artifact verification
- [x] Full accessibility compliance
- [ ] Optional: Service worker for offline capability
- [ ] Optional: Formal verification dashboard (future)

---

**Last Updated:** January 12, 2026
**Version:** 1.0.0
**Status:** Production-Ready
