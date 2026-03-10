// Load all saved roadmaps
function loadRoadmaps() {
    const roadmapsData = localStorage.getItem('allRoadmaps');
    return roadmapsData ? JSON.parse(roadmapsData) : {};
}

// Save all roadmaps
function saveRoadmaps(roadmaps) {
    localStorage.setItem('allRoadmaps', JSON.stringify(roadmaps));
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
function renderRoadmapsList() {
    const roadmaps = loadRoadmaps();
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
function createNewRoadmap() {
    showModal('Create New Roadmap', '', (name) => {
        if (!name.trim()) {
            alert('Please enter a program name');
            return;
        }

        const roadmaps = loadRoadmaps();
        const id = Date.now().toString();

        roadmaps[id] = {
            name: name.trim(),
            items: [],
            created: Date.now(),
            lastModified: Date.now()
        };

        saveRoadmaps(roadmaps);
        setCurrentRoadmapId(id);
        window.location.href = `index.html?id=${id}`;
    });
}

// Open existing roadmap
function openRoadmap(id) {
    setCurrentRoadmapId(id);
    window.location.href = `index.html?id=${id}`;
}

// Rename roadmap
function renameRoadmap(id) {
    const roadmaps = loadRoadmaps();
    const roadmap = roadmaps[id];

    if (!roadmap) return;

    showModal('Rename Roadmap', roadmap.name, (newName) => {
        if (!newName.trim()) {
            alert('Please enter a program name');
            return;
        }

        roadmap.name = newName.trim();
        roadmap.lastModified = Date.now();
        saveRoadmaps(roadmaps);
        renderRoadmapsList();
    });
}

// Delete roadmap
function deleteRoadmap(id) {
    const roadmaps = loadRoadmaps();
    const roadmap = roadmaps[id];

    if (!roadmap) return;

    if (confirm(`Are you sure you want to delete "${roadmap.name}"? This cannot be undone.`)) {
        delete roadmaps[id];
        saveRoadmaps(roadmaps);

        // Clear current roadmap if it's the one being deleted
        if (getCurrentRoadmapId() === id) {
            localStorage.removeItem('currentRoadmapId');
        }

        renderRoadmapsList();
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
document.addEventListener('DOMContentLoaded', () => {
    renderRoadmapsList();

    // Event listeners
    document.getElementById('createNewBtn').addEventListener('click', createNewRoadmap);
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
