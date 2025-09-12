// Smart Form Guide Chrome Extension - Background Script (No Authentication)
console.log('🚀 Smart Form Guide Extension Background Script loaded');

const webAppUrl = 'http://localhost:3000';

// Listen for extension installation
if (chrome.runtime && chrome.runtime.onInstalled) {
    chrome.runtime.onInstalled.addListener((details) => {
        console.log('🎉 Extension installed:', details.reason);

        if (details.reason === 'install') {
            // Open welcome page
            if (chrome.tabs && chrome.tabs.create) {
                chrome.tabs.create({
                    url: `${webAppUrl}/extension-welcome`
                });
            }

            // Set default settings
            if (chrome.storage && chrome.storage.local) {
                chrome.storage.local.set({
                    extensionEnabled: true,
                    autoDetectForms: true,
                    showNotifications: true,
                    version: chrome.runtime.getManifest().version
                });
            }
        }
    });
}

// Listen for action clicks to open sidebar
if (chrome.action && chrome.action.onClicked) {
    chrome.action.onClicked.addListener(async (tab) => {
        console.log('🖱️ Extension icon clicked');
        
        // Try to open sidebar first
        if (chrome.sidePanel && chrome.sidePanel.open) {
            try {
                await chrome.sidePanel.open({ tabId: tab.id });
                console.log('📱 Sidebar opened');
                return;
            } catch (error) {
                console.error('❌ Failed to open sidebar:', error);
            }
        }
        
        // Fallback: open popup in new tab if sidebar not supported
        console.log('📱 Sidebar not supported, opening in new tab');
        if (chrome.tabs && chrome.tabs.create) {
            chrome.tabs.create({
                url: chrome.runtime.getURL('sidebar.html'),
                active: true
            });
        }
    });
}

// Listen for messages from content scripts and sidebar
if (chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        // Safety check for message object
        if (!message || typeof message !== 'object') {
            console.warn('❓ Invalid message received:', message);
            sendResponse({ error: 'Invalid message format' });
            return;
        }

        console.log('📨 Background received message:', message.type);

        // Handle different message types
        switch (message.type) {
            case 'FORM_DETECTED':
                handleFormDetected(message, sendResponse);
                break;
            case 'FORM_FILLED':
                handleFormFilled(message, sendResponse);
                break;
            case 'LOG_ACTIVITY':
                if (message.activity) {
                    logActivity(message.activity);
                    sendResponse({ success: true });
                } else {
                    sendResponse({ error: 'No activity data provided' });
                }
                break;
            default:
                console.warn('❓ Unknown message type:', message.type);
                sendResponse({ error: 'Unknown message type' });
        }

        return true; // Keep message channel open for async responses
    });
}

// Listen for tab updates to detect permit websites
if (chrome.tabs && chrome.tabs.onUpdated) {
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
        if (changeInfo.status === 'complete' && tab && tab.url) {
            const isPermitSite = isPermitWebsite(tab.url);

            if (isPermitSite) {
                console.log('🏛️ Permit website detected on tab', tabId, ':', tab.url);
                // Content script will be injected via manifest
                
                // Notify sidebar if open
                notifySidebarOfPageChange(tabId, tab.url);
            }
        }
    });
}

// Helper functions
async function handleFormDetected(message, sendResponse) {
    try {
        console.log('📋 Form detected:', message.formData);
        
        // Store detected form data
        if (chrome.storage && chrome.storage.local) {
            await chrome.storage.local.set({
                detectedForms: message.formData,
                detectionTimestamp: Date.now(),
                tabId: message.tabId
            });
        }
        
        sendResponse({ success: true });
    } catch (error) {
        console.error('❌ Failed to handle form detection:', error);
        sendResponse({ success: false, error: error.message });
    }
}

async function handleFormFilled(message, sendResponse) {
    try {
        console.log('✅ Form filled:', message.fillData);
        
        // Log form filling activity
        logActivity({
            type: 'form_filled',
            timestamp: Date.now(),
            fieldsCount: message.fillData.fieldsCount,
            url: message.url
        });
        
        sendResponse({ success: true });
    } catch (error) {
        console.error('❌ Failed to handle form filling:', error);
        sendResponse({ success: false, error: error.message });
    }
}

function isPermitWebsite(url) {
    const permitDomains = [
        '.gov',
        'accela.com',
        'permitflow.com',
        'permits.',
        'planning.',
        'building.'
    ];
    
    return permitDomains.some(domain => url.includes(domain));
}

async function notifySidebarOfPageChange(tabId, url) {
    try {
        // Send message to sidebar about page change
        if (chrome.runtime && chrome.runtime.sendMessage) {
            chrome.runtime.sendMessage({
                type: 'PAGE_CHANGED',
                tabId: tabId,
                url: url,
                isPermitSite: isPermitWebsite(url)
            });
        }
    } catch (error) {
        // Sidebar might not be open, that's okay
        console.log('📱 Sidebar not available for notification');
    }
}

function logActivity(activity) {
    console.log('📊 Activity logged:', activity);
    
    // Store activity in local storage for analytics
    if (chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['activityLog'], (result) => {
            const log = result.activityLog || [];
            log.push(activity);
            
            // Keep only last 100 activities
            if (log.length > 100) {
                log.splice(0, log.length - 100);
            }
            
            chrome.storage.local.set({ activityLog: log });
        });
    }
}

// Cleanup on extension unload
if (chrome.runtime && chrome.runtime.onSuspend) {
    chrome.runtime.onSuspend.addListener(() => {
        console.log('🧹 Extension background script suspended');
    });
}
