# CytherAI Production QA Checklist

## Pre-Deployment Checklist

Use this checklist to verify the CytherAI teaser website meets all production-ready requirements before deployment.

---

## ✓ Acceptance Criteria (MUST PASS)

### 1. Zero External Requests

- [ ] **Homepage loads with ZERO third-party requests**
  - Test: Open DevTools → Network tab → Reload page
  - Filter by domain (should only see requests to your domain)
  - Verify: No CDN, no Google Fonts, no analytics, no trackers

- [ ] **All pages load without external dependencies**
  - Test each page: /, /pages/brief.html, /pages/contact.html, /pages/security.html, /pages/privacy.html, /pages/terms.html
  - Confirm: All CSS, JS, fonts, images served from same origin

- [ ] **Sealed Artifact Verification displays "0 External Requests"**
  - Homepage verification panel shows: External Requests = 0, External Origins = NONE
  - Test after page load completes (wait 5 seconds)

**How to Verify:**
```bash
# Open browser console and run:
performance.getEntriesByType('resource').filter(r => {
  const url = new URL(r.name);
  return url.origin !== window.location.origin;
}).length  // Should be 0
```

---

### 2. Progressive Enhancement (Works Without JS)

- [ ] **Primary CTA accessible without JavaScript**
  - Disable JavaScript in browser
  - Click "REQUEST BRIEFING" button
  - Verify: Navigates to /pages/contact.html

- [ ] **Navigation works without JavaScript**
  - All nav links functional (/, /pages/brief.html, /pages/contact.html)
  - Anchor links scroll to sections

- [ ] **Contact form submits without JavaScript**
  - Fill out contact form with JS disabled
  - Click "TRANSMIT MESSAGE"
  - Verify: Form submits (backend dependent, but form action should be set)

- [ ] **Content readable without JavaScript**
  - All text visible and styled correctly
  - Disclosure modules (details/summary) expand/collapse natively

---

### 3. Mobile Responsiveness

- [ ] **Homepage looks intentional on mobile (375px width)**
  - Open DevTools → Device toolbar → iPhone SE
  - Check: Text readable, buttons tappable, no horizontal scroll

- [ ] **Navigation usable on mobile**
  - Nav links readable and tappable (min 44x44px touch targets)
  - No overlapping elements

- [ ] **Disclosure modules work on mobile**
  - Tap to open/close
  - Content fits viewport width

- [ ] **Forms usable on mobile**
  - Input fields full-width
  - Submit button full-width
  - Keyboard doesn't obscure inputs

**Test Viewports:**
- 375px (iPhone SE)
- 768px (iPad)
- 1024px (Desktop)

---

### 4. Keyboard Navigation

- [ ] **Can navigate entire site with Tab key only**
  - Tab through all interactive elements
  - Verify: Visible focus indicators on all elements

- [ ] **Command Palette opens with Ctrl/Cmd+K**
  - Press Ctrl+K (Windows) or Cmd+K (Mac)
  - Verify: Palette opens with search input focused

- [ ] **Command Palette navigable with keyboard**
  - Arrow keys select commands
  - Enter executes selected command
  - Escape closes palette

- [ ] **Disclosure modules toggleable with Enter/Space**
  - Focus on disclosure header
  - Press Enter or Space
  - Verify: Opens/closes

- [ ] **Skip to main content link works**
  - Tab once from page load
  - Verify: "Skip to main content" link appears
  - Press Enter → focus jumps to main content

---

### 5. Reduced Motion Respect

- [ ] **Animations disabled when prefers-reduced-motion is enabled**
  - DevTools → Rendering → Emulate CSS media feature `prefers-reduced-motion: reduce`
  - Reload page
  - Verify: No animations, transitions instant

- [ ] **Background particles/effects hidden**
  - With reduced motion enabled
  - Verify: No particle systems, no background animations

---

### 6. Accessibility (WCAG AA Compliance)

- [ ] **Color contrast passes WCAG AA (4.5:1 minimum)**
  - Test with [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
  - Primary text: #f5f5f0 on #050508 = 18.5:1 ✓
  - Secondary text: #b5b4af on #050508 = 9.1:1 ✓
  - Muted text: #8b8a85 on #050508 = 6.2:1 ✓

- [ ] **All images have alt text**
  - Check all `<img>` tags have meaningful `alt` attributes
  - Decorative images use `alt=""`

- [ ] **Form inputs have labels**
  - All inputs have associated `<label>` elements
  - Labels visible and descriptive

- [ ] **Heading hierarchy is logical**
  - One `<h1>` per page
  - No skipped levels (h1 → h3)
  - Test with [WAVE](https://wave.webaim.org/)

- [ ] **Link text is descriptive**
  - No "click here" links
  - Links make sense out of context

**Automated Test:**
```bash
# Install pa11y
npm install -g pa11y

# Test pages
pa11y http://localhost:8000
pa11y http://localhost:8000/pages/brief.html
```

---

### 7. Performance

- [ ] **First Contentful Paint < 1.5s**
  - DevTools → Lighthouse → Run audit
  - Target: FCP < 1.5s

- [ ] **Largest Contentful Paint < 2.5s**
  - Target: LCP < 2.5s

- [ ] **Cumulative Layout Shift < 0.1**
  - No layout jumps during load
  - Target: CLS < 0.1

- [ ] **Total page size < 500KB (uncompressed)**
  - Network tab → Transferred size
  - With gzip/brotli, should be < 200KB

- [ ] **JavaScript execution time < 200ms**
  - DevTools → Performance → Record page load
  - Check scripting time

**Target Lighthouse Scores:**
- Performance: 90+
- Accessibility: 100
- Best Practices: 100
- SEO: 100

---

### 8. Security

- [ ] **All security headers present**
  - Visit [securityheaders.com](https://securityheaders.com)
  - Test: https://yourdomain.com
  - Target grade: A+

- [ ] **CSP blocks external resources**
  - Attempt to load external script via console:
    ```javascript
    const script = document.createElement('script');
    script.src = 'https://cdn.example.com/test.js';
    document.body.appendChild(script);
    ```
  - Verify: CSP violation in console, script blocked

- [ ] **HTTPS enforced**
  - HTTP requests redirect to HTTPS
  - HSTS header present

- [ ] **No mixed content warnings**
  - All resources loaded over HTTPS
  - No HTTP images, scripts, or stylesheets

---

### 9. Cross-Browser Testing

Test on:

- [ ] **Chrome (latest)**
  - All features work
  - No console errors

- [ ] **Firefox (latest)**
  - All features work
  - No console errors

- [ ] **Safari (latest)**
  - All features work
  - Webkit-specific bugs checked

- [ ] **Edge (latest)**
  - All features work
  - No console errors

- [ ] **Mobile Safari (iOS)**
  - Touch interactions work
  - No viewport issues

- [ ] **Mobile Chrome (Android)**
  - Touch interactions work
  - No viewport issues

---

## ✓ Content Verification

### 10. Copy & Messaging

- [ ] **Plain-language tagline present**
  - Homepage includes: "Sovereign AI systems built as sealed artifacts: offline-capable, inspectable, and engineered for verification."
  - Or similar clear, jargon-free description

- [ ] **No vague claims**
  - All technical claims specific and defensible
  - No "best", "fastest", "most secure" without evidence

- [ ] **Limitations section honest**
  - Clearly states: Alpha status, not production-ready
  - Lists: What's NOT verified, what's research-stage

- [ ] **CTA uses in-universe language**
  - Labels: "REQUEST BRIEFING", "LEAVE COORDINATES", "INITIATE CONTACT"
  - Not: "Sign Up", "Get Started", "Try Now"

- [ ] **Microcopy matches vibe**
  - "No tracking. Plain email. Response window 24–48h."
  - Tone: Protocol-like, not marketing-speak

---

### 11. Contact & Legal

- [ ] **Contact emails valid**
  - contact@cytherai.com
  - security@cytherai.com
  - nda@cytherai.com
  - (Update with real emails before deployment)

- [ ] **Privacy policy reflects reality**
  - Confirms: Zero analytics, no cookies, no tracking
  - Matches sealed artifact verification data

- [ ] **Terms updated with jurisdiction**
  - Replace placeholders: [SPECIFY JURISDICTION], [LEGAL ENTITY]

---

## ✓ Functional Tests

### 12. Command Palette

- [ ] **Opens with Ctrl/Cmd+K**
- [ ] **Closes with Escape**
- [ ] **Search filters commands**
  - Type "brief" → filters to BRIEFING commands
- [ ] **Arrow keys navigate**
- [ ] **Enter executes command**
- [ ] **"REQUEST BRIEFING" navigates to /pages/brief.html**
- [ ] **"INITIATE CONTACT" navigates to /pages/contact.html**
- [ ] **"COPY CONTACT EMAIL" copies to clipboard**
- [ ] **"GENERATE ARTIFACT REPORT" downloads JSON**

---

### 13. Sealed Artifact Verification

- [ ] **Displays on homepage**
- [ ] **External Requests count = 0**
- [ ] **External Origins = "NONE"**
- [ ] **Build hash displayed** (format: BUILD: xxxxxxxxxxxxxxxx)
- [ ] **Updates in real-time** (monitors Performance API)
- [ ] **Download report works** (Cmd+K → "Generate Artifact Report")

**Sample Report Format:**
```json
{
  "externalRequests": 0,
  "externalOrigins": [],
  "buildHash": "a1b2c3d4e5f6g7h8",
  "timestamp": "2026-01-12T..."
}
```

---

### 14. Disclosure Modules

- [ ] **Click to expand/collapse**
- [ ] **Indicator rotates 180° when open**
- [ ] **Content accessible without JS** (native `<details>` element)
- [ ] **Smooth animation** (unless reduced motion)
- [ ] **All 4 modules present:**
  - Deployment Model
  - Threat Model
  - Guarantees
  - Limitations

---

## ✓ SEO & Meta

### 15. Meta Tags

- [ ] **Title tags unique per page**
  - Home: "CytherAI | Sovereign AI Systems Built as Sealed Artifacts"
  - Brief: "Technical Brief | CytherAI"
  - Etc.

- [ ] **Meta descriptions present (150-160 chars)**
- [ ] **OG tags present:**
  - og:title
  - og:description
  - og:image (/assets/images/og-image.svg)
  - og:url

- [ ] **Twitter card tags present**
- [ ] **Canonical URLs set** (if applicable)

---

## ✓ Files & Structure

### 16. File Organization

- [ ] **CSS in /css/ directory**
  - /css/cytherai.css

- [ ] **JS in /js/ directory**
  - /js/cytherai.js
  - /js/command-palette.js
  - /js/sealed-artifact.js

- [ ] **Pages in /pages/ directory**
  - /pages/brief.html
  - /pages/contact.html
  - /pages/security.html
  - /pages/privacy.html
  - /pages/terms.html

- [ ] **Assets in /assets/ directory**
  - /assets/images/og-image.svg
  - (Add more as needed)

---

## ✓ Deployment Readiness

### 17. Pre-Deploy

- [ ] **All placeholder content replaced**
  - Email addresses updated
  - Legal jurisdiction specified
  - Contact form backend configured

- [ ] **Build hash updated** (if using CI/CD)
  - Update in sealed-artifact.js or inject at build time

- [ ] **Robots.txt present** (if needed)
- [ ] **Sitemap.xml present** (if needed)
- [ ] **Favicon set** (recommended)

---

## Testing Workflow

### Local Testing
```bash
# Start local server
python3 -m http.server 8000

# Open browser
open http://localhost:8000

# Run through checklist above
```

### Staging Environment
1. Deploy to staging URL (e.g., staging.cytherai.com)
2. Run full checklist
3. Share with stakeholders for review
4. Fix issues, repeat

### Production
1. Deploy to production
2. Smoke test critical paths (homepage, contact form)
3. Verify security headers (securityheaders.com)
4. Monitor error logs for 24 hours

---

## Automated Testing Script

```bash
#!/bin/bash
# qa-test.sh

echo "🔍 Running CytherAI QA Tests..."

# Test 1: Zero External Requests
echo "\n✓ Test 1: Checking for external requests..."
# (Use a headless browser script or manual verification)

# Test 2: Lighthouse Performance
echo "\n✓ Test 2: Running Lighthouse..."
npx lighthouse http://localhost:8000 --output html --output-path ./lighthouse-report.html

# Test 3: Accessibility
echo "\n✓ Test 3: Running pa11y..."
npx pa11y http://localhost:8000

# Test 4: Security Headers
echo "\n✓ Test 4: Checking security headers..."
curl -I http://localhost:8000 | grep -E "(Content-Security-Policy|X-Content-Type-Options|Referrer-Policy)"

echo "\n✅ QA Tests Complete. Review reports above."
```

---

## Sign-Off

- [ ] **Developer:** QA checklist completed, all tests pass
- [ ] **Designer:** Visual review approved, branding consistent
- [ ] **Stakeholder:** Content approved, messaging aligned
- [ ] **Security:** Headers verified, no critical vulnerabilities
- [ ] **Legal:** Privacy/Terms reviewed and approved

**Date:** _____________

**Ready for Production:** [ ] YES [ ] NO

---

## Post-Launch Monitoring

**First 24 Hours:**
- [ ] Monitor server logs for errors
- [ ] Check uptime (should be 100%)
- [ ] Verify analytics (if any) show traffic
- [ ] Test contact form submissions work

**First Week:**
- [ ] Re-run Lighthouse (performance regression check)
- [ ] Re-verify security headers (config drift check)
- [ ] Review user feedback (if any)

**Monthly:**
- [ ] Run full QA checklist again
- [ ] Update dependencies (if any)
- [ ] Check for broken links
