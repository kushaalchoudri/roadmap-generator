# SQLite Database Integration for Roadmap Generator

## Overview

This integration adds a file-based SQLite database to the Roadmap Generator application, replacing localStorage and Firebase with a more robust, exportable database solution.

## Features

✅ **File-based storage** - Data stored in SQLite database files (.sqlite)
✅ **Export/Import** - Download and upload database files
✅ **Cross-platform** - Works in any modern browser
✅ **No server required** - Runs entirely in the browser using SQL.js
✅ **Backward compatible** - Falls back to localStorage if SQLite fails
✅ **Migration tool** - Convert existing localStorage data to SQLite

## Architecture

### Components

1. **db.js** - Database layer with RoadmapDatabase class
2. **db-integration.js** - Integration functions to replace existing code
3. **SQL.js** - SQLite compiled to WebAssembly (loaded from CDN)

### Database Schema

```sql
-- Roadmaps table
CREATE TABLE roadmaps (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Items table (activities and milestones)
CREATE TABLE items (
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
);

-- Workstream order table
CREATE TABLE workstream_order (
    roadmap_id TEXT NOT NULL,
    workstream TEXT NOT NULL,
    order_index INTEGER NOT NULL,
    PRIMARY KEY (roadmap_id, workstream),
    FOREIGN KEY (roadmap_id) REFERENCES roadmaps(id) ON DELETE CASCADE
);
```

## Installation

### Step 1: Add SQL.js Library

Update `index.html` to include the SQL.js library BEFORE your script.js:

```html
<head>
    <!-- Existing head content -->

    <!-- SQLite for browser (SQL.js) -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/sql-wasm.js"></script>

    <!-- Database layer -->
    <script src="db.js"></script>

    <!-- Main application script -->
    <script src="script.js?v=xxx"></script>
</head>
```

### Step 2: Update script.js

Replace the following functions in `script.js` with the versions from `db-integration.js`:

1. **initializeApp()** - Add SQLite initialization
2. **loadAllRoadmaps()** - Use `roadmapDB.getAllRoadmaps()`
3. **loadRoadmap()** - Use `roadmapDB.getRoadmap()` and `roadmapDB.getRoadmapItems()`
4. **saveCurrentRoadmap()** - Use `roadmapDB.saveItems()`
5. **createNewRoadmap()** - Use `roadmapDB.createRoadmap()`
6. **deleteRoadmap()** - Use `roadmapDB.deleteRoadmap()`

### Step 3: Add Export/Import Buttons

Add these buttons to your UI (in `index.html`):

```html
<div class="database-controls">
    <button id="exportDbBtn" class="btn btn-secondary">Export Database</button>
    <button id="importDbBtn" class="btn btn-secondary">Import Database</button>
    <button id="migrateBtn" class="btn btn-warning">Migrate from localStorage</button>
</div>
```

Then add event listeners in `script.js`:

```javascript
// Export database button
document.getElementById('exportDbBtn').addEventListener('click', exportDatabase);

// Import database button
document.getElementById('importDbBtn').addEventListener('click', importDatabase);

// Migration button
document.getElementById('migrateBtn').addEventListener('click', migrateLocalStorageToSQLite);
```

## Usage

### Export Database
```javascript
// Click "Export Database" button
// Downloads: roadmap-data.sqlite file
```

### Import Database
```javascript
// Click "Import Database" button
// Select a .sqlite file
// All data is loaded from the file
```

### Migrate Existing Data
```javascript
// Click "Migrate from localStorage" button
// Converts all localStorage roadmaps to SQLite
// Original localStorage data is preserved
```

## API Reference

### RoadmapDatabase Class

#### `async initialize()`
Initialize the database. Call this before any other operations.

#### `async createRoadmap(name)`
Create a new roadmap.
- **Returns**: `{ id, name, created_at, updated_at }`

#### `async getAllRoadmaps()`
Get all roadmaps, sorted by updated_at DESC.
- **Returns**: Array of roadmap objects

#### `async getRoadmap(id)`
Get a specific roadmap by ID.
- **Returns**: Roadmap object or null

#### `async updateRoadmap(id, name)`
Update roadmap name.

#### `async deleteRoadmap(id)`
Delete roadmap and all its items.

#### `async getRoadmapItems(roadmapId)`
Get all items for a roadmap.
- **Returns**: Array of item objects

#### `async saveItem(roadmapId, item)`
Save a single item (insert or update).

#### `async saveItems(roadmapId, items)`
Save multiple items at once.

#### `async deleteItem(itemId)`
Delete an item.

#### `async saveWorkstreamOrder(roadmapId, orderMap)`
Save workstream ordering.

#### `async getWorkstreamOrder(roadmapId)`
Get workstream ordering.
- **Returns**: Object mapping workstream names to order indices

#### `async exportToFile()`
Export database to downloadable .sqlite file.

#### `async importFromFile(file)`
Import database from a .sqlite file.

#### `async clearAllData()`
Delete all data (useful for testing).

#### `async query(sql, params)`
Execute raw SQL query.

## Benefits Over localStorage

| Feature | localStorage | SQLite |
|---------|--------------|--------|
| **Size limit** | ~5-10 MB | Unlimited (browser storage) |
| **Data structure** | JSON strings | Relational tables |
| **Queries** | Manual filtering | SQL queries |
| **Relationships** | Manual | Foreign keys |
| **Export** | JSON files | .sqlite files |
| **Portability** | JSON format | Universal database format |
| **Integrity** | None | Constraints, transactions |
| **Performance** | O(n) scans | Indexed queries |

## Benefits Over Firebase

| Feature | Firebase | SQLite |
|---------|----------|--------|
| **Offline** | Requires connection | Always works |
| **Privacy** | Data on Google servers | Data stays local |
| **Cost** | Paid plans for scale | Free |
| **Setup** | Requires configuration | Zero configuration |
| **Export** | Complex | Simple file download |
| **Backup** | Requires tools | Copy .sqlite file |

## File Format

The exported `.sqlite` files are standard SQLite 3 database files that can be:
- Opened with any SQLite viewer (DB Browser for SQLite, DBeaver, etc.)
- Queried with sqlite3 command line
- Imported into other applications
- Backed up by copying the file
- Shared with team members

## Migration from Existing Data

If you have existing data in localStorage or Firebase:

1. Click **"Migrate from localStorage"** button
2. Script will:
   - Read all roadmaps from localStorage
   - Convert to SQLite format
   - Save to new SQLite database
   - Preserve original localStorage data
3. Verify data migrated correctly
4. Export SQLite database as backup

## Advanced Usage

### Custom Queries

```javascript
// Get all in-progress activities
const result = await roadmapDB.query(`
    SELECT * FROM items
    WHERE type = 'activity'
    AND status = 'in-progress'
    ORDER BY start_date
`);

// Get roadmaps created in last 30 days
const recent = await roadmapDB.query(`
    SELECT * FROM roadmaps
    WHERE created_at > datetime('now', '-30 days')
`);

// Get workstream statistics
const stats = await roadmapDB.query(`
    SELECT workstream, COUNT(*) as count
    FROM items
    WHERE roadmap_id = ?
    GROUP BY workstream
`, [roadmapId]);
```

### Backup Automation

```javascript
// Auto-export every hour
setInterval(async () => {
    await roadmapDB.exportToFile();
}, 3600000);
```

### Database Inspection

```javascript
// View all tables
const tables = await roadmapDB.query(`
    SELECT name FROM sqlite_master WHERE type='table'
`);

// View table schema
const schema = await roadmapDB.query(`
    SELECT sql FROM sqlite_master WHERE name='items'
`);
```

## Troubleshooting

### Database not loading?
- Check browser console for errors
- Ensure SQL.js library loaded successfully
- Clear browser cache and reload

### Data not saving?
- Check console for SQL errors
- Verify roadmap ID is set
- Check localStorage quota (may be full)

### Import fails?
- Ensure file is valid SQLite database
- Check file was exported from this app
- Try with a fresh export

### Performance issues?
- Export database and check file size
- Consider archiving old roadmaps
- Use SQL queries to filter data

## Development

### Testing

```javascript
// Create test data
const roadmap = await roadmapDB.createRoadmap('Test Roadmap');
await roadmapDB.saveItem(roadmap.id, {
    id: Date.now(),
    type: 'activity',
    name: 'Test Activity',
    workstream: 'Development',
    startDate: '2024-01-01',
    endDate: '2024-01-15',
    status: 'not-started',
    description: 'Test description'
});

// Verify
const items = await roadmapDB.getRoadmapItems(roadmap.id);
console.log('Items:', items);
```

### Debugging

```javascript
// Enable SQL.js debug mode
const SQL = await initSqlJs({
    locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
});

// Check database stats
const stats = await roadmapDB.getStats();
console.log('Database stats:', stats);

// View raw database
const db = roadmapDB.db;
const allData = db.exec('SELECT * FROM roadmaps');
console.log('All roadmaps:', allData);
```

## Next Steps

1. ✅ Add database files (db.js, db-integration.js)
2. ⬜ Update index.html to include SQL.js and db.js
3. ⬜ Replace functions in script.js with SQLite versions
4. ⬜ Add export/import buttons to UI
5. ⬜ Test with existing data
6. ⬜ Run migration tool
7. ⬜ Test export/import functionality
8. ⬜ Document for users

## Support

For issues or questions:
- Check browser console for error messages
- Verify SQL.js is loading correctly
- Test with a fresh database
- Check file permissions for export/import

---

**SQLite integration provides robust, portable, file-based data storage for your roadmaps!**
