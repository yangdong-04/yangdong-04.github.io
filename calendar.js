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
        const hasTask = checkHasTask(dateStr);

        let classes = 'calendar-day';
        if (isToday) classes += ' today';
        if (isSelected) classes += ' selected';
        if (hasTask) classes += ' has-task';

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
                renderCalendar();
                window.dispatchEvent(new CustomEvent('dateSelected', { detail: { date: dateStr } }));
            }
        });
    });
}

// 检查某天是否有任务
function checkHasTask(dateStr) {
    const projects = appState.get('projects') || [];
    const goals = appState.get('goals') || [];
    const tempTasks = appState.get('tempTasks') || {};

    // 检查临时任务
    if (tempTasks[dateStr]?.length > 0) return true;

    // 检查项目任务
    for (const project of projects) {
        if (project.subTasks) {
            for (const task of project.subTasks) {
                if (task.dailyRepeat) {
                    // 检查日期是否在项目时间范围内
                    if (dateStr >= project.startDate && dateStr <= project.endDate) {
                        return true;
                    }
                } else if (task.date === dateStr) {
                    return true;
                }
            }
        }
    }

    // 检查目标小目标
    for (const goal of goals) {
        if (goal.phases) {
            for (const phase of goal.phases) {
                if (phase.tasks) {
                    for (const task of phase.tasks) {
                        if (task.dueDate === dateStr) {
                            return true;
                        }
                    }
                }
            }
        }
    }

    return false;
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
