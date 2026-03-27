# Team Collaboration via Shared Network Drive

## Setup Guide

### Step 1: Choose Your Shared Drive
- **Dropbox**
- **Google Drive**
- **OneDrive**
- **Box**
- **Company network drive**

### Step 2: Create Shared Folder Structure
```
RoadmapDatabase/
├── roadmap-data.sqlite          ← Main database file
├── backups/                      ← Optional: daily backups
│   ├── roadmap-data-2024-03-24.sqlite
│   └── roadmap-data-2024-03-23.sqlite
└── README.txt                    ← Instructions for team
```

### Step 3: Export Your Database
1. Open the roadmap app: `file:///Users/i053963/projects/roadmap-generator/index.html`
2. Click **"Export Database"** button
3. Save file as: `roadmap-data.sqlite`
4. Move to shared folder: `YourSharedDrive/RoadmapDatabase/roadmap-data.sqlite`

### Step 4: Share with Team

#### For Team Members (First Time):
1. Go to shared folder
2. Download `roadmap-data.sqlite`
3. Open roadmap app in browser
4. Click **"Import Database"**
5. Select the downloaded `.sqlite` file
6. ✅ You can now see all roadmaps!

#### For Daily Use:
1. Before making changes: Download latest `.sqlite` from shared drive
2. Import into your app
3. Make your changes
4. Export updated `.sqlite`
5. Upload to shared drive (overwrite old file)

## Workflow Examples

### Morning Workflow (Before Making Changes)
```
1. Check shared drive for latest database
2. Download roadmap-data.sqlite
3. Import into app
4. Now you have latest team updates
```

### End of Day (After Making Changes)
```
1. Export database from app
2. Save as roadmap-data.sqlite
3. Upload to shared drive
4. Optional: Backup old version first
```

### Conflict Prevention
```
Before uploading:
1. Check file timestamp on shared drive
2. If newer than your last download → someone else updated
3. Download their version first
4. Merge changes manually or coordinate with teammate
```

## Best Practices

### 1. Communication Protocol
**Use Slack/Teams to coordinate:**
```
You: "Updating roadmaps for 10 mins, please wait"
     [Make changes]
     [Export and upload]
You: "✅ Done, latest DB uploaded"
```

### 2. Daily Backups
```
Script/Manual:
- Copy roadmap-data.sqlite
- Rename: roadmap-data-2024-03-24.sqlite
- Keep in backups/ folder
- Keeps last 7 days
```

### 3. Version Naming Convention
```
Instead of always "roadmap-data.sqlite":

roadmap-data-v1.0.sqlite
roadmap-data-v1.1.sqlite
roadmap-data-latest.sqlite  ← Always current
```

### 4. Lock File Pattern
Create a simple lock file when editing:
```
1. Create empty file: roadmap-data.LOCK
2. Make your changes
3. Export database
4. Upload new database
5. Delete roadmap-data.LOCK
```

Team checks for .LOCK file before downloading.

## Automated Sync Options

### Option A: Sync Tool Script
If shared drive has desktop sync (Dropbox, Google Drive, OneDrive):

1. **Database file location**: Store in synced folder
2. **Auto-sync**: Drive app syncs automatically
3. **App imports from**: Local synced folder path

**Setup:**
- Export to: `~/Dropbox/RoadmapDatabase/roadmap-data.sqlite`
- Import from: Same location
- Drive syncs automatically

### Option B: Browser Auto-Export
Add auto-export on every save:

```javascript
// In script.js - after saveCurrentRoadmap()
async function autoExport() {
    await roadmapDB.exportToFile();
    // File downloads to Downloads folder
    // Manually move to shared drive
}
```

## Team README Template

Create `README.txt` in shared folder:

```txt
ROADMAP DATABASE - TEAM GUIDE
==============================

Database File: roadmap-data.sqlite
App Location: [your-app-url or file path]

HOW TO GET STARTED:
1. Download roadmap-data.sqlite
2. Open the roadmap app
3. Click "Import Database"
4. Select the downloaded file
5. You can now view/edit all roadmaps

HOW TO UPDATE:
1. Download latest roadmap-data.sqlite FIRST
2. Import into app
3. Make your changes
4. Click "Export Database"
5. Upload to replace old file
6. Post in Slack: "Updated roadmap DB"

RULES:
- Always download latest before making changes
- Post in #roadmap channel when uploading
- Don't edit simultaneously with teammates
- Check file timestamp before downloading

BACKUP:
Old versions kept in backups/ folder (7 days)

SUPPORT:
Contact: [your-name/email]
```

## Comparison: File Sharing vs Firebase

| Feature | Shared Drive Files | Firebase Cloud |
|---------|-------------------|----------------|
| **Setup time** | 5 minutes | 30 minutes |
| **Team sees changes** | When they import | Instantly |
| **Conflicts** | Manual coordination | Automatic merge |
| **Internet required** | Only for sync | Always |
| **Cost** | Free (existing drive) | Free (small usage) |
| **Privacy** | Your drive account | Google servers |
| **Backup** | Manual file copies | Automatic |
| **Best for** | 2-5 person teams | Larger teams |

## Troubleshooting

### Someone uploaded while I was editing?
```
Your changes:   A → B → C
Their upload:   A → B → X

Solution:
1. Export your version (save as roadmap-mine.sqlite)
2. Import their version
3. Manually re-apply your changes
4. Export and upload
```

### Database import fails?
- Check file isn't corrupted
- Try re-downloading from shared drive
- Use backup from yesterday

### Multiple versions confusion?
- Use version numbers in filename
- Always keep "roadmap-data-latest.sqlite"
- Delete old versions after 7 days

---

## Quick Start Checklist

- [ ] Create shared folder structure
- [ ] Export your current database
- [ ] Upload to shared drive
- [ ] Create README.txt with instructions
- [ ] Share folder with team
- [ ] Send team the app URL/path
- [ ] Test: Have teammate import database
- [ ] Set up Slack/Teams notification protocol

**With this workflow, your team can collaborate using the shared database file!**
