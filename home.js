// Check if database is initialized
const useSQLite = typeof roadmapDB !== 'undefined';

// Load all saved roadmaps
async function loadRoadmaps() {
    // Use SQLite database
    console.log('loadRoadmaps called, roadmapDB:', roadmapDB);
    console.log('roadmapDB.db:', roadmapDB ? roadmapDB.db : 'roadmapDB undefined');

    if (roadmapDB && roadmapDB.db) {
        try {
            const roadmapsArray = await roadmapDB.getAllRoadmaps();
            console.log('Loaded roadmaps from SQLite:', roadmapsArray);
            const roadmaps = {};

            // Convert array to object with IDs as keys
            for (const roadmap of roadmapsArray) {
                // Load items for this roadmap
                const items = await roadmapDB.getRoadmapItems(roadmap.id);
                console.log(`Loaded ${items.length} items for roadmap ${roadmap.id}`);
                roadmaps[roadmap.id] = {
                    name: roadmap.name,
                    items: items,
                    created: new Date(roadmap.created_at).getTime(),
                    lastModified: new Date(roadmap.updated_at).getTime()
                };
            }

            console.log('Final roadmaps object:', roadmaps);
            return roadmaps;
        } catch (error) {
            console.error('Error loading from SQLite:', error);
            alert('Error loading roadmaps from database.');
            return {};
        }
    } else {
        console.error('Database not initialized');
        alert('Database not initialized. Please refresh the page.');
        return {};
    }
}

// Save all roadmaps (deprecated - kept for compatibility)
async function saveRoadmaps(roadmaps) {
    // SQLite uses individual save operations, not bulk saves
    console.log('saveRoadmaps is deprecated with SQLite');
}

// Get current roadmap ID from URL or localStorage
function getCurrentRoadmapId() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id') || localStorage.getItem('currentRoadmapId');
}

// Set current roadmap ID
function setCurrentRoadmapId(id) {
    localStorage.setItem('currentRoadmapId', id);
}

// Render roadmaps list
async function renderRoadmapsList() {
    const roadmaps = await loadRoadmaps();
    const roadmapsList = document.getElementById('roadmapsList');

    const roadmapIds = Object.keys(roadmaps);

    if (roadmapIds.length === 0) {
        roadmapsList.innerHTML = `
            <div class="empty-state" style="padding: 60px 20px;">
                <svg xmlns="http://www.w3.org/2000/svg" style="width: 80px; height: 80px; opacity: 0.3; margin-bottom: 20px;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p>No roadmaps yet. Click "Create New Roadmap" to get started!</p>
            </div>
        `;
        return;
    }

    roadmapsList.innerHTML = roadmapIds.map(id => {
        const roadmap = roadmaps[id];
        const itemCount = roadmap.items ? roadmap.items.length : 0;
        const lastModified = roadmap.lastModified ? new Date(roadmap.lastModified).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }) : 'Unknown';

        return `
            <div class="roadmap-card">
                <div class="roadmap-info">
                    <h3 class="roadmap-name">${escapeHtml(roadmap.name)}</h3>
                    <div class="roadmap-meta">
                        <span class="roadmap-count">${itemCount} item${itemCount !== 1 ? 's' : ''}</span>
                        <span class="roadmap-date">Last modified: ${lastModified}</span>
                    </div>
                </div>
                <div class="roadmap-actions">
                    <button class="btn-icon" onclick="openRoadmap('${id}')" title="Open">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                        </svg>
                    </button>
                    <button class="btn-icon" onclick="renameRoadmap('${id}')" title="Rename">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                        </svg>
                    </button>
                    <button class="btn-icon btn-danger" onclick="deleteRoadmap('${id}')" title="Delete">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Create new roadmap
async function createNewRoadmap() {
    showModal('Create New Roadmap', '', async (name) => {
        if (!name.trim()) {
            alert('Please enter a program name');
            return;
        }

        try {
            const roadmap = await roadmapDB.createRoadmap(name.trim());
            setCurrentRoadmapId(roadmap.id);
            window.location.href = `index.html?id=${roadmap.id}`;
        } catch (error) {
            console.error('Error creating roadmap:', error);
            alert('Error creating roadmap. Please try again.');
        }
    });
}

// Import database
async function importDatabase() {
    if (!roadmapDB.db || !roadmapDB.SQL) {
        alert('Database system not ready. Please wait a moment and try again.');
        return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.sqlite,.db';

    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            // Import roadmaps as copies (merge into existing database)
            const result = await roadmapDB.importRoadmapsAsCopies(file);

            alert(`Roadmaps imported successfully!\nRoadmaps: ${result.roadmapsImported}\nItems: ${result.itemsImported}\n\nImported roadmaps have been added with "(Imported)" suffix.`);

            // Refresh the roadmaps list
            await renderRoadmapsList();
        } catch (error) {
            console.error('Error importing database:', error);
            alert('Error importing database: ' + error.message);
        }
    };

    input.click();
}

// Open existing roadmap
function openRoadmap(id) {
    setCurrentRoadmapId(id);
    window.location.href = `index.html?id=${id}`;
}

// Rename roadmap
async function renameRoadmap(id) {
    const roadmaps = await loadRoadmaps();
    const roadmap = roadmaps[id];

    if (!roadmap) return;

    showModal('Rename Roadmap', roadmap.name, async (newName) => {
        if (!newName.trim()) {
            alert('Please enter a program name');
            return;
        }

        try {
            await roadmapDB.updateRoadmap(id, newName.trim());
            await renderRoadmapsList();
        } catch (error) {
            console.error('Error renaming roadmap:', error);
            alert('Error renaming roadmap. Please try again.');
        }
    });
}

// Delete roadmap
async function deleteRoadmap(id) {
    const roadmaps = await loadRoadmaps();
    const roadmap = roadmaps[id];

    if (!roadmap) return;

    if (confirm(`Are you sure you want to delete "${roadmap.name}"? This cannot be undone.`)) {
        try {
            await roadmapDB.deleteRoadmap(id);

            // Clear current roadmap if it's the one being deleted
            if (getCurrentRoadmapId() === id) {
                localStorage.removeItem('currentRoadmapId');
            }

            await renderRoadmapsList();
        } catch (error) {
            console.error('Error deleting roadmap:', error);
            alert('Error deleting roadmap. Please try again.');
        }
    }
}

// Modal functions
let modalCallback = null;

function showModal(title, defaultValue, callback) {
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modalTitle');
    const programNameInput = document.getElementById('programName');

    modalTitle.textContent = title;
    programNameInput.value = defaultValue;
    modalCallback = callback;

    modal.style.display = 'flex';
    setTimeout(() => programNameInput.focus(), 100);
}

function hideModal() {
    document.getElementById('modal').style.display = 'none';
    modalCallback = null;
}

function saveModal() {
    const programNameInput = document.getElementById('programName');
    const name = programNameInput.value.trim();

    if (modalCallback && name) {
        modalCallback(name);
        hideModal();
    } else if (!name) {
        alert('Please enter a program name');
    }
}

// Utility function
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOMContentLoaded - starting initialization');
    console.log('roadmapDB available:', typeof roadmapDB !== 'undefined');

    // Initialize SQLite database
    const initialized = await roadmapDB.initialize();
    console.log('Database initialized:', initialized);

    if (!initialized) {
        alert('Failed to initialize database. Please refresh the page.');
        return;
    }

    // Render roadmaps list
    await renderRoadmapsList();
    console.log('Roadmaps list rendered');

    // Event listeners
    document.getElementById('createNewBtn').addEventListener('click', createNewRoadmap);
    document.getElementById('importDbBtn').addEventListener('click', importDatabase);
    document.getElementById('modalSave').addEventListener('click', saveModal);
    document.getElementById('modalCancel').addEventListener('click', hideModal);

    // Enter key in modal
    document.getElementById('programName').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            saveModal();
        }
    });

    // Close modal on outside click
    document.getElementById('modal').addEventListener('click', (e) => {
        if (e.target.id === 'modal') {
            hideModal();
        }
    });
});
