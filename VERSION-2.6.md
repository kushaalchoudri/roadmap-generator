# ✅ VERSION 2.6 - Duplicate Items Feature

## 🎨 What's New

### 1. ✅ Duplicate Button in Actions Column
**Feature**: New "Duplicate" button next to the "Delete" button for each item
**Appearance**: Blue button with hover effect
**Location**: Actions column in the activities table

### 2. ✅ Smart Duplicate Dialog
**Opens When**: You click "Duplicate" on any activity or milestone
**Shows**:
- Name of item being duplicated
- Dropdown to select target workstream
- Options include:
  - Same workstream (keeps current workstream)
  - Create new workstream (shows text input)
  - All existing workstreams (list)

### 3. ✅ Flexible Workstream Selection
**Same Workstream**: Creates copy in the same workstream
**Existing Workstream**: Move copy to any existing workstream
**New Workstream**: Create a brand new workstream for the duplicate

### 4. ✅ Complete Item Duplication
**Duplicates All Fields**:
- Name
- Type (Activity/Milestone)
- Dates (Start date, End date, or Milestone date)
- Status
- Description
- Workstream (or changed to new workstream)

---

## 🚀 How to Use

### Step 1: Clear Cache (Important!)
```
Mac: Cmd + Shift + R
Windows: Ctrl + Shift + R
```

### Step 2: Wait 3-4 Minutes
GitHub Pages needs time to deploy v2.6

### Step 3: Open App
```
Local: file:///Users/i053963/projects/roadmap-generator/home.html
Live:  https://kushaalchoudri.github.io/roadmap-generator/home.html
```

### Step 4: Use Duplicate Feature

#### Example 1: Duplicate to Same Workstream
1. Find an activity/milestone you want to duplicate
2. Click **"Duplicate"** button in the Actions column
3. Dialog opens showing the item name
4. Keep default: "Same workstream"
5. Click **"Duplicate"**
6. ✅ Item is copied in the same workstream

#### Example 2: Duplicate to Existing Workstream
1. Click **"Duplicate"** on an item
2. In the dropdown, select an **existing workstream** from the list
3. Click **"Duplicate"**
4. ✅ Item is copied to the selected workstream

#### Example 3: Duplicate to New Workstream
1. Click **"Duplicate"** on an item
2. Select **"Create new workstream..."** from dropdown
3. New text input appears
4. Enter the new workstream name (e.g., "Phase 2", "Team B")
5. Click **"Duplicate"**
6. ✅ New workstream created with the duplicated item

---

## 📊 Technical Changes

### JavaScript (script.js)

#### Added Duplicate Button to Table
```javascript
<td>
    <div class="table-actions">
        <button class="btn-table-action btn-table-duplicate"
                onclick="duplicateRow('${item.id}')">Duplicate</button>
        <button class="btn-table-action btn-table-delete"
                onclick="deleteRow('${item.id}')">Delete</button>
    </div>
</td>
```

#### New duplicateRow() Function
```javascript
async function duplicateRow(id) {
    const item = roadmapItems.find(i => i.id == id);

    // Get all existing workstreams
    const workstreams = [...new Set(roadmapItems.map(i => i.workstream)...)];

    // Show dialog with dropdown
    // Options: same workstream, new workstream, or existing workstreams

    // On confirm:
    const duplicateItem = {
        ...item,
        id: Date.now() + Math.random(), // Unique ID
        workstream: targetWorkstream
    };

    roadmapItems.push(duplicateItem);
    await saveData();
}
```

#### Dialog Features
- Modal overlay with backdrop
- Styled with inline CSS for consistency
- Dropdown for workstream selection
- Conditional input field for new workstream
- Cancel and Confirm buttons
- Click outside to close

### CSS (styles.css)

#### Duplicate Button Styling
```css
.btn-table-duplicate {
    background: #dbeafe;      /* Light blue */
    color: #1e40af;           /* Dark blue text */
    border: 1px solid #bfdbfe;
    margin-right: 5px;
}

.btn-table-duplicate:hover {
    background: #bfdbfe;      /* Slightly darker blue */
}
```

---

## 🎯 Use Cases

### Use Case 1: Testing Different Workstreams
Duplicate the same activity to multiple workstreams to compare timelines or test different team allocations.

### Use Case 2: Template Activities
Create a template activity with common settings, then duplicate it to multiple workstreams and adjust dates/names.

### Use Case 3: Milestone Replication
Duplicate a milestone (e.g., "Review Meeting") across multiple workstreams that need the same checkpoint.

### Use Case 4: Phase Planning
Duplicate entire sets of activities from "Phase 1" workstream to "Phase 2" workstream, then adjust dates.

### Use Case 5: Multi-Team Projects
Copy activities from one team's workstream to another team's workstream when they have similar tasks.

---

## ✨ Benefits

1. **Time Saver** - No need to manually re-enter all fields
2. **Error Reduction** - Copying ensures consistency
3. **Flexible Organization** - Easy to reorganize items across workstreams
4. **Template Support** - Create reusable activity templates
5. **Multi-Team Coordination** - Quickly replicate tasks across teams

---

## 🔄 Workflow Examples

### Workflow 1: Create Activity Templates
```
1. Create a well-defined activity with all details
2. Duplicate it to "Templates" workstream
3. When needed, duplicate from Templates to active workstreams
4. Adjust dates and specifics
```

### Workflow 2: Multi-Phase Projects
```
1. Create all Phase 1 activities in "Phase 1" workstream
2. Duplicate each to "Phase 2" workstream
3. Adjust dates for Phase 2 timeline
4. Repeat for Phase 3, 4, etc.
```

### Workflow 3: Cross-Team Dependencies
```
1. Create activity in "Frontend" workstream
2. Duplicate to "Backend" workstream
3. Adjust names: "Frontend API Integration" → "Backend API Development"
4. Align dates to show dependencies
```

---

## 📸 What You Should See

### In Table View
```
┌──────────┬──────────┬──────────┬─────────────┐
│ Activity │ ...      │ ...      │ Actions     │
├──────────┼──────────┼──────────┼─────────────┤
│ Task A   │ ...      │ ...      │ [Duplicate] │
│          │          │          │ [Delete]    │
└──────────┴──────────┴──────────┴─────────────┘
```

### Duplicate Dialog
```
┌────────────────────────────────────┐
│  Duplicate Item                    │
│                                    │
│  Duplicating: Design Review        │
│                                    │
│  Target Workstream:                │
│  ┌──────────────────────────────┐ │
│  │ Same workstream (Phase 1)  ▼│ │
│  └──────────────────────────────┘ │
│                                    │
│  Options:                          │
│  - Same workstream (Phase 1)       │
│  - Create new workstream...        │
│  - Development                     │
│  - Testing                         │
│                                    │
│           [Cancel]  [Duplicate]    │
└────────────────────────────────────┘
```

### After Duplication
```
Original:
  Workstream: Phase 1
  Activity: Design Review
  Dates: Jan 15 - Jan 20

Duplicate (in Phase 2):
  Workstream: Phase 2
  Activity: Design Review
  Dates: Jan 15 - Jan 20
  (You can now edit dates/name)
```

---

## 🆘 Troubleshooting

### Duplicate button not visible?
- **Cause**: Cache showing old version
- **Solution**: Hard refresh (Cmd/Ctrl + Shift + R)

### Dialog not appearing?
- **Cause**: JavaScript error or old cached JS
- **Solution**: Clear cache, check browser console for errors

### New workstream not created?
- **Cause**: Empty workstream name
- **Solution**: Enter a valid name in the text input

### Duplicate not saving?
- **Cause**: Data persistence issue
- **Solution**: Check console logs, ensure saveData() is working

---

## 🔬 Technical Details

### Data Structure
```javascript
// Original item
{
  id: 1234567890,
  workstream: "Phase 1",
  type: "activity",
  name: "Design Review",
  startDate: "2024-01-15",
  endDate: "2024-01-20",
  status: "not-started",
  description: "Review designs"
}

// Duplicated item
{
  id: 1234567891.543, // New unique ID
  workstream: "Phase 2", // Changed or same
  type: "activity",
  name: "Design Review", // Same
  startDate: "2024-01-15", // Same
  endDate: "2024-01-20", // Same
  status: "not-started", // Same
  description: "Review designs" // Same
}
```

### Unique ID Generation
```javascript
id: Date.now() + Math.random()
// Example: 1710123456789.234
// Combines timestamp with random decimal
// Ensures uniqueness even for rapid duplications
```

---

## 📋 Future Enhancements (Possible)

1. **Bulk Duplicate** - Select multiple items to duplicate at once
2. **Date Offset** - Automatically adjust dates by X days/weeks
3. **Batch Edit After Duplicate** - Edit all duplicated items together
4. **Duplicate with Dependencies** - Duplicate related items together
5. **Duplicate History** - Track which items were duplicated from where

---

**Version 2.6 adds powerful duplication capabilities for efficient roadmap management!**
