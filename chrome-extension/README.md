# Smart Form Guide - Chrome Extension

Intelligent form filling assistant for solar permit applications. Automatically suggests field values from your uploaded documents.

## Features

### 🎯 **Smart Form Detection**
- Automatically detects form fields on government and permit websites
- Classifies field types (name, email, address, project description, etc.)
- Calculates confidence scores for auto-fill suggestions

### 🔐 **Seamless Authentication**
- Single Sign-On with Smart Form Guide web application
- No need to login separately in the extension
- Secure token-based authentication

### 📁 **Project Integration**
- Access your uploaded projects and documents
- Select active project for form filling
- Real-time sync with main application

### ⚡ **Intelligent Auto-Fill**
- Extracts relevant data from your uploaded PDFs
- Suggests appropriate values for each form field
- Highlights fillable fields for easy identification

### 🎨 **Beautiful UI**
- Modern, responsive design
- Floating assistance panel on permit websites
- Draggable and customizable interface

## Installation

### For Development:

#### Step 1: Create Icon Files
Before loading the extension, you need to create the required PNG icon files:

**Option A: Use the Icon Generator**
1. Open `chrome-extension/icon-generator.html` in your browser
2. Right-click each icon and save as PNG with these names:
   - `icons/icon16.png` (16x16 pixels)
   - `icons/icon32.png` (32x32 pixels)
   - `icons/icon48.png` (48x48 pixels)
   - `icons/icon128.png` (128x128 pixels)

**Option B: Use Online Converter**
1. Copy the SVG code from `icons/icon.svg`
2. Use an online SVG to PNG converter
3. Generate PNG files in sizes: 16x16, 32x32, 48x48, 128x128
4. Save them in the `icons/` folder with the correct names

**Option C: Use the JavaScript Generator**
1. Open `chrome-extension/create-icons.js` in a browser
2. Open browser console and run the script
3. It will automatically download all required PNG files

#### Step 2: Update Manifest
After creating the PNG files, add this to `manifest.json`:

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

#### Step 3: Load Extension
1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked" and select the `chrome-extension` folder
4. The extension will appear in your browser toolbar

### For Users:
1. Install from Chrome Web Store (coming soon)
2. Sign in with your Smart Form Guide account
3. Navigate to any permit website to start using

## How to Use

### 1. **Initial Setup**
- Install the extension
- Click the extension icon in your browser toolbar
- Sign in with your Smart Form Guide account
- Your projects will automatically sync

### 2. **Select a Project**
- In the extension popup, choose the project you want to use
- This project's documents will be used for form filling suggestions

### 3. **Navigate to Permit Website**
- Go to any government permit website (e.g., *.gov, accela.com)
- The extension will automatically detect form fields
- A floating assistance panel will appear

### 4. **Auto-Fill Forms**
- Click "Auto-fill Fields" in the floating panel
- The extension will suggest values based on your uploaded documents
- Review and modify suggestions as needed

## Supported Websites

The extension works on:
- Government websites (*.gov)
- Accela permit portals (*.accela.com)
- PermitFlow platforms (*.permitflow.com)
- Other permit and building department websites

## Field Types Detected

- **Personal Information**: Name, email, phone number
- **Address Information**: Street address, city, state, ZIP code
- **Project Details**: Description, type, value, area
- **Dates**: Application date, project timeline
- **Technical Details**: System size, equipment specifications

## Privacy & Security

- All data is encrypted and stored securely
- No form data is stored without your explicit consent
- Authentication tokens are managed securely
- Only works with your explicitly uploaded documents

## Technical Requirements

- Chrome browser version 88 or higher
- Active Smart Form Guide account
- Internet connection for authentication and data sync

## Support

For help and support:
- Visit the main Smart Form Guide application
- Check the help section in the extension popup
- Contact support through the web application

## Version History

### v1.0.0 (Current)
- Initial release
- Form detection and classification
- Single Sign-On authentication
- Project integration
- Auto-fill suggestions
- Floating assistance panel

## Development

### Project Structure
```
chrome-extension/
├── manifest.json          # Extension configuration
├── popup.html             # Extension popup interface
├── popup.css              # Popup styles
├── popup.js               # Popup functionality
├── content.js             # Content script for form detection
├── content.css            # Content script styles
├── background.js          # Background service worker
├── icons/                 # Extension icons
└── README.md              # This file
```

### Key Components

1. **Popup Interface** (`popup.html`, `popup.css`, `popup.js`)
   - User authentication
   - Project selection
   - Extension status and controls

2. **Content Script** (`content.js`, `content.css`)
   - Form field detection and analysis
   - Floating assistance panel
   - Auto-fill functionality

3. **Background Service** (`background.js`)
   - Authentication management
   - API communication
   - Cross-tab messaging

### API Integration

The extension communicates with:
- **Backend API** (`http://localhost:8000`) for authentication and data
- **Frontend App** (`http://localhost:3000`) for user interface integration

## Contributing

This extension is part of the Smart Form Guide project. For development guidelines and contribution instructions, please refer to the main project repository.

## License

© 2025 Smart Form Guide. All rights reserved.
