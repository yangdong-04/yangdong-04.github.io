// 日历组件

let currentDate = new Date();
let selectedDate = new Date();

// 获取月份的天数
function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
}

// 获取月份第一天是星期几
function getFirstDayOfMonth(year, month) {
    return new Date(year, month, 1).getDay();
}

// 渲染日历
function renderCalendar() {
    const grid = document.getElementById('calendar-grid');
    const monthLabel = document.getElementById('current-month');
    if (!grid || !monthLabel) return;

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // 更新月份标签
    monthLabel.textContent = `${year}年${month + 1}月`;

    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const daysInPrevMonth = getDaysInMonth(year, month - 1);

    const today = new Date();
    const todayStr = utils.formatDate(today);
    const selectedStr = utils.formatDate(selectedDate);

    let html = '';

    // 星期标题
    const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
    weekDays.forEach(day => {
        html += `<div class="text-center text-sm text-white/50 font-semibold py-2">${day}</div>`;
    });

    // 上个月的天数
    for (let i = firstDay - 1; i >= 0; i--) {
        const day = daysInPrevMonth - i;
        html += `<div class="calendar-day other-month text-white/30">${day}</div>`;
    }

    // 当月的天数
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dateStr = utils.formatDate(date);
        const isToday = dateStr === todayStr;
        const isSelected = dateStr === selectedStr;
        const taskInfo = checkDateHasTasks(dateStr);

        let classes = 'calendar-day';
        if (isToday) classes += ' today';
        if (isSelected) classes += ' selected';
        if (taskInfo.hasAnyTask) classes += ' has-task';
        if (taskInfo.hasDeadline) classes += ' has-deadline';
        if (taskInfo.hasCustomRepeat) classes += ' has-custom-repeat';
        if (taskInfo.hasDailyRepeat) classes += ' has-daily-repeat';

        html += `<div class="${classes}" data-date="${dateStr}">${day}</div>`;
    }

    // 下个月的天数
    const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
    const remainingCells = totalCells - (firstDay + daysInMonth);
    for (let day = 1; day <= remainingCells; day++) {
        html += `<div class="calendar-day other-month text-white/30">${day}</div>`;
    }

    grid.innerHTML = html;

    // 绑定日期点击事件
    grid.querySelectorAll('.calendar-day:not(.other-month)').forEach(day => {
        day.addEventListener('click', () => {
            const dateStr = day.dataset.date;
            if (dateStr) {
                selectedDate = new Date(dateStr);
                window.currentSelectedDate = dateStr;
                renderCalendar();
                window.dispatchEvent(new CustomEvent('dateSelected', { detail: { date: dateStr } }));
            }
        });
    });
}

// 检查某天是否有未完成的任务，区分任务类型
function checkDateHasTasks(dateStr) {
    const projects = appState.get('projects') || [];
    const goals = appState.get('goals') || [];
    const tempTasks = appState.get('tempTasks') || {};

    let hasAnyTask = false;
    let hasDeadline = false;
    let hasDailyRepeat = false;
    let hasCustomRepeat = false;

    // 检查临时任务 - 只有存在未完成的临时任务才显示
    const dayTempTasks = tempTasks[dateStr] || [];
    const hasUncompletedTempTasks = dayTempTasks.some(task => !task.completed);
    if (hasUncompletedTempTasks) {
        hasAnyTask = true;
    }

    // 检查项目任务
    for (const project of projects) {
        if (project.subTasks) {
            for (const task of project.subTasks) {
                // 兼容旧数据
                const repeatFrequency = task.repeatFrequency || (task.dailyRepeat ? 'daily' : 'none');
                const completedDates = task.completedDates || [];
                
                if (repeatFrequency !== 'none') {
                    // 重复任务：检查日期是否是截止日期之一，且该日期未完成
                    const dueDates = getRepeatingTaskDueDatesForCalendar(task, project.startDate, project.endDate);
                    if (dueDates.includes(dateStr) && !completedDates.includes(dateStr)) {
                        hasAnyTask = true;
                        // 区分每日重复和非每日重复
                        if (repeatFrequency === 'daily') {
                            hasDailyRepeat = true;
                        } else {
                            hasCustomRepeat = true;
                        }
                    }
                } else if ((task.dueDate === dateStr || task.date === dateStr) && task.completed !== true) {
                    // 非重复性任务 - 这是截止日期且未完成
                    hasAnyTask = true;
                    hasDeadline = true;
                }
            }
        }
    }

    // 检查目标小目标（这些都是有截止日期的）
    for (const goal of goals) {
        if (goal.phases) {
            for (const phase of goal.phases) {
                if (phase.tasks) {
                    for (const task of phase.tasks) {
                        if (task.dueDate === dateStr && task.completed !== true) {
                            hasAnyTask = true;
                            hasDeadline = true;
                        }
                    }
                }
            }
        }
    }

    return { hasAnyTask, hasDeadline, hasDailyRepeat, hasCustomRepeat };
}

// 为日历计算重复任务的截止日期列表
function getRepeatingTaskDueDatesForCalendar(task, projectStartDate, projectEndDate) {
    const dueDates = [];
    const repeatFrequency = task.repeatFrequency || (task.dailyRepeat ? 'daily' : 'none');
    if (repeatFrequency === 'none') {
        // 非重复任务，直接返回dueDate（如果有）
        if (task.dueDate) {
            dueDates.push(task.dueDate);
        } else if (task.date) {
            dueDates.push(task.date);
        }
        return dueDates;
    }

    // 解析重复频率
    let intervalDays = 1;
    if (repeatFrequency === 'daily') {
        intervalDays = 1;
    } else if (repeatFrequency === 'weekly') {
        intervalDays = 7;
    } else if (repeatFrequency.startsWith('every')) {
        // 格式：every2days, every3days
        const match = repeatFrequency.match(/every(\d+)days?/);
        if (match) {
            intervalDays = parseInt(match[1]);
        }
    }

    // 开始日期：优先使用任务的创建日期，否则使用dueDate，否则使用项目开始日期
    let startDateStr = task.createdAt ? task.createdAt.split('T')[0] : (task.dueDate || projectStartDate);
    const startDate = new Date(startDateStr);
    const endDate = new Date(projectEndDate);
    
    // 重复结束日期：优先使用任务的repeatEndDate，否则使用项目结束日期
    const repeatEndDateStr = task.repeatEndDate || projectEndDate;
    const repeatEndDate = new Date(repeatEndDateStr);
    const finalEndDate = repeatEndDate < endDate ? repeatEndDate : endDate;

    // 生成截止日期列表
    let currentDate = new Date(startDate);
    while (currentDate <= finalEndDate) {
        const dateStr = utils.formatDate(currentDate);
        dueDates.push(dateStr);
        currentDate.setDate(currentDate.getDate() + intervalDays);
    }

    return dueDates;
}

// 获取选中的日期
function getSelectedDate() {
    return utils.formatDate(selectedDate);
}

// 初始化日历
function initCalendar() {
    renderCalendar();

    // 绑定月份切换按钮
    const prevBtn = document.getElementById('prev-month');
    const nextBtn = document.getElementById('next-month');

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            currentDate.setMonth(currentDate.getMonth() - 1);
            renderCalendar();
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            currentDate.setMonth(currentDate.getMonth() + 1);
            renderCalendar();
        });
    }
}

// 监听日期选择事件
window.addEventListener('dateSelected', (e) => {
    // 可以在这里处理日期选择
});

// 暴露全局函数
window.initCalendar = initCalendar;
window.renderCalendar = renderCalendar;
window.getSelectedDate = getSelectedDate;
