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
        console.log('🌐 Chrome extension API available:', typeof chrome !== 'undefined' && !!chrome.runtime);

        // Setup event listeners
        this.setupEventListeners();

        // Show main interface immediately
        this.showMainInterface();

        // Start form detection
        this.startFormDetection();

        console.log('✅ Sidebar initialization complete');
    }

    setupEventListeners() {
        console.log('🔧 Setting up event listeners...');

        // Form detection button
        const detectFormsBtn = document.getElementById('detectFormsBtn');
        if (detectFormsBtn) {
            console.log('✅ Detect Forms button found, adding event listener');
            detectFormsBtn.addEventListener('click', () => {
                console.log('🖱️ Detect Forms button clicked!');
                this.detectForms();
            });
        } else {
            console.error('❌ Detect Forms button not found!');
        }

        // Auto fill button
        const fillFormsBtn = document.getElementById('fillFormsBtn');
        if (fillFormsBtn) {
            console.log('✅ Auto Fill button found, adding event listener');
            fillFormsBtn.addEventListener('click', () => {
                console.log('🖱️ Auto Fill button clicked!');
                console.log('🔧 Button disabled state:', fillFormsBtn.disabled);
                if (fillFormsBtn.disabled) {
                    console.log('⚠️ Button is disabled, not executing auto-fill');
                    alert('⚠️ Please click "Detect Forms" first to find form fields.');
                    return;
                }
                this.autoFillForms();
            });
        } else {
            console.error('❌ Auto Fill button not found!');
        }

        // Clear forms button
        const clearFormsBtn = document.getElementById('clearFormsBtn');
        if (clearFormsBtn) {
            console.log('✅ Clear Forms button found, adding event listener');
            clearFormsBtn.addEventListener('click', () => {
                console.log('🖱️ Clear Forms button clicked!');
                this.clearForms();
            });
        } else {
            console.error('❌ Clear Forms button not found!');
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
        console.log('🔧 Chrome API check:', {
            chrome: typeof chrome !== 'undefined',
            tabs: typeof chrome?.tabs !== 'undefined',
            scripting: typeof chrome?.scripting !== 'undefined',
            runtime: typeof chrome?.runtime !== 'undefined'
        });

        const noForms = document.getElementById('noForms');
        const detectedForms = document.getElementById('detectedForms');
        const fillFormsBtn = document.getElementById('fillFormsBtn');
        const detectFormsBtn = document.getElementById('detectFormsBtn');

        try {
            // Show loading state
            if (detectFormsBtn) {
                detectFormsBtn.textContent = 'Detecting...';
                detectFormsBtn.disabled = true;
                console.log('🔄 Button state changed to detecting...');
            }

            // Check if Chrome APIs are available
            if (typeof chrome === 'undefined' || !chrome.tabs) {
                throw new Error('Chrome extension APIs not available');
            }

            // Get current active tab
            console.log('📋 Querying active tab...');
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            console.log('📋 Active tabs found:', tabs.length, tabs[0]?.url);

            if (tabs.length === 0) {
                throw new Error('No active tab found');
            }

            // First try to communicate with existing content script
            try {
                console.log('📤 Sending message to content script...');
                const response = await chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'detectForms'
                });
                console.log('📥 Content script response:', response);

                if (response && response.success) {
                    console.log('📋 Forms detected via content script:', response.fieldsCount);

                    // Get detailed field information
                    console.log('📤 Requesting detailed field information...');
                    const fieldsResponse = await chrome.tabs.sendMessage(tabs[0].id, {
                        action: 'getDetectedFields'
                    });
                    console.log('📥 Fields response:', fieldsResponse);

                    if (fieldsResponse && fieldsResponse.success) {
                        this.formFields = fieldsResponse.fields || [];
                        this.handleDetectionResults();
                        return;
                    }
                }
            } catch (messageError) {
                console.log('📝 Content script not available, using injection method. Error:', messageError);
            }

            // Fallback: Inject content script to detect forms
            console.log('💉 Injecting form detection script...');
            const results = await chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                func: this.detectFormsOnPage
            });
            console.log('💉 Injection results:', results);

            if (results && results[0] && results[0].result) {
                const formData = results[0].result;
                console.log('📋 Forms detected via injection:', formData);

                this.formFields = formData.fields || [];
                this.handleDetectionResults();
            } else {
                console.log('❌ No results from injection');
                this.formFields = [];
                this.handleDetectionResults();
            }

        } catch (error) {
            console.error('❌ Form detection failed:', error);
            // Show error state
            if (noForms) {
                noForms.style.display = 'block';
                noForms.innerHTML = '<p>⚠️ Error detecting forms. Please refresh the page and try again.</p>';
            }
            if (detectedForms) detectedForms.style.display = 'none';
            if (fillFormsBtn) fillFormsBtn.disabled = true;
        } finally {
            // Reset button state
            if (detectFormsBtn) {
                detectFormsBtn.textContent = 'Detect Forms';
                detectFormsBtn.disabled = false;
            }
        }
    }

    handleDetectionResults() {
        const noForms = document.getElementById('noForms');
        const detectedForms = document.getElementById('detectedForms');
        const fillFormsBtn = document.getElementById('fillFormsBtn');

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

            if (noForms) {
                noForms.style.display = 'block';
                noForms.innerHTML = '<p>No fillable form fields detected on this page.</p>';
            }
            if (detectedForms) detectedForms.style.display = 'none';
            if (fillFormsBtn) fillFormsBtn.disabled = true;
        }
    }

    // This function runs in the context of the web page
    detectFormsOnPage() {
        const forms = document.querySelectorAll('form');
        const inputs = document.querySelectorAll('input, select, textarea');
        const fields = [];

        // Helper function to check if element is visible
        function isElementVisible(element) {
            const style = window.getComputedStyle(element);
            return style.display !== 'none' &&
                   style.visibility !== 'hidden' &&
                   style.opacity !== '0' &&
                   element.offsetWidth > 0 &&
                   element.offsetHeight > 0;
        }

        // Helper function to get field label
        function getFieldLabel(input) {
            // Try to find associated label by 'for' attribute
            if (input.id) {
                const label = document.querySelector(`label[for="${input.id}"]`);
                if (label) return label.textContent.trim();
            }

            // Try parent label
            const parentLabel = input.closest('label');
            if (parentLabel) {
                return parentLabel.textContent.replace(input.value, '').trim();
            }

            // Check for aria-label
            if (input.getAttribute('aria-label')) {
                return input.getAttribute('aria-label').trim();
            }

            // Check for aria-labelledby
            if (input.getAttribute('aria-labelledby')) {
                const labelId = input.getAttribute('aria-labelledby');
                const labelElement = document.getElementById(labelId);
                if (labelElement) {
                    return labelElement.textContent.trim();
                }
            }

            // Try previous sibling elements
            let sibling = input.previousElementSibling;
            while (sibling) {
                const text = sibling.textContent.trim();
                if (text && text.length > 0 && text.length < 100) {
                    return text;
                }
                sibling = sibling.previousElementSibling;
            }

            // Try parent's previous sibling
            const parent = input.parentElement;
            if (parent) {
                sibling = parent.previousElementSibling;
                if (sibling) {
                    const text = sibling.textContent.trim();
                    if (text && text.length > 0 && text.length < 100) {
                        return text;
                    }
                }
            }

            return input.placeholder || input.name || 'Unknown Field';
        }

        // Detect form fields
        inputs.forEach((input, index) => {
            // Skip hidden, submit, button inputs and disabled fields
            if (input.type === 'hidden' || input.type === 'submit' ||
                input.type === 'button' || input.type === 'image' ||
                input.type === 'reset' || input.disabled) {
                return;
            }

            // Skip if element is not visible
            if (!isElementVisible(input)) {
                return;
            }

            const label = getFieldLabel(input);
            const field = {
                id: input.id || `field_${index}`,
                name: input.name || input.id || `field_${index}`,
                type: input.type || input.tagName.toLowerCase(),
                placeholder: input.placeholder || '',
                label: label,
                value: input.value || '',
                required: input.required || false,
                fieldType: 'unknown'
            };

            // Classify field type based on label and attributes
            const text = (input.name + ' ' + input.id + ' ' + input.placeholder + ' ' + label).toLowerCase();

            if (input.type === 'email' || text.includes('email')) field.fieldType = 'email';
            else if (input.type === 'tel' || text.includes('phone') || text.includes('tel')) field.fieldType = 'phone';
            else if (input.type === 'date' || text.includes('date')) field.fieldType = 'date';
            else if (text.includes('name')) field.fieldType = 'name';
            else if (text.includes('address')) field.fieldType = 'address';
            else if (text.includes('city')) field.fieldType = 'city';
            else if (text.includes('state')) field.fieldType = 'state';
            else if (text.includes('zip') || text.includes('postal')) field.fieldType = 'zip';

            fields.push(field);
        });

        return {
            formsCount: forms.length,
            fields: fields,
            url: window.location.href
        };
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
        console.log('🖊️ Auto-filling forms with LLM assistance...');

        try {
            // Check if we have detected fields
            if (!this.formFields || this.formFields.length === 0) {
                console.log('⚠️ No form fields detected. Running detection first...');
                await this.detectForms();

                if (!this.formFields || this.formFields.length === 0) {
                    throw new Error('No form fields found to fill');
                }
            }

            // Get extracted text from uploaded documents
            console.log('📄 Automatically finding and fetching extracted document text...');
            const documentText = await this.getExtractedDocumentText();

            if (!documentText) {
                console.log('❌ No extracted text found from any uploaded documents');
                alert('❌ No documents found with extracted text. Please:\n1. Upload planset and utility bill documents\n2. Wait for processing to complete\n3. Try auto-fill again');
                return;
            }

            console.log('✅ Found extracted text from documents!');

            // Use LLM to match fields with document data
            console.log('🤖 Using LLM to match form fields with document data...');
            console.log('📋 Sending to LLM:', {
                fieldsCount: this.formFields.length,
                hasDocumentText: !!(documentText.plansetText || documentText.utilityText)
            });

            const fieldMappings = await this.getLLMFieldMappings(this.formFields, documentText);

            if (!fieldMappings || Object.keys(fieldMappings).length === 0) {
                console.log('⚠️ LLM did not return field mappings, using sample data as fallback');
                await this.autoFillWithSampleData();
                return;
            }

            // Fill the forms with LLM-generated data
            console.log('✏️ Filling forms with LLM-generated data...');
            await this.fillFormsWithMappings(fieldMappings);

        } catch (error) {
            console.error('❌ Auto-fill failed:', error);
            // Fallback to sample data
            console.log('🔄 Falling back to sample data...');
            await this.autoFillWithSampleData();
        }
    }

    async autoFillWithSampleData() {
        console.log('🎭 Using sample data for demonstration');

        const sampleData = {
            // Customer Information
            'name': 'Eddie Gonzalez',
            'customer': 'Eddie Gonzalez',
            'applicant': 'Eddie Gonzalez',
            'owner': 'Eddie Gonzalez',
            'email': 'eddie.gonzalez@email.com',
            'phone': '(555) 987-6543',
            'tel': '(555) 987-6543',

            // Address Information
            'address': '1234 Solar Avenue',
            'street': '1234 Solar Avenue',
            'city': 'San Jose',
            'state': 'CA',
            'zip': '95123',
            'zipcode': '95123',
            'postal': '95123',

            // Solar Project Information
            'company': 'SunPower Solar',
            'contractor': 'SunPower Solar',
            'system': '8.5 kW Solar System',
            'size': '8.5',
            'capacity': '8.5 kW',
            'panels': '24',
            'inverter': 'Enphase IQ8+',

            // Utility Information
            'utility': 'Pacific Gas & Electric (PG&E)',
            'account': '1234567890',
            'meter': 'E-12345678',

            // Project Details
            'description': 'Residential rooftop solar installation with 24 panels',
            'date': new Date().toISOString().split('T')[0], // Today's date
            'installation': new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0] // 30 days from now
        };

        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs.length === 0) return;

        await chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            func: this.fillFormsOnPage,
            args: [sampleData]
        });

        console.log('✅ Forms filled with sample data');
    }

    async getExtractedDocumentText() {
        try {
            console.log('🔍 Searching for projects with uploaded documents...');

            // Get access token
            const token = localStorage.getItem('access_token');
            if (!token) {
                console.log('❌ No access token found - user not logged in');
                return null;
            }

            // Get all projects with documents
            const projectsWithDocs = await this.getAllProjectsWithDocuments();
            if (projectsWithDocs.length === 0) {
                console.log('📋 No projects with documents found');
                return null;
            }

            // Use the most recent project with documents
            const latestProject = projectsWithDocs[0]; // Projects are usually sorted by creation date
            console.log(`📋 Using project: ${latestProject.name} (ID: ${latestProject.id})`);

            // Fetch extracted text from backend
            const url = `${this.webAppUrl}/api/projects/${latestProject.id}/extracted-text`;
            console.log('🌐 Fetching extracted text from:', url);

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('📡 Response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ API Error:', errorText);

                // Try other projects if this one fails
                if (projectsWithDocs.length > 1) {
                    console.log('🔄 Trying next project...');
                    for (let i = 1; i < projectsWithDocs.length; i++) {
                        const project = projectsWithDocs[i];
                        console.log(`📋 Trying project: ${project.name}`);

                        const retryResponse = await fetch(`${this.webAppUrl}/api/projects/${project.id}/extracted-text`, {
                            method: 'GET',
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json'
                            }
                        });

                        if (retryResponse.ok) {
                            const retryData = await retryResponse.json();
                            console.log('✅ Successfully got data from alternate project');

                            const extractedData = {
                                plansetText: retryData.planset_text || '',
                                utilityText: retryData.utility_text || '',
                                customerAddress: retryData.customer_address || '',
                                energyConsumption: retryData.energy_consumption || '',
                                utilityCompany: retryData.utility_company || ''
                            };

                            if (extractedData.plansetText || extractedData.utilityText) {
                                return extractedData;
                            }
                        }
                    }
                }

                console.log('🔄 All projects failed - no extracted text available');
                return null;
            }

            const data = await response.json();
            console.log('📄 Raw API response:', data);

            const extractedData = {
                plansetText: data.planset_text || '',
                utilityText: data.utility_text || '',
                customerAddress: data.customer_address || '',
                energyConsumption: data.energy_consumption || '',
                utilityCompany: data.utility_company || ''
            };

            console.log('📄 Processed extracted data:', extractedData);

            // Check if we have any text data
            if (!extractedData.plansetText && !extractedData.utilityText) {
                console.log('⚠️ No extracted text found in documents');
                return null;
            }

            console.log('✅ Successfully retrieved extracted text from documents');
            return extractedData;

        } catch (error) {
            console.error('❌ Failed to get extracted document text:', error);
            return null;
        }
    }

    async getAllProjectsWithDocuments() {
        try {
            // Get access token from localStorage
            const token = localStorage.getItem('access_token');
            if (!token) {
                console.log('❌ No access token found');
                return [];
            }

            // Get all projects
            const response = await fetch(`${this.webAppUrl}/api/projects/`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch projects: ${response.status}`);
            }

            const projects = await response.json();
            console.log(`📋 Found ${projects.length} projects`);

            // Find projects with documents
            const projectsWithDocs = [];
            for (const project of projects) {
                if (project.document_count > 0) {
                    projectsWithDocs.push(project);
                }
            }

            console.log(`📄 Found ${projectsWithDocs.length} projects with documents`);
            return projectsWithDocs;

        } catch (error) {
            console.error('❌ Failed to get projects:', error);
            return [];
        }
    }

    async getLLMFieldMappings(formFields, documentText) {
        try {
            console.log('🤖 Creating LLM prompt with document text...');
            const prompt = this.createFieldMappingPrompt(formFields, documentText);
            console.log('📝 LLM Prompt created (length):', prompt.length);

            // Send to backend LLM service
            console.log('🌐 Sending request to LLM service...');
            const response = await fetch(`${this.webAppUrl}/query/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    question: prompt
                })
            });

            console.log('📡 LLM service response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ LLM service error:', errorText);
                throw new Error(`LLM service failed: ${response.status} - ${errorText}`);
            }

            const result = await response.json();
            console.log('🤖 LLM raw response:', result);

            // Try to parse JSON from the LLM response
            try {
                const mappings = JSON.parse(result.answer);
                console.log('✅ Successfully parsed LLM mappings:', mappings);
                return mappings;
            } catch (parseError) {
                console.log('📝 LLM response is not JSON, extracting values manually');
                console.log('📄 LLM text response:', result.answer);
                return this.extractMappingsFromText(result.answer, formFields);
            }

        } catch (error) {
            console.error('❌ LLM field mapping failed:', error);
            return {};
        }
    }

    createFieldMappingPrompt(formFields, documentText) {
        const fieldsDescription = formFields.map(field =>
            `- ${field.label || field.name} (${field.type}) [ID: ${field.id}]`
        ).join('\n');

        return `
You are a smart form-filling assistant for solar permit applications. Based on the extracted text from uploaded planset and utility bill documents, provide appropriate values for the following form fields.

FORM FIELDS TO FILL:
${fieldsDescription}

EXTRACTED DOCUMENT TEXT:
=== PLANSET DOCUMENT ===
${documentText.plansetText || 'No planset text available'}

=== UTILITY BILL DOCUMENT ===
${documentText.utilityText || 'No utility bill text available'}

=== EXTRACTED METADATA ===
Customer Address: ${documentText.customerAddress || 'Not found'}
Energy Consumption: ${documentText.energyConsumption || 'Not found'}
Utility Company: ${documentText.utilityCompany || 'Not found'}

INSTRUCTIONS:
1. Analyze the document text to extract relevant information for solar permit applications
2. Look for: customer names, addresses, phone numbers, email addresses, property details, system specifications, utility information
3. Match extracted data to the appropriate form fields based on field labels and types
4. Return ONLY a valid JSON object with field IDs as keys and extracted values
5. Use realistic values based on the documents, not placeholder text
6. For missing information, use "N/A" or leave empty string ""
7. Format values appropriately (proper case for names, formatted phone numbers, etc.)

RESPONSE FORMAT (JSON only, no other text):
{
  "${formFields[0]?.id || 'example_field'}": "extracted_value_from_documents"
}
`;
    }

    extractMappingsFromText(text, formFields) {
        // Fallback method to extract field mappings from non-JSON LLM response
        const mappings = {};

        formFields.forEach(field => {
            const fieldId = field.id;
            const fieldLabel = field.label || field.name;

            // Look for patterns like "fieldId: value" or "fieldLabel: value"
            const patterns = [
                new RegExp(`"${fieldId}"\\s*:\\s*"([^"]*)"`, 'i'),
                new RegExp(`${fieldId}\\s*:\\s*([^\\n,}]+)`, 'i'),
                new RegExp(`${fieldLabel}\\s*:\\s*([^\\n,}]+)`, 'i')
            ];

            for (const pattern of patterns) {
                const match = text.match(pattern);
                if (match && match[1]) {
                    mappings[fieldId] = match[1].trim().replace(/['"]/g, '');
                    break;
                }
            }
        });

        return mappings;
    }

    async fillFormsWithMappings(mappings) {
        try {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tabs.length === 0) return;

            const filledCount = await chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                func: (mappings) => {
                    let filled = 0;

                    Object.entries(mappings).forEach(([fieldId, value]) => {
                        if (!value || value === 'N/A') return;

                        // Try to find element by ID first
                        let element = document.getElementById(fieldId);

                        // If not found by ID, try by name
                        if (!element) {
                            element = document.querySelector(`[name="${fieldId}"]`);
                        }

                        // If still not found, try partial matches
                        if (!element) {
                            element = document.querySelector(`[id*="${fieldId}"], [name*="${fieldId}"]`);
                        }

                        if (element && element.type !== 'hidden' && element.type !== 'submit' && element.type !== 'button') {
                            element.value = value;
                            element.dispatchEvent(new Event('input', { bubbles: true }));
                            element.dispatchEvent(new Event('change', { bubbles: true }));
                            filled++;
                            console.log(`✅ Filled ${fieldId} with: ${value}`);
                        }
                    });

                    return filled;
                },
                args: [mappings]
            });

            console.log(`✅ Auto-filled ${filledCount[0].result} fields using LLM mappings`);

        } catch (error) {
            console.error('❌ Failed to fill forms with mappings:', error);
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
