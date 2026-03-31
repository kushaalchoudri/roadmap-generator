// Data storage
let roadmapItems = [];
let appInitialized = false;
let currentRoadmapId = null;
let currentView = 'daily'; // Default to 'daily' view
let draggedItem = null;
let dragStartX = 0;
let dragType = null; // 'move', 'resize-start', 'resize-end'
let workstreamOrder = {}; // Track custom workstream order
let timelineExtensionDays = 0; // Extra days to extend timeline beyond last activity
let zoomLevel = 0; // Zoom level: 0 (default), negative for zoom out, positive for zoom in

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
    // Try SQLite first
    if (roadmapDB.db) {
        try {
            const roadmap = await roadmapDB.getRoadmap(currentRoadmapId);
            if (roadmap) {
                roadmapItems = await roadmapDB.getRoadmapItems(currentRoadmapId);
                workstreamOrder = await roadmapDB.getWorkstreamOrder(currentRoadmapId);
                console.log('Loaded roadmap from SQLite:', roadmap.name, roadmapItems.length, 'items');
                return roadmap;
            }
        } catch (error) {
            console.error('Error loading from SQLite:', error);
        }
    }

    // Fallback to localStorage/Firebase
    const roadmaps = await loadAllRoadmaps();
    console.log('All roadmaps loaded:', roadmaps);
    console.log('Current roadmap ID:', currentRoadmapId);
    const roadmap = roadmaps[currentRoadmapId];

    if (roadmap) {
        roadmapItems = roadmap.items || [];
        console.log('Loaded roadmap items:', roadmapItems.length, 'items');
        return roadmap;
    }

    console.log('No roadmap found for ID:', currentRoadmapId);
    return null;
}

// Save current roadmap
async function saveCurrentRoadmap() {
    if (!currentRoadmapId) return;

    console.log('Saving roadmap, items count:', roadmapItems.length);
    console.log('Items being saved:', roadmapItems);

    // Try SQLite first
    if (roadmapDB.db) {
        try {
            // Ensure roadmap record exists in database
            const existingRoadmap = await roadmapDB.getRoadmap(currentRoadmapId);
            if (!existingRoadmap) {
                // Create roadmap record if it doesn't exist
                console.log('Creating roadmap record for ID:', currentRoadmapId);
                const roadmapName = document.getElementById('currentRoadmapName')?.textContent || 'Unnamed Roadmap';
                const now = new Date().toISOString();
                roadmapDB.db.run(
                    'INSERT INTO roadmaps (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)',
                    [currentRoadmapId, roadmapName, now, now]
                );
            }

            await roadmapDB.saveItems(currentRoadmapId, roadmapItems);
            await roadmapDB.saveWorkstreamOrder(currentRoadmapId, workstreamOrder);
            console.log('Saved to SQLite successfully');
            return;
        } catch (error) {
            console.error('Error saving to SQLite:', error);
            // Fall through to localStorage/Firebase
        }
    }

    // Fallback to Firebase/localStorage
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
            console.log('Saved to localStorage, roadmap ID:', currentRoadmapId, 'items:', roadmapItems.length);
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

    // Initialize SQLite database
    try {
        const dbInitialized = await roadmapDB.initialize();
        if (dbInitialized) {
            console.log('SQLite database initialized successfully');
            const stats = await roadmapDB.getStats();
            console.log('Database stats:', stats);
        } else {
            console.warn('SQLite initialization failed, using localStorage fallback');
        }
    } catch (error) {
        console.error('Error initializing SQLite:', error);
        console.warn('Using localStorage fallback');
    }

    // Check if we have a roadmap ID
    currentRoadmapId = getRoadmapIdFromUrl();

    if (!currentRoadmapId) {
        // No roadmap ID, redirect to home
        window.location.href = 'home.html';
        return;
    }

    appInitialized = true;
    console.log('App initialized successfully');

    // Load workstream order from sessionStorage
    const savedOrder = sessionStorage.getItem('workstreamOrder');
    if (savedOrder) {
        try {
            workstreamOrder = JSON.parse(savedOrder);
        } catch (e) {
            console.error('Error loading workstream order:', e);
            workstreamOrder = {};
        }
    }

    // Load timeline extension from sessionStorage
    const savedExtension = sessionStorage.getItem('timelineExtensionDays');
    if (savedExtension) {
        timelineExtensionDays = parseInt(savedExtension) || 0;
    }

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
    const exportDbBtn = document.getElementById('exportDbBtn');
    const importDbBtn = document.getElementById('importDbBtn');
    const resetTimelineBtn = document.getElementById('resetTimelineBtn');

    // View toggle buttons
    const viewDailyBtn = document.getElementById('viewDailyBtn');
    const viewWeeklyBtn = document.getElementById('viewWeeklyBtn');
    const viewMonthlyBtn = document.getElementById('viewMonthlyBtn');
    const viewQuarterlyBtn = document.getElementById('viewQuarterlyBtn');
    const viewYearlyBtn = document.getElementById('viewYearlyBtn');

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

    // Export database button
    if (exportDbBtn) {
        exportDbBtn.addEventListener('click', async () => {
            // Check if database is initialized
            if (!roadmapDB.db || !roadmapDB.SQL) {
                alert('Database system not ready. Please wait a moment and try again.');
                console.error('SQLite not initialized');
                return;
            }

            try {
                await roadmapDB.exportToFile();
                alert('Database exported successfully!');
            } catch (error) {
                console.error('Error exporting database:', error);
                alert('Error exporting database: ' + error.message);
            }
        });
    }

    // Import database button
    if (importDbBtn) {
        importDbBtn.addEventListener('click', async () => {
            // Check if database is initialized
            if (!roadmapDB.db || !roadmapDB.SQL) {
                alert('Database system not ready. Please wait a moment and try again.');
                console.error('SQLite not initialized');
                return;
            }

            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.sqlite,.db';

            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) return;

                if (!confirm('Importing will replace your current database. Continue?')) {
                    return;
                }

                try {
                    console.log('Importing file:', file.name, 'Size:', file.size, 'bytes');
                    await roadmapDB.importFromFile(file);

                    // Verify import worked
                    const stats = await roadmapDB.getStats();
                    console.log('Import complete. Database stats:', stats);

                    const roadmaps = await roadmapDB.getAllRoadmaps();
                    console.log('Roadmaps after import:', roadmaps);

                    alert(`Database imported successfully!\nRoadmaps: ${stats.roadmaps}\nItems: ${stats.items}\n\nRedirecting to home...`);
                    // Redirect to home to see list of imported roadmaps
                    window.location.href = 'home.html';
                } catch (error) {
                    console.error('Error importing database:', error);
                    alert('Error importing database: ' + error.message + '\nPlease ensure it is a valid SQLite file.');
                }
            };

            input.click();
        });
    }

    // Zoom In button
    const zoomInBtn = document.getElementById('zoomInBtn');
    if (zoomInBtn) {
        zoomInBtn.addEventListener('click', () => {
            if (roadmapItems.length === 0) {
                alert('Please add some activities or milestones first');
                return;
            }
            zoomLevel = Math.min(zoomLevel + 1, 3); // Max zoom in level: +3
            renderTimeline();
        });
    }

    // Zoom Out button
    const zoomOutBtn = document.getElementById('zoomOutBtn');
    if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', () => {
            if (roadmapItems.length === 0) {
                alert('Please add some activities or milestones first');
                return;
            }
            zoomLevel = Math.max(zoomLevel - 1, -5); // Max zoom out level: -5
            renderTimeline();
        });
    }

    // Reset Zoom button
    const resetZoomBtn = document.getElementById('resetZoomBtn');
    if (resetZoomBtn) {
        resetZoomBtn.addEventListener('click', () => {
            zoomLevel = 0;
            renderTimeline();
        });
    }

    // Reset timeline width button
    if (resetTimelineBtn) {
        resetTimelineBtn.addEventListener('click', () => {
            // Reset zoom and extension
            const timelineCanvas = document.getElementById('timeline');
            if (timelineCanvas) {
                timelineCanvas.style.zoom = '1';
                timelineCanvas.style.width = '';
            }

            zoomLevel = 0;
            timelineExtensionDays = 0;
            sessionStorage.removeItem('timelineExtensionDays');
            renderTimeline();
        });
    }

    // View toggle buttons with null checks
    console.log('View buttons:', viewDailyBtn, viewWeeklyBtn, viewMonthlyBtn, viewQuarterlyBtn, viewYearlyBtn);

    if (viewDailyBtn) {
        viewDailyBtn.addEventListener('click', () => {
            console.log('Daily button clicked');
            currentView = 'daily';
            document.querySelectorAll('.btn-view-toggle').forEach(btn => btn.classList.remove('active'));
            viewDailyBtn.classList.add('active');
            renderTimeline();
        });
    }

    if (viewWeeklyBtn) {
        viewWeeklyBtn.addEventListener('click', () => {
            console.log('Weekly button clicked');
            currentView = 'weekly';
            document.querySelectorAll('.btn-view-toggle').forEach(btn => btn.classList.remove('active'));
            viewWeeklyBtn.classList.add('active');
            renderTimeline();
        });
    }

    if (viewMonthlyBtn) {
        viewMonthlyBtn.addEventListener('click', () => {
            console.log('Monthly button clicked');
            currentView = 'monthly';
            document.querySelectorAll('.btn-view-toggle').forEach(btn => btn.classList.remove('active'));
            viewMonthlyBtn.classList.add('active');
            renderTimeline();
        });
    }

    if (viewQuarterlyBtn) {
        viewQuarterlyBtn.addEventListener('click', () => {
            console.log('Quarterly button clicked');
            currentView = 'quarterly';
            document.querySelectorAll('.btn-view-toggle').forEach(btn => btn.classList.remove('active'));
            viewQuarterlyBtn.classList.add('active');
            renderTimeline();
        });
    }

    if (viewYearlyBtn) {
        viewYearlyBtn.addEventListener('click', () => {
            console.log('Yearly button clicked');
            currentView = 'yearly';
            document.querySelectorAll('.btn-view-toggle').forEach(btn => btn.classList.remove('active'));
            viewYearlyBtn.classList.add('active');
            renderTimeline();
        });
    }

    // Download timeline as image
    downloadBtn.addEventListener('click', async () => {
        if (roadmapItems.length === 0) {
            alert('Please add some activities or milestones first');
            return;
        }

        // Show user instruction for best quality
        if (!confirm('For best quality:\n1. The timeline will expand to full size\n2. Click OK to capture\n3. Wait a few seconds for processing\n\nContinue?')) {
            return;
        }

        try {
            // Try dom-to-image library first (better CSS support)
            if (typeof domtoimage === 'undefined') {
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/dom-to-image/2.6.0/dom-to-image.min.js';
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

    // Capture timeline as image using dom-to-image (better CSS support than html2canvas)
    function captureTimeline() {
        const timelineSection = document.querySelector('.timeline-section');
        const timelineContent = timelineCanvas.querySelector('.timeline-content');

        if (!timelineContent) {
            alert('Timeline content not found');
            return;
        }

        // Get the full dimensions
        const fullWidth = timelineContent.scrollWidth;
        const fullHeight = timelineContent.scrollHeight;

        // Temporarily remove scrollbars and set full size for capture
        const originalStyles = {
            overflow: timelineCanvas.style.overflow,
            maxHeight: timelineCanvas.style.maxHeight,
            height: timelineCanvas.style.height
        };

        timelineCanvas.style.overflow = 'visible';
        timelineCanvas.style.maxHeight = 'none';
        timelineCanvas.style.height = 'auto';

        // Use dom-to-image which preserves CSS better with higher scale for readability
        domtoimage.toPng(timelineCanvas, {
            width: (fullWidth + 50) * 2, // 2x zoom for better readability
            height: (fullHeight + 50) * 2, // 2x zoom
            style: {
                transform: 'scale(2)', // Scale up 2x
                transformOrigin: 'top left'
            },
            quality: 1.0
        }).then(function (dataUrl) {
            // Restore original styles
            timelineCanvas.style.overflow = originalStyles.overflow;
            timelineCanvas.style.maxHeight = originalStyles.maxHeight;
            timelineCanvas.style.height = originalStyles.height;

            // Download the image
            const a = document.createElement('a');
            a.href = dataUrl;
            a.download = `${roadmap.name}-roadmap-${new Date().toISOString().split('T')[0]}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }).catch(function (error) {
            // Restore original styles on error
            timelineCanvas.style.overflow = originalStyles.overflow;
            timelineCanvas.style.maxHeight = originalStyles.maxHeight;
            timelineCanvas.style.height = originalStyles.height;
            console.error('Error capturing timeline:', error);
            alert('Error capturing timeline. Please try again.');
        });
    }

    // Render table with workstream grouping and expand/collapse
    function renderTable() {
        console.log('renderTable called, roadmapItems count:', roadmapItems.length);
        if (roadmapItems.length === 0) {
            tableBody.innerHTML = '';
            emptyState.classList.add('show');
            document.querySelector('.table-container').style.display = 'none';
            return;
        }

        emptyState.classList.remove('show');
        document.querySelector('.table-container').style.display = 'block';

        // Group items by workstream
        const groupedItems = {};
        const noWorkstream = [];

        roadmapItems.forEach(item => {
            const workstream = item.workstream?.trim() || '';
            if (workstream) {
                if (!groupedItems[workstream]) {
                    groupedItems[workstream] = [];
                }
                groupedItems[workstream].push(item);
            } else {
                noWorkstream.push(item);
            }
        });

        // Sort workstream names
        const sortedWorkstreams = Object.keys(groupedItems).sort();

        let html = '';

        // Render each workstream group
        sortedWorkstreams.forEach(workstreamName => {
            const items = groupedItems[workstreamName];
            const workstreamId = `workstream-${workstreamName.replace(/\s+/g, '-')}`;
            const isCollapsed = sessionStorage.getItem(workstreamId) === 'collapsed';

            // Workstream header row - compact styling with copy and delete buttons
            html += `
                <tr class="workstream-header-row">
                    <td colspan="8" style="cursor: pointer; position: relative;">
                        <div style="display: flex; align-items: center; justify-content: space-between;">
                            <div onclick="toggleWorkstream('${workstreamId}')" style="flex: 1;">
                                <span class="workstream-toggle-icon" id="${workstreamId}-icon">${isCollapsed ? '▶' : '▼'}</span>
                                ${escapeHtml(workstreamName)} <span style="font-weight: 400; font-size: 11px; color: #6b7280;">(${items.length})</span>
                            </div>
                            <div style="display: flex; gap: 10px;">
                                <button
                                    class="btn-table-action"
                                    onclick="event.stopPropagation(); copyWorkstream('${escapeHtml(workstreamName).replace(/'/g, "\\'")}');"
                                    title="Copy entire workstream"
                                    style="background: #3b82f6; color: white;">
                                    Copy Workstream
                                </button>
                                <button
                                    class="btn-table-action btn-table-delete"
                                    onclick="event.stopPropagation(); deleteWorkstream('${escapeHtml(workstreamName).replace(/'/g, "\\'")}');"
                                    title="Delete entire workstream">
                                    Delete Workstream
                                </button>
                            </div>
                        </div>
                    </td>
                </tr>
            `;

            // Workstream items
            items.forEach(item => {
                html += renderTableRow(item, workstreamId, isCollapsed);
            });
        });

        // Render items without workstream
        if (noWorkstream.length > 0) {
            const workstreamId = 'workstream-none';
            const isCollapsed = sessionStorage.getItem(workstreamId) === 'collapsed';

            html += `
                <tr class="workstream-header-row" onclick="toggleWorkstream('${workstreamId}')">
                    <td colspan="8" style="cursor: pointer; background: #fef3c7;">
                        <span class="workstream-toggle-icon" id="${workstreamId}-icon">${isCollapsed ? '▶' : '▼'}</span>
                        No Workstream <span style="font-weight: 400; font-size: 11px; color: #6b7280;">(${noWorkstream.length})</span>
                    </td>
                </tr>
            `;

            noWorkstream.forEach(item => {
                html += renderTableRow(item, workstreamId, isCollapsed);
            });
        }

        tableBody.innerHTML = html;

        // Add event listeners for inline editing
        document.querySelectorAll('.editable-field').forEach(field => {
            field.addEventListener('change', handleFieldChange);
            field.addEventListener('blur', handleFieldChange);
        });

        // Add datalist to workstream inputs
        document.querySelectorAll('input[data-field="workstream"]').forEach(input => {
            createWorkstreamDatalist(input);
        });

        // Auto-grow textareas
        document.querySelectorAll('textarea.editable-field').forEach(textarea => {
            textarea.style.height = 'auto';
            textarea.style.height = textarea.scrollHeight + 'px';
            textarea.addEventListener('input', function() {
                this.style.height = 'auto';
                this.style.height = this.scrollHeight + 'px';
            });
        });
    }

    // Helper function to render a single table row
    function renderTableRow(item, workstreamId, isCollapsed) {
        const isMilestone = item.type === 'milestone';

        let displayStartDate = '';
        let displayEndDate = '';

        if (isMilestone) {
            displayStartDate = item.date || item.startDate || '';
            displayEndDate = displayStartDate;
        } else {
            displayStartDate = item.startDate || '';
            displayEndDate = item.endDate || '';
        }

        return `
            <tr data-id="${item.id}" class="workstream-item" data-workstream="${workstreamId}" style="display: ${isCollapsed ? 'none' : 'table-row'};">
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
                        <button class="btn-table-action btn-table-duplicate" onclick="duplicateRow('${item.id}')" title="Copy">
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                            </svg>
                        </button>
                        <button class="btn-table-action btn-table-delete" onclick="deleteRow('${item.id}')" title="Delete">
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    // Toggle workstream expand/collapse
    window.toggleWorkstream = function(workstreamId) {
        const items = document.querySelectorAll(`tr[data-workstream="${workstreamId}"]`);
        const icon = document.getElementById(`${workstreamId}-icon`);
        const isCollapsed = items[0]?.style.display === 'none';

        items.forEach(item => {
            item.style.display = isCollapsed ? 'table-row' : 'none';
        });

        icon.textContent = isCollapsed ? '▼' : '▶';

        // Save state to sessionStorage
        if (isCollapsed) {
            sessionStorage.removeItem(workstreamId);
        } else {
            sessionStorage.setItem(workstreamId, 'collapsed');
        }
    };

    // Handle field changes
    function handleFieldChange(e) {
        const field = e.target;
        const row = field.closest('tr');
        const itemId = row.dataset.id;
        const fieldName = field.dataset.field;
        const value = field.value;

        console.log('Field change:', fieldName, 'ID:', itemId, 'Value:', value);

        // Find item by ID (handle both string and number IDs)
        const item = roadmapItems.find(i => String(i.id) === String(itemId));
        if (!item) {
            console.error('Item not found for ID:', itemId);
            return;
        }

        console.log('Found item:', item);

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

    // Render hierarchical timeline headers
    function renderTimelineHeaders(minDate, maxDate, totalDays, pixelsPerDay, timelineWidth, displayMode) {
        let html = '';

        // Calculate hierarchical structures (excluding weekends)
        const yearSpans = [];
        const quarterSpans = [];
        const monthSpans = [];
        const weekSpans = [];
        const daySpans = [];

        let currentDate = new Date(minDate);
        let dayIndex = 0;

        // Build spans for each level (skip weekends)
        while (currentDate <= maxDate) {
            const dayOfWeek = currentDate.getDay();

            // Skip weekends (0 = Sunday, 6 = Saturday)
            if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                const year = currentDate.getFullYear();
                const month = currentDate.getMonth();
                const quarter = Math.floor(month / 3) + 1;
                const weekNum = getWeekNumber(currentDate);

                // Year spans
                if (yearSpans.length === 0 || yearSpans[yearSpans.length - 1].year !== year) {
                    yearSpans.push({ year, startDay: dayIndex, endDay: dayIndex });
                } else {
                    yearSpans[yearSpans.length - 1].endDay = dayIndex;
                }

                // Quarter spans
                if (quarterSpans.length === 0 || quarterSpans[quarterSpans.length - 1].quarter !== quarter || quarterSpans[quarterSpans.length - 1].year !== year) {
                    quarterSpans.push({ year, quarter, startDay: dayIndex, endDay: dayIndex });
                } else {
                    quarterSpans[quarterSpans.length - 1].endDay = dayIndex;
                }

                // Month spans
                if (monthSpans.length === 0 || monthSpans[monthSpans.length - 1].month !== month || monthSpans[monthSpans.length - 1].year !== year) {
                    const monthName = currentDate.toLocaleDateString('en-US', { month: 'short' });
                    monthSpans.push({ year, month, monthName, startDay: dayIndex, endDay: dayIndex });
                } else {
                    monthSpans[monthSpans.length - 1].endDay = dayIndex;
                }

                // Week spans
                if (weekSpans.length === 0 || weekSpans[weekSpans.length - 1].weekNum !== weekNum) {
                    weekSpans.push({ weekNum, startDay: dayIndex, endDay: dayIndex });
                } else {
                    weekSpans[weekSpans.length - 1].endDay = dayIndex;
                }

                // Day spans
                daySpans.push({ date: currentDate.getDate(), startDay: dayIndex, endDay: dayIndex });

                dayIndex++;
            }

            currentDate.setDate(currentDate.getDate() + 1);
        }

        // Render based on view mode
        html += '<div class="timeline-header-hierarchical" style="display: flex;">';
        html += '<div class="timeline-left-spacer"></div>';
        html += '<div class="timeline-headers-container" style="width: ' + timelineWidth + 'px; overflow: hidden;">';

        if (displayMode === 'weeks') {
            // Zoomed out mode - show only week numbers
            html += '<div class="timeline-header-row" style="display: flex; border-bottom: 1px solid #e2e8f0;">';
            weekSpans.forEach(span => {
                const width = (span.endDay - span.startDay + 1) * pixelsPerDay;
                html += `<div class="timeline-header-cell" style="width: ${width}px; min-width: ${width}px; padding: 8px 4px; text-align: center; font-size: 11px; font-weight: 600; background: #f7fafc;">CW${span.weekNum}</div>`;
            });
            html += '</div>';
        } else {
            // Normal hierarchical views
            if (currentView === 'daily') {
                // 5 rows: Year, Quarter, Month, Week, Date
                html += renderHeaderRow(yearSpans, pixelsPerDay, span => span.year, '#667eea', 'white');
                html += renderHeaderRow(quarterSpans, pixelsPerDay, span => `Q${span.quarter}`, '#764ba2', 'white');
                html += renderHeaderRow(monthSpans, pixelsPerDay, span => span.monthName, '#48bb78', 'white');
                html += renderHeaderRow(weekSpans, pixelsPerDay, span => `W${span.weekNum}`, '#4299e1', 'white');
                html += renderHeaderRow(daySpans, pixelsPerDay, span => span.date, '#e5e7eb', '#2d3748');
            } else if (currentView === 'weekly') {
                // 4 rows: Year, Quarter, Month, Week
                html += renderHeaderRow(yearSpans, pixelsPerDay, span => span.year, '#667eea', 'white');
                html += renderHeaderRow(quarterSpans, pixelsPerDay, span => `Q${span.quarter}`, '#764ba2', 'white');
                html += renderHeaderRow(monthSpans, pixelsPerDay, span => span.monthName, '#48bb78', 'white');
                html += renderHeaderRow(weekSpans, pixelsPerDay, span => `W${span.weekNum}`, '#4299e1', 'white');
            } else if (currentView === 'monthly') {
                // 3 rows: Year, Quarter, Month
                html += renderHeaderRow(yearSpans, pixelsPerDay, span => span.year, '#667eea', 'white');
                html += renderHeaderRow(quarterSpans, pixelsPerDay, span => `Q${span.quarter}`, '#764ba2', 'white');
                html += renderHeaderRow(monthSpans, pixelsPerDay, span => span.monthName, '#48bb78', 'white');
            } else if (currentView === 'quarterly') {
                // 2 rows: Year, Quarter
                html += renderHeaderRow(yearSpans, pixelsPerDay, span => span.year, '#667eea', 'white');
                html += renderHeaderRow(quarterSpans, pixelsPerDay, span => `Q${span.quarter}`, '#764ba2', 'white');
            } else if (currentView === 'yearly') {
                // 1 row: Year only
                html += renderHeaderRow(yearSpans, pixelsPerDay, span => span.year, '#667eea', 'white');
            }
        }

        html += '</div></div>';
        return html;
    }

    function renderHeaderRow(spans, pixelsPerDay, labelFunc, bgColor, textColor) {
        let html = '<div class="timeline-header-row" style="display: flex; border-bottom: 1px solid #e2e8f0;">';
        spans.forEach(span => {
            const width = (span.endDay - span.startDay + 1) * pixelsPerDay;
            const label = labelFunc(span);
            // Ensure minimum width for readability - no min-width constraint, let it flow naturally
            const fontSize = width < 40 ? '9px' : (width < 60 ? '10px' : '11px');
            const padding = width < 30 ? '6px 1px' : '8px 4px';
            html += `<div class="timeline-header-cell" style="width: ${width}px; min-width: ${width}px; padding: ${padding}; text-align: center; font-size: ${fontSize}; font-weight: 600; background: ${bgColor}; color: ${textColor}; border-right: 1px solid rgba(255,255,255,0.2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${label}</div>`;
        });
        html += '</div>';
        return html;
    }

    // Enhanced renderTimeline function with drag-and-drop, view modes, today marker, and smart positioning
    function renderTimeline() {
        try {
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
                if (date) allDates.push(parseLocalDate(date));
            } else {
                if (item.startDate) allDates.push(parseLocalDate(item.startDate));
                if (item.endDate) allDates.push(parseLocalDate(item.endDate));
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

        // Add timelineExtensionDays if user has expanded horizontally
        if (timelineExtensionDays > 0) {
            maxDate.setDate(maxDate.getDate() + timelineExtensionDays);
        }

        console.log('Original date range:', minDate.toISOString(), 'to', maxDate.toISOString());

        // Add padding based on view - minimal padding (2 days extra)
        // All views now start from the actual data, not from beginning of period
        if (currentView === 'daily') {
            // Daily view - find Monday of the week containing minDate
            const minDay = minDate.getDay();
            const daysToMonday = minDay === 0 ? 6 : minDay - 1; // Sunday is 0, we want Monday
            minDate.setDate(minDate.getDate() - daysToMonday);

            // Add just 2 days padding after maxDate
            maxDate.setDate(maxDate.getDate() + 2);
        } else if (currentView === 'weekly') {
            // Weekly view - start from Monday of week
            const minDay = minDate.getDay();
            const daysToMonday = minDay === 0 ? 6 : minDay - 1;
            minDate.setDate(minDate.getDate() - daysToMonday);
            maxDate.setDate(maxDate.getDate() + 2);
        } else if (currentView === 'yearly') {
            // Yearly view - start from the first day of the month containing minDate
            minDate.setDate(1);
            // Add 2 days padding
            maxDate.setDate(maxDate.getDate() + 2);
        } else if (currentView === 'quarterly') {
            // Quarterly view - start from the first day of the month containing minDate
            minDate.setDate(1);
            // Add 2 days padding
            maxDate.setDate(maxDate.getDate() + 2);
        } else { // monthly view
            // Monthly view - start from the first day of the month containing minDate
            minDate.setDate(1);
            // Add 2 days padding
            maxDate.setDate(maxDate.getDate() + 2);
        }

        console.log('Padded date range:', minDate.toISOString(), 'to', maxDate.toISOString());

        // Generate time periods based on view
        const periods = [];
        if (currentView === 'week') {
            // Week view - each period is one week (Monday to Sunday)
            let currentWeekStart = new Date(minDate);
            while (currentWeekStart <= maxDate) {
                const weekEnd = new Date(currentWeekStart);
                weekEnd.setDate(weekEnd.getDate() + 6); // Sunday

                const weekNum = getWeekNumber(currentWeekStart);
                const monthYear = currentWeekStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

                periods.push({
                    label: `W${weekNum} ${monthYear}`,
                    start: new Date(currentWeekStart),
                    end: weekEnd,
                    days: 7,
                    weekNumber: weekNum
                });

                currentWeekStart.setDate(currentWeekStart.getDate() + 7);
            }
        } else if (currentView === 'year') {
            // Year view with months
            const currentYear = minDate.getFullYear();
            const endYear = maxDate.getFullYear();
            console.log('Year view: generating periods from', currentYear, 'to', endYear);
            for (let year = currentYear; year <= endYear; year++) {
                const yearStart = new Date(year, 0, 1);
                const yearEnd = new Date(year, 11, 31);
                const daysInYear = Math.ceil((yearEnd - yearStart) / (1000 * 60 * 60 * 24)) + 1;

                // Calculate months in this year
                const months = [];
                for (let month = 0; month < 12; month++) {
                    const monthStart = new Date(year, month, 1);
                    const monthEnd = new Date(year, month + 1, 0);
                    months.push({
                        name: monthStart.toLocaleDateString('en-US', { month: 'short' }),
                        start: monthStart,
                        end: monthEnd
                    });
                }

                const yearPeriod = {
                    label: year.toString(),
                    start: yearStart,
                    end: yearEnd,
                    days: daysInYear,
                    months: months
                };
                console.log('Adding year period:', yearPeriod.label, 'with', months.length, 'months');
                periods.push(yearPeriod);
            }
        } else if (currentView === 'quarter') {
            // Quarter view with weeks - start from actual data, not quarter boundary
            let currentDate = new Date(minDate);
            while (currentDate <= maxDate) {
                const quarter = Math.floor(currentDate.getMonth() / 3) + 1;
                const quarterStart = new Date(currentDate.getFullYear(), (quarter - 1) * 3, 1);
                const quarterEnd = new Date(currentDate.getFullYear(), quarter * 3, 0);

                // Use the later of quarterStart or minDate as the actual start
                const actualStart = quarterStart > minDate ? quarterStart : new Date(minDate);
                const actualEnd = quarterEnd < maxDate ? quarterEnd : new Date(maxDate);
                const daysInPeriod = Math.ceil((actualEnd - actualStart) / (1000 * 60 * 60 * 24)) + 1;

                // Calculate weeks starting from the actual visible start date, aligned to Monday
                const weeks = [];
                let weekStart = new Date(actualStart);

                while (weekStart <= actualEnd) {
                    // Find Monday of the current week (skip to Monday if not already)
                    const dayOfWeek = weekStart.getDay();
                    const daysToMonday = dayOfWeek === 0 ? 1 : (dayOfWeek === 1 ? 0 : (8 - dayOfWeek));
                    if (daysToMonday > 0) {
                        weekStart.setDate(weekStart.getDate() + daysToMonday);
                    }

                    if (weekStart > actualEnd) break;

                    const weekNum = getWeekNumber(weekStart);
                    weeks.push({
                        number: weekNum,
                        start: new Date(weekStart)
                    });
                    weekStart.setDate(weekStart.getDate() + 7);
                }

                periods.push({
                    label: `Q${quarter} ${currentDate.getFullYear()}`,
                    start: actualStart,
                    end: actualEnd,
                    days: daysInPeriod,
                    weeks: weeks
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
                    // Find Monday of the current week (skip to Monday if not already)
                    const dayOfWeek = weekStart.getDay();
                    const daysToMonday = dayOfWeek === 0 ? 1 : (dayOfWeek === 1 ? 0 : (8 - dayOfWeek));
                    if (daysToMonday > 0) {
                        weekStart.setDate(weekStart.getDate() + daysToMonday);
                    }

                    if (weekStart > monthEnd) break;

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
                console.log('Adding activity to timeline:', item.name, 'Start:', item.startDate, 'End:', item.endDate);
                workstreams[item.workstream].push(item);
            }
        });

        // Calculate dimensions with zoom level (counting only weekdays)
        // Count weekdays between minDate and maxDate
        let totalWeekdays = 0;
        let tempDate = new Date(minDate);
        while (tempDate <= maxDate) {
            const dayOfWeek = tempDate.getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                totalWeekdays++;
            }
            tempDate.setDate(tempDate.getDate() + 1);
        }
        const totalDays = totalWeekdays;

        console.log('Weekday calculation:', {
            minDate: minDate.toISOString(),
            maxDate: maxDate.toISOString(),
            totalWeekdays: totalWeekdays
        });

        let pixelsPerDay;
        let displayMode = 'days'; // 'days', 'weeks', 'months'

        // Base pixels per day for each view (now based on weekdays only)
        // Quarter view: 1 week (5 weekdays) per column = should take reasonable space
        // Year view: highly compressed - showing years only
        let basePixelsPerDay;
        if (currentView === 'daily') {
            basePixelsPerDay = Math.max(30, 2400 / totalDays);
        } else if (currentView === 'weekly') {
            basePixelsPerDay = Math.max(15, 1800 / totalDays);
        } else if (currentView === 'monthly') {
            basePixelsPerDay = Math.max(3, 1200 / totalDays);
        } else if (currentView === 'quarterly') {
            // Each week should be a visible column: 7 days = ~50-70 pixels
            // So approximately 7-10 pixels per day
            basePixelsPerDay = Math.max(7, 2100 / totalDays);
        } else { // yearly
            // Highly compressed view - entire year should fit in reasonable width
            // Approximately 0.3 pixels per day (365 days = ~110 pixels per year)
            basePixelsPerDay = Math.max(0.3, 1200 / totalDays);
        }

        // Apply zoom level
        // Zoom level ranges from -5 (most zoomed out) to +3 (most zoomed in)
        // Each zoom level multiplies/divides by ~1.5x
        const zoomFactor = Math.pow(1.5, zoomLevel);
        pixelsPerDay = basePixelsPerDay * zoomFactor;

        // Determine display mode based on resulting pixels per day
        if (pixelsPerDay < 2) {
            displayMode = 'weeks'; // Show week numbers when very zoomed out
        } else if (pixelsPerDay < 5 && (currentView === 'quarterly' || currentView === 'yearly')) {
            displayMode = 'weeks'; // Show weeks for very compressed views
        } else {
            displayMode = 'days'; // Show normal hierarchical display
        }

        const timelineWidth = totalDays * pixelsPerDay;

        console.log('Timeline calculation:', {
            totalDays,
            pixelsPerDay,
            timelineWidth,
            minDate: minDate.toISOString(),
            maxDate: maxDate.toISOString()
        });

        // Render timeline HTML - adjust width to fit content with proper padding
        // Add extra padding (400px) to accommodate labels, dates, and descriptions that extend beyond bars
        const contentWidth = Math.max(timelineWidth + 400, 1200);
        let html = '<div class="timeline-content" style="width: ' + contentWidth + 'px;">';

        // Start bordered container that includes headers AND workstreams
        html += `<div class="timeline-bordered-container" style="border: 3px solid #3b82f6; border-radius: 8px; display: inline-block; overflow: hidden;">`;

        // Render hierarchical timeline headers based on view
        html += renderTimelineHeaders(minDate, maxDate, totalDays, pixelsPerDay, timelineWidth, displayMode);

        // General milestones section and workstreams (inside the border)
        html += `<div class="timeline-grid" style="position: relative;">`;

        // Add vertical lines and today marker - GLOBAL container spanning entire timeline
        let gridLinesHtml = '';

        // No weekend shading since we're excluding weekends from display

        // Add month-end lines for all views (grey line on last day of each month)
        let currentMonthEnd = new Date(minDate.getFullYear(), minDate.getMonth() + 1, 0); // Last day of first month
        while (currentMonthEnd <= maxDate) {
            const weekdaysSinceMin = getWeekdayPosition(minDate, currentMonthEnd);
            const monthEndLeft = weekdaysSinceMin * pixelsPerDay;
            gridLinesHtml += `<div class="month-end-line" style="left: ${monthEndLeft}px;"></div>`;

            // Move to next month end
            currentMonthEnd = new Date(currentMonthEnd.getFullYear(), currentMonthEnd.getMonth() + 2, 0);
        }

        // Add week/period lines based on display mode
        if (displayMode === 'weeks') {
            // Week display mode - show weekly gridlines
            let currentWeekStart = new Date(minDate);
            while (currentWeekStart <= maxDate) {
                const weekdaysFromStart = getWeekdayPosition(minDate, currentWeekStart);
                const weekLeft = weekdaysFromStart * pixelsPerDay;
                gridLinesHtml += `<div class="week-line" style="left: ${weekLeft}px;"></div>`;
                currentWeekStart.setDate(currentWeekStart.getDate() + 7);
            }
        } else if (currentView === 'daily') {
            // Daily view - show daily gridlines (weekdays only)
            let currentDate = new Date(minDate);
            let weekdayIndex = 0;
            while (currentDate <= maxDate) {
                const dayOfWeek = currentDate.getDay();
                if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Skip weekends
                    const dayLeft = weekdayIndex * pixelsPerDay;
                    gridLinesHtml += `<div class="week-line" style="left: ${dayLeft}px; opacity: 0.3;"></div>`;
                    weekdayIndex++;
                }
                currentDate.setDate(currentDate.getDate() + 1);
            }
        } else if (currentView === 'weekly') {
            // Weekly view - show weekly gridlines
            let currentWeekStart = new Date(minDate);
            while (currentWeekStart <= maxDate) {
                const weekdaysFromStart = getWeekdayPosition(minDate, currentWeekStart);
                const weekLeft = weekdaysFromStart * pixelsPerDay;
                gridLinesHtml += `<div class="week-line" style="left: ${weekLeft}px;"></div>`;
                currentWeekStart.setDate(currentWeekStart.getDate() + 7);
            }
        } else if (currentView === 'monthly') {
            // Monthly view - show monthly gridlines
            let currentMonthStart = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
            while (currentMonthStart <= maxDate) {
                const weekdaysFromStart = getWeekdayPosition(minDate, currentMonthStart);
                if (weekdaysFromStart >= 0) {
                    const monthLeft = weekdaysFromStart * pixelsPerDay;
                    gridLinesHtml += `<div class="week-line" style="left: ${monthLeft}px;"></div>`;
                }
                currentMonthStart.setMonth(currentMonthStart.getMonth() + 1);
            }
        } else if (currentView === 'quarterly') {
            // Quarterly view - show weekly gridlines (each column = 1 week of weekdays)
            let currentWeekStart = new Date(minDate);
            // Align to Monday
            const dayOfWeek = currentWeekStart.getDay();
            const daysToMonday = dayOfWeek === 0 ? 1 : (dayOfWeek === 1 ? 0 : (8 - dayOfWeek));
            if (daysToMonday > 0) {
                currentWeekStart.setDate(currentWeekStart.getDate() + daysToMonday);
            }

            while (currentWeekStart <= maxDate) {
                const weekdaysFromStart = getWeekdayPosition(minDate, currentWeekStart);
                if (weekdaysFromStart >= 0) {
                    const weekLeft = weekdaysFromStart * pixelsPerDay;
                    gridLinesHtml += `<div class="week-line" style="left: ${weekLeft}px;"></div>`;
                }
                currentWeekStart.setDate(currentWeekStart.getDate() + 7);
            }
        } else { // yearly
            // Yearly view - show year boundaries
            let currentYearStart = new Date(minDate.getFullYear(), 0, 1); // Jan 1
            // If minDate is not Jan 1, move to next year
            if (currentYearStart < minDate) {
                currentYearStart = new Date(minDate.getFullYear() + 1, 0, 1);
            }

            while (currentYearStart <= maxDate) {
                const weekdaysFromStart = getWeekdayPosition(minDate, currentYearStart);
                if (weekdaysFromStart >= 0) {
                    const yearLeft = weekdaysFromStart * pixelsPerDay;
                    gridLinesHtml += `<div class="week-line" style="left: ${yearLeft}px;"></div>`;
                }
                currentYearStart = new Date(currentYearStart.getFullYear() + 1, 0, 1);
            }
        }

        // Add TODAY marker
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        console.log('Today date:', today, 'Min:', minDate, 'Max:', maxDate);
        let todayMarkerHtml = '';
        let todayLabelHtml = '';
        if (today >= minDate && today <= maxDate) {
            const todayWeekdays = getWeekdayPosition(minDate, today);
            const todayLeft = todayWeekdays * pixelsPerDay;
            console.log('Adding today marker at:', todayLeft, 'px');
            gridLinesHtml += `<div class="today-marker" style="left: ${todayLeft}px;"></div>`;
            // Create label separately - add 200px offset for workstream header
            todayLabelHtml = `<div class="today-marker-label" style="left: ${200 + todayLeft}px;">TODAY</div>`;
        } else {
            console.log('Today is outside timeline range');
        }

        // Add global gridlines container that spans entire timeline height
        html += `<div class="timeline-gridlines-container" style="position: absolute; top: 0; left: 200px; right: 0; bottom: 0; pointer-events: none; z-index: 0;">`;
        html += gridLinesHtml;
        html += `</div>`;

        // General milestones
        let isFirstWorkstream = true;
        if (generalMilestones.length > 0) {
            html += `<div class="timeline-workstream" data-workstream-name="Milestones">`;
            html += `<div class="workstream-header milestones">Milestones</div>`;
            html += `<div class="workstream-rows" style="min-height: 65px; position: relative;">`;
            // Gridlines are now in global container, not here

            generalMilestones.forEach(item => {
                const itemDate = parseLocalDate(item.date);
                const weekdaysFromStart = getWeekdayPosition(minDate, itemDate);
                const left = weekdaysFromStart * pixelsPerDay;

                html += `
                    <div class="timeline-milestone general" style="left: ${left}px;" title="${escapeHtml(item.name)}\n${formatDate(item.date)}">
                        <div class="milestone-diamond"></div>
                        <div class="milestone-label">${escapeHtml(item.name)}</div>
                        <div class="milestone-date">${formatDateShort(item.date)}</div>
                    </div>
                `;
            });

            html += `</div>`;
            html += `<div class="workstream-resize-handle-vertical" title="Drag to resize height"></div>`;
            html += `</div>`;
        }

        // Workstreams with smart positioning
        // Get sorted workstreams considering custom order
        const sortedWorkstreamNames = Object.keys(workstreams).sort((a, b) => {
            const orderA = workstreamOrder[a] ?? 999;
            const orderB = workstreamOrder[b] ?? 999;
            if (orderA !== orderB) return orderA - orderB;
            return a.localeCompare(b); // Alphabetical if same order
        });

        sortedWorkstreamNames.forEach((workstreamName, index) => {
            const items = workstreams[workstreamName];
            const milestones = items.filter(i => i.type === 'milestone');
            const activities = items.filter(i => i.type === 'activity');

            html += `<div class="timeline-workstream" data-workstream-name="${escapeHtml(workstreamName)}">`;
            html += `<div class="workstream-header">
                <span>${escapeHtml(workstreamName)}</span>
                <div class="workstream-move-buttons">
                    <button class="workstream-move-btn" onclick="moveWorkstream('${escapeHtml(workstreamName)}', 'up')" title="Move up" ${index === 0 ? 'disabled' : ''}>▲</button>
                    <button class="workstream-move-btn" onclick="moveWorkstream('${escapeHtml(workstreamName)}', 'down')" title="Move down" ${index === sortedWorkstreamNames.length - 1 ? 'disabled' : ''}>▼</button>
                </div>
            </div>`;
            html += `<div class="workstream-rows" style="position: relative;">`;
            // Gridlines are now in global container, not here

            // Render milestones
            milestones.forEach(item => {
                const itemDate = parseLocalDate(item.date);
                const weekdaysFromStart = getWeekdayPosition(minDate, itemDate);
                const left = weekdaysFromStart * pixelsPerDay;

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
                const start = parseLocalDate(item.startDate);
                const end = parseLocalDate(item.endDate);
                const weekdaysFromStart = getWeekdayPosition(minDate, start);
                const durationWeekdays = countWeekdays(start, end);
                const left = weekdaysFromStart * pixelsPerDay;
                const width = durationWeekdays * pixelsPerDay;

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
                            // Use weekday-based positioning to match actual rendering
                            const prevStart = parseLocalDate(prevItem.startDate);
                            const prevEndDate = parseLocalDate(prevItem.endDate);
                            const prevWeekdaysFromStart = getWeekdayPosition(minDate, prevStart);
                            const prevDurationWeekdays = countWeekdays(prevStart, prevEndDate);
                            const prevLeft = prevWeekdaysFromStart * pixelsPerDay;
                            const prevWidth = prevDurationWeekdays * pixelsPerDay;
                            const prevVisualWidth = prevWidth + textPadding;

                            // Check for visual overlap (including text)
                            // Add small gap (5px) to ensure no touching when dates are adjacent
                            const currentEnd = left + visualWidth;
                            const prevEnd = prevLeft + prevVisualWidth;
                            const gap = 5; // 5px gap between activities

                            if (!(left >= prevEnd + gap || currentEnd <= prevLeft - gap)) {
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
                        // Safety check to prevent infinite loop
                        if (rowIndex > 100) {
                            console.error('Too many rows needed for activity placement');
                            item.assignedRow = rowIndex;
                            foundRow = true;
                        }
                    }
                }

                const milestoneHeight = milestones.length > 0 ? 65 : 0;
                const top = milestoneHeight + (item.assignedRow * 70) + 30; // Increased spacing from 50 to 70, and offset from 10 to 30 to start below Today label
                const status = item.status || 'not-started';
                const startDateStr = formatDateShort(item.startDate);
                const endDateStr = formatDateShort(item.endDate);

                // Status colors for the line
                const lineColors = {
                    'not-started': '#9ca3af',
                    'in-progress': '#10b981',
                    'at-risk': '#ef4444',
                    'completed': '#3b82f6'
                };
                const lineColor = lineColors[status] || '#9ca3af';

                // Detect activity duration for layout (based on weekdays)
                const activityDuration = durationWeekdays;
                let datePositionClass = '';
                let dateDisplay = '';

                if (activityDuration === 1) {
                    // 1-day activity: show single date below, name above
                    datePositionClass = 'single-day';
                    dateDisplay = `<div class="timeline-bar-single-date">${startDateStr}</div>`;
                } else if (activityDuration <= 3) {
                    // Short activity (2-3 days): stack dates vertically, move name higher
                    datePositionClass = 'stacked';
                    dateDisplay = `
                        <div class="timeline-bar-start-date">${startDateStr}</div>
                        <div class="timeline-bar-end-date">${endDateStr}</div>
                    `;
                } else if (width < 100) {
                    // Visually compressed activity: also stack to prevent overlap
                    datePositionClass = 'stacked';
                    dateDisplay = `
                        <div class="timeline-bar-start-date">${startDateStr}</div>
                        <div class="timeline-bar-end-date">${endDateStr}</div>
                    `;
                } else {
                    // Normal activity: dates on both ends below line
                    dateDisplay = `
                        <div class="timeline-bar-start-date">${startDateStr}</div>
                        <div class="timeline-bar-end-date">${endDateStr}</div>
                    `;
                }

                html += `
                    <div class="timeline-bar ${datePositionClass}"
                         data-item-id="${item.id}"
                         style="left: ${left}px; width: ${width}px; top: ${top}px; z-index: 3;"
                         title="${escapeHtml(item.name)}\n${startDateStr} - ${endDateStr}">
                        <div class="timeline-bar-drag-handle-start"></div>
                        <div class="timeline-bar-line ${status}" style="background: ${lineColor};"></div>
                        <div class="timeline-bar-description">${escapeHtml(item.name)}</div>
                        ${dateDisplay}
                        <div class="timeline-bar-drag-handle-end"></div>
                    </div>
                `;
            });

            const maxRow = Math.max(...activities.map(a => a.assignedRow || 0), -1) + 1;
            const totalActivityHeight = maxRow * 70; // Updated to match new spacing
            const milestoneHeight = milestones.length > 0 ? 65 : 0;
            const barHeight = 24; // Height of activity bar
            const labelAboveHeight = 20; // Height of label when positioned above bar
            const minHeight = Math.max(milestoneHeight + totalActivityHeight + barHeight + labelAboveHeight + 20, 100); // Increased padding

            html += `</div>`;
            // Add resize handle (vertical only for workstreams)
            html += `<div class="workstream-resize-handle-vertical" title="Drag to resize height"></div>`;
            html += `</div>`;

            // Replace the workstream-rows div to add calculated min-height
            const searchStr = `<div class="workstream-rows" style="position: relative;">`;
            const lastIndex = html.lastIndexOf(searchStr);
            if (lastIndex !== -1) {
                html = html.substring(0, lastIndex) +
                       `<div class="workstream-rows" style="position: relative; min-height: ${minHeight}px;">` +
                       html.substring(lastIndex + searchStr.length);
            }
        });

        // Calculate total timeline height (sum of all workstreams + general milestones)
        let totalTimelineHeight = 0;
        if (generalMilestones.length > 0) {
            totalTimelineHeight += 65; // General milestones section height
        }

        // Add each workstream height
        sortedWorkstreamNames.forEach(workstreamName => {
            const items = workstreams[workstreamName];
            const milestones = items.filter(i => i.type === 'milestone');
            const activities = items.filter(i => i.type === 'activity');

            const maxRow = activities.length > 0 ? Math.max(...activities.map(a => a.assignedRow || 0), -1) + 1 : 0;
            const totalActivityHeight = maxRow * 50;
            const milestoneHeight = milestones.length > 0 ? 65 : 0;
            const workstreamHeight = Math.max(milestoneHeight + totalActivityHeight + 64, 100);
            totalTimelineHeight += workstreamHeight;
        });

        html += '</div>'; // Close timeline-grid
        html += '<div class="timeline-border-resize-handle" title="Drag to extend timeline"></div>'; // Add horizontal resize handle to border
        html += '</div>'; // Close timeline-bordered-container

        // Add TODAY label below all workstreams in white space above border
        if (todayLabelHtml) {
            const todayDays = Math.ceil((today - minDate) / (1000 * 60 * 60 * 24));
            const todayLeft = todayDays * pixelsPerDay;
            // Position label below the bordered container with 15px padding from bottom
            html += `<div class="today-marker-label-bottom" style="left: ${200 + todayLeft}px; top: ${totalTimelineHeight + 15}px;">TODAY</div>`;
        }

        html += '</div>'; // Close timeline-content
        timelineCanvas.innerHTML = html;

        // Add drag-and-drop functionality
        initDragAndDrop(minDate, pixelsPerDay);

        // Add workstream resize functionality
        initWorkstreamResize();
        } catch (error) {
            console.error('Error in renderTimeline:', error);
            timelineCanvas.innerHTML = `
                <div class="empty-state">
                    <p style="color: red;">Error rendering timeline: ${error.message}</p>
                    <p>Check console for details</p>
                </div>
            `;
        }
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

                    const duration = Math.ceil((parseLocalDate(item.endDate) - parseLocalDate(item.startDate)) / (1000 * 60 * 60 * 24));
                    const newEndDate = new Date(newStartDate);
                    newEndDate.setDate(newEndDate.getDate() + duration);

                    bar.style.left = newLeft + 'px';
                    bar.querySelector('.timeline-bar-start-date').textContent = formatDateShort(formatLocalDateToISO(newStartDate));
                    bar.querySelector('.timeline-bar-end-date').textContent = formatDateShort(formatLocalDateToISO(newEndDate));
                };

                const onMouseUp = async (e) => {
                    const deltaX = e.clientX - dragStartX;
                    const newLeft = startLeft + deltaX;
                    const newStartDays = Math.round(newLeft / pixelsPerDay);
                    const newStartDate = new Date(minDate);
                    newStartDate.setDate(newStartDate.getDate() + newStartDays);

                    const duration = Math.ceil((parseLocalDate(item.endDate) - parseLocalDate(item.startDate)) / (1000 * 60 * 60 * 24));
                    const newEndDate = new Date(newStartDate);
                    newEndDate.setDate(newEndDate.getDate() + duration);

                    item.startDate = formatLocalDateToISO(newStartDate);
                    item.endDate = formatLocalDateToISO(newEndDate);

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
                            bar.querySelector('.timeline-bar-start-date').textContent = formatDateShort(formatLocalDateToISO(newStartDate));
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
                            item.startDate = formatLocalDateToISO(newStartDate);

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
                            const newEndDate = parseLocalDate(item.startDate);
                            newEndDate.setDate(newEndDate.getDate() + durationDays - 1);
                            bar.querySelector('.timeline-bar-end-date').textContent = formatDateShort(formatLocalDateToISO(newEndDate));
                        }
                    };

                    const onMouseUp = async (e) => {
                        const deltaX = e.clientX - dragStartX;
                        const newWidth = startWidth + deltaX;

                        if (newWidth > 10) {
                            const durationDays = Math.round(newWidth / pixelsPerDay);
                            const newEndDate = parseLocalDate(item.startDate);
                            newEndDate.setDate(newEndDate.getDate() + durationDays - 1);
                            item.endDate = formatLocalDateToISO(newEndDate);

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

    // Initialize workstream resize functionality
    function initWorkstreamResize() {
        // Vertical resize handles
        const verticalHandles = document.querySelectorAll('.workstream-resize-handle-vertical');

        verticalHandles.forEach(handle => {
            const workstreamDiv = handle.parentElement;
            const workstreamRows = workstreamDiv.querySelector('.workstream-rows');
            const workstreamName = workstreamDiv.getAttribute('data-workstream-name');

            if (!workstreamRows) return;

            handle.addEventListener('mousedown', (e) => {
                e.preventDefault();
                const startY = e.clientY;
                const startHeight = workstreamRows.offsetHeight;

                const onMouseMove = (e) => {
                    const deltaY = e.clientY - startY;
                    const newHeight = Math.max(50, startHeight + deltaY); // Minimum 50px
                    workstreamRows.style.height = newHeight + 'px';
                    workstreamRows.style.minHeight = newHeight + 'px';
                };

                const onMouseUp = () => {
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);

                    // Save the height to sessionStorage
                    const finalHeight = workstreamRows.offsetHeight;
                    sessionStorage.setItem(`workstream-height-${workstreamName}`, finalHeight);
                };

                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            });

            // Restore saved height
            const savedHeight = sessionStorage.getItem(`workstream-height-${workstreamName}`);
            if (savedHeight) {
                workstreamRows.style.height = savedHeight + 'px';
                workstreamRows.style.minHeight = savedHeight + 'px';
            }
        });

        // Horizontal resize handles
        const horizontalHandles = document.querySelectorAll('.timeline-border-resize-handle');

        horizontalHandles.forEach(handle => {
            handle.addEventListener('mousedown', (e) => {
                e.preventDefault();
                const startX = e.clientX;
                const startExtension = timelineExtensionDays;
                let lastUpdateTime = 0;

                const onMouseMove = (e) => {
                    const deltaX = e.clientX - startX;

                    // Calculate how many extra days this represents
                    const pixelsPerDay = currentView === 'week' ? 30 :  // Updated to match doubled week view
                                        currentView === 'month' ? 3 :
                                        currentView === 'quarter' ? 2 : 1;

                    const extraDays = Math.ceil(deltaX / pixelsPerDay);

                    // Update extension days
                    if (extraDays > 0) {
                        timelineExtensionDays = startExtension + extraDays;
                    } else {
                        timelineExtensionDays = Math.max(0, startExtension + extraDays);
                    }

                    // Throttle timeline regeneration (max once per 200ms)
                    const now = Date.now();
                    if (now - lastUpdateTime > 200) {
                        lastUpdateTime = now;
                        console.log('Extending timeline by', timelineExtensionDays, 'days');
                        renderTimeline();
                    }
                };

                const onMouseUp = () => {
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);

                    // Final timeline regeneration and save
                    sessionStorage.setItem('timelineExtensionDays', timelineExtensionDays);
                    console.log('Timeline extension saved:', timelineExtensionDays, 'days');
                    renderTimeline();
                };

                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            });
        });
    }

    // Expose render functions globally so they can be called from delete/duplicate
    window.renderTable = renderTable;
    window.renderTimeline = renderTimeline;
}

// Global function for deleting rows
// Duplicate a row to a new or existing workstream
async function duplicateRow(id) {
    console.log('Duplicate row called for ID:', id);
    const item = roadmapItems.find(i => i.id == id);
    if (!item) return;

    // Get all existing workstreams
    const workstreams = [...new Set(roadmapItems.map(i => i.workstream).filter(w => w && w.trim()))];

    // Create dialog HTML
    const dialogHtml = `
        <div id="duplicateDialog" style="
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        ">
            <div style="
                background: white;
                padding: 30px;
                border-radius: 12px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.3);
                max-width: 500px;
                width: 90%;
            ">
                <h2 style="margin-top: 0; color: #1f2937;">Duplicate Item</h2>
                <p style="color: #6b7280; margin-bottom: 20px;">
                    Duplicating: <strong>${escapeHtml(item.name || 'Untitled')}</strong>
                </p>

                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #374151;">
                        Target Workstream:
                    </label>
                    <select id="duplicateWorkstreamSelect" style="
                        width: 100%;
                        padding: 10px;
                        border: 2px solid #d1d5db;
                        border-radius: 6px;
                        font-size: 14px;
                    ">
                        <option value="__same__">Same workstream (${escapeHtml(item.workstream || 'None')})</option>
                        <option value="__new__">Create new workstream...</option>
                        ${workstreams.filter(w => w !== item.workstream).map(w =>
                            `<option value="${escapeHtml(w)}">${escapeHtml(w)}</option>`
                        ).join('')}
                    </select>
                </div>

                <div id="newWorkstreamInput" style="display: none; margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #374151;">
                        New Workstream Name:
                    </label>
                    <input type="text" id="newWorkstreamName" style="
                        width: 100%;
                        padding: 10px;
                        border: 2px solid #d1d5db;
                        border-radius: 6px;
                        font-size: 14px;
                    " placeholder="Enter workstream name">
                </div>

                <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 25px;">
                    <button id="duplicateCancelBtn" style="
                        padding: 10px 20px;
                        border: 2px solid #d1d5db;
                        background: white;
                        border-radius: 6px;
                        cursor: pointer;
                        font-weight: 600;
                        color: #374151;
                    ">Cancel</button>
                    <button id="duplicateConfirmBtn" style="
                        padding: 10px 20px;
                        border: none;
                        background: #3b82f6;
                        color: white;
                        border-radius: 6px;
                        cursor: pointer;
                        font-weight: 600;
                    ">Duplicate</button>
                </div>
            </div>
        </div>
    `;

    // Add dialog to body
    document.body.insertAdjacentHTML('beforeend', dialogHtml);

    const dialog = document.getElementById('duplicateDialog');
    const select = document.getElementById('duplicateWorkstreamSelect');
    const newInput = document.getElementById('newWorkstreamInput');
    const newNameInput = document.getElementById('newWorkstreamName');
    const cancelBtn = document.getElementById('duplicateCancelBtn');
    const confirmBtn = document.getElementById('duplicateConfirmBtn');

    // Show/hide new workstream input
    select.addEventListener('change', () => {
        if (select.value === '__new__') {
            newInput.style.display = 'block';
            newNameInput.focus();
        } else {
            newInput.style.display = 'none';
        }
    });

    // Cancel button
    cancelBtn.addEventListener('click', () => {
        dialog.remove();
    });

    // Confirm button
    confirmBtn.addEventListener('click', async () => {
        let targetWorkstream = select.value;

        if (targetWorkstream === '__new__') {
            targetWorkstream = newNameInput.value.trim();
            if (!targetWorkstream) {
                alert('Please enter a workstream name');
                return;
            }
        } else if (targetWorkstream === '__same__') {
            targetWorkstream = item.workstream;
        }

        // Create duplicate item with deep copy and integer ID
        const duplicateItem = {
            id: Date.now(), // Use timestamp as unique integer ID
            workstream: targetWorkstream,
            type: item.type,
            name: item.name,
            startDate: item.startDate,
            endDate: item.endDate,
            date: item.date,
            status: item.status,
            description: item.description
        };

        console.log('Creating duplicate item:', duplicateItem);
        roadmapItems.push(duplicateItem);
        console.log('Total items after duplicate:', roadmapItems.length);
        await saveData();

        // Close dialog
        dialog.remove();

        // Refresh UI
        console.log('Calling renderTable and renderTimeline after duplicate');
        window.renderTable();
        window.renderTimeline();

        // Show save button
        const saveRoadmapBtn = document.getElementById('saveRoadmapBtn');
        if (saveRoadmapBtn) {
            saveRoadmapBtn.style.display = 'block';
        }
    });

    // Close on background click
    dialog.addEventListener('click', (e) => {
        if (e.target === dialog) {
            dialog.remove();
        }
    });
}

// Make duplicateRow globally accessible
window.duplicateRow = duplicateRow;

// Move workstream up or down
window.moveWorkstream = function(workstreamName, direction) {
    // Get current workstreams in order
    const workstreams = {};
    roadmapItems.forEach(item => {
        const ws = item.workstream?.trim() || '';
        if (ws && !workstreams[ws]) {
            workstreams[ws] = true;
        }
    });

    const allWorkstreams = Object.keys(workstreams).sort((a, b) => {
        const orderA = workstreamOrder[a] ?? 999;
        const orderB = workstreamOrder[b] ?? 999;
        if (orderA !== orderB) return orderA - orderB;
        return a.localeCompare(b);
    });

    const currentIndex = allWorkstreams.indexOf(workstreamName);
    if (currentIndex === -1) return;

    // Initialize order if not set
    allWorkstreams.forEach((ws, idx) => {
        if (workstreamOrder[ws] === undefined) {
            workstreamOrder[ws] = idx;
        }
    });

    if (direction === 'up' && currentIndex > 0) {
        // Swap with previous
        const prevWorkstream = allWorkstreams[currentIndex - 1];
        const temp = workstreamOrder[workstreamName];
        workstreamOrder[workstreamName] = workstreamOrder[prevWorkstream];
        workstreamOrder[prevWorkstream] = temp;
    } else if (direction === 'down' && currentIndex < allWorkstreams.length - 1) {
        // Swap with next
        const nextWorkstream = allWorkstreams[currentIndex + 1];
        const temp = workstreamOrder[workstreamName];
        workstreamOrder[workstreamName] = workstreamOrder[nextWorkstream];
        workstreamOrder[nextWorkstream] = temp;
    }

    // Save to sessionStorage and database
    sessionStorage.setItem('workstreamOrder', JSON.stringify(workstreamOrder));
    saveData();

    // Re-render using the global exposed functions
    if (typeof window.renderTable === 'function' && typeof window.renderTimeline === 'function') {
        window.renderTable();
        window.renderTimeline();
    } else {
        location.reload(); // Fallback
    }
};

async function deleteRow(id) {
    console.log('Delete row called for ID:', id);
    if (confirm('Are you sure you want to delete this item?')) {
        roadmapItems = roadmapItems.filter(item => item.id != id);
        await saveData();
        renderTable();
        renderTimeline();
    }
}

// Make deleteRow globally accessible
window.deleteRow = deleteRow;

// Delete entire workstream
async function deleteWorkstream(workstreamName) {
    console.log('Delete workstream called for:', workstreamName);

    const itemsInWorkstream = roadmapItems.filter(item => item.workstream === workstreamName);
    const count = itemsInWorkstream.length;

    if (confirm(`Are you sure you want to delete the workstream "${workstreamName}" and all ${count} items in it? This cannot be undone.`)) {
        // Remove all items in this workstream
        roadmapItems = roadmapItems.filter(item => item.workstream !== workstreamName);

        // Remove from workstream order
        delete workstreamOrder[workstreamName];

        await saveData();
        window.renderTable();
        window.renderTimeline();
    }
}

// Make deleteWorkstream globally accessible
window.deleteWorkstream = deleteWorkstream;

// Copy entire workstream
async function copyWorkstream(workstreamName) {
    console.log('Copy workstream called for:', workstreamName);

    const itemsInWorkstream = roadmapItems.filter(item => item.workstream === workstreamName);
    const count = itemsInWorkstream.length;

    if (count === 0) {
        alert('No items in this workstream to copy.');
        return;
    }

    if (confirm(`Copy workstream "${workstreamName}" with all ${count} items? Dates will be blank and names will be prefixed with "Copy of".`)) {
        const newWorkstreamName = `Copy of ${workstreamName}`;

        // Create copies of all items in the workstream
        itemsInWorkstream.forEach(item => {
            const copiedItem = {
                id: Date.now() + Math.random() * 1000, // Unique ID
                workstream: newWorkstreamName,
                type: item.type,
                name: `Copy of ${item.name}`,
                startDate: '', // Blank dates
                endDate: '',
                date: '', // For milestones
                status: 'not-started',
                description: item.description || ''
            };
            roadmapItems.push(copiedItem);
        });

        await saveData();
        window.renderTable();
        window.renderTimeline();

        alert(`Workstream "${newWorkstreamName}" created with ${count} items (dates are blank).`);
    }
}

// Make copyWorkstream globally accessible
window.copyWorkstream = copyWorkstream;

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
// Count weekdays between two dates (excluding Saturday and Sunday)
function countWeekdays(startDate, endDate) {
    let count = 0;
    const current = new Date(startDate);
    while (current <= endDate) {
        const dayOfWeek = current.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday(0) or Saturday(6)
            count++;
        }
        current.setDate(current.getDate() + 1);
    }
    return count;
}

// Get weekday position (excluding weekends) from start date
function getWeekdayPosition(startDate, targetDate) {
    let position = 0;
    const current = new Date(startDate);
    current.setHours(0, 0, 0, 0);
    const target = new Date(targetDate);
    target.setHours(0, 0, 0, 0);

    let iterations = 0;
    const maxIterations = 10000; // Safety limit

    while (current < target && iterations < maxIterations) {
        const dayOfWeek = current.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not weekend
            position++;
        }
        current.setDate(current.getDate() + 1);
        iterations++;
    }

    if (iterations >= maxIterations) {
        console.error('getWeekdayPosition: Max iterations reached', startDate, targetDate);
    }

    return position;
}

// Count weekdays between two dates (inclusive)
function countWeekdays(startDate, endDate) {
    let count = 0;
    const current = new Date(startDate);
    current.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);

    let iterations = 0;
    const maxIterations = 10000; // Safety limit

    while (current <= end && iterations < maxIterations) {
        const dayOfWeek = current.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not weekend
            count++;
        }
        current.setDate(current.getDate() + 1);
        iterations++;
    }

    if (iterations >= maxIterations) {
        console.error('countWeekdays: Max iterations reached', startDate, endDate);
    }

    return count;
}

// Parse date string in local timezone (avoid UTC conversion issues)
function parseLocalDate(dateString) {
    if (!dateString) return null;
    // Split the date string to get year, month, day
    const parts = dateString.split('-');
    if (parts.length !== 3) return new Date(dateString); // Fallback

    // Create date in local timezone (month is 0-indexed)
    return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
}

// Format date to YYYY-MM-DD in local timezone
function formatLocalDateToISO(date) {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatDate(dateString) {
    const date = parseLocalDate(dateString);
    if (!date) return '';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateShort(dateString) {
    const date = parseLocalDate(dateString);
    if (!date) return '';
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
