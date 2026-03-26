// 项目管理模块

let currentProjectId = null;
let projectChart = null;
let projectSearchQuery = '';
let projectSelectedTag = null;
let projectTaskFilter = 'all'; // 任务过滤：all/active/completed
let projectSearchTimeout = null;

// 计算重复任务的截止日期列表
function getRepeatingTaskDueDates(task, projectStartDate, projectEndDate) {
    const dueDates = [];
    if (!task.repeatFrequency || task.repeatFrequency === 'none') {
        // 非重复任务，直接返回dueDate（如果有）
        if (task.dueDate) {
            dueDates.push(task.dueDate);
        }
        return dueDates;
    }

    // 解析重复频率
    let intervalDays = 1;
    if (task.repeatFrequency === 'daily') {
        intervalDays = 1;
    } else if (task.repeatFrequency.startsWith('every')) {
        // 格式：every2days, every3days
        const match = task.repeatFrequency.match(/every(\d+)days?/);
        if (match) {
            intervalDays = parseInt(match[1]);
        }
    }

    // 开始日期：优先使用任务的创建日期，否则使用项目开始日期
    const startDateStr = task.createdAt ? task.createdAt.split('T')[0] : projectStartDate;
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

// 获取过滤后的项目列表
function getFilteredProjects() {
    const projects = appState.get('projects') || [];
    let filtered = projects;

    // 搜索过滤
    if (projectSearchQuery) {
        const query = projectSearchQuery.toLowerCase();
        filtered = filtered.filter(project => {
            const nameMatch = project.name.toLowerCase().includes(query);
            const descMatch = project.description?.toLowerCase().includes(query);
            return nameMatch || descMatch;
        });
    }

    // 标签过滤
    if (projectSelectedTag) {
        filtered = filtered.filter(project => {
            return project.tags && project.tags.includes(projectSelectedTag);
        });
    }

    return filtered;
}

// 渲染项目列表
function renderProjectList() {
    const container = document.getElementById('project-list');
    if (!container) return;

    const filteredProjects = getFilteredProjects();
    const allProjects = appState.get('projects') || [];

    if (filteredProjects.length === 0) {
        if (projectSearchQuery || projectSelectedTag) {
            container.innerHTML = `
                <div class="col-span-full text-center py-16 text-white/50">
                    <i class="fas fa-search text-6xl mb-6"></i>
                    <h3 class="text-xl font-semibold mb-2">没有找到匹配的项目</h3>
                    <p>试试换个搜索关键词或标签</p>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="col-span-full text-center py-16 text-white/50">
                    <i class="fas fa-folder-open text-6xl mb-6"></i>
                    <h3 class="text-xl font-semibold mb-2">还没有项目</h3>
                    <p>点击上方按钮创建你的第一个项目</p>
                </div>
            `;
        }
        return;
    }

    container.innerHTML = filteredProjects.map(project => {
        const progress = calculateProjectProgress(project);
        const totalDays = utils.daysBetween(project.startDate, project.endDate);
        const elapsedDays = utils.daysBetween(project.startDate, new Date());
        const timeProgress = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));

        // 渲染标签
        const tagsHtml = project.tags && project.tags.length > 0 
            ? `<div class="flex flex-wrap gap-1 mb-3">
                ${project.tags.map(tag => `<span class="px-2 py-1 text-xs rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">${tag}</span>`).join('')}
               </div>` 
            : '';

        return `
            <div class="project-card bg-black/30 backdrop-blur-xl rounded-2xl p-6 border border-white/10 cursor-pointer hover:border-purple-500/50" data-id="${project.id}">
                <div class="flex items-start justify-between mb-4">
                    <div class="drag-handle p-1 text-white/30 hover:text-white/60 cursor-grab mr-2">
                        <i class="fas fa-grip-vertical"></i>
                    </div>
                    <h3 class="text-lg font-semibold truncate flex-1">${project.name}</h3>
                    <div class="flex gap-2 ml-2">
                        <button class="edit-project p-2 text-white/30 hover:text-purple-400 transition-colors" data-id="${project.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="delete-project p-2 text-white/30 hover:text-red-400 transition-colors" data-id="${project.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                ${tagsHtml}
                ${project.description ? `<p class="text-white/60 text-sm mb-4 line-clamp-2">${project.description}</p>` : ''}
                <div class="space-y-3">
                    <div class="flex justify-between text-sm text-white/50">
                        <span><i class="fas fa-calendar mr-1"></i>${project.startDate}</span>
                        <span>至</span>
                        <span>${project.endDate}</span>
                    </div>
                    <div>
                        <div class="flex justify-between text-sm mb-1">
                            <span class="text-white/70">任务进度</span>
                            <span class="text-purple-400 font-semibold">${progress}%</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${progress}%"></div>
                        </div>
                    </div>
                    <div>
                        <div class="flex justify-between text-sm mb-1">
                            <span class="text-white/70">时间进度</span>
                            <span class="text-pink-400 font-semibold">${Math.round(timeProgress)}%</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${timeProgress}%; background: linear-gradient(90deg, #ec4899, #f59e0b)"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // 重新渲染标签筛选按钮
    renderProjectTagFilters();

    // 绑定事件
    container.querySelectorAll('.project-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.edit-project') && !e.target.closest('.delete-project')) {
                openProjectDetail(card.dataset.id);
            }
        });
    });

    container.querySelectorAll('.edit-project').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            showEditProjectModal(btn.dataset.id);
        });
    });

    container.querySelectorAll('.delete-project').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteProject(btn.dataset.id);
        });
    });
}

// 渲染项目标签筛选按钮
function renderProjectTagFilters() {
    const container = document.getElementById('project-tag-filters');
    if (!container) return;

    const allProjects = appState.get('projects') || [];
    const allTags = new Set();
    allProjects.forEach(project => {
        if (project.tags) {
            project.tags.forEach(tag => allTags.add(tag));
        }
    });

    const tags = Array.from(allTags);
    if (tags.length === 0 && !projectSelectedTag) {
        container.innerHTML = '';
        return;
    }

    let html = '';
    // 清除筛选按钮
    html += `
        <button class="project-tag-btn px-3 py-1.5 rounded-lg text-sm border transition-all 
            ${!projectSelectedTag ? 'bg-purple-500 border-purple-500 text-white' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'}" 
            data-tag="">
            全部
        </button>
    `;

    tags.forEach(tag => {
        html += `
            <button class="project-tag-btn px-3 py-1.5 rounded-lg text-sm border transition-all 
                ${projectSelectedTag === tag ? 'bg-purple-500 border-purple-500 text-white' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'}" 
                data-tag="${tag}">
                ${tag}
            </button>
        `;
    });

    container.innerHTML = html;

    // 绑定点击事件
    container.querySelectorAll('.project-tag-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            projectSelectedTag = btn.dataset.tag || null;
            renderProjectList();
        });
    });
}

// 计算项目进度
function calculateProjectProgress(project) {
    if (!project.subTasks || project.subTasks.length === 0) return 0;

    let totalWeight = 0;
    let completedWeight = 0;

    project.subTasks.forEach(task => {
        // 兼容旧数据
        const repeatFrequency = task.repeatFrequency || (task.dailyRepeat ? 'daily' : 'none');
        
        if (repeatFrequency !== 'none') {
            // 重复任务：计算已完成次数占总次数的比例
            const dueDates = getRepeatingTaskDueDates(task, project.startDate, project.endDate);
            const completedDates = task.completedDates || [];
            const totalOccurrences = dueDates.length;
            const completedOccurrences = completedDates.length;
            
            if (totalOccurrences > 0) {
                totalWeight += 1; // 每个任务权重为1
                completedWeight += (completedOccurrences / totalOccurrences);
            }
        } else {
            // 单次任务
            totalWeight += 1;
            if (task.completed) completedWeight += 1;
        }
    });

    if (totalWeight === 0) return 0;
    return Math.round((completedWeight / totalWeight) * 100);
}

// 显示创建项目模态框
function showCreateProjectModal() {
    const today = utils.formatDate(new Date());
    const nextMonth = utils.formatDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));

    Modal.show(`
        <div class="p-6">
            <h3 class="text-xl font-bold mb-6">创建新项目</h3>
            <div class="space-y-4">
                <div>
                    <label class="block text-sm text-white/70 mb-2">项目名称 *</label>
                    <input type="text" id="project-name" placeholder="输入项目名称..."
                           class="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-400 transition-colors">
                </div>
                <div>
                    <label class="block text-sm text-white/70 mb-2">项目描述</label>
                    <textarea id="project-desc" placeholder="输入项目描述..." rows="3"
                              class="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-400 transition-colors resize-none"></textarea>
                </div>
                <div>
                    <label class="block text-sm text-white/70 mb-2">标签（用逗号分隔）</label>
                    <input type="text" id="project-tags" placeholder="例如：工作,重要,学习"
                           class="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-400 transition-colors">
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm text-white/70 mb-2">开始日期 *</label>
                        <input type="date" id="project-start" value="${today}"
                               class="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-400 transition-colors">
                    </div>
                    <div>
                        <label class="block text-sm text-white/70 mb-2">结束日期 *</label>
                        <input type="date" id="project-end" value="${nextMonth}"
                               class="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-400 transition-colors">
                    </div>
                </div>
                <div class="flex gap-3 pt-4">
                    <button id="cancel-create-project" class="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors">
                        取消
                    </button>
                    <button id="confirm-create-project" class="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 font-semibold hover:opacity-90 transition-opacity">
                        创建
                    </button>
                </div>
            </div>
        </div>
    `);

    document.getElementById('cancel-create-project').addEventListener('click', Modal.hide);
    document.getElementById('confirm-create-project').addEventListener('click', createProject);
}

// 创建项目
function createProject() {
    const name = document.getElementById('project-name').value.trim();
    const description = document.getElementById('project-desc').value.trim();
    const tagsInput = document.getElementById('project-tags').value.trim();
    const startDate = document.getElementById('project-start').value;
    const endDate = document.getElementById('project-end').value;

    if (!name || !startDate || !endDate) {
        alert('请填写必填项');
        return;
    }

    // 解析标签
    const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(t => t) : [];

    const projects = appState.get('projects') || [];
    projects.push({
        id: utils.generateId(),
        name,
        description,
        tags,
        startDate,
        endDate,
        subTasks: [],
        createdAt: new Date().toISOString()
    });

    appState.set('projects', projects);
    Modal.hide();
    renderProjectList();
}

// 显示编辑项目模态框
function showEditProjectModal(projectId) {
    const projects = appState.get('projects') || [];
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    const tagsValue = project.tags ? project.tags.join(', ') : '';

    Modal.show(`
        <div class="p-6">
            <h3 class="text-xl font-bold mb-6">编辑项目</h3>
            <div class="space-y-4">
                <div>
                    <label class="block text-sm text-white/70 mb-2">项目名称 *</label>
                    <input type="text" id="edit-project-name" value="${project.name}"
                           class="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-400 transition-colors">
                </div>
                <div>
                    <label class="block text-sm text-white/70 mb-2">项目描述</label>
                    <textarea id="edit-project-desc" rows="3"
                              class="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-400 transition-colors resize-none">${project.description || ''}</textarea>
                </div>
                <div>
                    <label class="block text-sm text-white/70 mb-2">标签（用逗号分隔）</label>
                    <input type="text" id="edit-project-tags" value="${tagsValue}"
                           class="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-400 transition-colors">
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm text-white/70 mb-2">开始日期 *</label>
                        <input type="date" id="edit-project-start" value="${project.startDate}"
                               class="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-400 transition-colors">
                    </div>
                    <div>
                        <label class="block text-sm text-white/70 mb-2">结束日期 *</label>
                        <input type="date" id="edit-project-end" value="${project.endDate}"
                               class="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-400 transition-colors">
                    </div>
                </div>
                <div class="flex gap-3 pt-4">
                    <button id="cancel-edit-project" class="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors">
                        取消
                    </button>
                    <button id="confirm-edit-project" class="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 font-semibold hover:opacity-90 transition-opacity" data-id="${projectId}">
                        保存
                    </button>
                </div>
            </div>
        </div>
    `);

    document.getElementById('cancel-edit-project').addEventListener('click', Modal.hide);
    document.getElementById('confirm-edit-project').addEventListener('click', (e) => {
        editProject(e.target.dataset.id);
    });
}

// 编辑项目
function editProject(projectId) {
    const name = document.getElementById('edit-project-name').value.trim();
    const description = document.getElementById('edit-project-desc').value.trim();
    const tagsInput = document.getElementById('edit-project-tags').value.trim();
    const startDate = document.getElementById('edit-project-start').value;
    const endDate = document.getElementById('edit-project-end').value;

    if (!name || !startDate || !endDate) {
        alert('请填写必填项');
        return;
    }

    // 解析标签
    const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(t => t) : [];

    const projects = appState.get('projects') || [];
    const projectIndex = projects.findIndex(p => p.id === projectId);
    if (projectIndex !== -1) {
        projects[projectIndex] = {
            ...projects[projectIndex],
            name,
            description,
            tags,
            startDate,
            endDate
        };
        appState.set('projects', projects);
        Modal.hide();
        renderProjectList();
    }
}

// 删除项目
function deleteProject(projectId) {
    if (!confirm('确定要删除这个项目吗？此操作不可撤销。')) return;

    const projects = appState.get('projects') || [];
    const filtered = projects.filter(p => p.id !== projectId);
    appState.set('projects', filtered);
    renderProjectList();
}

// 打开项目详情
function openProjectDetail(projectId) {
    currentProjectId = projectId;
    router.navigate('project-detail', { projectId });
    renderProjectDetail();
}

// 渲染项目详情
function renderProjectDetail() {
    const projects = appState.get('projects') || [];
    const project = projects.find(p => p.id === currentProjectId);
    if (!project) return;

    document.getElementById('project-detail-title').textContent = project.name;
    
    const container = document.getElementById('project-detail-content');
    const progress = calculateProjectProgress(project);

    container.innerHTML = `
        <div class="grid lg:grid-cols-3 gap-6">
            <!-- 项目信息和图表 -->
            <div class="lg:col-span-1 space-y-6">
                <div class="bg-black/30 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
                    <h3 class="text-lg font-semibold mb-4">项目信息</h3>
                    <div class="space-y-3">
                        ${project.tags && project.tags.length > 0 ? `
                            <div>
                                <span class="text-white/60 block mb-2">标签</span>
                                <div class="flex flex-wrap gap-1">
                                    ${project.tags.map(tag => `<span class="px-2 py-1 text-xs rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">${tag}</span>`).join('')}
                                </div>
                            </div>
                        ` : ''}
                        <div class="flex justify-between">
                            <span class="text-white/60">开始日期</span>
                            <span>${project.startDate}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-white/60">结束日期</span>
                            <span>${project.endDate}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-white/60">总天数</span>
                            <span>${utils.daysBetween(project.startDate, project.endDate)} 天</span>
                        </div>
                        <div class="pt-3 border-t border-white/10">
                            <div class="flex justify-between mb-2">
                                <span class="text-white/60">总进度</span>
                                <span class="text-purple-400 font-bold text-xl">${progress}%</span>
                            </div>
                            <div class="progress-bar h-3">
                                <div class="progress-fill" style="width: ${progress}%"></div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="bg-black/30 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
                    <h3 class="text-lg font-semibold mb-4">完成趋势</h3>
                    <div style="height: 200px;">
                        <canvas id="project-chart"></canvas>
                    </div>
                </div>
            </div>
            
            <!-- 子任务管理 -->
            <div class="lg:col-span-2 bg-black/30 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                    <h3 class="text-lg font-semibold">子任务</h3>
                    <div class="flex items-center gap-2">
                        <!-- 任务过滤按钮 -->
                        <div class="flex bg-white/10 rounded-lg p-1">
                            <button class="project-task-filter px-3 py-1 rounded-md text-sm transition-all ${projectTaskFilter === 'all' ? 'bg-purple-500 text-white' : 'text-white/60 hover:text-white'}" 
                                    data-filter="all">全部</button>
                            <button class="project-task-filter px-3 py-1 rounded-md text-sm transition-all ${projectTaskFilter === 'active' ? 'bg-purple-500 text-white' : 'text-white/60 hover:text-white'}" 
                                    data-filter="active">未完成</button>
                            <button class="project-task-filter px-3 py-1 rounded-md text-sm transition-all ${projectTaskFilter === 'completed' ? 'bg-purple-500 text-white' : 'text-white/60 hover:text-white'}" 
                                    data-filter="completed">已完成</button>
                        </div>
                        <button id="add-subtask" class="px-4 py-2 rounded-xl bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors flex items-center gap-2 ml-2">
                            <i class="fas fa-plus"></i>
                            添加子任务
                        </button>
                    </div>
                </div>
                <div id="subtask-list" class="space-y-3">
                    ${renderSubtaskList(project, projectTaskFilter)}
                </div>
            </div>
        </div>
    `;

    // 渲染图表
    renderProjectChart(project);

    // 绑定添加子任务按钮
    const addBtn = document.getElementById('add-subtask');
    if (addBtn) {
        addBtn.addEventListener('click', () => showAddSubtaskModal(project));
    }

    // 绑定任务过滤按钮事件
    document.querySelectorAll('.project-task-filter').forEach(btn => {
        btn.addEventListener('click', () => {
            projectTaskFilter = btn.dataset.filter;
            renderProjectDetail();
        });
    });
}

// 渲染子任务列表
function renderSubtaskList(project, filter = 'all') {
    if (!project.subTasks || project.subTasks.length === 0) {
        return `
            <div class="text-center py-12 text-white/50">
                <i class="fas fa-tasks text-4xl mb-4"></i>
                <p>还没有子任务</p>
                <p class="text-sm mt-2">点击上方按钮添加</p>
            </div>
        `;
    }

    const today = utils.formatDate(new Date());
    let filteredTasks = project.subTasks;

    // 根据过滤条件筛选
    if (filter === 'active') {
        filteredTasks = project.subTasks.filter(task => {
            const repeatFrequency = task.repeatFrequency || (task.dailyRepeat ? 'daily' : 'none');
            if (repeatFrequency !== 'none') {
                const completedDates = task.completedDates || [];
                return !completedDates.includes(today);
            } else {
                return !task.completed;
            }
        });
    } else if (filter === 'completed') {
        filteredTasks = project.subTasks.filter(task => {
            const repeatFrequency = task.repeatFrequency || (task.dailyRepeat ? 'daily' : 'none');
            if (repeatFrequency !== 'none') {
                const completedDates = task.completedDates || [];
                return completedDates.includes(today);
            } else {
                return task.completed;
            }
        });
    }

    if (filteredTasks.length === 0) {
        return `
            <div class="text-center py-12 text-white/50">
                <i class="fas fa-check-circle text-4xl mb-4"></i>
                <p>没有匹配的任务</p>
            </div>
        `;
    }

    return filteredTasks.map(task => {
        // 兼容旧数据
        const repeatFrequency = task.repeatFrequency || (task.dailyRepeat ? 'daily' : 'none');
        const dueDate = task.dueDate || task.date;
        const createdAt = task.createdAt ? new Date(task.createdAt).toLocaleDateString('zh-CN') : '未知';
        
        let taskProgress = 0;
        let isCompletedToday = false;
        
        if (repeatFrequency !== 'none') {
            // 计算重复任务的进度
            const dueDates = getRepeatingTaskDueDates(task, project.startDate, project.endDate);
            const completedDates = task.completedDates || [];
            const completedCount = completedDates.length;
            taskProgress = dueDates.length > 0 ? Math.round((completedCount / dueDates.length) * 100) : 0;
            isCompletedToday = completedDates.includes(today);
        } else {
            isCompletedToday = task.completed;
        }

        // 重复频率显示文本
        let repeatText = '';
        if (repeatFrequency === 'none') {
            repeatText = '单次任务';
        } else if (repeatFrequency === 'daily') {
            repeatText = '每天重复';
        } else if (repeatFrequency === 'weekly') {
            repeatText = '每周重复';
        } else if (repeatFrequency.startsWith('every')) {
            const match = repeatFrequency.match(/every(\d+)days?/);
            if (match) {
                repeatText = `每${match[1]}天重复`;
            } else {
                repeatText = '重复任务';
            }
        }

        return `
            <div class="subtask-item p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors" data-id="${task.id}">
                <div class="flex items-start justify-between">
                    <!-- 完成按钮 -->
                    <button class="complete-subtask flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center mr-4 transition-all
                        ${isCompletedToday ? 'bg-green-500 border-green-500 text-white' : 'border-white/30 hover:border-purple-400'}" 
                        data-id="${task.id}">
                        <i class="fas fa-check text-sm ${isCompletedToday ? '' : 'opacity-0'}"></i>
                    </button>
                    
                    <div class="flex-1">
                        <h4 class="font-semibold mb-2 ${isCompletedToday ? 'line-through opacity-50' : ''}">${task.name}</h4>
                        <div class="flex flex-wrap items-center gap-3 text-sm text-white/60 mb-2">
                            <span><i class="fas fa-calendar-plus mr-1"></i>创建: ${createdAt}</span>
                            <span><i class="fas fa-calendar-check mr-1"></i>截止: ${dueDate}</span>
                            <span><i class="fas fa-sync-alt mr-1"></i>${repeatText}</span>
                            ${repeatFrequency !== 'none' ? `<span class="text-purple-400">${taskProgress}% 完成</span>` : ''}
                        </div>
                        ${repeatFrequency !== 'none' ? `
                            <div class="mt-2 progress-bar">
                                <div class="progress-fill" style="width: ${taskProgress}%"></div>
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="flex gap-2 ml-4">
                        <button class="edit-subtask p-2 text-white/30 hover:text-purple-400 transition-colors" data-id="${task.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="delete-subtask p-2 text-white/30 hover:text-red-400 transition-colors" data-id="${task.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// 渲染项目图表 - 饼图展示已完成/未完成比例
function renderProjectChart(project) {
    const ctx = document.getElementById('project-chart');
    if (!ctx) return;

    if (projectChart) {
        projectChart.destroy();
        projectChart = null;
    }

    // 统计已完成和未完成的总量（统一按天数计算）
    // - 每日重复任务：项目开始到结束的总天数，实际完成天数计入完成
    // - 非重复性任务：创建时间到截止日期的天数作为总量，完成则全部计入完成，未完成则0
    let completed = 0;
    let total = 0;
    const projectStart = new Date(project.startDate);
    const today = new Date();

    if (project.subTasks) {
        project.subTasks.forEach(task => {
            if (task.dailyRepeat) {
                // 每日重复任务：项目起止总天数，按实际完成天数统计
                const totalDays = utils.daysBetween(project.startDate, project.endDate);
                const completedDays = (task.completedDates || []).length;
                total += totalDays;
                completed += completedDays;
            } else {
                // 非重复性任务：从项目创建（今天）到截止日期的天数作为总量
                // 如果任务已完成，全部计入已完成；否则未完成
                const taskStart = projectStart > today ? projectStart : today;
                const taskEnd = new Date(task.date);
                const taskTotalDays = utils.daysBetween(taskStart, taskEnd) + 1; // +1 包含截止当天
                total += Math.max(1, taskTotalDays); // 至少算1天
                if (task.completed) {
                    completed += Math.max(1, taskTotalDays);
                }
            }
        });
    }

    const uncompleted = total - completed;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    projectChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['已完成', '未完成'],
            datasets: [{
                data: [completed, uncompleted],
                backgroundColor: [
                    'rgba(34, 197, 94, 0.8)',  // 绿色 - 已完成
                    'rgba(139, 92, 246, 0.5)'   // 紫色 - 未完成
                ],
                borderColor: [
                    'rgba(34, 197, 94, 1)',
                    'rgba(139, 92, 246, 1)'
                ],
                borderWidth: 2,
                cutout: '60%'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: 'rgba(255, 255, 255, 0.8)',
                        padding: 15,
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                            // 对大数格式化显示
                            const formattedValue = value >= 1000 ? Math.round(value / 100) / 10 + 'k' : value;
                            return `${label}: ${formattedValue} 天 (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// 显示添加子任务模态框
function showAddSubtaskModal(project) {
    Modal.show(`
        <div class="p-6">
            <h3 class="text-xl font-bold mb-6">添加子任务</h3>
            <div class="space-y-4">
                <div>
                    <label class="block text-sm text-white/70 mb-2">任务名称 *</label>
                    <input type="text" id="subtask-name" placeholder="输入任务名称..."
                           class="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-400 transition-colors">
                </div>
                <div>
                    <label class="block text-sm text-white/70 mb-2">重复频率 *</label>
                    <select id="subtask-repeat-frequency" class="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-400 transition-colors">
                        <option value="none">无重复</option>
                        <option value="daily">每天</option>
                        <option value="every2days">每2天</option>
                        <option value="every3days">每3天</option>
                        <option value="every4days">每4天</option>
                        <option value="every5days">每5天</option>
                        <option value="every6days">每6天</option>
                        <option value="weekly">每周</option>
                    </select>
                </div>
                <div id="subtask-due-date-container">
                    <label class="block text-sm text-white/70 mb-2">截止日期 *</label>
                    <input type="date" id="subtask-due-date" min="${project.startDate}" max="${project.endDate}"
                           class="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-400 transition-colors">
                </div>
                <div id="subtask-repeat-end-container" class="hidden">
                    <label class="block text-sm text-white/70 mb-2">重复结束日期 (可选)</label>
                    <input type="date" id="subtask-repeat-end" min="${project.startDate}" max="${project.endDate}"
                           class="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-400 transition-colors">
                </div>
                <div class="flex gap-3 pt-4">
                    <button id="cancel-add-subtask" class="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors">
                        取消
                    </button>
                    <button id="confirm-add-subtask" class="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 font-semibold hover:opacity-90 transition-opacity">
                        添加
                    </button>
                </div>
            </div>
        </div>
    `);

    const repeatSelect = document.getElementById('subtask-repeat-frequency');
    const dueDateContainer = document.getElementById('subtask-due-date-container');
    const repeatEndContainer = document.getElementById('subtask-repeat-end-container');
    
    repeatSelect.addEventListener('change', () => {
        const isRepeating = repeatSelect.value !== 'none';
        if (isRepeating) {
            dueDateContainer.querySelector('label').innerHTML = '首次截止日期 *';
            repeatEndContainer.classList.remove('hidden');
        } else {
            dueDateContainer.querySelector('label').innerHTML = '截止日期 *';
            repeatEndContainer.classList.add('hidden');
        }
    });

    document.getElementById('cancel-add-subtask').addEventListener('click', Modal.hide);
    document.getElementById('confirm-add-subtask').addEventListener('click', () => {
        addSubtask(project.id);
    });
}

// 添加子任务
function addSubtask(projectId) {
    const name = document.getElementById('subtask-name').value.trim();
    const repeatFrequency = document.getElementById('subtask-repeat-frequency').value;
    const dueDate = document.getElementById('subtask-due-date').value;
    const repeatEndDate = document.getElementById('subtask-repeat-end')?.value || '';

    if (!name || !dueDate) {
        alert('请填写必填项');
        return;
    }

    const projects = appState.get('projects') || [];
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    if (!project.subTasks) project.subTasks = [];
    
    const now = new Date().toISOString();
    const task = {
        id: utils.generateId(),
        name,
        createdAt: now,
        repeatFrequency: repeatFrequency,
        dueDate: dueDate,
        repeatEndDate: repeatEndDate || null,
        // 向后兼容字段
        dailyRepeat: repeatFrequency === 'daily',
        date: repeatFrequency === 'none' ? dueDate : null,
        completed: false,
        completedDates: []
    };

    project.subTasks.push(task);
    appState.set('projects', projects);
    Modal.hide();
    renderProjectDetail();
    
    // 更新日历显示（如果仪表盘模块已加载）
    if (typeof window.updateCalendarDisplay === 'function') {
        window.updateCalendarDisplay();
    }
}

// 初始化项目模块
function initProjectModule() {
    renderProjectList();

    // 绑定创建项目按钮
    const createBtn = document.getElementById('create-project');
    if (createBtn) {
        createBtn.addEventListener('click', showCreateProjectModal);
    }

    // 绑定返回按钮
    const backBtn = document.getElementById('back-to-projects');
    if (backBtn) {
        backBtn.addEventListener('click', () => router.navigate('project'));
    }

    // 绑定搜索框 - 添加防抖300ms
    const searchInput = document.getElementById('project-search');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            clearTimeout(projectSearchTimeout);
            projectSearchTimeout = setTimeout(() => {
                projectSearchQuery = searchInput.value.trim();
                renderProjectList();
            }, 300);
        });
    }

    // 事件委托：处理子任务操作
    document.addEventListener('click', (e) => {
        const deleteBtn = e.target.closest('.delete-subtask');
        if (deleteBtn) {
            e.stopPropagation();
            const taskId = deleteBtn.dataset.id;
            deleteSubtask(taskId);
        }

        const completeBtn = e.target.closest('.complete-subtask');
        if (completeBtn) {
            e.stopPropagation();
            const taskId = completeBtn.dataset.id;
            toggleSubtaskComplete(taskId, completeBtn);
        }

        const editBtn = e.target.closest('.edit-subtask');
        if (editBtn) {
            e.stopPropagation();
            const taskId = editBtn.dataset.id;
            showEditSubtaskModal(taskId);
        }
    });
}

// 删除子任务
function deleteSubtask(taskId) {
    if (!confirm('确定要删除这个子任务吗？')) return;

    const projects = appState.get('projects') || [];
    const project = projects.find(p => p.id === currentProjectId);
    if (project && project.subTasks) {
        project.subTasks = project.subTasks.filter(t => t.id !== taskId);
        appState.set('projects', projects);
        Toast.success('子任务已删除');
        renderProjectDetail();
        
        // 更新日历显示（如果仪表盘模块已加载）
        if (typeof window.updateCalendarDisplay === 'function') {
            window.updateCalendarDisplay();
        }
    }
}

// 切换子任务完成状态
function toggleSubtaskComplete(taskId, buttonElement) {
    const projects = appState.get('projects') || [];
    const project = projects.find(p => p.id === currentProjectId);
    if (!project || !project.subTasks) return;

    const task = project.subTasks.find(t => t.id === taskId);
    if (!task) return;

    const today = utils.formatDate(new Date());
    const repeatFrequency = task.repeatFrequency || (task.dailyRepeat ? 'daily' : 'none');

    if (repeatFrequency !== 'none') {
        // 重复任务：标记今天完成
        if (!task.completedDates) task.completedDates = [];
        
        if (task.completedDates.includes(today)) {
            // 取消今天的完成状态
            task.completedDates = task.completedDates.filter(d => d !== today);
        } else {
            // 标记今天完成
            task.completedDates.push(today);
            Toast.success('今日任务已完成！🎉');
        }
    } else {
        // 单次任务：切换完成状态
        task.completed = !task.completed;
        if (task.completed) {
            task.completedAt = new Date().toISOString();
            Toast.success('任务已完成！🎉');
        }
    }

    // 添加完成动画
    const taskItem = buttonElement.closest('.subtask-item');
    const isCompleted = repeatFrequency !== 'none' ? task.completedDates?.includes(today) : task.completed;
    if (taskItem && isCompleted) {
        taskItem.classList.add('completing');
        setTimeout(() => taskItem.classList.remove('completing'), 500);
    }

    appState.set('projects', projects);
    renderProjectDetail();
    
    // 更新日历显示（如果仪表盘模块已加载）
    if (typeof window.updateCalendarDisplay === 'function') {
        window.updateCalendarDisplay();
    }
}

// 显示编辑子任务模态框
function showEditSubtaskModal(taskId) {
    const projects = appState.get('projects') || [];
    const project = projects.find(p => p.id === currentProjectId);
    if (!project || !project.subTasks) return;

    const task = project.subTasks.find(t => t.id === taskId);
    if (!task) return;

    // 确定重复频率值，兼容旧数据
    let repeatFrequency = task.repeatFrequency || 'none';
    if (task.dailyRepeat && !task.repeatFrequency) {
        repeatFrequency = 'daily';
    }

    Modal.show(`
        <div class="p-6">
            <h3 class="text-xl font-bold mb-6">编辑子任务</h3>
            <div class="space-y-4">
                <div>
                    <label class="block text-sm text-white/70 mb-2">任务名称 *</label>
                    <input type="text" id="edit-subtask-name" value="${task.name}"
                           class="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-400 transition-colors">
                </div>
                <div>
                    <label class="block text-sm text-white/70 mb-2">重复频率 *</label>
                    <select id="edit-subtask-repeat-frequency" class="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-400 transition-colors">
                        <option value="none" ${repeatFrequency === 'none' ? 'selected' : ''}>无重复</option>
                        <option value="daily" ${repeatFrequency === 'daily' ? 'selected' : ''}>每天</option>
                        <option value="every2days" ${repeatFrequency === 'every2days' ? 'selected' : ''}>每2天</option>
                        <option value="every3days" ${repeatFrequency === 'every3days' ? 'selected' : ''}>每3天</option>
                        <option value="every4days" ${repeatFrequency === 'every4days' ? 'selected' : ''}>每4天</option>
                        <option value="every5days" ${repeatFrequency === 'every5days' ? 'selected' : ''}>每5天</option>
                        <option value="every6days" ${repeatFrequency === 'every6days' ? 'selected' : ''}>每6天</option>
                        <option value="weekly" ${repeatFrequency === 'weekly' ? 'selected' : ''}>每周</option>
                    </select>
                </div>
                <div id="edit-subtask-due-date-container">
                    <label class="block text-sm text-white/70 mb-2">${repeatFrequency === 'none' ? '截止日期' : '首次截止日期'} *</label>
                    <input type="date" id="edit-subtask-due-date" value="${task.dueDate || task.date || ''}" min="${project.startDate}" max="${project.endDate}"
                           class="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-400 transition-colors">
                </div>
                <div id="edit-subtask-repeat-end-container" ${repeatFrequency === 'none' ? 'class="hidden"' : ''}>
                    <label class="block text-sm text-white/70 mb-2">重复结束日期 (可选)</label>
                    <input type="date" id="edit-subtask-repeat-end" value="${task.repeatEndDate || ''}" min="${project.startDate}" max="${project.endDate}"
                           class="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-400 transition-colors">
                </div>
                <div class="text-sm text-white/50">
                    <label class="block text-sm text-white/70 mb-2">创建日期</label>
                    <p>${task.createdAt ? new Date(task.createdAt).toLocaleDateString('zh-CN') : '未知'}</p>
                </div>
                <div class="flex gap-3 pt-4">
                    <button id="cancel-edit-subtask" class="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors">
                        取消
                    </button>
                    <button id="confirm-edit-subtask" class="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 font-semibold hover:opacity-90 transition-opacity" data-id="${taskId}">
                        保存
                    </button>
                </div>
            </div>
        </div>
    `);

    // 绑定重复选择事件
    const repeatSelect = document.getElementById('edit-subtask-repeat-frequency');
    const dueDateContainer = document.getElementById('edit-subtask-due-date-container');
    const repeatEndContainer = document.getElementById('edit-subtask-repeat-end-container');
    
    repeatSelect.addEventListener('change', () => {
        const isRepeating = repeatSelect.value !== 'none';
        if (isRepeating) {
            dueDateContainer.querySelector('label').innerHTML = '首次截止日期 *';
            repeatEndContainer.classList.remove('hidden');
        } else {
            dueDateContainer.querySelector('label').innerHTML = '截止日期 *';
            repeatEndContainer.classList.add('hidden');
        }
    });

    document.getElementById('cancel-edit-subtask').addEventListener('click', Modal.hide);
    document.getElementById('confirm-edit-subtask').addEventListener('click', (e) => {
        editSubtask(e.target.dataset.id);
    });
}

// 编辑子任务
function editSubtask(taskId) {
    const name = document.getElementById('edit-subtask-name').value.trim();
    const repeatFrequency = document.getElementById('edit-subtask-repeat-frequency').value;
    const dueDate = document.getElementById('edit-subtask-due-date').value;
    const repeatEndDate = document.getElementById('edit-subtask-repeat-end')?.value || '';

    if (!name || !dueDate) {
        Toast.error('请填写必填项');
        return;
    }

    const projects = appState.get('projects') || [];
    const project = projects.find(p => p.id === currentProjectId);
    if (!project || !project.subTasks) return;

    const taskIndex = project.subTasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return;

    project.subTasks[taskIndex] = {
        ...project.subTasks[taskIndex],
        name,
        repeatFrequency: repeatFrequency,
        dueDate: dueDate,
        repeatEndDate: repeatEndDate || null,
        // 向后兼容字段
        dailyRepeat: repeatFrequency === 'daily',
        date: repeatFrequency === 'none' ? dueDate : null
    };

    appState.set('projects', projects);
    Modal.hide();
    Toast.success('子任务已更新');
    renderProjectDetail();
    
    // 更新日历显示（如果仪表盘模块已加载）
    if (typeof window.updateCalendarDisplay === 'function') {
        window.updateCalendarDisplay();
    }
}

// 监听页面加载
window.addEventListener('pageLoaded', (e) => {
    if (e.detail.page === 'project') {
        renderProjectList();
    } else if (e.detail.page === 'project-detail') {
        if (e.detail.params?.projectId) {
            currentProjectId = e.detail.params.projectId;
        }
        renderProjectDetail();
    }
});

// 页面加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initProjectModule);
} else {
    setTimeout(initProjectModule, 300);
}

// 暴露全局函数
window.initProjectModule = initProjectModule;
window.renderProjectList = renderProjectList;
