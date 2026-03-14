# Testing Guide for Enhanced Roadmap Generator

## How to Test

### Option 1: Open in Browser
1. Navigate to the project folder:
   ```bash
   cd /Users/i053963/projects/roadmap-generator
   ```

2. Open `index.html` in your browser:
   ```bash
   open index.html
   ```
   Or simply double-click `index.html` in Finder

### Option 2: Use the Live GitHub Pages Version
Visit: https://kushaalchoudri.github.io/roadmap-generator/home.html

## Test Checklist

### ✅ View Toggle
- [ ] Click "Month" button - should show monthly view with week numbers
- [ ] Click "Quarter" button - should show quarterly view (Q1, Q2, Q3, Q4)
- [ ] Click "Year" button - should show yearly view
- [ ] Active button should be highlighted (white background, blue text)
- [ ] Timeline should re-render appropriately for each view

### ✅ Today Marker
- [ ] Red vertical line with "TODAY" label should appear if today is within timeline range
- [ ] Line should be at the correct position for today's date
- [ ] Should be visible across all workstreams

### ✅ Drag-and-Drop - Move Activity
- [ ] Hover over an activity bar - cursor should change to "move"
- [ ] Click and drag bar left/right
- [ ] Start and end dates should update during drag
- [ ] Release mouse - activity should stay at new position
- [ ] Table should update with new dates
- [ ] Reload page - changes should persist

### ✅ Drag-and-Drop - Resize Start Date
- [ ] Hover over left edge of activity bar - cursor should change to resize (↔)
- [ ] Drag left edge left/right
- [ ] Start date should update during drag
- [ ] End date should remain unchanged
- [ ] Release - changes should save

### ✅ Drag-and-Drop - Resize End Date
- [ ] Hover over right edge of activity bar - cursor should change to resize (↔)
- [ ] Drag right edge left/right
- [ ] End date should update during drag
- [ ] Start date should remain unchanged
- [ ] Release - changes should save

### ✅ Text Positioning
- [ ] Create multiple activities in same workstream with overlapping dates
- [ ] Activities should automatically position to different rows
- [ ] Activity names (labels above bars) should not overlap
- [ ] Start dates (left of bars) should not overlap with adjacent activities
- [ ] End dates (right of bars) should not overlap with adjacent activities
- [ ] All text should remain readable

### ✅ Start Date Styling
- [ ] Start dates should appear as plain gray text (no background box)
- [ ] End dates should still have background box

## Common Issues & Solutions

### Issue: View toggle buttons don't work
**Solution**: Check browser console for JavaScript errors. Make sure `currentView` variable is defined.

### Issue: Drag-and-drop not working
**Solution**:
- Make sure you're clicking on an activity bar (not milestone)
- Check console for errors
- Verify `data-item-id` attribute exists on bars

### Issue: Today marker not showing
**Solution**:
- Check if today's date falls within your timeline date range
- Try adding activities with dates close to today

### Issue: Text still overlaps
**Solution**:
- Try different view modes (month/quarter/year)
- The algorithm uses a fixed 120px padding - very long activity names might still overlap
- Consider shortening activity names if overlaps persist

### Issue: Changes don't persist after drag
**Solution**:
- Check if Firebase is configured (if using shared mode)
- Check browser console for save errors
- Verify localStorage is enabled in browser

## Debug Mode

To enable detailed logging, open browser console (F12) and run:
```javascript
console.log('Current view:', currentView);
console.log('Roadmap items:', roadmapItems);
console.log('Dragged item:', draggedItem);
```

## Reporting Issues

If you find bugs:
1. Note the exact steps to reproduce
2. Check browser console for errors (F12 → Console tab)
3. Note which browser and version you're using
4. Screenshot if visual issue

## Performance Notes

- Drag-and-drop triggers a full re-render on mouse-up (expected behavior)
- Large roadmaps (50+ activities) may have slight lag when dragging
- Year view with many activities may require horizontal scrolling
