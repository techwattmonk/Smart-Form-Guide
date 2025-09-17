// Smart Form Guide Chrome Extension - Sidebar Script (No Authentication)
class SmartFormGuideSidebar {
    constructor() {
        this.webAppUrl = 'http://localhost:8000';
        this.detectedForms = [];
        this.formFields = [];
        this.analyzedFields = null;
        this.selectedProject = null;
        this.workflowState = {
            fieldsAnalyzed: false,
            projectSelected: false
        };

        this.init();
    }

    async init() {
        console.log('🚀 Smart Form Guide Sidebar initialized');
        console.log('🌐 Chrome extension API available:', typeof chrome !== 'undefined' && !!chrome.runtime);

        // Setup event listeners
        this.setupEventListeners();

        // Initialize workflow status
        this.updateWorkflowStatus();

        console.log('✅ Sidebar initialization complete');
    }

    setupEventListeners() {
        console.log('🔧 Setting up event listeners...');

        // Analyze Fields button
        const analyzeFieldsBtn = document.getElementById('analyzeFieldsBtn');
        if (analyzeFieldsBtn) {
            console.log('✅ Analyze Fields button found, adding event listener');
            analyzeFieldsBtn.addEventListener('click', () => {
                console.log('🖱️ Analyze Fields button clicked!');
                this.analyzeFields();
            });
        } else {
            console.error('❌ Analyze Fields button not found!');
        }

        // Select Project button
        const selectProjectBtn = document.getElementById('selectProjectBtn');
        if (selectProjectBtn) {
            console.log('✅ Select Project button found, adding event listener');
            selectProjectBtn.addEventListener('click', () => {
                console.log('🖱️ Select Project button clicked!');
                this.showProjectSelection();
            });
        } else {
            console.error('❌ Select Project button not found!');
        }

        console.log('✅ Event listeners setup complete');
    }

    updateWorkflowStatus() {
        // Update fields status
        const fieldsStatus = document.getElementById('fieldsStatus');
        const fieldsStatusIcon = document.getElementById('fieldsStatusIcon');
        const fieldsStatusText = document.getElementById('fieldsStatusText');

        if (this.workflowState.fieldsAnalyzed) {
            fieldsStatus.classList.add('completed');
            fieldsStatusText.textContent = `${this.analyzedFields?.length || 0} fields analyzed`;
            fieldsStatusIcon.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 12l2 2 4-4"></path>
                    <circle cx="12" cy="12" r="10"></circle>
                </svg>
            `;
        } else {
            fieldsStatus.classList.remove('completed');
            fieldsStatusText.textContent = 'Fields not analyzed';
            fieldsStatusIcon.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                </svg>
            `;
        }

        // Update project status
        const projectStatus = document.getElementById('projectStatus');
        const projectStatusIcon = document.getElementById('projectStatusIcon');
        const projectStatusText = document.getElementById('projectStatusText');

        if (this.workflowState.projectSelected) {
            projectStatus.classList.add('completed');
            projectStatusText.textContent = `Project: ${this.selectedProject?.name || 'Selected'}`;
            projectStatusIcon.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 12l2 2 4-4"></path>
                    <circle cx="12" cy="12" r="10"></circle>
                </svg>
            `;
        } else {
            projectStatus.classList.remove('completed');
            projectStatusText.textContent = 'No project selected';
            projectStatusIcon.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                </svg>
            `;
        }

        // Update button states
        const selectProjectBtn = document.getElementById('selectProjectBtn');
        if (selectProjectBtn) {
            selectProjectBtn.disabled = !this.workflowState.fieldsAnalyzed;
        }
    }

    async analyzeFields() {
        console.log('🔍 Starting field analysis...');

        try {
            // Get current tab
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tabs.length === 0) {
                throw new Error('No active tab found');
            }

            // Detect forms using the existing logic
            await this.detectForms();

            if (this.formFields.length === 0) {
                alert('No form fields detected on this page. Please navigate to a page with forms.');
                return;
            }

            // Create field analysis JSON
            const fieldAnalysis = {
                url: tabs[0].url,
                title: tabs[0].title,
                timestamp: new Date().toISOString(),
                fields: this.formFields.map(field => ({
                    id: field.id,
                    name: field.name,
                    type: field.type,
                    fieldType: field.fieldType,
                    label: field.label,
                    required: field.required,
                    options: field.options || undefined,
                    placeholder: field.placeholder,
                    value: field.value
                }))
            };

            // Store analysis results
            this.analyzedFields = fieldAnalysis.fields;
            this.workflowState.fieldsAnalyzed = true;

            // Send to backend
            await this.sendFieldAnalysisToBackend(fieldAnalysis);

            // Update UI
            this.updateWorkflowStatus();
            this.showAnalysisResults();

            console.log('✅ Field analysis complete:', fieldAnalysis);

        } catch (error) {
            console.error('❌ Field analysis failed:', error);
            alert(`Field analysis failed: ${error.message}`);
        }
    }

    async sendFieldAnalysisToBackend(fieldAnalysis) {
        try {
            const response = await fetch(`${this.webAppUrl}/api/analyze-fields`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(fieldAnalysis)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log('✅ Field analysis sent to backend:', result);
            return result;

        } catch (error) {
            console.error('❌ Failed to send field analysis to backend:', error);
            // Don't throw error - continue with local functionality
        }
    }

    showAnalysisResults() {
        const resultsSection = document.getElementById('resultsSection');
        const analysisResults = document.getElementById('analysisResults');
        const fieldCount = document.getElementById('fieldCount');
        const fieldsSummary = document.getElementById('fieldsSummary');

        if (!resultsSection || !analysisResults) return;

        // Show results section
        resultsSection.style.display = 'block';
        analysisResults.style.display = 'block';

        // Update field count
        if (fieldCount) {
            fieldCount.textContent = `${this.analyzedFields.length} fields`;
        }

        // Create field type summary
        const fieldTypes = {};
        this.analyzedFields.forEach(field => {
            const type = field.type === 'radio-group' ? 'Radio Group' :
                        field.type === 'select' ? 'Dropdown' :
                        field.type === 'textarea' ? 'Text Area' :
                        field.type === 'email' ? 'Email' :
                        field.type === 'tel' ? 'Phone' :
                        field.type === 'date' ? 'Date' :
                        field.type === 'checkbox' ? 'Checkbox' :
                        'Text Input';

            fieldTypes[type] = (fieldTypes[type] || 0) + 1;
        });

        // Render field summary
        if (fieldsSummary) {
            fieldsSummary.innerHTML = Object.entries(fieldTypes)
                .map(([type, count]) => `
                    <div class="field-type-summary">
                        <span class="field-type-name">${type}</span>
                        <span class="field-type-count">${count}</span>
                    </div>
                `).join('');
        }
    }

    async showProjectSelection() {
        console.log('📋 Showing project selection...');

        try {
            // Fetch projects from backend
            const projects = await this.fetchProjects();

            // Show project selection UI
            const resultsSection = document.getElementById('resultsSection');
            const projectSelection = document.getElementById('projectSelection');
            const projectsList = document.getElementById('projectsList');

            if (!resultsSection || !projectSelection || !projectsList) return;

            resultsSection.style.display = 'block';
            projectSelection.style.display = 'block';

            // Render projects list
            if (projects.length === 0) {
                projectsList.innerHTML = `
                    <div style="text-align: center; padding: 20px; color: #64748b;">
                        <p>No projects found.</p>
                        <p>Please create a project in the web app first.</p>
                    </div>
                `;
                return;
            }

            projectsList.innerHTML = projects.map(project => `
                <div class="project-item" data-project-id="${project.id}">
                    <div class="project-name">${project.name}</div>
                    <div class="project-details">
                        Created: ${new Date(project.created_at).toLocaleDateString()}
                        ${project.planset_text ? '• Has Planset' : ''}
                        ${project.utility_bill_text ? '• Has Utility Bill' : ''}
                    </div>
                </div>
            `).join('');

            // Add click handlers for project selection
            projectsList.querySelectorAll('.project-item').forEach(item => {
                item.addEventListener('click', () => {
                    const projectId = item.dataset.projectId;
                    const project = projects.find(p => p.id == projectId);
                    this.selectProject(project);
                });
            });

        } catch (error) {
            console.error('❌ Failed to show project selection:', error);
            alert(`Failed to load projects: ${error.message}`);
        }
    }

    async fetchProjects() {
        try {
            const response = await fetch(`${this.webAppUrl}/api/projects`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const projects = await response.json();
            console.log('✅ Projects fetched:', projects);
            return projects;

        } catch (error) {
            console.error('❌ Failed to fetch projects:', error);
            throw error;
        }
    }

    selectProject(project) {
        console.log('📋 Project selected:', project);

        // Update selected project
        this.selectedProject = project;
        this.workflowState.projectSelected = true;

        // Update UI
        this.updateWorkflowStatus();

        // Highlight selected project
        document.querySelectorAll('.project-item').forEach(item => {
            item.classList.remove('selected');
        });
        document.querySelector(`[data-project-id="${project.id}"]`).classList.add('selected');

        // Start auto-fill process
        this.startAutoFill();
    }

    async startAutoFill() {
        console.log('🚀 Starting auto-fill process...');

        try {
            // Show progress
            this.showAutoFillProgress();

            // Prepare data for LLM
            const requestData = {
                fields: this.analyzedFields,
                project: {
                    id: this.selectedProject.id,
                    name: this.selectedProject.name,
                    planset_text: this.selectedProject.planset_text,
                    utility_bill_text: this.selectedProject.utility_bill_text
                }
            };

            // Send to backend for LLM processing
            const response = await fetch(`${this.webAppUrl}/api/auto-fill`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log('✅ Auto-fill response:', result);

            // Apply the field values
            await this.applyFieldValues(result.fieldValues);

            // Hide progress
            this.hideAutoFillProgress();

            alert('✅ Form auto-filled successfully!');

        } catch (error) {
            console.error('❌ Auto-fill failed:', error);
            this.hideAutoFillProgress();
            alert(`Auto-fill failed: ${error.message}`);
        }
    }

    showAutoFillProgress() {
        const resultsSection = document.getElementById('resultsSection');
        const autofillProgress = document.getElementById('autofillProgress');

        if (resultsSection && autofillProgress) {
            resultsSection.style.display = 'block';
            autofillProgress.style.display = 'block';
        }
    }

    hideAutoFillProgress() {
        const autofillProgress = document.getElementById('autofillProgress');
        if (autofillProgress) {
            autofillProgress.style.display = 'none';
        }
    }

    async applyFieldValues(fieldValues) {
        console.log('🖊️ Applying field values:', fieldValues);

        try {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tabs.length === 0) return;

            // Use the existing auto-fill logic but with the new field values
            await this.fillFormsWithMappings(fieldValues);

        } catch (error) {
            console.error('❌ Failed to apply field values:', error);
            throw error;
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

        // Group radio buttons by name and handle other inputs
        const radioGroups = new Map();

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

            // Handle radio buttons specially - group them by name
            if (input.type === 'radio' && input.name) {
                if (!radioGroups.has(input.name)) {
                    radioGroups.set(input.name, []);
                }
                radioGroups.get(input.name).push(input);
                return; // Skip individual processing for radio buttons
            }

            // Handle non-radio fields normally
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

        // Process radio button groups
        radioGroups.forEach((radioButtons, groupName) => {
            const visibleRadios = radioButtons.filter(radio => isElementVisible(radio));
            if (visibleRadios.length === 0) return;

            const firstRadio = visibleRadios[0];
            let groupLabel = getRadioGroupLabel(visibleRadios) || getFieldLabel(firstRadio);

            // Collect all options
            const options = visibleRadios.map(radio => ({
                value: radio.value,
                label: getFieldLabel(radio) || radio.value,
                checked: radio.checked
            }));

            const radioGroupField = {
                id: groupName || `radio_group_${fields.length}`,
                name: groupName,
                type: 'radio-group',
                placeholder: '',
                label: groupLabel,
                value: visibleRadios.find(r => r.checked)?.value || '',
                required: visibleRadios.some(r => r.required),
                fieldType: 'radio',
                options: options
            };

            fields.push(radioGroupField);
        });

        // Helper function to get radio group label
        function getRadioGroupLabel(radioButtons) {
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

        return {
            formsCount: forms.length,
            fields: fields,
            url: window.location.href
        };
    }



    renderFormFields() {
        const formFieldsList = document.getElementById('formFieldsList');
        if (!formFieldsList) return;

        const fieldsHtml = this.formFields.map(field => {
            if (field.type === 'radio-group' && field.options) {
                // Render radio group with options
                const optionsHtml = field.options.map(option =>
                    `<div class="radio-option">
                        <span class="option-label">${option.label}</span>
                        <span class="option-value">${option.value}</span>
                        ${option.checked ? '<span class="selected-indicator">✓</span>' : ''}
                    </div>`
                ).join('');

                return `
                    <div class="form-field-item radio-group-item">
                        <div class="field-info">
                            <span class="field-label">${field.label}</span>
                            <span class="field-type">${field.type}</span>
                        </div>
                        <div class="radio-options">
                            ${optionsHtml}
                        </div>
                        <div class="field-value">
                            <select data-field-id="${field.id}" data-field-type="radio-group">
                                <option value="">Select an option...</option>
                                ${field.options.map(option =>
                                    `<option value="${option.value}" ${option.checked ? 'selected' : ''}>${option.label}</option>`
                                ).join('')}
                            </select>
                        </div>
                    </div>
                `;
            } else {
                // Render regular field
                return `
                    <div class="form-field-item">
                        <div class="field-info">
                            <span class="field-label">${field.label}</span>
                            <span class="field-type">${field.type}</span>
                        </div>
                        <div class="field-value">
                            <input type="text" placeholder="Auto-fill value" data-field-id="${field.id}" />
                        </div>
                    </div>
                `;
            }
        }).join('');

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

                        // Check if this is a radio group (fieldId might be a radio group name)
                        const radioButtons = document.querySelectorAll(`input[type="radio"][name="${fieldId}"]`);

                        if (radioButtons.length > 0) {
                            // Handle radio button group
                            let radioFilled = false;
                            radioButtons.forEach(radio => {
                                // Try to match by value or label
                                const radioLabel = getFieldLabel(radio) || radio.value;
                                if (radio.value === value ||
                                    radioLabel.toLowerCase().includes(value.toLowerCase()) ||
                                    value.toLowerCase().includes(radioLabel.toLowerCase())) {
                                    radio.checked = true;
                                    radio.dispatchEvent(new Event('change', { bubbles: true }));
                                    filled++;
                                    radioFilled = true;
                                    console.log(`✅ Selected radio ${fieldId} with value: ${radio.value}`);
                                    return;
                                }
                            });

                            if (radioFilled) return; // Skip regular field processing
                        }

                        // Regular field processing
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
                            if (element.type === 'radio') {
                                // Handle individual radio button
                                element.checked = true;
                                element.dispatchEvent(new Event('change', { bubbles: true }));
                            } else {
                                // Handle regular input
                                element.value = value;
                                element.dispatchEvent(new Event('input', { bubbles: true }));
                                element.dispatchEvent(new Event('change', { bubbles: true }));
                            }
                            filled++;
                            console.log(`✅ Filled ${fieldId} with: ${value}`);
                        }
                    });

                    // Helper function to get field label (same as in content script)
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

                        return '';
                    }

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
