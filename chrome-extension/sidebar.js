// Smart Form Guide Chrome Extension - Sidebar Script (No Authentication)
class SmartFormGuideSidebar {
    constructor() {
        this.webAppUrl = 'http://localhost:3000';
        this.detectedForms = [];
        this.formFields = [];
        
        this.init();
    }

    async init() {
        console.log('🚀 Smart Form Guide Sidebar initialized');
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Show main interface immediately
        this.showMainInterface();
        
        // Start form detection
        this.startFormDetection();
    }

    setupEventListeners() {
        // Form detection button
        const detectFormsBtn = document.getElementById('detectFormsBtn');
        if (detectFormsBtn) {
            detectFormsBtn.addEventListener('click', () => this.detectForms());
        }

        // Auto fill button
        const fillFormsBtn = document.getElementById('fillFormsBtn');
        if (fillFormsBtn) {
            fillFormsBtn.addEventListener('click', () => this.autoFillForms());
        }

        // Clear forms button
        const clearFormsBtn = document.getElementById('clearFormsBtn');
        if (clearFormsBtn) {
            clearFormsBtn.addEventListener('click', () => this.clearForms());
        }


    }

    showMainInterface() {
        console.log('🎯 Showing main interface');

        const mainContent = document.getElementById('mainContent');

        if (mainContent) {
            mainContent.style.display = 'flex';
        }
    }

    startFormDetection() {
        console.log('🔍 Starting form detection...');

        // Auto-detect forms on page load
        setTimeout(() => {
            this.detectForms();
        }, 1000);
    }

    async detectForms() {
        console.log('🔍 Detecting forms on current page...');

        const noForms = document.getElementById('noForms');
        const detectedForms = document.getElementById('detectedForms');
        const fillFormsBtn = document.getElementById('fillFormsBtn');

        try {
            // Get current active tab
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (tabs.length === 0) {
                throw new Error('No active tab found');
            }

            // Inject content script to detect forms
            const results = await chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                func: this.detectFormsOnPage
            });

            if (results && results[0] && results[0].result) {
                const formData = results[0].result;
                console.log('📋 Forms detected:', formData);
                
                this.formFields = formData.fields || [];
                
                if (this.formFields.length > 0) {
                    // Forms found
                    console.log(`✅ Found ${this.formFields.length} form fields`);

                    if (noForms) noForms.style.display = 'none';
                    if (detectedForms) {
                        detectedForms.style.display = 'block';
                        this.renderFormFields();
                    }
                    if (fillFormsBtn) fillFormsBtn.disabled = false;

                } else {
                    // No forms found
                    console.log('ℹ️ No forms found on this page');

                    if (noForms) noForms.style.display = 'block';
                    if (detectedForms) detectedForms.style.display = 'none';
                    if (fillFormsBtn) fillFormsBtn.disabled = true;
                }
            }

        } catch (error) {
            console.error('❌ Form detection failed:', error);
        }
    }

    // This function runs in the context of the web page
    detectFormsOnPage() {
        const forms = document.querySelectorAll('form');
        const inputs = document.querySelectorAll('input, select, textarea');
        const fields = [];

        // Detect form fields
        inputs.forEach((input, index) => {
            if (input.type !== 'hidden' && input.type !== 'submit' && input.type !== 'button') {
                const field = {
                    id: input.id || `field_${index}`,
                    name: input.name || input.id || `field_${index}`,
                    type: input.type || input.tagName.toLowerCase(),
                    placeholder: input.placeholder || '',
                    label: this.getFieldLabel(input),
                    value: input.value || '',
                    required: input.required || false
                };
                fields.push(field);
            }
        });

        return {
            formsCount: forms.length,
            fields: fields,
            url: window.location.href
        };
    }

    // Helper function to get field label (runs in page context)
    getFieldLabel(input) {
        // Try to find associated label
        if (input.id) {
            const label = document.querySelector(`label[for="${input.id}"]`);
            if (label) return label.textContent.trim();
        }

        // Try parent label
        const parentLabel = input.closest('label');
        if (parentLabel) return parentLabel.textContent.trim();

        // Try previous sibling
        const prevSibling = input.previousElementSibling;
        if (prevSibling && (prevSibling.tagName === 'LABEL' || prevSibling.tagName === 'SPAN')) {
            return prevSibling.textContent.trim();
        }

        return input.placeholder || input.name || 'Unknown Field';
    }

    renderFormFields() {
        const formFieldsList = document.getElementById('formFieldsList');
        if (!formFieldsList) return;

        const fieldsHtml = this.formFields.map(field => `
            <div class="form-field-item">
                <div class="field-info">
                    <span class="field-label">${field.label}</span>
                    <span class="field-type">${field.type}</span>
                </div>
                <div class="field-value">
                    <input type="text" placeholder="Auto-fill value" data-field-id="${field.id}" />
                </div>
            </div>
        `).join('');

        formFieldsList.innerHTML = fieldsHtml;
    }

    async autoFillForms() {
        console.log('🖊️ Auto-filling forms...');
        
        // Get sample data (in real implementation, this would come from uploaded documents)
        const sampleData = {
            'name': 'John Doe',
            'email': 'john.doe@example.com',
            'phone': '(555) 123-4567',
            'address': '123 Main St, Anytown, CA 90210',
            'city': 'Anytown',
            'state': 'CA',
            'zip': '90210',
            'company': 'Solar Solutions Inc.'
        };

        try {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (tabs.length === 0) {
                throw new Error('No active tab found');
            }

            // Fill forms on the page
            await chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                func: this.fillFormsOnPage,
                args: [sampleData]
            });

            console.log('✅ Forms filled successfully');
            
        } catch (error) {
            console.error('❌ Auto-fill failed:', error);
        }
    }

    // This function runs in the context of the web page
    fillFormsOnPage(data) {
        const inputs = document.querySelectorAll('input, select, textarea');
        let filledCount = 0;

        inputs.forEach(input => {
            if (input.type === 'hidden' || input.type === 'submit' || input.type === 'button') {
                return;
            }

            const fieldName = (input.name || input.id || '').toLowerCase();
            const fieldLabel = this.getFieldLabel(input).toLowerCase();
            
            // Match field names/labels to data
            for (const [key, value] of Object.entries(data)) {
                if (fieldName.includes(key) || fieldLabel.includes(key)) {
                    input.value = value;
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                    filledCount++;
                    break;
                }
            }
        });

        return filledCount;
    }

    async clearForms() {
        console.log('🗑️ Clearing forms...');
        
        try {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (tabs.length === 0) {
                throw new Error('No active tab found');
            }

            await chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                func: () => {
                    const inputs = document.querySelectorAll('input, select, textarea');
                    inputs.forEach(input => {
                        if (input.type !== 'hidden' && input.type !== 'submit' && input.type !== 'button') {
                            input.value = '';
                            input.dispatchEvent(new Event('input', { bubbles: true }));
                            input.dispatchEvent(new Event('change', { bubbles: true }));
                        }
                    });
                }
            });

            console.log('✅ Forms cleared successfully');
            
        } catch (error) {
            console.error('❌ Clear forms failed:', error);
        }
    }


}

// Initialize sidebar when DOM loads
document.addEventListener('DOMContentLoaded', () => {
    window.smartFormGuideSidebar = new SmartFormGuideSidebar();
});

// Cleanup on unload
window.addEventListener('beforeunload', () => {
    console.log('🧹 Sidebar cleanup');
});
