# Troubleshooting Guide

## Current Issues & Fixes

### Issue 1: View Toggle Buttons Not Working ❌

**Status:** Investigating

**Symptoms:**
- Clicking Month/Quarter/Year buttons doesn't change the view
- Timeline doesn't re-render

**What Was Done:**
1. Added null checks for button elements
2. Added console.log debugging
3. Verified button IDs match in HTML and JavaScript

**How to Debug:**
1. Open `debug-test.html` in your browser
2. Click "Open Full Application"
3. Create or open a roadmap
4. Open browser console (F12 → Console tab)
5. Look for the message: `View buttons: [object] [object] [object]`
   - If you see `null null null`, the buttons aren't being found
6. Click each view button and check for console messages:
   - `Month button clicked`
   - `Quarter button clicked`
   - `Year button clicked`
7. Check for the message: `renderTimeline called with view: month/quarter/year`

**Possible Causes:**
- Buttons not loaded when script runs
- JavaScript error preventing initialization
- Scope issue with buttons

**Next Steps:**
- Check browser console for any JavaScript errors
- Verify the page is index.html (not home.html)
- Try hard refresh (Cmd+Shift+R or Ctrl+Shift+R)

---

### Issue 2: Today Marker Not Visible ❌

**Status:** Investigating

**Symptoms:**
- No red vertical line showing today's date
- No "TODAY" label visible

**What Was Done:**
1. Added console logging for today marker calculation
2. Verified gridLinesHtml is added to all workstreams
3. CSS styling verified (.today-marker class exists)

**How to Debug:**
1. Open browser console
2. Look for messages:
   ```
   Today date: [date] Min: [date] Max: [date]
   Adding today marker at: [X]px
   ```
3. If you see "Today is outside timeline range", your activities don't include today
4. Check if red line exists in HTML:
   - Right-click on timeline → Inspect Element
   - Search for `class="today-marker"`
   - Check if it has proper styles: `left: [X]px; z-index: 5;`

**Possible Causes:**
- Today's date is outside the range of your activities
- CSS z-index issue (today marker behind other elements)
- gridLinesHtml not being added properly

**Solutions:**
1. Add activities with dates within ±30 days of today
2. Check CSS:
   ```css
   .today-marker {
       position: absolute;
       width: 2px;
       background: linear-gradient(to bottom, transparent 0%, #ef4444 5%, #ef4444 95%, transparent 100%);
       top: 0;
       bottom: 0;
       pointer-events: none;
       z-index: 5;
   }
   ```

---

### Issue 3: Text Still Overlapping ❌

**Status:** Partially Fixed

**Symptoms:**
- Activity names overlap with each other
- Start/end dates overlap with adjacent activities

**What Was Done:**
1. Increased text padding from 120px to 180px
2. Smart positioning algorithm accounts for text width
3. Activities placed on different rows to avoid overlap

**How to Test:**
1. Create 3-4 activities in the same workstream
2. Give them overlapping or sequential date ranges
3. They should automatically stack on different rows
4. Text should not overlap

**Possible Causes:**
- Very long activity names (>30 characters)
- Too many activities in small time period
- Browser zoom level affecting calculations

**Solutions:**
1. **Use shorter activity names** (< 25 characters recommended)
2. **Switch to Quarter or Year view** for wider spacing
3. **Adjust zoom level** - Try 90% or 100% browser zoom
4. **Manually increase padding** in code (change 180 to 220):
   ```javascript
   const textPadding = 220; // Line 748 in script.js
   ```

---

## Quick Test Checklist

### Test 1: View Buttons
- [ ] Open index.html?id=xxx
- [ ] See three buttons: Month, Quarter, Year
- [ ] "Month" button is highlighted (white background)
- [ ] Click "Quarter" button → console shows "Quarter button clicked"
- [ ] Timeline re-renders with Q1, Q2, Q3, Q4 labels
- [ ] Click "Year" button → timeline shows year labels
- [ ] Click "Month" button → timeline returns to monthly view

### Test 2: Today Marker
- [ ] Create an activity with start date = today - 7 days
- [ ] Create an activity with end date = today + 7 days
- [ ] Open timeline
- [ ] See red vertical line
- [ ] Line has "TODAY" label at top
- [ ] Console shows "Adding today marker at: [X]px"

### Test 3: Text Overlap
- [ ] Create activity "Project Kickoff" from Jan 1 - Jan 15
- [ ] Create activity "Requirements Gathering" from Jan 10 - Jan 25
- [ ] Both in same workstream
- [ ] Activities stack on different rows
- [ ] "Project Kickoff" text visible above first bar
- [ ] "Requirements Gathering" text visible above second bar
- [ ] Start dates visible on left of bars (plain text)
- [ ] End dates visible on right of bars (with background)
- [ ] No text overlaps

### Test 4: Drag and Drop
- [ ] Hover over activity bar → cursor changes to "move"
- [ ] Click and drag bar left → dates update in real-time
- [ ] Release → activity stays in new position
- [ ] Table updates with new dates
- [ ] Reload page → changes persist
- [ ] Hover over left edge → cursor changes to "↔"
- [ ] Drag left edge → start date changes
- [ ] Hover over right edge → cursor changes to "↔"
- [ ] Drag right edge → end date changes

---

## Debug Commands

Open browser console (F12) and run these:

```javascript
// Check current view
console.log('Current view:', currentView);

// Check if buttons exist
console.log('View buttons:',
    document.getElementById('viewMonthBtn'),
    document.getElementById('viewQuarterBtn'),
    document.getElementById('viewYearBtn')
);

// Check roadmap items
console.log('Roadmap items:', roadmapItems);

// Check for today marker
console.log('Today markers:', document.querySelectorAll('.today-marker'));

// Force re-render
renderTimeline();

// Change view manually
currentView = 'quarter';
renderTimeline();
```

---

## File Locations

- **Main App**: `/Users/i053963/projects/roadmap-generator/index.html`
- **Test Page**: `/Users/i053963/projects/roadmap-generator/debug-test.html`
- **Script**: `/Users/i053963/projects/roadmap-generator/script.js`
- **Styles**: `/Users/i053963/projects/roadmap-generator/styles.css`

---

## Next Debugging Steps

1. **Open debug-test.html** for guided testing
2. **Check browser console** for all debug messages
3. **Take screenshots** of issues if they persist
4. **Report findings** with:
   - Browser and version
   - Console error messages
   - Screenshots
   - Steps to reproduce

---

## Contact & Support

If issues persist after trying these steps:
1. Check GitHub Issues: https://github.com/kushaalchoudri/roadmap-generator/issues
2. Share console logs and screenshots
3. Specify browser (Chrome, Firefox, Safari, etc.)
