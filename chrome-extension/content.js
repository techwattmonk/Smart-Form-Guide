// Smart Form Guide - Content Script for Form Detection and Auto-fill
class FormAssistant {
    constructor() {
        this.detectedFields = [];
        this.selectedProject = null;
        this.floatingPanel = null;
        this.isActive = false;
        
        this.init();
    }

    async init() {
        console.log('🔍 Smart Form Guide - Form Assistant initialized on:', window.location.hostname);
        
        // Load selected project
        await this.loadSelectedProject();
        
        // Detect if this is a government/permit website
        if (this.isPermitWebsite()) {
            console.log('🏛️ Permit website detected');
            
            // Start form detection
            this.detectForms();
            
            // Create floating panel
            this.createFloatingPanel();
            
            // Monitor for dynamic content
            this.startMutationObserver();
        }
    }

    async loadSelectedProject() {
        try {
            if (chrome.storage && chrome.storage.local) {
                const result = await chrome.storage.local.get(['selectedProject']);
                this.selectedProject = result.selectedProject;
                console.log('📁 Selected project loaded:', this.selectedProject?.name);
            }
        } catch (error) {
            console.error('❌ Error loading selected project:', error);
        }
    }

    isPermitWebsite() {
        const hostname = window.location.hostname.toLowerCase();
        const permitIndicators = [
            '.gov',
            'accela.com',
            'permitflow.com',
            'permits',
            'building',
            'planning',
            'development'
        ];
        
        return permitIndicators.some(indicator => hostname.includes(indicator));
    }

    detectForms() {
        // Find all forms on the page
        const forms = document.querySelectorAll('form');
        console.log(`📋 Found ${forms.length} forms on page`);
        
        forms.forEach((form, index) => {
            this.analyzeForm(form, index);
        });
        
        // Also detect standalone input fields (not in forms)
        this.detectStandaloneFields();
        
        console.log(`🎯 Total detected fields: ${this.detectedFields.length}`);
        
        if (this.detectedFields.length > 0) {
            this.updateFloatingPanel();
        }
    }

    analyzeForm(form, formIndex) {
        const inputs = form.querySelectorAll('input, select, textarea');
        
        inputs.forEach((input, inputIndex) => {
            const fieldInfo = this.analyzeField(input, formIndex, inputIndex);
            if (fieldInfo) {
                this.detectedFields.push(fieldInfo);
            }
        });
    }

    analyzeField(element, formIndex, inputIndex) {
        // Skip hidden, submit, and button inputs
        if (element.type === 'hidden' || element.type === 'submit' || element.type === 'button') {
            return null;
        }

        // Get field information
        const fieldInfo = {
            element: element,
            id: element.id || `form_${formIndex}_input_${inputIndex}`,
            name: element.name || '',
            type: element.type || element.tagName.toLowerCase(),
            label: this.getFieldLabel(element),
            placeholder: element.placeholder || '',
            value: element.value || '',
            required: element.required,
            fieldType: this.classifyField(element),
            confidence: 0
        };

        // Calculate confidence score for auto-fill
        fieldInfo.confidence = this.calculateConfidence(fieldInfo);

        return fieldInfo;
    }

    getFieldLabel(element) {
        // Try to find associated label
        let label = '';
        
        // Check for label element
        if (element.id) {
            const labelElement = document.querySelector(`label[for="${element.id}"]`);
            if (labelElement) {
                label = labelElement.textContent.trim();
            }
        }
        
        // Check for parent label
        if (!label) {
            const parentLabel = element.closest('label');
            if (parentLabel) {
                label = parentLabel.textContent.replace(element.value, '').trim();
            }
        }
        
        // Check for nearby text
        if (!label) {
            const parent = element.parentElement;
            if (parent) {
                const textNodes = Array.from(parent.childNodes)
                    .filter(node => node.nodeType === Node.TEXT_NODE)
                    .map(node => node.textContent.trim())
                    .filter(text => text.length > 0);
                
                if (textNodes.length > 0) {
                    label = textNodes[0];
                }
            }
        }
        
        return label;
    }

    classifyField(element) {
        const text = (element.name + ' ' + element.id + ' ' + element.placeholder + ' ' + this.getFieldLabel(element)).toLowerCase();
        
        // Common field types for permit applications
        const fieldTypes = {
            'name': ['name', 'applicant', 'owner', 'contractor'],
            'email': ['email', 'e-mail'],
            'phone': ['phone', 'telephone', 'mobile', 'cell'],
            'address': ['address', 'street', 'location'],
            'city': ['city', 'municipality'],
            'state': ['state', 'province'],
            'zip': ['zip', 'postal', 'zipcode'],
            'date': ['date', 'when', 'time'],
            'description': ['description', 'details', 'notes', 'comments'],
            'value': ['value', 'cost', 'amount', 'price', '$'],
            'area': ['area', 'square', 'sqft', 'size'],
            'permit_type': ['permit', 'type', 'category'],
            'project_description': ['project', 'work', 'scope']
        };
        
        for (const [type, keywords] of Object.entries(fieldTypes)) {
            if (keywords.some(keyword => text.includes(keyword))) {
                return type;
            }
        }
        
        return 'unknown';
    }

    calculateConfidence(fieldInfo) {
        let confidence = 0;
        
        // Higher confidence for known field types
        if (fieldInfo.fieldType !== 'unknown') {
            confidence += 0.5;
        }
        
        // Higher confidence for required fields
        if (fieldInfo.required) {
            confidence += 0.2;
        }
        
        // Higher confidence for fields with clear labels
        if (fieldInfo.label && fieldInfo.label.length > 2) {
            confidence += 0.3;
        }
        
        return Math.min(confidence, 1.0);
    }

    detectStandaloneFields() {
        // Detect input fields that are not inside forms
        const standaloneInputs = document.querySelectorAll('input:not(form input), select:not(form select), textarea:not(form textarea)');
        
        standaloneInputs.forEach((input, index) => {
            const fieldInfo = this.analyzeField(input, -1, index);
            if (fieldInfo) {
                this.detectedFields.push(fieldInfo);
            }
        });
    }

    createFloatingPanel() {
        // Create floating assistance panel
        this.floatingPanel = document.createElement('div');
        this.floatingPanel.id = 'smart-form-guide-panel';
        this.floatingPanel.innerHTML = `
            <div class="sfg-panel-header">
                <div class="sfg-logo">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M9 12l2 2 4-4"></path>
                        <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"></path>
                        <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3"></path>
                    </svg>
                    <span>Smart Form Guide</span>
                </div>
                <button class="sfg-close-btn" id="sfg-close">×</button>
            </div>
            <div class="sfg-panel-content">
                <div class="sfg-status">
                    <div class="sfg-status-dot scanning"></div>
                    <span>Scanning for form fields...</span>
                </div>
                <div class="sfg-fields-info" id="sfg-fields-info" style="display: none;">
                    <p class="sfg-fields-count">Found <span id="sfg-count">0</span> fillable fields</p>
                    <button class="sfg-auto-fill-btn" id="sfg-auto-fill" disabled>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="20,6 9,17 4,12"></polyline>
                        </svg>
                        Auto-fill Fields
                    </button>
                </div>
                <div class="sfg-no-project" id="sfg-no-project" style="display: none;">
                    <p>Select a project in the extension popup to enable auto-fill</p>
                </div>
            </div>
        `;
        
        document.body.appendChild(this.floatingPanel);
        
        // Add event listeners
        document.getElementById('sfg-close').addEventListener('click', () => {
            this.floatingPanel.style.display = 'none';
        });
        
        document.getElementById('sfg-auto-fill').addEventListener('click', () => {
            this.autoFillFields();
        });
        
        // Make panel draggable
        this.makePanelDraggable();
    }

    updateFloatingPanel() {
        if (!this.floatingPanel) return;
        
        const statusElement = this.floatingPanel.querySelector('.sfg-status');
        const fieldsInfo = document.getElementById('sfg-fields-info');
        const noProject = document.getElementById('sfg-no-project');
        const countElement = document.getElementById('sfg-count');
        const autoFillBtn = document.getElementById('sfg-auto-fill');
        
        if (this.detectedFields.length > 0) {
            statusElement.style.display = 'none';
            
            if (this.selectedProject) {
                fieldsInfo.style.display = 'block';
                noProject.style.display = 'none';
                countElement.textContent = this.detectedFields.length;
                autoFillBtn.disabled = false;
            } else {
                fieldsInfo.style.display = 'none';
                noProject.style.display = 'block';
            }
        }
    }

    makePanelDraggable() {
        const header = this.floatingPanel.querySelector('.sfg-panel-header');
        let isDragging = false;
        let currentX;
        let currentY;
        let initialX;
        let initialY;
        let xOffset = 0;
        let yOffset = 0;

        header.addEventListener('mousedown', (e) => {
            initialX = e.clientX - xOffset;
            initialY = e.clientY - yOffset;
            
            if (e.target === header || header.contains(e.target)) {
                isDragging = true;
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (isDragging) {
                e.preventDefault();
                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;
                xOffset = currentX;
                yOffset = currentY;
                
                this.floatingPanel.style.transform = `translate(${currentX}px, ${currentY}px)`;
            }
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
        });
    }

    autoFillFields() {
        console.log('🚀 Starting auto-fill process...');
        
        if (!this.selectedProject) {
            alert('Please select a project in the extension popup first.');
            return;
        }
        
        // TODO: Implement actual auto-fill logic
        // For now, just highlight the fields that would be filled
        this.highlightFillableFields();
        
        // Show success message
        this.showAutoFillSuccess();
    }

    highlightFillableFields() {
        this.detectedFields.forEach(field => {
            if (field.confidence > 0.3) {
                field.element.style.border = '2px solid #10b981';
                field.element.style.backgroundColor = '#f0fdf4';
                
                // Remove highlight after 3 seconds
                setTimeout(() => {
                    field.element.style.border = '';
                    field.element.style.backgroundColor = '';
                }, 3000);
            }
        });
    }

    showAutoFillSuccess() {
        const autoFillBtn = document.getElementById('sfg-auto-fill');
        const originalText = autoFillBtn.innerHTML;
        
        autoFillBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20,6 9,17 4,12"></polyline>
            </svg>
            Fields Highlighted!
        `;
        autoFillBtn.style.backgroundColor = '#10b981';
        
        setTimeout(() => {
            autoFillBtn.innerHTML = originalText;
            autoFillBtn.style.backgroundColor = '';
        }, 2000);
    }

    startMutationObserver() {
        // Watch for dynamic content changes
        const observer = new MutationObserver((mutations) => {
            let shouldRedetect = false;
            
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    // Check if new form elements were added
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            if (node.matches('form, input, select, textarea') || 
                                node.querySelector('form, input, select, textarea')) {
                                shouldRedetect = true;
                            }
                        }
                    });
                }
            });
            
            if (shouldRedetect) {
                console.log('🔄 Dynamic content detected, re-scanning forms...');
                this.detectedFields = [];
                this.detectForms();
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
}

// Initialize form assistant when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new FormAssistant();
    });
} else {
    new FormAssistant();
}
