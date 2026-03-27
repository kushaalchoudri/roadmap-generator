/**
 * Migration script to integrate SQLite database into existing roadmap application
 * This modifies the existing script.js functions to use SQLite instead of localStorage/Firebase
 */

// Add this to index.html before script.js:
// <script src="https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/sql-wasm.js"></script>
// <script src="db.js"></script>

/**
 * Modified initialization function
 */
async function initializeApp() {
    // Initialize SQLite database
    const dbInitialized = await roadmapDB.initialize();

    if (!dbInitialized) {
        console.warn('SQLite initialization failed, falling back to localStorage');
        // Keep existing localStorage logic as fallback
    } else {
        console.log('SQLite database initialized successfully');

        // Show database stats
        const stats = await roadmapDB.getStats();
        console.log('Database stats:', stats);
    }

    // Continue with existing initialization
    currentRoadmapId = getRoadmapIdFromUrl();
    if (currentRoadmapId) {
        await loadRoadmap(currentRoadmapId);
    }

    appInitialized = true;
}

/**
 * Modified loadAllRoadmaps function
 */
async function loadAllRoadmaps() {
    try {
        const roadmaps = await roadmapDB.getAllRoadmaps();
        return roadmaps;
    } catch (error) {
        console.error('Error loading roadmaps from SQLite:', error);
        // Fallback to localStorage
        return JSON.parse(localStorage.getItem('roadmaps') || '[]');
    }
}

/**
 * Modified loadRoadmap function
 */
async function loadRoadmap(roadmapId) {
    try {
        // Load roadmap metadata
        const roadmap = await roadmapDB.getRoadmap(roadmapId);
        if (!roadmap) {
            console.error('Roadmap not found:', roadmapId);
            return false;
        }

        // Load roadmap items
        roadmapItems = await roadmapDB.getRoadmapItems(roadmapId);

        // Load workstream order
        workstreamOrder = await roadmapDB.getWorkstreamOrder(roadmapId);

        console.log('Loaded roadmap from SQLite:', roadmap.name);
        console.log('Items loaded:', roadmapItems.length);

        return true;
    } catch (error) {
        console.error('Error loading roadmap from SQLite:', error);
        return false;
    }
}

/**
 * Modified saveCurrentRoadmap function
 */
async function saveCurrentRoadmap() {
    if (!currentRoadmapId) {
        console.error('No roadmap ID set');
        return;
    }

    try {
        // Save all items
        await roadmapDB.saveItems(currentRoadmapId, roadmapItems);

        // Save workstream order
        if (Object.keys(workstreamOrder).length > 0) {
            await roadmapDB.saveWorkstreamOrder(currentRoadmapId, workstreamOrder);
        }

        console.log('Roadmap saved to SQLite');
    } catch (error) {
        console.error('Error saving to SQLite:', error);
        throw error;
    }
}

/**
 * Modified createNewRoadmap function
 */
async function createNewRoadmap(name) {
    try {
        const roadmap = await roadmapDB.createRoadmap(name);
        return roadmap;
    } catch (error) {
        console.error('Error creating roadmap in SQLite:', error);
        throw error;
    }
}

/**
 * Modified deleteRoadmap function
 */
async function deleteRoadmap(roadmapId) {
    try {
        await roadmapDB.deleteRoadmap(roadmapId);
        console.log('Roadmap deleted from SQLite');
    } catch (error) {
        console.error('Error deleting roadmap from SQLite:', error);
        throw error;
    }
}

/**
 * New: Export database to file
 */
async function exportDatabase() {
    try {
        await roadmapDB.exportToFile();
        alert('Database exported successfully!');
    } catch (error) {
        console.error('Error exporting database:', error);
        alert('Error exporting database. Please try again.');
    }
}

/**
 * New: Import database from file
 */
async function importDatabase() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.sqlite,.db';

    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            await roadmapDB.importFromFile(file);
            alert('Database imported successfully! Reloading...');
            window.location.reload();
        } catch (error) {
            console.error('Error importing database:', error);
            alert('Error importing database. Please ensure it is a valid SQLite file.');
        }
    };

    input.click();
}

/**
 * Migration utility: Convert localStorage data to SQLite
 */
async function migrateLocalStorageToSQLite() {
    try {
        console.log('Starting migration from localStorage to SQLite...');

        // Get all roadmaps from localStorage
        const roadmaps = JSON.parse(localStorage.getItem('roadmaps') || '[]');

        if (roadmaps.length === 0) {
            console.log('No roadmaps found in localStorage');
            return;
        }

        // Migrate each roadmap
        for (const roadmap of roadmaps) {
            // Create roadmap in SQLite
            const newRoadmap = await roadmapDB.createRoadmap(roadmap.name);

            // Migrate items
            if (roadmap.items && roadmap.items.length > 0) {
                await roadmapDB.saveItems(newRoadmap.id, roadmap.items);
            }

            console.log(`Migrated roadmap: ${roadmap.name} (${roadmap.items?.length || 0} items)`);
        }

        console.log('Migration completed!');
        alert(`Successfully migrated ${roadmaps.length} roadmap(s) to SQLite!`);

    } catch (error) {
        console.error('Migration error:', error);
        alert('Error during migration. Check console for details.');
    }
}
