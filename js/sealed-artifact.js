/**
 * SEALED ARTIFACT VERIFICATION MODULE
 * Monitors and reports external requests, origins, and build integrity
 * Zero external dependencies - runs entirely client-side
 */

class SealedArtifactMonitor {
    constructor() {
        this.externalRequests = [];
        this.externalOrigins = new Set();
        this.buildHash = this.generateBuildHash();
        this.initialized = false;
    }

    /**
     * Initialize monitoring
     */
    init() {
        if (this.initialized) return;

        // Monitor all resource loading
        this.monitorResources();

        // Update display
        this.updateDisplay();

        // Set up periodic checks
        setInterval(() => this.updateDisplay(), 2000);

        this.initialized = true;
    }

    /**
     * Monitor resource loading via Performance API
     */
    monitorResources() {
        if (!window.performance || !window.performance.getEntriesByType) {
            console.warn('Performance API not available');
            return;
        }

        // Check resources loaded so far
        this.checkExistingResources();

        // Monitor new resources via PerformanceObserver
        if (window.PerformanceObserver) {
            const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    this.analyzeResource(entry);
                }
            });

            try {
                observer.observe({ entryTypes: ['resource'] });
            } catch (e) {
                console.warn('PerformanceObserver failed:', e);
            }
        }
    }

    /**
     * Check resources that were loaded before monitoring started
     */
    checkExistingResources() {
        const resources = performance.getEntriesByType('resource');
        resources.forEach(resource => this.analyzeResource(resource));
    }

    /**
     * Analyze a resource entry to determine if it's external
     */
    analyzeResource(resource) {
        const resourceUrl = new URL(resource.name, window.location.href);
        const currentOrigin = window.location.origin;

        // Check if resource is from external origin
        if (resourceUrl.origin !== currentOrigin) {
            this.externalRequests.push({
                url: resource.name,
                type: resource.initiatorType,
                origin: resourceUrl.origin,
                timestamp: Date.now()
            });

            this.externalOrigins.add(resourceUrl.origin);
        }
    }

    /**
     * Generate a deterministic build hash based on page content
     * In production, this would come from your build pipeline
     */
    generateBuildHash() {
        // For demo purposes, use a timestamp-based hash
        // In production, replace with actual build hash from CI/CD
        const buildInfo = {
            version: '1.0.0',
            timestamp: '2026-01-12T00:00:00Z',
            environment: 'production'
        };

        return this.hashString(JSON.stringify(buildInfo)).substring(0, 16);
    }

    /**
     * Simple hash function for demo purposes
     * In production, use actual SHA-256 from build pipeline
     */
    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(16).padStart(16, '0');
    }

    /**
     * Update the verification display
     */
    updateDisplay() {
        const externalCountEl = document.getElementById('artifact-external-count');
        const originsCountEl = document.getElementById('artifact-origins-count');
        const buildHashEl = document.getElementById('artifact-build-hash');

        if (externalCountEl) {
            externalCountEl.textContent = this.externalRequests.length;
            externalCountEl.className = this.externalRequests.length === 0 ? 'status-value ok' : 'status-value warning';
        }

        if (originsCountEl) {
            const originsList = this.externalOrigins.size === 0 ? 'NONE' : Array.from(this.externalOrigins).join(', ');
            originsCountEl.textContent = originsList;
            originsCountEl.className = this.externalOrigins.size === 0 ? 'status-value ok' : 'status-value warning';
        }

        if (buildHashEl) {
            buildHashEl.textContent = `BUILD: ${this.buildHash}`;
        }
    }

    /**
     * Get monitoring report
     */
    getReport() {
        return {
            externalRequests: this.externalRequests.length,
            externalOrigins: Array.from(this.externalOrigins),
            buildHash: this.buildHash,
            timestamp: new Date().toISOString()
        };
    }
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.sealedArtifact = new SealedArtifactMonitor();
        window.sealedArtifact.init();
    });
} else {
    window.sealedArtifact = new SealedArtifactMonitor();
    window.sealedArtifact.init();
}

export default SealedArtifactMonitor;
