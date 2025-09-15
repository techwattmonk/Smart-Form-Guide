# 🔄 Extension Reload Instructions

## Quick Fix Steps

### 1. **Reload the Extension**
1. Open Chrome and go to `chrome://extensions/`
2. Find "Smart Form Guide - Permit Assistant"
3. Click the **🔄 Reload** button (circular arrow icon)
4. Make sure the extension is **enabled** (toggle should be blue/on)

### 2. **Test on Local File**
1. Navigate to: `file:///d:/Wattmonk/Smart-Form-Guide/chrome-extension/test-form-detection.html`
2. Open the extension sidebar (click the extension icon)
3. Click **"Detect Forms"** button
4. OR click the **"🔍 Test Form Detection (Manual)"** button on the page

### 3. **Enable File Access (If Needed)**
1. Go to `chrome://extensions/`
2. Find "Smart Form Guide - Permit Assistant"
3. Click **"Details"**
4. Scroll down and toggle **"Allow access to file URLs"** to ON

### 4. **Check Console for Debug Info**
1. Press `F12` to open Developer Tools
2. Go to **Console** tab
3. Look for messages starting with:
   - `🔍 Smart Form Guide - Form Assistant initialized`
   - `📋 Found X forms on page`
   - `🎯 Total detected fields: X`

## Expected Results

### On Test Page:
- Should detect **~15-17 form fields**
- Console should show detailed field information
- Extension sidebar should show field count
- Manual test button should show debug info

### On PG&E Website:
- Should detect all radio buttons and input fields
- Should show field count in floating panel
- Should enable auto-fill button

## Troubleshooting

### If Nothing Happens:
1. **Check extension is loaded**: Look for extension icon in toolbar
2. **Check file access**: Enable "Allow access to file URLs" in extension details
3. **Check console**: Look for error messages in F12 Developer Tools
4. **Try different site**: Test on a regular website with forms

### If Still Not Working:
1. **Uninstall and reinstall** the extension
2. **Check manifest.json** was updated correctly
3. **Try incognito mode** (if extension is enabled for incognito)

## Debug Commands

Open console (F12) and run:
```javascript
// Check if content script is loaded
console.log('Content script loaded:', !!window.formAssistantInstance);

// Manual form detection
if (window.formAssistantInstance) {
    window.formAssistantInstance.detectForms();
}

// Count forms manually
console.log('Forms:', document.querySelectorAll('form').length);
console.log('Inputs:', document.querySelectorAll('input, select, textarea').length);
```
