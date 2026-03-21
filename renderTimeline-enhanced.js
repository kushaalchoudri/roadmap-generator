// Enhanced renderTimeline function with drag-and-drop, view modes, today marker, and smart positioning

function renderTimeline() {
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
    if (today >= minDate && today <= maxDate) {
        const todayDays = Math.ceil((today - minDate) / (1000 * 60 * 60 * 24));
        const todayLeft = todayDays * pixelsPerDay;
        gridLinesHtml += `<div class="today-marker" style="left: ${todayLeft}px;"></div>`;
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

            // Calculate text width estimates (approximate)
            const textPadding = 120; // Extra space for start/end dates and label
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
