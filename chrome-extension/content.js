// Smart Form Guide - Content Script for Form Detection and Auto-fill
class FormAssistant {
    constructor() {
        this.detectedFields = [];
        this.selectedProject = null;
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
        const url = window.location.href.toLowerCase();

        const permitIndicators = [
            '.gov',
            'accela.com',
            'permitflow.com',
            'permits',
            'building',
            'planning',
            'development',
            'pge.com',
            'pgecorp.com',
            'utility',
            'solar',
            'interconnection',
            'application',
            'form',
            'project'
        ];

        // Check hostname and URL for permit/form indicators
        const isPermitSite = permitIndicators.some(indicator =>
            hostname.includes(indicator) || url.includes(indicator)
        );

        // Also check if page has form elements (broader detection)
        const hasFormElements = document.querySelectorAll('form, input, select, textarea').length > 0;

        return isPermitSite || hasFormElements;
    }

    detectForms() {
        // Clear previous detections
        this.detectedFields = [];

        // Find all forms on the page
        const forms = document.querySelectorAll('form');
        console.log(`📋 Found ${forms.length} forms on page`);

        forms.forEach((form, index) => {
            this.analyzeForm(form, index);
        });

        // Also detect standalone input fields (not in forms)
        this.detectStandaloneFields();

        // Detect fields in common containers (divs, sections, etc.)
        this.detectFieldsInContainers();

        console.log(`🎯 Total detected fields: ${this.detectedFields.length}`);

        // Log detected fields for debugging
        this.detectedFields.forEach((field, index) => {
            console.log(`Field ${index + 1}:`, {
                label: field.label,
                type: field.type,
                fieldType: field.fieldType,
                confidence: field.confidence,
                element: field.element
            });
        });

        // Form detection completed
        console.log(`🎯 Total detected fields: ${this.detectedFields.length}`);

        // Send detection results to extension
        this.sendDetectionResults();
    }

    analyzeForm(form, formIndex) {
        const inputs = form.querySelectorAll('input, select, textarea');
        const radioGroups = new Map(); // Track radio button groups by name

        inputs.forEach((input, inputIndex) => {
            // Handle radio buttons specially - group them by name
            if (input.type === 'radio' && input.name) {
                if (!radioGroups.has(input.name)) {
                    radioGroups.set(input.name, []);
                }
                radioGroups.get(input.name).push(input);
            } else {
                // Handle non-radio fields normally
                const fieldInfo = this.analyzeField(input, formIndex, inputIndex);
                if (fieldInfo) {
                    this.detectedFields.push(fieldInfo);
                }
            }
        });

        // Process radio button groups
        radioGroups.forEach((radioButtons, groupName) => {
            const radioGroupInfo = this.analyzeRadioGroup(radioButtons, formIndex, groupName);
            if (radioGroupInfo) {
                this.detectedFields.push(radioGroupInfo);
            }
        });
    }

    analyzeField(element, formIndex, inputIndex) {
        // Skip hidden, submit, button, and image inputs
        if (element.type === 'hidden' || element.type === 'submit' ||
            element.type === 'button' || element.type === 'image' ||
            element.type === 'reset' || element.disabled) {
            return null;
        }

        // Skip if element is not visible
        if (!this.isElementVisible(element)) {
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
            confidence: 0,
            xpath: this.getElementXPath(element)
        };

        // Calculate confidence score for auto-fill
        fieldInfo.confidence = this.calculateConfidence(fieldInfo);

        return fieldInfo;
    }

    analyzeRadioGroup(radioButtons, formIndex, groupName) {
        // Skip if no radio buttons or all are hidden/disabled
        const visibleRadios = radioButtons.filter(radio =>
            !radio.disabled && this.isElementVisible(radio)
        );

        if (visibleRadios.length === 0) {
            return null;
        }

        // Use the first visible radio button as the representative element
        const firstRadio = visibleRadios[0];

        // Get the group label - try to find a common label or use the first radio's label
        let groupLabel = this.getRadioGroupLabel(visibleRadios);
        if (!groupLabel) {
            groupLabel = this.getFieldLabel(firstRadio);
        }

        // Collect all options
        const options = visibleRadios.map(radio => ({
            value: radio.value,
            label: this.getFieldLabel(radio) || radio.value,
            checked: radio.checked,
            element: radio
        }));

        // Create field info for the radio group
        const fieldInfo = {
            element: firstRadio, // Representative element for the group
            id: groupName || `radio_group_${formIndex}`,
            name: groupName,
            type: 'radio-group',
            label: groupLabel,
            placeholder: '',
            value: visibleRadios.find(r => r.checked)?.value || '',
            required: visibleRadios.some(r => r.required),
            fieldType: 'radio',
            confidence: 0,
            xpath: this.getElementXPath(firstRadio),
            options: options, // Store all radio button options
            radioButtons: visibleRadios // Store references to all radio elements
        };

        // Calculate confidence score
        fieldInfo.confidence = this.calculateConfidence(fieldInfo);

        return fieldInfo;
    }

    getRadioGroupLabel(radioButtons) {
        // Try to find a common parent element that might contain the group label
        const firstRadio = radioButtons[0];
        let parent = firstRadio.parentElement;

        // Look for fieldset legend or common parent with label
        while (parent && parent !== document.body) {
            // Check for fieldset with legend
            if (parent.tagName === 'FIELDSET') {
                const legend = parent.querySelector('legend');
                if (legend) {
                    return legend.textContent.trim();
                }
            }

            // Check for div/section with a label-like element
            const labelElement = parent.querySelector('label:not([for]), .label, .field-label, h3, h4, h5, h6');
            if (labelElement && !radioButtons.some(radio => labelElement.contains(radio))) {
                const labelText = labelElement.textContent.trim();
                if (labelText && labelText.length > 0) {
                    return labelText;
                }
            }

            parent = parent.parentElement;
        }

        return null;
    }

    isElementVisible(element) {
        const style = window.getComputedStyle(element);
        return style.display !== 'none' &&
               style.visibility !== 'hidden' &&
               style.opacity !== '0' &&
               element.offsetWidth > 0 &&
               element.offsetHeight > 0;
    }

    getElementXPath(element) {
        if (element.id) {
            return `//*[@id="${element.id}"]`;
        }

        const parts = [];
        while (element && element.nodeType === Node.ELEMENT_NODE) {
            let index = 0;
            let hasFollowingSiblings = false;
            let hasPrecedingSiblings = false;

            for (let sibling = element.previousSibling; sibling; sibling = sibling.previousSibling) {
                if (sibling.nodeType === Node.ELEMENT_NODE && sibling.nodeName === element.nodeName) {
                    hasPrecedingSiblings = true;
                    index++;
                }
            }

            for (let sibling = element.nextSibling; sibling && !hasFollowingSiblings; sibling = sibling.nextSibling) {
                if (sibling.nodeType === Node.ELEMENT_NODE && sibling.nodeName === element.nodeName) {
                    hasFollowingSiblings = true;
                }
            }

            const tagName = element.nodeName.toLowerCase();
            const pathIndex = (hasPrecedingSiblings || hasFollowingSiblings) ? `[${index + 1}]` : '';
            parts.splice(0, 0, tagName + pathIndex);

            element = element.parentNode;
        }

        return parts.length ? '/' + parts.join('/') : '';
    }

    getFieldLabel(element) {
        // Try to find associated label
        let label = '';

        // Check for label element by 'for' attribute
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

        // Check for aria-label
        if (!label && element.getAttribute('aria-label')) {
            label = element.getAttribute('aria-label').trim();
        }

        // Check for aria-labelledby
        if (!label && element.getAttribute('aria-labelledby')) {
            const labelId = element.getAttribute('aria-labelledby');
            const labelElement = document.getElementById(labelId);
            if (labelElement) {
                label = labelElement.textContent.trim();
            }
        }

        // Check for nearby text in various patterns
        if (!label) {
            label = this.findNearbyLabel(element);
        }

        // Clean up the label
        if (label) {
            label = label.replace(/[*:]+$/, '').trim(); // Remove trailing asterisks and colons
            label = label.replace(/\s+/g, ' '); // Normalize whitespace
        }

        return label;
    }

    findNearbyLabel(element) {
        // Check previous sibling elements for labels
        let sibling = element.previousElementSibling;
        while (sibling) {
            const text = sibling.textContent.trim();
            if (text && text.length > 0 && text.length < 100) {
                return text;
            }
            sibling = sibling.previousElementSibling;
        }

        // Check parent's previous sibling
        const parent = element.parentElement;
        if (parent) {
            sibling = parent.previousElementSibling;
            if (sibling) {
                const text = sibling.textContent.trim();
                if (text && text.length > 0 && text.length < 100) {
                    return text;
                }
            }

            // Check for text nodes in parent
            const textNodes = Array.from(parent.childNodes)
                .filter(node => node.nodeType === Node.TEXT_NODE)
                .map(node => node.textContent.trim())
                .filter(text => text.length > 0 && text.length < 100);

            if (textNodes.length > 0) {
                return textNodes[0];
            }
        }

        return '';
    }

    classifyField(element) {
        const text = (element.name + ' ' + element.id + ' ' + element.placeholder + ' ' + this.getFieldLabel(element)).toLowerCase();

        // Check input type first
        if (element.type === 'email') return 'email';
        if (element.type === 'tel') return 'phone';
        if (element.type === 'date') return 'date';
        if (element.type === 'number') return 'number';
        if (element.type === 'url') return 'url';

        // Common field types for permit applications and general forms
        const fieldTypes = {
            'name': ['name', 'applicant', 'owner', 'contractor', 'first', 'last', 'full'],
            'email': ['email', 'e-mail', 'mail'],
            'phone': ['phone', 'telephone', 'mobile', 'cell', 'tel'],
            'address': ['address', 'street', 'location', 'addr'],
            'city': ['city', 'municipality', 'town'],
            'state': ['state', 'province', 'region'],
            'zip': ['zip', 'postal', 'zipcode', 'postcode'],
            'date': ['date', 'when', 'time', 'birth', 'dob'],
            'description': ['description', 'details', 'notes', 'comments', 'message'],
            'value': ['value', 'cost', 'amount', 'price', '$', 'fee'],
            'area': ['area', 'square', 'sqft', 'size', 'footage'],
            'permit_type': ['permit', 'type', 'category', 'kind'],
            'project_description': ['project', 'work', 'scope', 'construction'],
            'company': ['company', 'business', 'organization', 'firm'],
            'title': ['title', 'position', 'job'],
            'website': ['website', 'url', 'site', 'web'],
            'password': ['password', 'pass', 'pwd'],
            'username': ['username', 'user', 'login'],
            'number': ['number', 'num', 'id', 'reference'],
            'checkbox': ['agree', 'accept', 'confirm', 'check'],
            'radio': ['select', 'choose', 'option']
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
        const radioGroups = new Map(); // Track radio button groups by name

        standaloneInputs.forEach((input, index) => {
            // Handle radio buttons specially - group them by name
            if (input.type === 'radio' && input.name) {
                if (!radioGroups.has(input.name)) {
                    radioGroups.set(input.name, []);
                }
                radioGroups.get(input.name).push(input);
            } else {
                // Handle non-radio fields normally
                const fieldInfo = this.analyzeField(input, -1, index);
                if (fieldInfo) {
                    this.detectedFields.push(fieldInfo);
                }
            }
        });

        // Process radio button groups
        radioGroups.forEach((radioButtons, groupName) => {
            const radioGroupInfo = this.analyzeRadioGroup(radioButtons, -1, groupName);
            if (radioGroupInfo) {
                this.detectedFields.push(radioGroupInfo);
            }
        });
    }

    detectFieldsInContainers() {
        // Look for form-like containers that might not use <form> tags
        const containers = document.querySelectorAll('div[class*="form"], div[class*="input"], section[class*="form"], .form-container, .input-container, .field-container');

        containers.forEach((container, containerIndex) => {
            const inputs = container.querySelectorAll('input, select, textarea');
            const radioGroups = new Map(); // Track radio button groups by name

            inputs.forEach((input, inputIndex) => {
                // Skip if already detected
                const alreadyDetected = this.detectedFields.some(field => {
                    // For radio groups, check if any radio button in the group is already detected
                    if (field.type === 'radio-group' && field.radioButtons) {
                        return field.radioButtons.includes(input);
                    }
                    return field.element === input;
                });

                if (!alreadyDetected) {
                    // Handle radio buttons specially - group them by name
                    if (input.type === 'radio' && input.name) {
                        if (!radioGroups.has(input.name)) {
                            radioGroups.set(input.name, []);
                        }
                        radioGroups.get(input.name).push(input);
                    } else {
                        // Handle non-radio fields normally
                        const fieldInfo = this.analyzeField(input, `container_${containerIndex}`, inputIndex);
                        if (fieldInfo) {
                            this.detectedFields.push(fieldInfo);
                        }
                    }
                }
            });

            // Process radio button groups
            radioGroups.forEach((radioButtons, groupName) => {
                const radioGroupInfo = this.analyzeRadioGroup(radioButtons, `container_${containerIndex}`, groupName);
                if (radioGroupInfo) {
                    this.detectedFields.push(radioGroupInfo);
                }
            });
        });
    }

    sendDetectionResults() {
        // Send results to extension popup/sidebar
        const results = {
            fieldsCount: this.detectedFields.length,
            fields: this.detectedFields.map(field => ({
                id: field.id,
                name: field.name,
                type: field.type,
                label: field.label,
                fieldType: field.fieldType,
                confidence: field.confidence,
                required: field.required,
                xpath: field.xpath,
                // Include radio group specific data
                options: field.options || undefined,
                value: field.value
            }))
        };

        // Store in chrome storage for popup access
        if (chrome.storage && chrome.storage.local) {
            chrome.storage.local.set({
                detectedFields: results,
                lastDetectionTime: Date.now()
            });
        }

        console.log('📤 Detection results sent:', results);
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

// Global form assistant instance
let formAssistantInstance = null;

// Initialize form assistant when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        formAssistantInstance = new FormAssistant();
    });
} else {
    formAssistantInstance = new FormAssistant();
}

// Listen for messages from extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'detectForms') {
        console.log('🔍 Manual form detection requested');
        if (formAssistantInstance) {
            formAssistantInstance.detectForms();
            sendResponse({
                success: true,
                fieldsCount: formAssistantInstance.detectedFields.length
            });
        } else {
            sendResponse({ success: false, error: 'Form assistant not initialized' });
        }
        return true; // Keep message channel open for async response
    }

    if (request.action === 'getDetectedFields') {
        if (formAssistantInstance) {
            sendResponse({
                success: true,
                fields: formAssistantInstance.detectedFields
            });
        } else {
            sendResponse({ success: false, error: 'Form assistant not initialized' });
        }
        return true;
    }

    if (request.action === 'highlightFields') {
        if (formAssistantInstance) {
            formAssistantInstance.highlightFillableFields();
            sendResponse({ success: true });
        } else {
            sendResponse({ success: false, error: 'Form assistant not initialized' });
        }
        return true;
    }
});
