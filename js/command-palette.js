/**
 * COMMAND PALETTE MODULE
 * In-universe command system for CytherAI
 * Keyboard-driven (Ctrl/Cmd+K) protocol interface
 */

class CommandPalette {
    constructor() {
        this.isActive = false;
        this.selectedIndex = 0;
        this.filteredCommands = [];

        // Define available commands
        this.commands = [
            {
                id: 'briefing',
                title: 'REQUEST BRIEFING',
                description: 'Access technical overview',
                action: () => window.location.href = '/pages/brief.html',
                keywords: ['brief', 'technical', 'overview', 'docs']
            },
            {
                id: 'contact',
                title: 'INITIATE CONTACT',
                description: 'Leave coordinates for response',
                action: () => window.location.href = '/pages/contact.html',
                keywords: ['contact', 'email', 'reach', 'coordinates']
            },
            {
                id: 'security',
                title: 'SECURITY PROTOCOL',
                description: 'View vulnerability disclosure',
                action: () => window.location.href = '/pages/security.html',
                keywords: ['security', 'vulnerability', 'disclosure', 'bug']
            },
            {
                id: 'copy-email',
                title: 'COPY CONTACT EMAIL',
                description: 'contact@cytherai.com',
                action: () => {
                    navigator.clipboard.writeText('contact@cytherai.com').then(() => {
                        this.close();
                        this.showNotification('Email copied to clipboard');
                    });
                },
                keywords: ['copy', 'email', 'clipboard']
            },
            {
                id: 'threat-model',
                title: 'OPEN THREAT MODEL',
                description: 'View security posture',
                action: () => {
                    this.close();
                    const threatEl = document.getElementById('threat-model');
                    if (threatEl) {
                        threatEl.setAttribute('open', '');
                        threatEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                },
                keywords: ['threat', 'security', 'model', 'risks']
            },
            {
                id: 'deployment',
                title: 'OPEN DEPLOYMENT MODEL',
                description: 'View deployment architecture',
                action: () => {
                    this.close();
                    const deploymentEl = document.getElementById('deployment-model');
                    if (deploymentEl) {
                        deploymentEl.setAttribute('open', '');
                        deploymentEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                },
                keywords: ['deployment', 'architecture', 'infrastructure']
            },
            {
                id: 'limitations',
                title: 'OPEN LIMITATIONS',
                description: 'View current constraints',
                action: () => {
                    this.close();
                    const limitsEl = document.getElementById('limitations');
                    if (limitsEl) {
                        limitsEl.setAttribute('open', '');
                        limitsEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                },
                keywords: ['limitations', 'constraints', 'bounds', 'limits']
            },
            {
                id: 'artifact-report',
                title: 'GENERATE ARTIFACT REPORT',
                description: 'Download verification data',
                action: () => {
                    if (window.sealedArtifact) {
                        const report = window.sealedArtifact.getReport();
                        this.downloadJSON(report, 'sealed-artifact-report.json');
                        this.close();
                        this.showNotification('Report downloaded');
                    }
                },
                keywords: ['report', 'artifact', 'verification', 'download']
            }
        ];

        this.init();
    }

    /**
     * Initialize command palette
     */
    init() {
        this.createUI();
        this.bindEvents();
    }

    /**
     * Create command palette UI
     */
    createUI() {
        const palette = document.createElement('div');
        palette.className = 'command-palette';
        palette.id = 'command-palette';
        palette.innerHTML = `
            <div class="command-container" role="dialog" aria-label="Command Palette">
                <input
                    type="text"
                    class="command-input"
                    id="command-input"
                    placeholder="Type a command..."
                    aria-label="Command search"
                    autocomplete="off"
                />
                <div class="command-results" id="command-results" role="listbox">
                </div>
            </div>
        `;

        document.body.appendChild(palette);

        // Close on backdrop click
        palette.addEventListener('click', (e) => {
            if (e.target === palette) {
                this.close();
            }
        });
    }

    /**
     * Bind keyboard events
     */
    bindEvents() {
        // Global keyboard shortcut
        document.addEventListener('keydown', (e) => {
            // Cmd+K or Ctrl+K
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                this.toggle();
            }

            // Escape to close
            if (e.key === 'Escape' && this.isActive) {
                e.preventDefault();
                this.close();
            }

            // Arrow navigation when palette is active
            if (this.isActive) {
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    this.selectNext();
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    this.selectPrevious();
                } else if (e.key === 'Enter') {
                    e.preventDefault();
                    this.executeSelected();
                }
            }
        });

        // Input event for filtering
        const input = document.getElementById('command-input');
        if (input) {
            input.addEventListener('input', (e) => {
                this.filterCommands(e.target.value);
            });
        }
    }

    /**
     * Toggle palette visibility
     */
    toggle() {
        if (this.isActive) {
            this.close();
        } else {
            this.open();
        }
    }

    /**
     * Open palette
     */
    open() {
        const palette = document.getElementById('command-palette');
        const input = document.getElementById('command-input');

        if (palette && input) {
            this.isActive = true;
            palette.classList.add('active');
            input.value = '';
            input.focus();
            this.filterCommands('');
        }
    }

    /**
     * Close palette
     */
    close() {
        const palette = document.getElementById('command-palette');
        const input = document.getElementById('command-input');

        if (palette && input) {
            this.isActive = false;
            palette.classList.remove('active');
            input.blur();
            this.selectedIndex = 0;
        }
    }

    /**
     * Filter commands based on search query
     */
    filterCommands(query) {
        const lowerQuery = query.toLowerCase();

        if (!query) {
            this.filteredCommands = [...this.commands];
        } else {
            this.filteredCommands = this.commands.filter(cmd => {
                return (
                    cmd.title.toLowerCase().includes(lowerQuery) ||
                    cmd.description.toLowerCase().includes(lowerQuery) ||
                    cmd.keywords.some(kw => kw.includes(lowerQuery))
                );
            });
        }

        this.selectedIndex = 0;
        this.renderResults();
    }

    /**
     * Render command results
     */
    renderResults() {
        const results = document.getElementById('command-results');
        if (!results) return;

        if (this.filteredCommands.length === 0) {
            results.innerHTML = '<div class="command-item"><div class="command-title">No commands found</div></div>';
            return;
        }

        results.innerHTML = this.filteredCommands.map((cmd, index) => `
            <div
                class="command-item ${index === this.selectedIndex ? 'selected' : ''}"
                data-index="${index}"
                role="option"
                aria-selected="${index === this.selectedIndex}"
            >
                <div class="command-title">${cmd.title}</div>
                <div class="command-description">${cmd.description}</div>
            </div>
        `).join('');

        // Add click handlers
        results.querySelectorAll('.command-item').forEach((item, index) => {
            item.addEventListener('click', () => {
                this.selectedIndex = index;
                this.executeSelected();
            });

            item.addEventListener('mouseenter', () => {
                this.selectedIndex = index;
                this.renderResults();
            });
        });
    }

    /**
     * Select next command
     */
    selectNext() {
        this.selectedIndex = (this.selectedIndex + 1) % this.filteredCommands.length;
        this.renderResults();
    }

    /**
     * Select previous command
     */
    selectPrevious() {
        this.selectedIndex = (this.selectedIndex - 1 + this.filteredCommands.length) % this.filteredCommands.length;
        this.renderResults();
    }

    /**
     * Execute selected command
     */
    executeSelected() {
        const command = this.filteredCommands[this.selectedIndex];
        if (command && command.action) {
            command.action();
        }
    }

    /**
     * Show notification
     */
    showNotification(message) {
        // Simple notification - could be enhanced
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            bottom: 2rem;
            right: 2rem;
            background: var(--bg-elevated);
            border: 1px solid var(--gold);
            padding: 1rem 1.5rem;
            border-radius: var(--radius-sm);
            font-family: var(--font-mono);
            font-size: 0.875rem;
            color: var(--gold-bright);
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
            z-index: 10001;
            animation: slideInUp 0.3s ease;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 2000);
    }

    /**
     * Download JSON file
     */
    downloadJSON(data, filename) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.commandPalette = new CommandPalette();
    });
} else {
    window.commandPalette = new CommandPalette();
}

export default CommandPalette;
