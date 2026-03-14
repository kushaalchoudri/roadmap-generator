# 🔍 DEBUG: Data Persistence Issue

## 🚨 Problem
Roadmap data is being deleted when the page is refreshed.

## 🛠️ Debugging Steps Added

I've added console logging to help diagnose the issue. Here's what to check:

### Step 1: Open Browser Console
1. Open your roadmap: `https://kushaalchoudri.github.io/roadmap-generator/home.html`
2. Press **F12** (or **Cmd+Option+I** on Mac)
3. Go to **Console** tab

### Step 2: Check What's Being Logged

When you open a roadmap, you should see:

```
All roadmaps loaded: {roadmap-id-1: {...}, roadmap-id-2: {...}}
Current roadmap ID: 1234567890
Loaded roadmap items: X items
renderTable called, roadmapItems count: X
```

When you add/edit an item and it auto-saves:

```
Saving roadmap, items count: X
Saved to localStorage, roadmap ID: 1234567890, items: X
```

### Step 3: Check localStorage Directly

In the Console tab, type:

```javascript
JSON.parse(localStorage.getItem('allRoadmaps'))
```

This should show all your roadmaps and their items.

## 🔬 Common Issues to Look For

### Issue 1: roadmapItems count is 0 after load
**Symptom**: Console shows "Loaded roadmap items: 0 items"
**Cause**: Data isn't being saved properly, or localStorage is being cleared
**Check**:
- Did you see "Saved to localStorage" messages before?
- Does `localStorage.getItem('allRoadmaps')` return null?

### Issue 2: roadmap ID changes on refresh
**Symptom**: Different roadmap ID each time you refresh
**Cause**: URL parameter isn't being preserved
**Check**: Look at the URL in the address bar - does it have `?id=XXXX`?

### Issue 3: localStorage is empty
**Symptom**: `localStorage.getItem('allRoadmaps')` returns null
**Possible Causes**:
- Browser privacy mode (Incognito/Private browsing doesn't persist localStorage)
- Browser settings clearing storage on exit
- Browser extension interfering with localStorage

### Issue 4: Data loads but table doesn't render
**Symptom**: Console shows items loaded, but table is empty
**Cause**: Rendering issue, not data loss
**Check**: Look for any JavaScript errors in Console

## 🧪 Test Scenarios

### Test 1: Create and Save
1. Create a new roadmap
2. Add 1-2 activities
3. **Check Console**: Should see "Saved to localStorage" messages
4. **Refresh page**
5. **Check Console**: Should see "Loaded roadmap items: 2 items"

### Test 2: Manual localStorage Check
After adding items, in Console run:
```javascript
const data = JSON.parse(localStorage.getItem('allRoadmaps'));
console.log('All roadmaps:', Object.keys(data));
console.log('Current roadmap items:', data[currentRoadmapId]?.items?.length);
```

### Test 3: Cross-Tab Test
1. Open roadmap in Tab A
2. Add an activity
3. Open **same roadmap URL** in Tab B
4. **Expected**: Should see the activity in Tab B

## 📊 What to Report Back

Please share:
1. **All console log messages** when you:
   - Open the roadmap
   - Add an activity
   - Refresh the page
2. **Output of**: `JSON.parse(localStorage.getItem('allRoadmaps'))`
3. **Browser name and version**
4. **Are you using Incognito/Private mode?**

## 🎯 Quick Fixes to Try

### Fix 1: Different Browser
Try a different browser - if it works there, it's a browser setting issue.

### Fix 2: Normal Mode (Not Incognito)
Incognito mode clears localStorage when you close the window.

### Fix 3: Check Browser Storage Settings
- Chrome: Settings → Privacy and security → Cookies and site data
- Make sure "Clear cookies and site data when you close all windows" is **OFF**

### Fix 4: Try Local Version
Use the local file instead of GitHub Pages:
```
file:///Users/i053963/projects/roadmap-generator/home.html
```

---

**This debugging version will help us identify exactly where the data is being lost!**
