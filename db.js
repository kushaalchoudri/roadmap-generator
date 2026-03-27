/**
 * SQLite Database Layer for Roadmap Generator
 * Uses SQL.js - SQLite compiled to JavaScript for browser usage
 * Data is stored in .sqlite files that can be downloaded/uploaded
 */

class RoadmapDatabase {
    constructor() {
        this.db = null;
        this.SQL = null;
        this.dbFileName = 'roadmap-data.sqlite';
    }

    /**
     * Initialize SQL.js and create/load database
     */
    async initialize() {
        try {
            // Load SQL.js library
            if (typeof initSqlJs === 'undefined') {
                await this.loadSqlJsLibrary();
            }

            // Initialize SQL.js
            this.SQL = await initSqlJs({
                locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
            });

            // Try to load existing database from localStorage
            const savedDb = localStorage.getItem('sqliteDb');
            if (savedDb) {
                const uint8Array = this.base64ToUint8Array(savedDb);
                this.db = new this.SQL.Database(uint8Array);
                console.log('Loaded existing SQLite database from localStorage');
            } else {
                // Create new database
                this.db = new this.SQL.Database();
                await this.createTables();
                console.log('Created new SQLite database');
            }

            return true;
        } catch (error) {
            console.error('Failed to initialize SQLite:', error);
            return false;
        }
    }

    /**
     * Load SQL.js library from CDN
     */
    loadSqlJsLibrary() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/sql-wasm.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    /**
     * Create database tables
     */
    async createTables() {
        // Roadmaps table
        this.db.run(`
            CREATE TABLE IF NOT EXISTS roadmaps (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        `);

        // Items table (activities and milestones)
        this.db.run(`
            CREATE TABLE IF NOT EXISTS items (
                id TEXT PRIMARY KEY,
                roadmap_id TEXT NOT NULL,
                type TEXT NOT NULL CHECK(type IN ('activity', 'milestone')),
                workstream TEXT,
                name TEXT NOT NULL,
                start_date TEXT,
                end_date TEXT,
                date TEXT,
                status TEXT CHECK(status IN ('not-started', 'in-progress', 'at-risk', 'completed')),
                description TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (roadmap_id) REFERENCES roadmaps(id) ON DELETE CASCADE
            )
        `);

        // Workstream order table
        this.db.run(`
            CREATE TABLE IF NOT EXISTS workstream_order (
                roadmap_id TEXT NOT NULL,
                workstream TEXT NOT NULL,
                order_index INTEGER NOT NULL,
                PRIMARY KEY (roadmap_id, workstream),
                FOREIGN KEY (roadmap_id) REFERENCES roadmaps(id) ON DELETE CASCADE
            )
        `);

        this.saveToLocalStorage();
    }

    /**
     * Save database to localStorage
     */
    saveToLocalStorage() {
        if (!this.db) return;
        const data = this.db.export();
        const base64 = this.uint8ArrayToBase64(data);
        localStorage.setItem('sqliteDb', base64);
    }

    /**
     * Export database to downloadable file
     */
    async exportToFile() {
        if (!this.db) {
            throw new Error('Database not initialized');
        }

        const data = this.db.export();
        const blob = new Blob([data], { type: 'application/x-sqlite3' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = this.dbFileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Import database from file
     */
    async importFromFile(file) {
        return new Promise((resolve, reject) => {
            console.log('Starting import of file:', file.name, 'type:', file.type, 'size:', file.size);

            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    console.log('File read successfully, size:', e.target.result.byteLength, 'bytes');
                    const uint8Array = new Uint8Array(e.target.result);
                    console.log('Created Uint8Array, length:', uint8Array.length);

                    // Close existing database if open
                    if (this.db) {
                        this.db.close();
                    }

                    this.db = new this.SQL.Database(uint8Array);
                    console.log('Database loaded successfully');

                    // Run migration to fix orphaned items
                    const migrated = await this.migrateOrphanedItems();
                    if (migrated > 0) {
                        console.log(`Migration: Created ${migrated} missing roadmap records`);
                    }

                    this.saveToLocalStorage();
                    console.log('Database saved to localStorage');

                    resolve(true);
                } catch (error) {
                    console.error('Error during import:', error);
                    reject(error);
                }
            };
            reader.onerror = (error) => {
                console.error('FileReader error:', error);
                reject(error);
            };
            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * Create a new roadmap
     */
    async createRoadmap(name) {
        const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
        const now = new Date().toISOString();

        this.db.run(
            'INSERT INTO roadmaps (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)',
            [id, name, now, now]
        );

        this.saveToLocalStorage();
        return { id, name, created_at: now, updated_at: now };
    }

    /**
     * Get all roadmaps
     */
    async getAllRoadmaps() {
        const result = this.db.exec('SELECT * FROM roadmaps ORDER BY updated_at DESC');
        if (result.length === 0) return [];

        const roadmaps = [];
        const columns = result[0].columns;
        result[0].values.forEach(row => {
            const roadmap = {};
            columns.forEach((col, idx) => {
                roadmap[col] = row[idx];
            });
            roadmaps.push(roadmap);
        });

        return roadmaps;
    }

    /**
     * Get roadmap by ID
     */
    async getRoadmap(id) {
        const result = this.db.exec('SELECT * FROM roadmaps WHERE id = ?', [id]);
        if (result.length === 0 || result[0].values.length === 0) return null;

        const roadmap = {};
        result[0].columns.forEach((col, idx) => {
            roadmap[col] = result[0].values[0][idx];
        });

        return roadmap;
    }

    /**
     * Update roadmap name
     */
    async updateRoadmap(id, name) {
        const now = new Date().toISOString();
        this.db.run(
            'UPDATE roadmaps SET name = ?, updated_at = ? WHERE id = ?',
            [name, now, id]
        );
        this.saveToLocalStorage();
    }

    /**
     * Delete roadmap and all its items
     */
    async deleteRoadmap(id) {
        this.db.run('DELETE FROM items WHERE roadmap_id = ?', [id]);
        this.db.run('DELETE FROM workstream_order WHERE roadmap_id = ?', [id]);
        this.db.run('DELETE FROM roadmaps WHERE id = ?', [id]);
        this.saveToLocalStorage();
    }

    /**
     * Get all items for a roadmap
     */
    async getRoadmapItems(roadmapId) {
        const result = this.db.exec('SELECT * FROM items WHERE roadmap_id = ? ORDER BY workstream, name', [roadmapId]);
        if (result.length === 0) return [];

        const items = [];
        const columns = result[0].columns;
        result[0].values.forEach(row => {
            const item = {};
            columns.forEach((col, idx) => {
                item[col] = row[idx];
            });
            // Convert date strings back to the format used by the app
            if (item.start_date) item.startDate = item.start_date;
            if (item.end_date) item.endDate = item.end_date;
            items.push(item);
        });

        return items;
    }

    /**
     * Save an item (activity or milestone)
     */
    async saveItem(roadmapId, item) {
        const now = new Date().toISOString();

        // Check if item exists
        const exists = this.db.exec('SELECT id FROM items WHERE id = ?', [item.id.toString()]);

        if (exists.length > 0 && exists[0].values.length > 0) {
            // Update existing item
            this.db.run(`
                UPDATE items SET
                    type = ?,
                    workstream = ?,
                    name = ?,
                    start_date = ?,
                    end_date = ?,
                    date = ?,
                    status = ?,
                    description = ?
                WHERE id = ?
            `, [
                item.type,
                item.workstream || null,
                item.name,
                item.startDate || null,
                item.endDate || null,
                item.date || null,
                item.status || 'not-started',
                item.description || '',
                item.id.toString()
            ]);
        } else {
            // Insert new item
            this.db.run(`
                INSERT INTO items (
                    id, roadmap_id, type, workstream, name,
                    start_date, end_date, date, status, description, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                item.id.toString(),
                roadmapId,
                item.type,
                item.workstream || null,
                item.name,
                item.startDate || null,
                item.endDate || null,
                item.date || null,
                item.status || 'not-started',
                item.description || '',
                now
            ]);
        }

        this.saveToLocalStorage();
    }

    /**
     * Save multiple items at once
     */
    async saveItems(roadmapId, items) {
        for (const item of items) {
            await this.saveItem(roadmapId, item);
        }
        // Update roadmap's updated_at timestamp
        const now = new Date().toISOString();
        this.db.run('UPDATE roadmaps SET updated_at = ? WHERE id = ?', [now, roadmapId]);
        this.saveToLocalStorage();
    }

    /**
     * Delete an item
     */
    async deleteItem(itemId) {
        this.db.run('DELETE FROM items WHERE id = ?', [itemId.toString()]);
        this.saveToLocalStorage();
    }

    /**
     * Save workstream order
     */
    async saveWorkstreamOrder(roadmapId, orderMap) {
        // Delete existing order
        this.db.run('DELETE FROM workstream_order WHERE roadmap_id = ?', [roadmapId]);

        // Insert new order
        for (const [workstream, order] of Object.entries(orderMap)) {
            this.db.run(
                'INSERT INTO workstream_order (roadmap_id, workstream, order_index) VALUES (?, ?, ?)',
                [roadmapId, workstream, order]
            );
        }

        this.saveToLocalStorage();
    }

    /**
     * Get workstream order
     */
    async getWorkstreamOrder(roadmapId) {
        const result = this.db.exec(
            'SELECT workstream, order_index FROM workstream_order WHERE roadmap_id = ? ORDER BY order_index',
            [roadmapId]
        );

        if (result.length === 0) return {};

        const orderMap = {};
        result[0].values.forEach(row => {
            orderMap[row[0]] = row[1];
        });

        return orderMap;
    }

    /**
     * Clear all data (for testing)
     */
    async clearAllData() {
        this.db.run('DELETE FROM items');
        this.db.run('DELETE FROM workstream_order');
        this.db.run('DELETE FROM roadmaps');
        this.saveToLocalStorage();
    }

    /**
     * Execute raw SQL query (for advanced usage)
     */
    async query(sql, params = []) {
        return this.db.exec(sql, params);
    }

    /**
     * Utility: Convert Uint8Array to base64
     */
    uint8ArrayToBase64(uint8Array) {
        let binary = '';
        const len = uint8Array.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(uint8Array[i]);
        }
        return btoa(binary);
    }

    /**
     * Utility: Convert base64 to Uint8Array
     */
    base64ToUint8Array(base64) {
        const binary = atob(base64);
        const len = binary.length;
        const uint8Array = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            uint8Array[i] = binary.charCodeAt(i);
        }
        return uint8Array;
    }

    /**
     * Get database statistics
     */
    async getStats() {
        const roadmapsResult = this.db.exec('SELECT COUNT(*) as count FROM roadmaps');
        const itemsResult = this.db.exec('SELECT COUNT(*) as count FROM items');

        return {
            roadmaps: roadmapsResult[0]?.values[0]?.[0] || 0,
            items: itemsResult[0]?.values[0]?.[0] || 0,
            size: this.db.export().length
        };
    }

    /**
     * Migrate orphaned items to create missing roadmap records
     */
    async migrateOrphanedItems() {
        try {
            // Find all unique roadmap_ids in items table
            const result = this.db.exec('SELECT DISTINCT roadmap_id FROM items');
            if (result.length === 0) return 0;

            let created = 0;
            const roadmapIds = result[0].values.map(row => row[0]);

            for (const roadmapId of roadmapIds) {
                // Check if roadmap record exists
                const roadmapExists = this.db.exec('SELECT id FROM roadmaps WHERE id = ?', [roadmapId]);

                if (roadmapExists.length === 0 || roadmapExists[0].values.length === 0) {
                    // Create missing roadmap record
                    const now = new Date().toISOString();
                    const name = `Roadmap ${roadmapId}`; // Default name

                    this.db.run(
                        'INSERT INTO roadmaps (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)',
                        [roadmapId, name, now, now]
                    );

                    console.log(`Created missing roadmap record for ID: ${roadmapId}`);
                    created++;
                }
            }

            if (created > 0) {
                this.saveToLocalStorage();
                console.log(`Migration complete: created ${created} roadmap records`);
            }

            return created;
        } catch (error) {
            console.error('Error during migration:', error);
            return 0;
        }
    }
}

// Global database instance
const roadmapDB = new RoadmapDatabase();
