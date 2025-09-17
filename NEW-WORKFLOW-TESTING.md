# New Chrome Extension Workflow Testing Guide

## 🚀 **New Workflow Overview**

The Chrome extension now follows a streamlined 2-step process:

1. **Analyze Fields** - Detect and analyze all form fields on the current page
2. **Select Project** - Choose a project from the database to auto-fill the form using AI

## 🔧 **What Was Implemented**

### **Frontend (Chrome Extension)**
- **New UI Design**: Clean interface with two main action buttons
- **Workflow Status**: Visual indicators showing progress through the workflow
- **Field Analysis**: Comprehensive form field detection with radio button grouping
- **Project Selection**: Dynamic project list from the database
- **Auto-fill Integration**: AI-powered form filling using project data

### **Backend API**
- **`POST /api/analyze-fields`**: Receives field analysis from extension
- **`GET /api/projects`**: Returns all projects with extracted text
- **`POST /api/auto-fill`**: Processes fields with AI using project data

### **Key Features**
- ✅ Radio button grouping (fixed from previous issue)
- ✅ Real-time workflow status tracking
- ✅ Project data integration with LLM
- ✅ Comprehensive field type detection
- ✅ Error handling and user feedback

## 🧪 **Testing Steps**

### **Step 1: Setup**
1. **Start Backend Server**:
   ```bash
   cd backend
   uvicorn app.main:app --reload --port 8000
   ```

2. **Load Chrome Extension**:
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" → Select `chrome-extension` folder
   - Ensure extension is enabled

3. **Create Test Projects** (via web app):
   - Go to `http://localhost:3000`
   - Create a project with planset and utility bill documents
   - Ensure documents have extracted text

### **Step 2: Test Field Analysis**
1. **Open Test Form**:
   - Navigate to `file:///c:/Users/Admin/Smart-Form-Guide/test-radio-groups.html`
   - Or go to the actual PG&E form

2. **Open Extension**:
   - Click the extension icon to open sidebar
   - Should see the new UI with two main buttons

3. **Analyze Fields**:
   - Click "Analyze Fields" button
   - Should see:
     - ✅ Status indicator changes to "X fields analyzed"
     - ✅ Results section appears showing field summary
     - ✅ "Select Project" button becomes enabled
     - ✅ Field types grouped correctly (radio groups as single fields)

### **Step 3: Test Project Selection**
1. **Click "Select Project"**:
   - Should see list of projects from database
   - Each project shows creation date and document status

2. **Select a Project**:
   - Click on a project
   - Should see:
     - ✅ Project highlighted as selected
     - ✅ Status indicator updates to show selected project
     - ✅ Auto-fill process starts automatically

### **Step 4: Test Auto-fill**
1. **AI Processing**:
   - Should see "Auto-filling Form" progress indicator
   - Backend processes fields with LLM using project data

2. **Form Filling**:
   - Form fields should be automatically filled
   - Radio buttons should be selected appropriately
   - Text fields should contain relevant extracted data

## 📊 **Expected Results**

### **Field Analysis Results**
- **Test Form**: Should detect ~6 fields (3 radio groups + 3 text fields)
- **PG&E Form**: Should detect significantly fewer fields due to radio grouping
- **Field Types**: Text, Email, Radio Groups, Dropdowns, etc.

### **Project Selection**
- **Projects List**: All projects from database with document status
- **Selection**: Visual feedback and status updates

### **Auto-fill Results**
- **Radio Groups**: Appropriate option selected based on project data
- **Text Fields**: Relevant information extracted from documents
- **Success Message**: Confirmation of successful auto-fill

## 🐛 **Troubleshooting**

### **Extension Issues**
- **No fields detected**: Check if page has forms, refresh page
- **Button disabled**: Ensure fields are analyzed first
- **Console errors**: Check browser console (F12) for JavaScript errors

### **Backend Issues**
- **API errors**: Check backend console for error messages
- **No projects**: Ensure projects exist in database with extracted text
- **CORS errors**: Backend should allow chrome-extension origins

### **Auto-fill Issues**
- **No filling**: Check if LLM response is valid JSON
- **Wrong values**: Review project document text quality
- **Radio buttons not selected**: Check field name matching logic

## 🔍 **Debug Information**

### **Browser Console Logs**
Look for these log messages:
- `🔍 Starting field analysis...`
- `✅ Field analysis complete:`
- `📋 Showing project selection...`
- `🚀 Starting auto-fill process...`

### **Backend Console Logs**
Look for these log messages:
- `📋 Received field analysis for [URL]`
- `📋 Returning X projects for extension`
- `🚀 Starting auto-fill for X fields`
- `🤖 LLM Response: [JSON]`

### **Network Tab**
Check these API calls:
- `POST /api/analyze-fields` (field analysis)
- `GET /api/projects` (project list)
- `POST /api/auto-fill` (AI processing)

## 📝 **Test Scenarios**

### **Scenario 1: PG&E Form**
1. Navigate to PG&E interconnection form
2. Analyze fields → Should see radio groups properly grouped
3. Select project with solar installation data
4. Verify appropriate program/service selections

### **Scenario 2: Test Form**
1. Use the test HTML file
2. Analyze fields → Should see 6 fields total
3. Select any project
4. Verify all field types are filled correctly

### **Scenario 3: Error Handling**
1. Test with no internet connection
2. Test with invalid project data
3. Test on pages with no forms
4. Verify appropriate error messages

## ✅ **Success Criteria**

- [ ] Extension UI loads with new design
- [ ] Field analysis detects and groups fields correctly
- [ ] Project selection shows database projects
- [ ] Auto-fill successfully fills form fields
- [ ] Radio button groups work properly
- [ ] Error handling provides clear feedback
- [ ] Workflow status updates correctly
- [ ] Backend APIs respond correctly

## 🚀 **Next Steps**

After successful testing:
1. **Authentication**: Add proper user authentication to APIs
2. **Field Mapping**: Improve LLM field mapping accuracy
3. **Error Recovery**: Add retry mechanisms for failed operations
4. **Analytics**: Track field analysis and auto-fill success rates
5. **Performance**: Optimize for large forms and projects
