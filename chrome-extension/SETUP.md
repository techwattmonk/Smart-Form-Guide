# Chrome Extension Setup Guide

## Quick Fix for Icon Error

The extension is failing to load because it's missing PNG icon files. Here's how to fix it:

### Method 1: Temporary Fix (Fastest)
Remove the icons requirement temporarily to test the extension:

1. Open `manifest.json`
2. Remove or comment out the `"icons"` section
3. In the `"action"` section, remove the `"default_icon"` property
4. Save the file
5. Try loading the extension again

### Method 2: Create Proper Icons (Recommended)

#### Using Online Converter (Easiest):
1. Go to https://convertio.co/svg-png/ or https://cloudconvert.com/svg-to-png
2. Upload the `icons/icon.svg` file
3. Convert to PNG at these sizes:
   - 16x16 pixels → save as `icon16.png`
   - 32x32 pixels → save as `icon32.png`
   - 48x48 pixels → save as `icon48.png`
   - 128x128 pixels → save as `icon128.png`
4. Place all PNG files in the `chrome-extension/icons/` folder
5. Add the icons section back to `manifest.json`:

```json
"action": {
  "default_popup": "popup.html",
  "default_title": "Smart Form Guide Assistant",
  "default_icon": {
    "16": "icons/icon16.png",
    "32": "icons/icon32.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
},

"icons": {
  "16": "icons/icon16.png",
  "32": "icons/icon32.png",
  "48": "icons/icon48.png",
  "128": "icons/icon128.png"
},
```

#### Using Icon Generator HTML:
1. Open `icon-generator.html` in your browser
2. Right-click each icon size and "Save image as..."
3. Save with the correct filenames in the `icons/` folder
4. Update the manifest as shown above

### Method 3: Use Simple Placeholder Icons

Create simple colored squares as temporary icons:

1. Create a 16x16 blue square image and save as `icon16.png`
2. Create a 32x32 blue square image and save as `icon32.png`
3. Create a 48x48 blue square image and save as `icon48.png`
4. Create a 128x128 blue square image and save as `icon128.png`
5. Place all in the `icons/` folder
6. Update the manifest

## Testing the Extension

After fixing the icons:

1. Open Chrome
2. Go to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the `chrome-extension` folder
6. The extension should load successfully

## Troubleshooting

### If you still get errors:
- Check that all file paths in `manifest.json` are correct
- Ensure all referenced files exist
- Check browser console for specific error messages
- Make sure PNG files are valid images

### Common Issues:
- **File not found**: Check file paths and names match exactly
- **Invalid manifest**: Validate JSON syntax
- **Permission errors**: Ensure all required permissions are listed

## Next Steps

Once the extension loads successfully:
1. Click the extension icon in the toolbar
2. Test the popup interface
3. Navigate to a government website to test form detection
4. Check the browser console for any JavaScript errors

## Files Structure

Your `chrome-extension` folder should contain:
```
chrome-extension/
├── manifest.json
├── popup.html
├── popup.css
├── popup.js
├── content.js
├── content.css
├── background.js
├── icons/
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   ├── icon128.png
│   └── icon.svg
└── README.md
```

## Need Help?

If you continue to have issues:
1. Check the Chrome extension developer documentation
2. Look at the browser console for error messages
3. Verify all files are in the correct locations
4. Test with a minimal manifest first, then add features back
