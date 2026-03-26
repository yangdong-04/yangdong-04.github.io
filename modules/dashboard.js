// 仪表盘模块

// 引入日历组件（非模块化方式，直接初始化）
let calendarModule = null;
let dashboardTaskFilter = 'all'; // 今日任务过滤

// 更新日历显示
function updateCalendarDisplay() {
    // 如果使用组件日历
    if (typeof window.renderCalendar === 'function') {
        window.renderCalendar();
    } else {
        // 否则使用手动日历
        manualInitCalendar();
    }
}

// 动态加载日历组件
async function loadCalendarComponent() {
    try {
        // 先尝试加载组件
        const script = document.createElement('script');
        script.src = './components/calendar.js';
        script.type = 'module';
        document.head.appendChild(script);
        
        // 等待一下让组件加载
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // 直接初始化日历
        if (typeof initCalendar !== 'undefined') {
            initCalendar();
        } else {
            // 降级方案：手动初始化
            manualInitCalendar();
        }
        
        return { initCalendar: manualInitCalendar, getSelectedDate: getSelectedDateFromCalendar };
    } catch (e) {
        console.error('加载日历组件失败:', e);
        // 降级方案
        manualInitCalendar();
        return null;
    }
}

// 检查某天是否有未完成的任务（用于手动日历）
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
                const repeatFrequency = task.repeatFrequency || (task.dailyRepeat ? 'daily' : 'none');
                const completedDates = task.completedDates || [];
                
                if (repeatFrequency !== 'none') {
                    // 重复任务：检查日期是否是截止日期之一，且该日期未完成
                    const dueDates = getRepeatingTaskDueDatesForDashboard(task, project.startDate, project.endDate);
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

// 手动初始化日历（降级方案）
function manualInitCalendar() {
    const grid = document.getElementById('calendar-grid');
    const monthLabel = document.getElementById('current-month');
    if (!grid || !monthLabel) return;

    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();

    monthLabel.textContent = `${year}年${month + 1}月`;

    let html = '';
    const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
    weekDays.forEach(day => {
        html += `<div class="text-center text-sm text-white/50 font-semibold py-2">${day}</div>`;
    });

    for (let i = 0; i < firstDay; i++) {
        html += `<div class="calendar-day other-month text-white/30"></div>`;
    }

    const todayStr = utils.formatDate(today);
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dateStr = utils.formatDate(date);
        const isToday = dateStr === todayStr;
        const taskInfo = checkDateHasTasks(dateStr);

        let classes = 'calendar-day';
        if (isToday) classes += ' today';
        if (taskInfo.hasAnyTask) classes += ' has-task';
        if (taskInfo.hasDeadline) classes += ' has-deadline';
        if (taskInfo.hasCustomRepeat) classes += ' has-custom-repeat';
        if (taskInfo.hasDailyRepeat) classes += ' has-daily-repeat';
        
        html += `<div class="${classes}" data-date="${dateStr}">${day}</div>`;
    }

    grid.innerHTML = html;

    grid.querySelectorAll('.calendar-day:not(.other-month)').forEach(day => {
        day.addEventListener('click', () => {
            const dateStr = day.dataset.date;
            if (dateStr) {
                document.querySelectorAll('.calendar-day').forEach(d => d.classList.remove('selected'));
                day.classList.add('selected');
                window.currentSelectedDate = dateStr;
                renderTaskList(dateStr);
            }
        });
    });

    const prevBtn = document.getElementById('prev-month');
    const nextBtn = document.getElementById('next-month');
    if (prevBtn) prevBtn.style.opacity = '0.5';
    if (nextBtn) nextBtn.style.opacity = '0.5';
}

// 为仪表盘计算重复任务的截止日期列表
function getRepeatingTaskDueDatesForDashboard(task, projectStartDate, projectEndDate) {
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

// 获取某一天的所有任务
function getTasksForDate(dateStr) {
    const tasks = [];
    const projects = appState.get('projects') || [];
    const goals = appState.get('goals') || [];
    const tempTasks = appState.get('tempTasks') || {};

    // 临时任务
    if (tempTasks[dateStr]) {
        tempTasks[dateStr].forEach(task => {
            tasks.push({
                ...task,
                source: '临时任务',
                sourceType: 'temp'
            });
        });
    }

    // 项目任务
    projects.forEach(project => {
        if (project.subTasks) {
            project.subTasks.forEach(task => {
                let shouldShow = false;
                
                // 兼容旧数据
                const repeatFrequency = task.repeatFrequency || (task.dailyRepeat ? 'daily' : 'none');
                
                if (repeatFrequency !== 'none') {
                    // 重复任务：检查日期是否是截止日期之一
                    const dueDates = getRepeatingTaskDueDatesForDashboard(task, project.startDate, project.endDate);
                    shouldShow = dueDates.includes(dateStr);
                } else if (task.dueDate === dateStr || task.date === dateStr) {
                    shouldShow = true;
                }

                if (shouldShow) {
                    // 检查是否已完成
                    const completedDates = task.completedDates || [];
                    const isCompleted = completedDates.includes(dateStr);

                    tasks.push({
                        id: task.id,
                        text: task.name,
                        source: `项目: ${project.name}`,
                        sourceType: 'project',
                        projectId: project.id,
                        taskId: task.id,
                        completed: isCompleted,
                        completedDates: completedDates,
                        repeatFrequency: repeatFrequency
                    });
                }
            });
        }
    });

    // 目标小目标
    goals.forEach(goal => {
        if (goal.phases) {
            goal.phases.forEach(phase => {
                if (phase.tasks) {
                    phase.tasks.forEach(task => {
                        if (task.dueDate === dateStr) {
                            tasks.push({
                                id: task.id,
                                text: task.name,
                                source: `目标: ${goal.name}`,
                                sourceType: 'goal',
                                goalId: goal.id,
                                phaseId: phase.id,
                                taskId: task.id,
                                completed: task.completed || false
                            });
                        }
                    });
                }
            });
        }
    });

    return tasks;
}

// 渲染任务列表
function renderTaskList(dateStr) {
    const container = document.getElementById('task-list');
    const titleEl = document.getElementById('task-date-title');
    if (!container) return;

    const today = utils.formatDate(new Date());
    const isToday = dateStr === today;
    
    titleEl.textContent = isToday ? '今日任务' : `${dateStr} 任务`;

    let tasks = getTasksForDate(dateStr);

    // 根据过滤条件筛选
    if (dashboardTaskFilter === 'active') {
        tasks = tasks.filter(task => !task.completed);
    } else if (dashboardTaskFilter === 'completed') {
        tasks = tasks.filter(task => task.completed);
    }

    // 过滤按钮始终显示，不管有没有任务
    let html = `
        <!-- 任务过滤按钮 -->
        <div class="flex items-center gap-2 mb-4 pb-3 border-b border-white/10">
            <div class="flex bg-white/10 rounded-lg p-1">
                <button class="dashboard-task-filter px-3 py-1 rounded-md text-sm transition-all ${dashboardTaskFilter === 'all' ? 'bg-purple-500 text-white' : 'text-white/60 hover:text-white'}" 
                        data-filter="all">全部</button>
                <button class="dashboard-task-filter px-3 py-1 rounded-md text-sm transition-all ${dashboardTaskFilter === 'active' ? 'bg-purple-500 text-white' : 'text-white/60 hover:text-white'}" 
                        data-filter="active">未完成</button>
                <button class="dashboard-task-filter px-3 py-1 rounded-md text-sm transition-all ${dashboardTaskFilter === 'completed' ? 'bg-purple-500 text-white' : 'text-white/60 hover:text-white'}" 
                        data-filter="completed">已完成</button>
            </div>
        </div>
    `;

    if (tasks.length === 0) {
        html += `
            <div class="text-center py-8 text-white/50">
                <i class="fas fa-check-circle text-4xl mb-4"></i>
                <p>没有匹配的任务</p>
            </div>
        `;
    } else {
        html += tasks.map(task => `
            <div class="task-item flex items-start gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 ${task.completed ? 'completed' : ''}">
                <input type="checkbox" class="checkbox-custom mt-1 flex-shrink-0" 
                       ${task.completed ? 'checked' : ''}
                       data-task='${JSON.stringify(task)}'>
                <div class="flex-1 min-w-0">
                    <p class="task-text font-medium">${task.text}</p>
                    <p class="text-xs text-white/50 mt-1">${task.source}</p>
                </div>
                ${task.sourceType === 'temp' ? `
                    <button class="delete-temp-task p-1 text-white/30 hover:text-red-400 transition-colors" 
                            data-date="${dateStr}" data-id="${task.id}">
                        <i class="fas fa-trash text-sm"></i>
                    </button>
                ` : ''}
            </div>
        `).join('');
    }

    container.innerHTML = html;

    // 绑定复选框事件
    container.querySelectorAll('.checkbox-custom').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const task = JSON.parse(e.target.dataset.task);
            toggleTaskComplete(task, dateStr, e.target.checked, e.target);
        });
    });

    // 绑定删除临时任务事件
    container.querySelectorAll('.delete-temp-task').forEach(btn => {
        btn.addEventListener('click', () => {
            const date = btn.dataset.date;
            const id = btn.dataset.id;
            deleteTempTask(date, id);
        });
    });
}

// 切换任务完成状态
function toggleTaskComplete(task, dateStr, completed, checkboxElement) {
    // 添加完成动画
    if (checkboxElement && completed) {
        const taskItem = checkboxElement.closest('.task-item');
        if (taskItem) {
            taskItem.classList.add('completing');
        }
    }

    if (task.sourceType === 'temp') {
        // 临时任务
        const tempTasks = appState.get('tempTasks') || {};
        if (tempTasks[dateStr]) {
            const taskIndex = tempTasks[dateStr].findIndex(t => t.id === task.id);
            if (taskIndex !== -1) {
                tempTasks[dateStr][taskIndex].completed = completed;
                if (completed) {
                    tempTasks[dateStr][taskIndex].completedAt = new Date().toISOString();
                }
                appState.set('tempTasks', tempTasks);
            }
        }
    } else if (task.sourceType === 'project') {
        // 项目任务
        const projects = appState.get('projects') || [];
        const project = projects.find(p => p.id === task.projectId);
        if (project && project.subTasks) {
            const subTask = project.subTasks.find(t => t.id === task.taskId);
            if (subTask) {
                const repeatFrequency = subTask.repeatFrequency || (subTask.dailyRepeat ? 'daily' : 'none');
                
                if (repeatFrequency !== 'none') {
                    // 重复任务：更新completedDates数组
                    if (!subTask.completedDates) subTask.completedDates = [];
                    if (completed) {
                        if (!subTask.completedDates.includes(dateStr)) {
                            subTask.completedDates.push(dateStr);
                            subTask.completedAt = new Date().toISOString();
                        }
                    } else {
                        subTask.completedDates = subTask.completedDates.filter(d => d !== dateStr);
                    }
                } else {
                    // 单次任务：更新completed字段
                    subTask.completed = completed;
                    if (completed) {
                        subTask.completedAt = new Date().toISOString();
                    }
                }
                appState.set('projects', projects);
            }
        }
    } else if (task.sourceType === 'goal') {
        // 目标任务
        const goals = appState.get('goals') || [];
        const goal = goals.find(g => g.id === task.goalId);
        if (goal && goal.phases) {
            const phase = goal.phases.find(p => p.id === task.phaseId);
            if (phase && phase.tasks) {
                const goalTask = phase.tasks.find(t => t.id === task.taskId);
                if (goalTask) {
                    goalTask.completed = completed;
                    if (completed) {
                        goalTask.completedAt = new Date().toISOString();
                    }
                    appState.set('goals', goals);
                }
            }
        }
    }

    // 显示 Toast 提示
    if (completed) {
        Toast.success('任务完成！🎉');
    }

    renderTaskList(dateStr);
    updateCalendarDisplay();
}

// 添加临时任务
function showAddTempTaskModal(dateStr) {
    Modal.show(`
        <div class="p-6">
            <h3 class="text-xl font-bold mb-6">添加临时任务</h3>
            <div class="space-y-4">
                <div>
                    <label class="block text-sm text-white/70 mb-2">任务内容</label>
                    <input type="text" id="temp-task-text" placeholder="输入任务内容..."
                           class="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-400 transition-colors">
                </div>
                <div class="flex gap-3 pt-4">
                    <button id="cancel-add-temp" class="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors">
                        取消
                    </button>
                    <button id="confirm-add-temp" class="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 font-semibold hover:opacity-90 transition-opacity">
                        添加
                    </button>
                </div>
            </div>
        </div>
    `);

    document.getElementById('cancel-add-temp').addEventListener('click', Modal.hide);
    document.getElementById('confirm-add-temp').addEventListener('click', () => {
        const text = document.getElementById('temp-task-text').value.trim();
        if (text) {
            addTempTask(dateStr, text);
            Modal.hide();
        }
    });
}

// 添加临时任务
function addTempTask(dateStr, text) {
    const tempTasks = appState.get('tempTasks') || {};
    if (!tempTasks[dateStr]) tempTasks[dateStr] = [];
    
    tempTasks[dateStr].push({
        id: utils.generateId(),
        text: text,
        completed: false,
        createdAt: new Date().toISOString()
    });
    
    appState.set('tempTasks', tempTasks);
    renderTaskList(dateStr);
    updateCalendarDisplay();
}

// 删除临时任务
function deleteTempTask(dateStr, taskId) {
    const tempTasks = appState.get('tempTasks') || {};
    if (tempTasks[dateStr]) {
        tempTasks[dateStr] = tempTasks[dateStr].filter(t => t.id !== taskId);
        appState.set('tempTasks', tempTasks);
        renderTaskList(dateStr);
        updateCalendarDisplay();
    }
}

// 初始化仪表盘
async function initDashboard() {
    // 加载日历组件
    await loadCalendarComponent();

    // 渲染今天的任务
    const today = utils.formatDate(new Date());
    renderTaskList(today);

    // 监听日期选择
    window.addEventListener('dateSelected', (e) => {
        window.currentSelectedDate = e.detail.date;
        renderTaskList(e.detail.date);
    });

    // 绑定添加临时任务按钮
    const addBtn = document.getElementById('add-temp-task');
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            // 动态获取当前选中的日期
            const selectedDate = getSelectedDateFromCalendar();
            showAddTempTaskModal(selectedDate);
        });
    }

    // 绑定任务过滤按钮事件（事件委托）
    document.addEventListener('click', (e) => {
        const filterBtn = e.target.closest('.dashboard-task-filter');
        if (filterBtn) {
            dashboardTaskFilter = filterBtn.dataset.filter;
            const selectedDate = getSelectedDateFromCalendar();
            renderTaskList(selectedDate);
        }
    });
}

// 从日历组件获取选中日期
function getSelectedDateFromCalendar() {
    return window.currentSelectedDate || utils.formatDate(new Date());
}

// 监听页面加载
window.addEventListener('pageLoaded', (e) => {
    if (e.detail.page === 'dashboard') {
        const today = utils.formatDate(new Date());
        renderTaskList(today);
    }
});

// 页面加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDashboard);
} else {
    setTimeout(initDashboard, 500);
}

// 暴露全局函数
window.initDashboard = initDashboard;
window.renderTaskList = renderTaskList;
window.updateCalendarDisplay = updateCalendarDisplay;
