# Project Roadmap Generator

A web-based tool to create and manage visual project timelines with multiple workstreams, activities, and milestones.

## 🌐 Live Application

**Access the app here:** [https://kushaalchoudri.github.io/roadmap-generator/home.html](https://kushaalchoudri.github.io/roadmap-generator/home.html)

## 🎯 Getting Started

### Local Development
Open `home.html` in your browser to begin!

### Shared Database (Team Collaboration)
To enable team-wide shared roadmaps, set up Firebase by following the [Firebase Setup Guide](FIREBASE_SETUP.md).

**Without Firebase:** Roadmaps are saved locally in your browser (only you can see them)
**With Firebase:** All team members see the same roadmaps and can collaborate in real-time!

## ✨ Key Features

### 📁 Multi-Roadmap Management
- Create and manage multiple project roadmaps
- Home dashboard to view all your roadmaps
- Save and load different programs
- Rename and delete roadmaps

### 📊 Interactive Timeline
- Visual Gantt-style timeline
- Color-coded activity bars by status:
  - 🔵 **Blue**: Completed
  - 🟢 **Green**: In Progress
  - 🔴 **Red**: At Risk
  - ⚪ **Grey**: Not Started
- Activities show name and date range on the bar
- Workstream names in colored boxes on the left
- Milestones displayed as orange diamonds with dates

### 🎨 Easy to Use
- Intuitive form to add activities and milestones
- Workstream autocomplete from previous entries
- Status tracking for each activity
- Download timeline as PNG image
- All data saved automatically in browser

## 🚀 How to Use

1. **Open** `home.html` in your browser
2. **Click** "Create New Roadmap"
3. **Enter** a program name (e.g., "Product Launch 2024")
4. **Add** activities and milestones
5. **Click** "Save Roadmap" to save your work
6. **Use** "Back to Home" to manage multiple roadmaps

## 📱 Browser Support

Works great in Chrome, Safari, Firefox, and Edge!

## 💾 Data Storage

All data is stored locally in your browser using LocalStorage. No server required, completely private.

## 📄 License

Free to use and modify for personal and commercial projects.
