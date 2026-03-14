// Data storage
let roadmapItems = [];
let appInitialized = false;
let currentRoadmapId = null;
let currentView = 'month'; // 'month', 'quarter', or 'year'
let draggedItem = null;
let dragStartX = 0;
let dragType = null; // 'move', 'resize-start', 'resize-end'

// Check if Firebase is initialized
const useFirebase = typeof firebase !== 'undefined' && typeof db !== 'undefined';

// Get roadmap ID from URL
function getRoadmapIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

// Load all roadmaps from localStorage or Firebase
async function loadAllRoadmaps() {
    if (useFirebase) {
        try {
            const snapshot = await db.collection('roadmaps').get();
            const roadmaps = {};
            snapshot.forEach(doc => {
                roadmaps[doc.id] = doc.data();
            });
            return roadmaps;
        } catch (error) {
            console.error('Error loading from Firebase:', error);
            return {};
        }
    } else {
        const data = localStorage.getItem('allRoadmaps');
        return data ? JSON.parse(data) : {};
    }
}

// Save all roadmaps to localStorage or Firebase
async function saveAllRoadmaps(roadmaps) {
    if (useFirebase) {
        // Not typically used with Firebase, we update documents directly
        for (const [id, roadmap] of Object.entries(roadmaps)) {
            await db.collection('roadmaps').doc(id).set(roadmap);
        }
    } else {
        localStorage.setItem('allRoadmaps', JSON.stringify(roadmaps));
    }
}

// Load current roadmap data
async function loadCurrentRoadmap() {
    const roadmaps = await loadAllRoadmaps();
    const roadmap = roadmaps[currentRoadmapId];

    if (roadmap) {
        roadmapItems = roadmap.items || [];
        return roadmap;
    }

    return null;
}

// Save current roadmap
async function saveCurrentRoadmap() {
    if (!currentRoadmapId) return;

    if (useFirebase) {
        try {
            await db.collection('roadmaps').doc(currentRoadmapId).update({
                items: roadmapItems,
                lastModified: Date.now()
            });
        } catch (error) {
            console.error('Error saving to Firebase:', error);
            // Fallback: try set instead of update (in case document doesn't exist)
            try {
                const roadmaps = await loadAllRoadmaps();
                const roadmap = roadmaps[currentRoadmapId];
                if (roadmap) {
                    roadmap.items = roadmapItems;
                    roadmap.lastModified = Date.now();
                    await db.collection('roadmaps').doc(currentRoadmapId).set(roadmap);
                }
            } catch (setError) {
                console.error('Error with set fallback:', setError);
            }
        }
    } else {
        const roadmaps = await loadAllRoadmaps();
        if (roadmaps[currentRoadmapId]) {
            roadmaps[currentRoadmapId].items = roadmapItems;
            roadmaps[currentRoadmapId].lastModified = Date.now();
            await saveAllRoadmaps(roadmaps);
        }
    }
}

// Save data to the current roadmap
async function saveData() {
    try {
        await saveCurrentRoadmap();
        console.log('Data saved successfully');
    } catch (error) {
        console.error('Error saving data:', error);
        alert('Warning: Unable to save data. Your items may not persist after refreshing the page.');
    }
}

// Get unique workstream names for datalist
function getWorkstreamNames() {
    const workstreams = new Set();
    roadmapItems.forEach(item => {
        if (item.workstream && item.workstream.trim()) {
            workstreams.add(item.workstream);
        }
    });
    return Array.from(workstreams).sort();
}

// Create datalist for workstream autocomplete
function createWorkstreamDatalist(input) {
    const datalistId = 'workstream-datalist-' + Date.now();
    const datalist = document.createElement('datalist');
    datalist.id = datalistId;

    getWorkstreamNames().forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        datalist.appendChild(option);
    });

    document.body.appendChild(datalist);
    input.setAttribute('list', datalistId);

    return datalist;
}

// Initialize when DOM is ready
async function initApp() {
    // Prevent double initialization
    if (appInitialized) return;

    // Check if we have a roadmap ID
    currentRoadmapId = getRoadmapIdFromUrl();

    if (!currentRoadmapId) {
        // No roadmap ID, redirect to home
        window.location.href = 'home.html';
        return;
    }

    appInitialized = true;
    console.log('App initialized successfully');

    // Load current roadmap
    const roadmap = await loadCurrentRoadmap();
    if (!roadmap) {
        alert('Roadmap not found. Redirecting to home...');
        window.location.href = 'home.html';
        return;
    }

    // DOM elements
    const currentRoadmapName = document.getElementById('currentRoadmapName');
    const addRowBtn = document.getElementById('addRowBtn');
    const tableBody = document.getElementById('tableBody');
    const emptyState = document.getElementById('emptyState');
    const saveRoadmapBtn = document.getElementById('saveRoadmapBtn');
    const backToHomeBtn = document.getElementById('backToHomeBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const clearBtn = document.getElementById('clearBtn');
    const timelineCanvas = document.getElementById('timeline');

    // View toggle buttons
    const viewMonthBtn = document.getElementById('viewMonthBtn');
    const viewQuarterBtn = document.getElementById('viewQuarterBtn');
    const viewYearBtn = document.getElementById('viewYearBtn');

    // Set roadmap name
    currentRoadmapName.textContent = roadmap.name;

    // Show save button if there are items
    if (roadmapItems.length > 0) {
        saveRoadmapBtn.style.display = 'block';
    }

    // Back to home button
    backToHomeBtn.addEventListener('click', () => {
        window.location.href = 'home.html';
    });

    // Save roadmap button
    saveRoadmapBtn.addEventListener('click', async () => {
        await saveCurrentRoadmap();
        alert('Roadmap saved successfully!');
    });

    // Add new row button
    addRowBtn.addEventListener('click', async () => {
        const newItem = {
            id: Date.now(),
            workstream: '',
            type: 'activity',
            name: '',
            startDate: '',
            endDate: '',
            status: 'not-started',
            description: ''
        };
        roadmapItems.push(newItem);
        renderTable();
        await saveData();

        // Show save button
        saveRoadmapBtn.style.display = 'block';
    });

    // Clear all button
    clearBtn.addEventListener('click', async () => {
        if (confirm('Are you sure you want to clear all items? This cannot be undone.')) {
            roadmapItems = [];
            await saveData();
            renderTable();
            renderTimeline();
            saveRoadmapBtn.style.display = 'none';
        }
    });

    // View toggle buttons with null checks
    console.log('View buttons:', viewMonthBtn, viewQuarterBtn, viewYearBtn);
    if (viewMonthBtn) {
        viewMonthBtn.addEventListener('click', () => {
            console.log('Month button clicked');
            currentView = 'month';
            document.querySelectorAll('.btn-view-toggle').forEach(btn => btn.classList.remove('active'));
            viewMonthBtn.classList.add('active');
            renderTimeline();
        });
    }

    if (viewQuarterBtn) {
        viewQuarterBtn.addEventListener('click', () => {
            console.log('Quarter button clicked');
            currentView = 'quarter';
            document.querySelectorAll('.btn-view-toggle').forEach(btn => btn.classList.remove('active'));
            viewQuarterBtn.classList.add('active');
            renderTimeline();
        });
    }

    if (viewYearBtn) {
        viewYearBtn.addEventListener('click', () => {
            console.log('Year button clicked');
            currentView = 'year';
            document.querySelectorAll('.btn-view-toggle').forEach(btn => btn.classList.remove('active'));
            viewYearBtn.classList.add('active');
            renderTimeline();
        });
    }

    // Download timeline as image
    downloadBtn.addEventListener('click', async () => {
        if (roadmapItems.length === 0) {
            alert('Please add some activities or milestones first');
            return;
        }

        try {
            if (typeof html2canvas === 'undefined') {
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
                script.onload = () => captureTimeline();
                document.head.appendChild(script);
            } else {
                captureTimeline();
            }
        } catch (error) {
            alert('Error downloading image. Please try again.');
            console.error(error);
        }
    });

    // Capture timeline as image
    function captureTimeline() {
        html2canvas(timelineCanvas, {
            backgroundColor: '#fafafa',
            scale: 2
        }).then(canvas => {
            canvas.toBlob((blob) => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${roadmap.name}-roadmap-${new Date().toISOString().split('T')[0]}.png`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            });
        });
    }

    // Render table
    function renderTable() {
        if (roadmapItems.length === 0) {
            tableBody.innerHTML = '';
            emptyState.classList.add('show');
            document.querySelector('.table-container').style.display = 'none';
            return;
        }

        emptyState.classList.remove('show');
        document.querySelector('.table-container').style.display = 'block';

        tableBody.innerHTML = roadmapItems.map((item, index) => {
            const isMilestone = item.type === 'milestone';

            // For milestones, use date field or startDate, and set both start and end to same value
            let displayStartDate = '';
            let displayEndDate = '';

            if (isMilestone) {
                displayStartDate = item.date || item.startDate || '';
                displayEndDate = displayStartDate; // Same as start date for milestones
            } else {
                displayStartDate = item.startDate || '';
                displayEndDate = item.endDate || '';
            }

            return `
                <tr data-id="${item.id}">
                    <td>
                        <input type="text"
                               class="editable-field"
                               data-field="workstream"
                               value="${escapeHtml(item.workstream || '')}"
                               placeholder="${isMilestone ? 'Optional' : 'Required'}"
                               ${isMilestone ? '' : 'required'}>
                    </td>
                    <td>
                        <select class="editable-field" data-field="type">
                            <option value="activity" ${item.type === 'activity' ? 'selected' : ''}>Activity</option>
                            <option value="milestone" ${item.type === 'milestone' ? 'selected' : ''}>Milestone</option>
                        </select>
                    </td>
                    <td>
                        <input type="text"
                               class="editable-field"
                               data-field="name"
                               value="${escapeHtml(item.name || '')}"
                               placeholder="Enter name"
                               required>
                    </td>
                    <td>
                        <input type="date"
                               class="editable-field milestone-date-field"
                               data-field="${isMilestone ? 'date' : 'startDate'}"
                               value="${displayStartDate}"
                               ${isMilestone ? '' : ''}>
                    </td>
                    <td>
                        <input type="date"
                               class="editable-field"
                               data-field="endDate"
                               value="${displayEndDate}"
                               ${isMilestone ? 'readonly style="background: #f5f5f5;"' : ''}>
                    </td>
                    <td>
                        <select class="editable-field status-${item.status || 'not-started'}"
                                data-field="status"
                                ${isMilestone ? 'disabled' : ''}>
                            <option value="not-started" class="status-not-started" ${(item.status || 'not-started') === 'not-started' ? 'selected' : ''}>Not Started</option>
                            <option value="in-progress" class="status-in-progress" ${item.status === 'in-progress' ? 'selected' : ''}>In Progress</option>
                            <option value="at-risk" class="status-at-risk" ${item.status === 'at-risk' ? 'selected' : ''}>At Risk</option>
                            <option value="completed" class="status-completed" ${item.status === 'completed' ? 'selected' : ''}>Completed</option>
                        </select>
                    </td>
                    <td>
                        <textarea class="editable-field"
                                  data-field="description"
                                  placeholder="Optional"
                                  rows="1">${escapeHtml(item.description || '')}</textarea>
                    </td>
                    <td>
                        <div class="table-actions">
                            <button class="btn-table-action btn-table-delete" onclick="deleteRow('${item.id}')">Delete</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        // Add event listeners for inline editing
        document.querySelectorAll('.editable-field').forEach(field => {
            field.addEventListener('change', handleFieldChange);
            field.addEventListener('blur', handleFieldChange);
        });

        // Add datalist to workstream inputs
        document.querySelectorAll('input[data-field="workstream"]').forEach(input => {
            createWorkstreamDatalist(input);
        });
    }

    // Handle field changes
    function handleFieldChange(e) {
        const field = e.target;
        const row = field.closest('tr');
        const itemId = parseInt(row.dataset.id);
        const fieldName = field.dataset.field;
        const value = field.value;

        const item = roadmapItems.find(i => i.id === itemId);
        if (!item) return;

        // Handle type change
        if (fieldName === 'type') {
            item.type = value;

            // Re-render the row to update field states
            renderTable();
            renderTimeline();
            saveData();
            return;
        }

        // Update item
        item[fieldName] = value;

        // For milestones, sync the date field
        if (item.type === 'milestone') {
            if (fieldName === 'date') {
                item.date = value;
                item.startDate = value;
                item.endDate = value;
                // Update the end date field display
                const endDateField = row.querySelector('input[data-field="endDate"]');
                if (endDateField) {
                    endDateField.value = value;
                }
            } else if (fieldName === 'startDate') {
                item.date = value;
                item.startDate = value;
                item.endDate = value;
            }
        }

        saveData();
        renderTimeline();
    }

    // Initial render
    renderTable();
    renderTimeline();

    // Enhanced renderTimeline function with drag-and-drop, view modes, today marker, and smart positioning
    function renderTimeline() {
        console.log('renderTimeline called with view:', currentView);

        if (roadmapItems.length === 0) {
            timelineCanvas.innerHTML = `
                <div class="empty-state">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p>Add activities and milestones to see your project timeline</p>
                </div>
            `;
            return;
        }

        // Calculate timeline range
        const allDates = [];
        roadmapItems.forEach(item => {
            if (item.type === 'milestone') {
                const date = item.date || item.startDate;
                if (date) allDates.push(new Date(date));
            } else {
                if (item.startDate) allDates.push(new Date(item.startDate));
                if (item.endDate) allDates.push(new Date(item.endDate));
            }
        });

        if (allDates.length === 0) {
            timelineCanvas.innerHTML = `
                <div class="empty-state">
                    <p>Please add dates to your activities and milestones</p>
                </div>
            `;
            return;
        }

        const minDate = new Date(Math.min(...allDates));
        const maxDate = new Date(Math.max(...allDates));

        // Add padding based on view
        if (currentView === 'year') {
            minDate.setMonth(0, 1);
            maxDate.setMonth(11, 31);
        } else if (currentView === 'quarter') {
            const startQuarter = Math.floor(minDate.getMonth() / 3) * 3;
            minDate.setMonth(startQuarter, 1);
            const endQuarter = Math.floor(maxDate.getMonth() / 3) * 3 + 2;
            maxDate.setMonth(endQuarter + 1, 0);
        } else { // month view
            minDate.setDate(1);
            maxDate.setMonth(maxDate.getMonth() + 1, 0);
        }

        // Generate time periods based on view
        const periods = [];
        if (currentView === 'year') {
            // Year view
            const currentYear = minDate.getFullYear();
            const endYear = maxDate.getFullYear();
            for (let year = currentYear; year <= endYear; year++) {
                const yearStart = new Date(year, 0, 1);
                const yearEnd = new Date(year, 11, 31);
                const daysInYear = Math.ceil((yearEnd - yearStart) / (1000 * 60 * 60 * 24)) + 1;
                periods.push({
                    label: year.toString(),
                    start: yearStart,
                    end: yearEnd,
                    days: daysInYear
                });
            }
        } else if (currentView === 'quarter') {
            // Quarter view
            let currentDate = new Date(minDate);
            while (currentDate <= maxDate) {
                const quarter = Math.floor(currentDate.getMonth() / 3) + 1;
                const quarterStart = new Date(currentDate.getFullYear(), (quarter - 1) * 3, 1);
                const quarterEnd = new Date(currentDate.getFullYear(), quarter * 3, 0);
                const daysInQuarter = Math.ceil((quarterEnd - quarterStart) / (1000 * 60 * 60 * 24)) + 1;

                periods.push({
                    label: `Q${quarter} ${currentDate.getFullYear()}`,
                    start: quarterStart,
                    end: quarterEnd,
                    days: daysInQuarter
                });

                currentDate = new Date(quarterEnd);
                currentDate.setDate(currentDate.getDate() + 1);
            }
        } else {
            // Month view (existing logic)
            let currentMonth = new Date(minDate);
            while (currentMonth <= maxDate) {
                const monthStart = new Date(currentMonth);
                const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
                const daysInMonth = monthEnd.getDate();

                const weeks = [];
                let weekStart = new Date(monthStart);
                while (weekStart <= monthEnd) {
                    const weekEnd = new Date(weekStart);
                    weekEnd.setDate(weekEnd.getDate() + 6);
                    const weekNum = getWeekNumber(weekStart);
                    weeks.push({
                        number: weekNum,
                        start: new Date(weekStart),
                        end: weekEnd > monthEnd ? monthEnd : weekEnd
                    });
                    weekStart.setDate(weekStart.getDate() + 7);
                }

                periods.push({
                    label: currentMonth.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
                    start: monthStart,
                    end: monthEnd,
                    days: daysInMonth,
                    weeks: weeks
                });
                currentMonth.setMonth(currentMonth.getMonth() + 1);
            }
        }

        // Group items
        const workstreams = {};
        const generalMilestones = [];

        roadmapItems.forEach(item => {
            if (item.type === 'milestone') {
                const milestoneDate = item.date || item.startDate;
                if (!milestoneDate) return;
                const milestoneItem = { ...item, date: milestoneDate };

                if (item.workstream && item.workstream.trim()) {
                    if (!workstreams[item.workstream]) {
                        workstreams[item.workstream] = [];
                    }
                    workstreams[item.workstream].push(milestoneItem);
                } else {
                    generalMilestones.push(milestoneItem);
                }
            } else if (item.type === 'activity' && item.startDate && item.endDate) {
                if (!item.workstream) return;
                if (!workstreams[item.workstream]) {
                    workstreams[item.workstream] = [];
                }
                workstreams[item.workstream].push(item);
            }
        });

        // Calculate dimensions
        const totalDays = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24));
        const pixelsPerDay = currentView === 'year' ? Math.max(1, 1200 / totalDays) :
                            currentView === 'quarter' ? Math.max(2, 1200 / totalDays) :
                            Math.max(3, 1200 / totalDays);
        const timelineWidth = totalDays * pixelsPerDay;

        // Render timeline HTML
        let html = '<div class="timeline-content" style="width: ' + Math.max(timelineWidth + 200, 1400) + 'px;">';

        // Period headers
        html += '<div class="timeline-header-row">';
        html += '<div class="timeline-left-spacer"></div>';
        html += '<div class="timeline-months-wrapper"><div class="timeline-months">';

        periods.forEach(period => {
            const width = period.days * pixelsPerDay;
            html += `<div class="timeline-month" style="width: ${width}px; min-width: ${width}px;">`;
            html += `<div class="timeline-month-header">${period.label}</div>`;

            // Only show weeks in month view
            if (currentView === 'month' && period.weeks) {
                html += `<div class="timeline-weeks">`;
                period.weeks.forEach(week => {
                    html += `<div class="timeline-week">W${week.number}</div>`;
                });
                html += `</div>`;
            }

            html += `</div>`;
        });

        html += '</div></div></div>';

        // General milestones section and workstreams
        html += '<div class="timeline-grid" style="position: relative;">';

        // Add vertical lines and today marker
        let gridLinesHtml = '';

        // Add week/month lines based on view
        if (currentView === 'month') {
            periods.forEach(period => {
                if (period.weeks) {
                    period.weeks.forEach(week => {
                        const weekStartDay = Math.ceil((week.start - minDate) / (1000 * 60 * 60 * 24));
                        const weekLeft = weekStartDay * pixelsPerDay;
                        gridLinesHtml += `<div class="week-line" style="left: ${weekLeft}px;"></div>`;
                    });
                }
            });
        } else {
            // For quarter and year view, show month lines
            periods.forEach(period => {
                const periodStartDay = Math.ceil((period.start - minDate) / (1000 * 60 * 60 * 24));
                const periodLeft = periodStartDay * pixelsPerDay;
                gridLinesHtml += `<div class="week-line" style="left: ${periodLeft}px;"></div>`;
            });
        }

        // Add TODAY marker
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        console.log('Today date:', today, 'Min:', minDate, 'Max:', maxDate);
        if (today >= minDate && today <= maxDate) {
            const todayDays = Math.ceil((today - minDate) / (1000 * 60 * 60 * 24));
            const todayLeft = todayDays * pixelsPerDay;
            console.log('Adding today marker at:', todayLeft, 'px');
            gridLinesHtml += `<div class="today-marker" style="left: ${todayLeft}px;"></div>`;
        } else {
            console.log('Today is outside timeline range');
        }

        // General milestones
        if (generalMilestones.length > 0) {
            html += `<div class="timeline-workstream">`;
            html += `<div class="workstream-header milestones">Milestones</div>`;
            html += `<div class="workstream-rows" style="min-height: 65px; padding-top: 0;">`;
            html += gridLinesHtml;

            generalMilestones.forEach(item => {
                const itemDate = new Date(item.date);
                const daysFromStart = Math.ceil((itemDate - minDate) / (1000 * 60 * 60 * 24));
                const left = daysFromStart * pixelsPerDay;

                html += `
                    <div class="timeline-milestone general" style="left: ${left}px;" title="${escapeHtml(item.name)}\n${formatDate(item.date)}">
                        <div class="milestone-diamond"></div>
                        <div class="milestone-label">${escapeHtml(item.name)}</div>
                        <div class="milestone-date">${formatDateShort(item.date)}</div>
                    </div>
                `;
            });

            html += `</div></div>`;
        }

        // Workstreams with smart positioning
        Object.keys(workstreams).sort().forEach(workstreamName => {
            const items = workstreams[workstreamName];
            const milestones = items.filter(i => i.type === 'milestone');
            const activities = items.filter(i => i.type === 'activity');

            html += `<div class="timeline-workstream">`;
            html += `<div class="workstream-header">${escapeHtml(workstreamName)}</div>`;
            html += `<div class="workstream-rows">`;
            html += gridLinesHtml;

            // Render milestones
            milestones.forEach(item => {
                const itemDate = new Date(item.date);
                const daysFromStart = Math.ceil((itemDate - minDate) / (1000 * 60 * 60 * 24));
                const left = daysFromStart * pixelsPerDay;

                html += `
                    <div class="timeline-milestone" style="left: ${left}px;" title="${escapeHtml(item.name)}\n${formatDate(item.date)}">
                        <div class="milestone-diamond"></div>
                        <div class="milestone-label">${escapeHtml(item.name)}</div>
                        <div class="milestone-date">${formatDateShort(item.date)}</div>
                    </div>
                `;
            });

            // Smart row placement for activities to avoid text overlap
            activities.forEach(activity => delete activity.assignedRow);

            activities.forEach((item, activityIndex) => {
                const start = new Date(item.startDate);
                const end = new Date(item.endDate);
                const daysFromStart = Math.ceil((start - minDate) / (1000 * 60 * 60 * 24));
                const duration = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
                const left = daysFromStart * pixelsPerDay;
                const width = duration * pixelsPerDay;

                // Calculate text width estimates (approximate) - increased padding for better spacing
                const textPadding = 180; // Extra space for start/end dates and label (increased from 120)
                const visualWidth = width + textPadding;

                // Find non-overlapping row
                let rowIndex = 0;
                let foundRow = false;

                while (!foundRow) {
                    let canFit = true;

                    for (let i = 0; i < activityIndex; i++) {
                        const prevItem = activities[i];
                        if (prevItem.assignedRow === rowIndex) {
                            const prevStart = new Date(prevItem.startDate);
                            const prevEnd = new Date(prevItem.endDate);
                            const prevDaysFromStart = Math.ceil((prevStart - minDate) / (1000 * 60 * 60 * 24));
                            const prevDuration = Math.ceil((prevEnd - prevStart) / (1000 * 60 * 60 * 24)) + 1;
                            const prevLeft = prevDaysFromStart * pixelsPerDay;
                            const prevWidth = prevDuration * pixelsPerDay;
                            const prevVisualWidth = prevWidth + textPadding;

                            // Check for visual overlap (including text)
                            const currentEnd = left + visualWidth;
                            const prevEnd = prevLeft + prevVisualWidth;

                            if (!(left >= prevEnd || currentEnd <= prevLeft)) {
                                canFit = false;
                                break;
                            }
                        }
                    }

                    if (canFit) {
                        item.assignedRow = rowIndex;
                        foundRow = true;
                    } else {
                        rowIndex++;
                    }
                }

                const milestoneHeight = milestones.length > 0 ? 65 : 0;
                const top = milestoneHeight + (item.assignedRow * 40) + 5;
                const status = item.status || 'not-started';
                const startDateStr = formatDateShort(item.startDate);
                const endDateStr = formatDateShort(item.endDate);

                html += `
                    <div class="timeline-bar"
                         data-item-id="${item.id}"
                         style="left: ${left}px; width: ${width}px; top: ${top}px; z-index: 3;"
                         title="${escapeHtml(item.name)}\n${startDateStr} - ${endDateStr}">
                        <div class="timeline-bar-drag-handle-start"></div>
                        <div class="timeline-bar-shape ${status}"></div>
                        <div class="timeline-bar-label">${escapeHtml(item.name)}</div>
                        <div class="timeline-bar-start-date">${startDateStr}</div>
                        <div class="timeline-bar-end-date">${endDateStr}</div>
                        <div class="timeline-bar-drag-handle-end"></div>
                    </div>
                `;
            });

            const maxRow = Math.max(...activities.map(a => a.assignedRow || 0), -1) + 1;
            const totalActivityHeight = maxRow * 40;
            const milestoneHeight = milestones.length > 0 ? 65 : 0;
            const minHeight = Math.max(milestoneHeight + totalActivityHeight + 20, 100);

            html += `</div></div>`;

            const lastIndex = html.lastIndexOf('<div class="workstream-rows">');
            if (lastIndex !== -1) {
                html = html.substring(0, lastIndex) +
                       `<div class="workstream-rows" style="min-height: ${minHeight}px;">` +
                       html.substring(lastIndex + '<div class="workstream-rows">'.length);
            }
        });

        html += '</div></div>';
        timelineCanvas.innerHTML = html;

        // Add drag-and-drop functionality
        initDragAndDrop(minDate, pixelsPerDay);
    }

    // Initialize drag-and-drop for timeline bars
    function initDragAndDrop(minDate, pixelsPerDay) {
        const bars = document.querySelectorAll('.timeline-bar');

        bars.forEach(bar => {
            const itemId = bar.getAttribute('data-item-id');
            const item = roadmapItems.find(i => i.id == itemId);
            if (!item) return;

            const startHandle = bar.querySelector('.timeline-bar-drag-handle-start');
            const endHandle = bar.querySelector('.timeline-bar-drag-handle-end');

            // Drag entire bar to move
            bar.addEventListener('mousedown', (e) => {
                if (e.target.classList.contains('timeline-bar-drag-handle-start') ||
                    e.target.classList.contains('timeline-bar-drag-handle-end')) {
                    return; // Let handle events take over
                }

                e.preventDefault();
                draggedItem = item;
                dragType = 'move';
                dragStartX = e.clientX;
                bar.classList.add('dragging');

                const startLeft = parseInt(bar.style.left);
                const startWidth = parseInt(bar.style.width);

                const onMouseMove = (e) => {
                    const deltaX = e.clientX - dragStartX;
                    const newLeft = startLeft + deltaX;

                    // Calculate new dates
                    const newStartDays = Math.round(newLeft / pixelsPerDay);
                    const newStartDate = new Date(minDate);
                    newStartDate.setDate(newStartDate.getDate() + newStartDays);

                    const duration = Math.ceil((new Date(item.endDate) - new Date(item.startDate)) / (1000 * 60 * 60 * 24));
                    const newEndDate = new Date(newStartDate);
                    newEndDate.setDate(newEndDate.getDate() + duration);

                    bar.style.left = newLeft + 'px';
                    bar.querySelector('.timeline-bar-start-date').textContent = formatDateShort(newStartDate.toISOString().split('T')[0]);
                    bar.querySelector('.timeline-bar-end-date').textContent = formatDateShort(newEndDate.toISOString().split('T')[0]);
                };

                const onMouseUp = async (e) => {
                    const deltaX = e.clientX - dragStartX;
                    const newLeft = startLeft + deltaX;
                    const newStartDays = Math.round(newLeft / pixelsPerDay);
                    const newStartDate = new Date(minDate);
                    newStartDate.setDate(newStartDate.getDate() + newStartDays);

                    const duration = Math.ceil((new Date(item.endDate) - new Date(item.startDate)) / (1000 * 60 * 60 * 24));
                    const newEndDate = new Date(newStartDate);
                    newEndDate.setDate(newEndDate.getDate() + duration);

                    item.startDate = newStartDate.toISOString().split('T')[0];
                    item.endDate = newEndDate.toISOString().split('T')[0];

                    await saveData();
                    renderTable();
                    renderTimeline();

                    bar.classList.remove('dragging');
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                    draggedItem = null;
                    dragType = null;
                };

                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            });

            // Resize from start
            if (startHandle) {
                startHandle.addEventListener('mousedown', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    draggedItem = item;
                    dragType = 'resize-start';
                    dragStartX = e.clientX;
                    bar.classList.add('dragging');

                    const startLeft = parseInt(bar.style.left);
                    const startWidth = parseInt(bar.style.width);

                    const onMouseMove = (e) => {
                        const deltaX = e.clientX - dragStartX;
                        const newLeft = startLeft + deltaX;
                        const newWidth = startWidth - deltaX;

                        if (newWidth > 10) {
                            bar.style.left = newLeft + 'px';
                            bar.style.width = newWidth + 'px';

                            const newStartDays = Math.round(newLeft / pixelsPerDay);
                            const newStartDate = new Date(minDate);
                            newStartDate.setDate(newStartDate.getDate() + newStartDays);
                            bar.querySelector('.timeline-bar-start-date').textContent = formatDateShort(newStartDate.toISOString().split('T')[0]);
                        }
                    };

                    const onMouseUp = async (e) => {
                        const deltaX = e.clientX - dragStartX;
                        const newLeft = startLeft + deltaX;
                        const newWidth = startWidth - deltaX;

                        if (newWidth > 10) {
                            const newStartDays = Math.round(newLeft / pixelsPerDay);
                            const newStartDate = new Date(minDate);
                            newStartDate.setDate(newStartDate.getDate() + newStartDays);
                            item.startDate = newStartDate.toISOString().split('T')[0];

                            await saveData();
                            renderTable();
                            renderTimeline();
                        }

                        bar.classList.remove('dragging');
                        document.removeEventListener('mousemove', onMouseMove);
                        document.removeEventListener('mouseup', onMouseUp);
                        draggedItem = null;
                        dragType = null;
                    };

                    document.addEventListener('mousemove', onMouseMove);
                    document.addEventListener('mouseup', onMouseUp);
                });
            }

            // Resize from end
            if (endHandle) {
                endHandle.addEventListener('mousedown', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    draggedItem = item;
                    dragType = 'resize-end';
                    dragStartX = e.clientX;
                    bar.classList.add('dragging');

                    const startWidth = parseInt(bar.style.width);

                    const onMouseMove = (e) => {
                        const deltaX = e.clientX - dragStartX;
                        const newWidth = startWidth + deltaX;

                        if (newWidth > 10) {
                            bar.style.width = newWidth + 'px';

                            const durationDays = Math.round(newWidth / pixelsPerDay);
                            const newEndDate = new Date(item.startDate);
                            newEndDate.setDate(newEndDate.getDate() + durationDays - 1);
                            bar.querySelector('.timeline-bar-end-date').textContent = formatDateShort(newEndDate.toISOString().split('T')[0]);
                        }
                    };

                    const onMouseUp = async (e) => {
                        const deltaX = e.clientX - dragStartX;
                        const newWidth = startWidth + deltaX;

                        if (newWidth > 10) {
                            const durationDays = Math.round(newWidth / pixelsPerDay);
                            const newEndDate = new Date(item.startDate);
                            newEndDate.setDate(newEndDate.getDate() + durationDays - 1);
                            item.endDate = newEndDate.toISOString().split('T')[0];

                            await saveData();
                            renderTable();
                            renderTimeline();
                        }

                        bar.classList.remove('dragging');
                        document.removeEventListener('mousemove', onMouseMove);
                        document.removeEventListener('mouseup', onMouseUp);
                        draggedItem = null;
                        dragType = null;
                    };

                    document.addEventListener('mousemove', onMouseMove);
                    document.addEventListener('mouseup', onMouseUp);
                });
            }
        });
    }
}

// Global function for deleting rows
async function deleteRow(id) {
    if (confirm('Are you sure you want to delete this item?')) {
        roadmapItems = roadmapItems.filter(item => item.id != id);
        await saveData();

        // Re-initialize to refresh everything
        const event = new Event('reinit');
        document.dispatchEvent(event);
    }
}

// Listen for reinit event
document.addEventListener('reinit', () => {
    const tableBody = document.getElementById('tableBody');
    const timelineCanvas = document.getElementById('timeline');
    if (tableBody && timelineCanvas) {
        initApp.renderTable && initApp.renderTable();
        initApp.renderTimeline && initApp.renderTimeline();
    }
    location.reload(); // Simple reload for now
});

// Utility functions
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateShort(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// Initialize app
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
