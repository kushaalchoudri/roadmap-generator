# ✅ VERSION 2.7 - Week View

## 🎨 What's New

### 1. ✅ New Week View Button
**Feature**: Added "Week" view button alongside Month, Quarter, and Year
**Location**: Timeline header, first button in the view toggle group
**Purpose**: Provides most detailed timeline view with maximum spread

### 2. ✅ Weekly Period Headers
**Display**: Each week shown as separate period (Monday - Sunday)
**Format**: "W{number} {Month Year}" (e.g., "W12 Mar 2024")
**Layout**: One week per section with day names below

### 3. ✅ Day-Level Display
**Sub-headers**: Mon, Tue, Wed, Thu, Fri, Sat, Sun
**Purpose**: Shows individual days within each week
**Benefit**: Precise day-by-day visibility

### 4. ✅ Daily Gridlines
**Gridlines**: Vertical line for each day
**Opacity**: Lighter (0.3) to avoid visual clutter
**Benefit**: Clear separation between days

### 5. ✅ Maximum Spread for Activity Bars
**Pixels per Day**: Minimum 15 pixels (vs 3 for month, 2 for quarter, 1 for year)
**Result**: Activity bars are much wider and easier to see
**Benefit**: Better readability, more space for labels

---

## 🚀 How to Use

### Step 1: Clear Cache (Important!)
```
Mac: Cmd + Shift + R
Windows: Ctrl + Shift + R
```

### Step 2: Wait 3-4 Minutes
GitHub Pages needs time to deploy v2.7

### Step 3: Open App
```
Local: file:///Users/i053963/projects/roadmap-generator/home.html
Live:  https://kushaalchoudri.github.io/roadmap-generator/home.html
```

### Step 4: Try Week View

#### Switch to Week View
1. Open a roadmap with activities
2. Look at the view toggle buttons (top of timeline)
3. Click **"Week"** button
4. ✅ Timeline switches to week view

#### What You'll See
- **Week headers**: "W12 Mar 2024", "W13 Mar 2024", etc.
- **Day names**: Mon, Tue, Wed, Thu, Fri, Sat, Sun
- **Daily gridlines**: Vertical line for each day
- **Wider bars**: Activity bars are much more spread out
- **Better labels**: More space for activity names and dates

---

## 📊 Comparison of Views

### View Characteristics

| View | Period | Sub-Period | Pixels/Day | Best For |
|------|--------|------------|------------|----------|
| **Week** | Week (Mon-Sun) | Days | 15+ | **Short-term planning (1-4 weeks)** |
| Month | Month | Weeks | 3+ | Medium-term planning (1-3 months) |
| Quarter | Quarter (Q1-Q4) | None | 2+ | Long-term planning (3-12 months) |
| Year | Year | None | 1+ | Strategic planning (1-5 years) |

### When to Use Each View

#### Week View ✨ NEW
- **Best for**: 1-4 weeks of activities
- **Use when**: Planning sprints, short projects, detailed scheduling
- **Pros**: Maximum detail, easy to see exact days
- **Cons**: Takes more horizontal space

#### Month View
- **Best for**: 1-3 months of activities
- **Use when**: Planning phases, monthly cycles
- **Pros**: Good balance of detail and overview
- **Cons**: Can get crowded with many activities

#### Quarter View
- **Best for**: 3-12 months of activities
- **Use when**: Planning quarters, product roadmaps
- **Pros**: Shows longer timespan
- **Cons**: Less day-to-day detail

#### Year View
- **Best for**: 1-5 years of activities
- **Use when**: Strategic planning, multi-year projects
- **Pros**: Maximum overview
- **Cons**: Minimal detail, bars can overlap

---

## 📊 Technical Changes

### HTML (index.html)

#### Added Week Button
```html
<div class="timeline-view-toggle">
    <button id="viewWeekBtn" class="btn-view-toggle">Week</button>
    <button id="viewMonthBtn" class="btn-view-toggle active">Month</button>
    <button id="viewQuarterBtn" class="btn-view-toggle">Quarter</button>
    <button id="viewYearBtn" class="btn-view-toggle">Year</button>
</div>
```

### JavaScript (script.js)

#### Week Button Handler
```javascript
const viewWeekBtn = document.getElementById('viewWeekBtn');

if (viewWeekBtn) {
    viewWeekBtn.addEventListener('click', () => {
        currentView = 'week';
        document.querySelectorAll('.btn-view-toggle').forEach(btn =>
            btn.classList.remove('active'));
        viewWeekBtn.classList.add('active');
        renderTimeline();
    });
}
```

#### Date Range Padding for Week View
```javascript
if (currentView === 'week') {
    // Find Monday of the week containing minDate
    const minDay = minDate.getDay();
    const daysToMonday = minDay === 0 ? 6 : minDay - 1;
    minDate.setDate(minDate.getDate() - daysToMonday);

    // Find Sunday of the week containing maxDate
    const maxDay = maxDate.getDay();
    const daysToSunday = maxDay === 0 ? 0 : 7 - maxDay;
    maxDate.setDate(maxDate.getDate() + daysToSunday);
}
```

#### Week Period Generation
```javascript
if (currentView === 'week') {
    let currentWeekStart = new Date(minDate);
    while (currentWeekStart <= maxDate) {
        const weekEnd = new Date(currentWeekStart);
        weekEnd.setDate(weekEnd.getDate() + 6); // Sunday

        const weekNum = getWeekNumber(currentWeekStart);
        const monthYear = currentWeekStart.toLocaleDateString('en-US',
            { month: 'short', year: 'numeric' });

        periods.push({
            label: `W${weekNum} ${monthYear}`,
            start: new Date(currentWeekStart),
            end: weekEnd > maxDate ? maxDate : weekEnd,
            days: 7,
            weekNumber: weekNum
        });

        currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    }
}
```

#### Pixels Per Day Calculation
```javascript
const pixelsPerDay =
    currentView === 'week' ? Math.max(15, 1200 / totalDays) :  // 15+ for week
    currentView === 'year' ? Math.max(1, 1200 / totalDays) :
    currentView === 'quarter' ? Math.max(2, 1200 / totalDays) :
    Math.max(3, 1200 / totalDays);
```

#### Daily Gridlines
```javascript
if (currentView === 'week') {
    // Show daily gridlines
    for (let day = 0; day <= totalDays; day++) {
        const dayLeft = day * pixelsPerDay;
        gridLinesHtml += `<div class="week-line"
            style="left: ${dayLeft}px; opacity: 0.3;"></div>`;
    }
}
```

#### Day Names Display
```javascript
if (currentView === 'week' && period.days === 7) {
    html += `<div class="timeline-weeks" style="display: flex;">`;
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    dayNames.forEach(dayName => {
        html += `<div class="timeline-week"
            style="flex: 1; font-size: 10px;">${dayName}</div>`;
    });
    html += `</div>`;
}
```

---

## 🎯 Use Cases

### Use Case 1: Sprint Planning (2-week sprints)
```
Week View:
W12 Mar 2024          W13 Mar 2024
Mon Tue Wed Thu Fri   Mon Tue Wed Thu Fri
[═══Sprint 1═══════]  [═══Sprint 2═══════]
```

### Use Case 2: Event Coordination
```
Week View:
W15 Apr 2024
Mon  Tue  Wed  Thu  Fri  Sat  Sun
     [Setup]  [═══Event═══]  [Cleanup]
```

### Use Case 3: Detailed Task Tracking
```
Week View:
W20 May 2024
Mon Tue Wed Thu Fri Sat Sun
[A]     [B]     [C]
    [Task A]
        [Task B]
            [Task C]
```

### Use Case 4: Short Project (1 month)
```
Switch between Week and Month view:

Week View:  W18  W19  W20  W21
            [====Project Phases====]
            Very detailed day-by-day

Month View: May 2024
            [====Project====]
            Overall overview
```

---

## ✨ Benefits

1. **Maximum Detail** - See exactly which day activities start/end
2. **Better Spread** - Activity bars are 5x wider than month view
3. **Day Visibility** - Individual days clearly labeled (Mon-Sun)
4. **Precise Planning** - Plan activities down to the day level
5. **Short-Term Focus** - Perfect for 1-4 week planning windows
6. **Easy Reading** - More space means less overlap, clearer labels
7. **Flexible Zooming** - Switch between Week/Month/Quarter/Year as needed

---

## 📸 Visual Examples

### Week View Header
```
┌─────────────────────────────────────────────┐
│ Week View  Month  Quarter  Year             │
└─────────────────────────────────────────────┘
┌───────────────────────────────────────────────┐
│  W12 Mar 2024              W13 Mar 2024       │
│  Mon Tue Wed Thu Fri       Mon Tue Wed Thu    │
└───────────────────────────────────────────────┘
```

### Activity Bars in Different Views

#### Week View (15px/day)
```
Mon    Tue    Wed    Thu    Fri
[═════ Activity Name ═════════]
Very wide, easy to read
```

#### Month View (3px/day)
```
Week 12    Week 13    Week 14
[Activity Name]
Narrower, still readable
```

#### Year View (1px/day)
```
Jan    Feb    Mar    Apr
[Act]
Very condensed
```

---

## 🔬 Technical Details

### Week Number Calculation
Uses ISO week numbering:
- Week 1 = First week with Thursday in new year
- Weeks start on Monday
- Weeks end on Sunday

### Date Range Expansion
```javascript
// Example: Activities from Wed Mar 13 to Fri Mar 22

// Original range: Mar 13 (Wed) to Mar 22 (Fri)

// Week view expands to:
// minDate: Mar 11 (Mon) - start of week containing Mar 13
// maxDate: Mar 24 (Sun) - end of week containing Mar 22

// Result: Two complete weeks displayed
```

### Performance Considerations
- More gridlines in week view (one per day)
- Lighter opacity (0.3) reduces visual weight
- Wider timeline may require more horizontal scrolling
- Ideal for ~4 weeks or less

---

## 🆘 Troubleshooting

### Week button not visible?
- **Cause**: Cache showing old HTML
- **Solution**: Hard refresh (Cmd/Ctrl + Shift + R)

### Week view shows too many weeks?
- **Cause**: Activities span long date range
- **Solution**: Use Month or Quarter view for longer ranges

### Gridlines too dense?
- **Cause**: Normal behavior for week view (daily lines)
- **Solution**: Opacity is reduced to 0.3 to minimize clutter

### Activity bars still narrow?
- **Cause**: Too many weeks displayed
- **Solution**: Filter to shorter date range or use horizontal scroll

### Day names not showing?
- **Cause**: JavaScript not loaded or cached
- **Solution**: Clear cache, check console for errors

---

## 💡 Tips

1. **Switch Views Dynamically**: Start with Month view for overview, zoom to Week for details
2. **Week View for Sprints**: Perfect for 1-2 week sprint planning
3. **Short Projects**: Use Week view for projects under 1 month
4. **Day Precision**: When exact start/end days matter, use Week view
5. **Combine with Duplicate**: Duplicate activities across weeks using Week view

---

## 🔄 View Switching Workflow

### Recommended Flow
```
1. Start: Year view (strategic overview)
   ↓
2. Narrow: Quarter view (focus on specific quarter)
   ↓
3. Detail: Month view (see specific months)
   ↓
4. Precision: Week view (day-by-day planning)
```

---

**Version 2.7 adds Week view for maximum timeline detail and activity bar spread!**
