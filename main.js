// 入口文件 - 统一管理所有模块

// Toast 组件
class Toast {
    static container = null;

    static init() {
        this.container = document.getElementById('toast-container');
    }

    static show(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-times-circle',
            warning: 'fa-exclamation-circle',
            info: 'fa-info-circle'
        };
        
        toast.innerHTML = `
            <i class="fas ${icons[type]}"></i>
            <span>${message}</span>
        `;
        
        this.container.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('hiding');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    static success(message) {
        this.show(message, 'success');
    }

    static error(message) {
        this.show(message, 'error');
    }

    static warning(message) {
        this.show(message, 'warning');
    }

    static info(message) {
        this.show(message, 'info');
    }
}

// 主题管理器
class ThemeManager {
    static themes = [
        { id: 'dark', name: '深色主题', icon: 'fa-moon' },
        { id: 'light', name: '浅色主题', icon: 'fa-sun' },
        { id: 'ocean', name: '海洋主题', icon: 'fa-water' },
        { id: 'forest', name: '森林主题', icon: 'fa-tree' }
    ];

    static currentTheme = 'dark';

    static init() {
        const saved = localStorage.getItem('taskManagerTheme') || 'dark';
        this.setTheme(saved);
        
        document.getElementById('theme-toggle').addEventListener('click', () => {
            this.showThemePicker();
        });
    }

    static setTheme(themeId) {
        document.body.classList.remove('theme-light', 'theme-ocean', 'theme-forest');
        if (themeId !== 'dark') {
            document.body.classList.add(`theme-${themeId}`);
        }
        this.currentTheme = themeId;
        localStorage.setItem('taskManagerTheme', themeId);
    }

    static showThemePicker() {
        const content = `
            <div class="p-6">
                <h2 class="text-2xl font-bold mb-6">选择主题</h2>
                <div class="space-y-3">
                    ${this.themes.map(theme => `
                        <button class="theme-option w-full flex items-center gap-4 p-4 rounded-xl border border-white/20 ${theme.id === this.currentTheme ? 'selected' : ''}" 
                                data-theme="${theme.id}">
                            <i class="fas ${theme.icon} text-xl"></i>
                            <span class="text-lg">${theme.name}</span>
                            ${theme.id === this.currentTheme ? '<i class="fas fa-check ml-auto text-purple-400"></i>' : ''}
                        </button>
                    `).join('')}
                </div>
                <div class="mt-6 flex justify-end">
                    <button onclick="Modal.hide()" class="px-6 py-3 bg-white/10 rounded-xl hover:bg-white/20 transition-colors">
                        关闭
                    </button>
                </div>
            </div>
        `;
        
        Modal.show(content);
        
        document.querySelectorAll('.theme-option').forEach(btn => {
            btn.addEventListener('click', () => {
                const themeId = btn.dataset.theme;
                this.setTheme(themeId);
                Toast.success(`已切换到${this.themes.find(t => t.id === themeId).name}`);
                Modal.hide();
            });
        });
    }
}

// 数据备份与恢复管理器
class BackupManager {
    static init() {
        document.getElementById('backup-data').addEventListener('click', () => this.showBackupOptions());
        document.getElementById('restore-data').addEventListener('click', () => {
            document.getElementById('restore-input').click();
        });
        document.getElementById('restore-input').addEventListener('change', (e) => this.restoreData(e));
    }

    static showBackupOptions() {
        const content = `
            <div class="p-6">
                <h2 class="text-2xl font-bold mb-6">备份数据</h2>
                <p class="text-white/60 mb-6">选择要备份的数据类型：</p>
                <div class="space-y-3">
                    <label class="backup-option flex items-center gap-4 p-4 rounded-xl border border-white/20 cursor-pointer">
                        <input type="checkbox" id="backup-all" class="checkbox-custom" checked>
                        <span class="text-lg">全部数据</span>
                    </label>
                    <label class="backup-option flex items-center gap-4 p-4 rounded-xl border border-white/20 cursor-pointer">
                        <input type="checkbox" class="backup-item checkbox-custom" data-type="user" checked>
                        <span class="text-lg">用户信息</span>
                    </label>
                    <label class="backup-option flex items-center gap-4 p-4 rounded-xl border border-white/20 cursor-pointer">
                        <input type="checkbox" class="backup-item checkbox-custom" data-type="projects" checked>
                        <span class="text-lg">项目数据</span>
                    </label>
                    <label class="backup-option flex items-center gap-4 p-4 rounded-xl border border-white/20 cursor-pointer">
                        <input type="checkbox" class="backup-item checkbox-custom" data-type="goals" checked>
                        <span class="text-lg">长期目标</span>
                    </label>
                    <label class="backup-option flex items-center gap-4 p-4 rounded-xl border border-white/20 cursor-pointer">
                        <input type="checkbox" class="backup-item checkbox-custom" data-type="moods" checked>
                        <span class="text-lg">心情记录</span>
                    </label>
                    <label class="backup-option flex items-center gap-4 p-4 rounded-xl border border-white/20 cursor-pointer">
                        <input type="checkbox" class="backup-item checkbox-custom" data-type="tempTasks" checked>
                        <span class="text-lg">临时任务</span>
                    </label>
                </div>
                <div class="mt-6 flex gap-3 justify-end">
                    <button onclick="Modal.hide()" class="px-6 py-3 bg-white/10 rounded-xl hover:bg-white/20 transition-colors">
                        取消
                    </button>
                    <button id="confirm-backup" class="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl hover:opacity-90 transition-opacity">
                        开始备份
                    </button>
                </div>
            </div>
        `;
        
        Modal.show(content);
        
        const backupAll = document.getElementById('backup-all');
        const backupItems = document.querySelectorAll('.backup-item');
        
        backupAll.addEventListener('change', () => {
            backupItems.forEach(item => item.checked = backupAll.checked);
        });
        
        backupItems.forEach(item => {
            item.addEventListener('change', () => {
                backupAll.checked = Array.from(backupItems).every(i => i.checked);
            });
        });
        
        document.getElementById('confirm-backup').addEventListener('click', () => {
            const types = backupAll.checked 
                ? ['user', 'projects', 'goals', 'moods', 'tempTasks']
                : Array.from(backupItems).filter(i => i.checked).map(i => i.dataset.type);
            
            this.backupData(types);
            Modal.hide();
        });
    }

    static backupData(types) {
        const data = {};
        types.forEach(type => {
            data[type] = appState.get(type);
        });
        
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `task-manager-backup-${timestamp}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        Toast.success('数据备份成功！');
    }

    static restoreData(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                Modal.show(`
                    <div class="p-6">
                        <h2 class="text-2xl font-bold mb-6">确认恢复</h2>
                        <p class="text-white/60 mb-4">以下数据将被恢复：</p>
                        <ul class="space-y-2 mb-6">
                            ${Object.keys(data).map(key => `
                                <li class="flex items-center gap-2">
                                    <i class="fas fa-check text-green-400"></i>
                                    <span>${this.getTypeLabel(key)}</span>
                                </li>
                            `).join('')}
                        </ul>
                        <p class="text-yellow-400 mb-6">
                            <i class="fas fa-exclamation-triangle"></i>
                            警告：这将覆盖现有数据！
                        </p>
                        <div class="flex gap-3 justify-end">
                            <button onclick="Modal.hide()" class="px-6 py-3 bg-white/10 rounded-xl hover:bg-white/20 transition-colors">
                                取消
                            </button>
                            <button id="confirm-restore" class="px-6 py-3 bg-gradient-to-r from-red-500 to-orange-500 rounded-xl hover:opacity-90 transition-opacity">
                                确认恢复
                            </button>
                        </div>
                    </div>
                `);
                
                document.getElementById('confirm-restore').addEventListener('click', () => {
                    Object.keys(data).forEach(key => {
                        appState.set(key, data[key]);
                    });
                    Modal.hide();
                    Toast.success('数据恢复成功！');
                    window.dispatchEvent(new CustomEvent('dataRestored'));
                });
                
            } catch (error) {
                Toast.error('备份文件格式错误！');
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    }

    static getTypeLabel(type) {
        const labels = {
            user: '用户信息',
            projects: '项目数据',
            goals: '长期目标',
            moods: '心情记录',
            tempTasks: '临时任务'
        };
        return labels[type] || type;
    }
}

// 全局状态管理器
class AppState {
    constructor() {
        this.data = this.load();
        this.listeners = new Set();
    }

    // 从 LocalStorage 加载数据
    load() {
        const defaults = {
            user: { avatar: null, nickname: '' },
            projects: [],
            goals: [],
            moods: [],
            tempTasks: {},
            lastQuoteDate: null,
            currentQuote: null
        };

        try {
            const stored = localStorage.getItem('taskManagerData');
            return stored ? { ...defaults, ...JSON.parse(stored) } : defaults;
        } catch (e) {
            console.error('加载数据失败:', e);
            return defaults;
        }
    }

    // 保存数据到 LocalStorage
    save() {
        try {
            localStorage.setItem('taskManagerData', JSON.stringify(this.data));
            this.notify();
        } catch (e) {
            console.error('保存数据失败:', e);
        }
    }

    // 通知监听器
    notify() {
        this.listeners.forEach(fn => fn(this.data));
    }

    // 订阅数据变化
    subscribe(fn) {
        this.listeners.add(fn);
        return () => this.listeners.delete(fn);
    }

    // 获取数据
    get(path) {
        return path.split('.').reduce((obj, key) => obj?.[key], this.data);
    }

    // 设置数据
    set(path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((obj, key) => {
            if (!obj[key]) obj[key] = {};
            return obj[key];
        }, this.data);
        target[lastKey] = value;
        this.save();
    }
}

// 全局状态实例
const appState = new AppState();

// 页面路由管理器
class Router {
    constructor() {
        this.currentPage = 'dashboard';
        this.init();
    }

    init() {
        // 绑定导航按钮
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const page = btn.dataset.page;
                if (page) this.navigate(page);
            });
        });
    }

    navigate(page, params = {}) {
        // 隐藏所有页面
        document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));

        // 显示目标页面
        const targetPage = document.getElementById(`page-${page}`);
        if (targetPage) {
            targetPage.classList.remove('hidden');
            this.currentPage = page;

            // 更新导航按钮状态
            document.querySelectorAll('.nav-btn').forEach(btn => {
                btn.classList.remove('active', 'bg-purple-500/20', 'text-purple-300');
                btn.classList.add('text-white/60');
                if (btn.dataset.page === page || 
                    (page === 'project-detail' && btn.dataset.page === 'project') ||
                    (page === 'goal-detail' && btn.dataset.page === 'goal')) {
                    btn.classList.add('active', 'bg-purple-500/20', 'text-purple-300');
                    btn.classList.remove('text-white/60');
                }
            });

            // 触发页面加载事件
            window.dispatchEvent(new CustomEvent('pageLoaded', { detail: { page, params } }));
        }
    }
}

// 全局路由实例
const router = new Router();

// 模态框管理器
class Modal {
    static show(content) {
        const container = document.getElementById('modal-container');
        const contentEl = document.getElementById('modal-content');
        contentEl.innerHTML = content;
        container.classList.remove('hidden');
    }

    static hide() {
        const container = document.getElementById('modal-container');
        container.classList.add('hidden');
    }

    static init() {
        document.getElementById('modal-overlay').addEventListener('click', () => Modal.hide());
    }
}

// 数据统计管理器
class StatsManager {
    static moodChart = null;
    static isOnDashboard = false;

    static init() {
        window.addEventListener('pageLoaded', (e) => {
            if (e.detail.page === 'dashboard') {
                this.isOnDashboard = true;
                this.updateStats();
            } else {
                this.isOnDashboard = false;
            }
        });

        // 订阅数据变化，实时更新统计
        appState.subscribe(() => {
            if (this.isOnDashboard) {
                this.updateStats();
            }
        });

        // 数据恢复时也更新
        window.addEventListener('dataRestored', () => {
            if (this.isOnDashboard) {
                this.updateStats();
            }
        });
    }

    static updateStats() {
        this.updateWeeklyTasks();
        this.updateProjectsProgress();
        this.updateMoodChart();
    }

    static updateWeeklyTasks() {
        const now = new Date();
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        weekStart.setHours(0, 0, 0, 0);

        let completedCount = 0;

        // 检查项目任务
        const projects = appState.get('projects') || [];
        projects.forEach(project => {
            (project.tasks || []).forEach(task => {
                if (task.completed && task.completedAt && new Date(task.completedAt) >= weekStart) {
                    completedCount++;
                }
            });
        });

        // 检查目标小目标
        const goals = appState.get('goals') || [];
        goals.forEach(goal => {
            (goal.phases || []).forEach(phase => {
                (phase.tasks || []).forEach(task => {
                    if (task.completed && task.completedAt && new Date(task.completedAt) >= weekStart) {
                        completedCount++;
                    }
                });
            });
        });

        // 检查临时任务
        const tempTasks = appState.get('tempTasks') || {};
        Object.values(tempTasks).forEach(tasks => {
            tasks.forEach(task => {
                if (task.completed && task.completedAt && new Date(task.completedAt) >= weekStart) {
                    completedCount++;
                }
            });
        });

        document.getElementById('weekly-tasks-count').textContent = completedCount;
    }

    static updateProjectsProgress() {
        const projects = appState.get('projects') || [];
        if (projects.length === 0) {
            document.getElementById('projects-progress').textContent = '0%';
            document.getElementById('projects-progress-bar').style.width = '0%';
            return;
        }

        let totalTasks = 0;
        let completedTasks = 0;

        projects.forEach(project => {
            (project.tasks || []).forEach(task => {
                totalTasks++;
                if (task.completed) completedTasks++;
            });
        });

        const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        document.getElementById('projects-progress').textContent = progress + '%';
        document.getElementById('projects-progress-bar').style.width = progress + '%';
    }

    static updateMoodChart() {
        const ctx = document.getElementById('mood-chart');
        if (!ctx) return;

        const moods = appState.get('moods') || [];
        const last7Days = [];
        const moodCounts = {};

        // 最近7天
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = this.formatDate(date);
            last7Days.push(dateStr);
            moodCounts[dateStr] = { happy: 0, neutral: 0, sad: 0 };
        }

        // 统计心情
        moods.forEach(mood => {
            const dateStr = this.formatDate(mood.date);
            if (moodCounts[dateStr]) {
                if (mood.mood.includes('开心') || mood.mood.includes('😊') || mood.mood.includes('😄')) {
                    moodCounts[dateStr].happy++;
                } else if (mood.mood.includes('难过') || mood.mood.includes('😢') || mood.mood.includes('😞')) {
                    moodCounts[dateStr].sad++;
                } else {
                    moodCounts[dateStr].neutral++;
                }
            }
        });

        const chartData = {
            labels: last7Days.map(d => d.slice(5)),
            datasets: [
                {
                    label: '开心',
                    data: last7Days.map(d => moodCounts[d].happy),
                    borderColor: '#22c55e',
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: '平静',
                    data: last7Days.map(d => moodCounts[d].neutral),
                    borderColor: '#8b5cf6',
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: '难过',
                    data: last7Days.map(d => moodCounts[d].sad),
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    tension: 0.4,
                    fill: true
                }
            ]
        };

        const chartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 300
            },
            plugins: {
                legend: {
                    labels: { color: 'rgba(255, 255, 255, 0.6)' }
                }
            },
            scales: {
                x: {
                    ticks: { color: 'rgba(255, 255, 255, 0.6)' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                y: {
                    ticks: { color: 'rgba(255, 255, 255, 0.6)' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    beginAtZero: true
                }
            }
        };

        // 如果图表已存在，更新数据而不是重建
        if (this.moodChart) {
            this.moodChart.data = chartData;
            this.moodChart.options = chartOptions;
            this.moodChart.update('none'); // 无动画更新
        } else {
            this.moodChart = new Chart(ctx, {
                type: 'line',
                data: chartData,
                options: chartOptions
            });
        }
    }

    static formatDate(date) {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
}

// 拖拽排序管理器
class DragSortManager {
    static init() {
        window.addEventListener('pageLoaded', (e) => {
            if (e.detail.page === 'project') {
                setTimeout(() => this.initProjectSort(), 100);
            } else if (e.detail.page === 'goal') {
                setTimeout(() => this.initGoalSort(), 100);
            }
        });
    }

    static initProjectSort() {
        const list = document.getElementById('project-list');
        if (!list || !window.Sortable) return;

        new window.Sortable(list, {
            animation: 150,
            ghostClass: 'sortable-ghost',
            chosenClass: 'sortable-chosen',
            dragClass: 'sortable-drag',
            handle: '.drag-handle',
            onEnd: (evt) => {
                const projects = appState.get('projects') || [];
                const [movedItem] = projects.splice(evt.oldIndex, 1);
                projects.splice(evt.newIndex, 0, movedItem);
                appState.set('projects', projects);
                Toast.success('排序已保存');
            }
        });
    }

    static initGoalSort() {
        const list = document.getElementById('goal-list');
        if (!list || !window.Sortable) return;

        new window.Sortable(list, {
            animation: 150,
            ghostClass: 'sortable-ghost',
            chosenClass: 'sortable-chosen',
            dragClass: 'sortable-drag',
            handle: '.drag-handle',
            onEnd: (evt) => {
                const goals = appState.get('goals') || [];
                const [movedItem] = goals.splice(evt.oldIndex, 1);
                goals.splice(evt.newIndex, 0, movedItem);
                appState.set('goals', goals);
                Toast.success('排序已保存');
            }
        });
    }
}

// 工具函数
const utils = {
    // 格式化日期
    formatDate(date, format = 'YYYY-MM-DD') {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        
        return format
            .replace('YYYY', year)
            .replace('MM', month)
            .replace('DD', day);
    },

    // 格式化时间
    formatTime(date) {
        const d = new Date(date);
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    },

    // 计算日期差（天数）
    daysBetween(start, end) {
        const s = new Date(start);
        const e = new Date(end);
        const diff = e.getTime() - s.getTime();
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    },

    // 生成唯一ID
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    // 防抖
    debounce(fn, delay) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), delay);
        };
    }
};

// 导出全局对象
window.appState = appState;
window.router = router;
window.Modal = Modal;
window.utils = utils;
window.Toast = Toast;

// 初始化应用
function initApp() {
    // 初始化 Toast
    Toast.init();
    
    // 初始化模态框
    Modal.init();

    // 初始化主题
    ThemeManager.init();
    
    // 初始化备份恢复
    BackupManager.init();
    
    // 初始化数据统计
    StatsManager.init();
    
    // 初始化拖拽排序
    DragSortManager.init();

    // 初始化侧边栏用户信息
    initUserProfile();

    // 默认显示仪表盘
    router.navigate('dashboard');

    console.log('应用初始化完成！');
}

// 初始化用户头像和昵称
function initUserProfile() {
    const avatarImg = document.getElementById('avatar-img');
    const avatarIcon = document.getElementById('avatar-icon');
    const avatarContainer = document.getElementById('avatar-container');
    const avatarInput = document.getElementById('avatar-input');
    const nicknameInput = document.getElementById('nickname-input');

    // 加载保存的用户信息
    const user = appState.get('user');
    if (user.avatar) {
        avatarImg.src = user.avatar;
        avatarImg.classList.remove('hidden');
        avatarIcon.classList.add('hidden');
    }
    if (user.nickname) {
        nicknameInput.value = user.nickname;
    }

    // 头像点击上传
    avatarContainer.addEventListener('click', () => avatarInput.click());
    avatarInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const dataUrl = event.target.result;
                avatarImg.src = dataUrl;
                avatarImg.classList.remove('hidden');
                avatarIcon.classList.add('hidden');
                appState.set('user.avatar', dataUrl);
                Toast.success('头像已更新');
            };
            reader.readAsDataURL(file);
        }
    });

    // 昵称编辑
    nicknameInput.addEventListener('change', (e) => {
        appState.set('user.nickname', e.target.value);
        Toast.success('昵称已更新');
    });
}

// 启动应用
initApp();
