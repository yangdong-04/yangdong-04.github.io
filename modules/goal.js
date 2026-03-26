// 长期目标模块

let currentGoalId = null;
let goalChart = null;
let goalSearchQuery = '';
let goalSelectedTag = null;
let goalSearchTimeout = null;
let goalTaskFilter = {}; // 每个阶段的任务过滤 {phaseId: 'all/active/completed'

// 获取过滤后的目标列表
function getFilteredGoals() {
    const goals = appState.get('goals') || [];
    let filtered = goals;

    // 搜索过滤
    if (goalSearchQuery) {
        const query = goalSearchQuery.toLowerCase();
        filtered = filtered.filter(goal => {
            const nameMatch = goal.name.toLowerCase().includes(query);
            const descMatch = goal.description?.toLowerCase().includes(query);
            return nameMatch || descMatch;
        });
    }

    // 标签过滤
    if (goalSelectedTag) {
        filtered = filtered.filter(goal => {
            return goal.tags && goal.tags.includes(goalSelectedTag);
        });
    }

    return filtered;
}

// 渲染目标列表
function renderGoalList() {
    const container = document.getElementById('goal-list');
    if (!container) return;

    const filteredGoals = getFilteredGoals();
    const allGoals = appState.get('goals') || [];

    if (filteredGoals.length === 0) {
        if (goalSearchQuery || goalSelectedTag) {
            container.innerHTML = `
                <div class="text-center py-16 text-white/50">
                    <i class="fas fa-search text-6xl mb-6"></i>
                    <h3 class="text-xl font-semibold mb-2">没有找到匹配的目标</h3>
                    <p>试试换个搜索关键词或标签</p>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="text-center py-16 text-white/50">
                    <i class="fas fa-rocket text-6xl mb-6"></i>
                    <h3 class="text-xl font-semibold mb-2">还没有长期目标</h3>
                    <p>点击上方按钮设定你的第一个长期目标（至少1年）</p>
                </div>
            `;
        }
        return;
    }

    container.innerHTML = filteredGoals.map(goal => {
        const progress = calculateGoalProgress(goal);
        const totalDays = utils.daysBetween(goal.startDate, goal.endDate);
        const elapsedDays = utils.daysBetween(goal.startDate, new Date());
        const timeProgress = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));

        // 渲染标签
        const tagsHtml = goal.tags && goal.tags.length > 0 
            ? `<div class="flex flex-wrap gap-1 mb-3">
                ${goal.tags.map(tag => `<span class="px-2 py-1 text-xs rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30">${tag}</span>`).join('')}
               </div>` 
            : '';

        return `
            <div class="goal-card bg-black/30 backdrop-blur-xl rounded-2xl p-6 border border-white/10 cursor-pointer hover:border-pink-500/50" data-id="${goal.id}">
                <div class="flex items-start justify-between mb-4">
                    <div class="drag-handle p-1 text-white/30 hover:text-white/60 cursor-grab mr-2">
                        <i class="fas fa-grip-vertical"></i>
                    </div>
                    <div class="flex-1">
                        <h3 class="text-xl font-semibold mb-2">${goal.name}</h3>
                        ${tagsHtml}
                        ${goal.description ? `<p class="text-white/60">${goal.description}</p>` : ''}
                    </div>
                    <div class="flex gap-2 ml-4">
                        <button class="edit-goal p-2 text-white/30 hover:text-purple-400 transition-colors" data-id="${goal.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="delete-goal p-2 text-white/30 hover:text-red-400 transition-colors" data-id="${goal.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="grid md:grid-cols-2 gap-6">
                    <div class="space-y-3">
                        <div class="flex justify-between text-sm text-white/50">
                            <span><i class="fas fa-calendar mr-1"></i>${goal.startDate}</span>
                            <span>至</span>
                            <span>${goal.endDate}</span>
                        </div>
                        <div class="text-sm text-white/50">
                            <i class="fas fa-clock mr-1"></i>${Math.ceil(totalDays / 365)} 年 ${Math.ceil((totalDays % 365) / 30)} 个月
                        </div>
                    </div>
                    <div class="space-y-3">
                        <div>
                            <div class="flex justify-between text-sm mb-1">
                                <span class="text-white/70">目标进度</span>
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
            </div>
        `;
    }).join('');

    // 重新渲染标签筛选按钮
    renderGoalTagFilters();

    // 绑定事件
    container.querySelectorAll('.goal-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.edit-goal') && !e.target.closest('.delete-goal')) {
                openGoalDetail(card.dataset.id);
            }
        });
    });

    container.querySelectorAll('.edit-goal').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            showEditGoalModal(btn.dataset.id);
        });
    });

    container.querySelectorAll('.delete-goal').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteGoal(btn.dataset.id);
        });
    });
}

// 渲染目标标签筛选按钮
function renderGoalTagFilters() {
    const container = document.getElementById('goal-tag-filters');
    if (!container) return;

    const allGoals = appState.get('goals') || [];
    const allTags = new Set();
    allGoals.forEach(goal => {
        if (goal.tags) {
            goal.tags.forEach(tag => allTags.add(tag));
        }
    });

    const tags = Array.from(allTags);
    if (tags.length === 0 && !goalSelectedTag) {
        container.innerHTML = '';
        return;
    }

    let html = '';
    // 清除筛选按钮
    html += `
        <button class="goal-tag-btn px-3 py-1.5 rounded-lg text-sm border transition-all 
            ${!goalSelectedTag ? 'bg-purple-500 border-purple-500 text-white' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'}" 
            data-tag="">
            全部
        </button>
    `;

    tags.forEach(tag => {
        html += `
            <button class="goal-tag-btn px-3 py-1.5 rounded-lg text-sm border transition-all 
            ${goalSelectedTag === tag ? 'bg-purple-500 border-purple-500 text-white' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'}" 
                data-tag="${tag}">
                ${tag}
            </button>
        `;
    });

    container.innerHTML = html;

    // 绑定点击事件
    container.querySelectorAll('.goal-tag-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            goalSelectedTag = btn.dataset.tag || null;
            renderGoalList();
        });
    });
}

// 计算目标进度
function calculateGoalProgress(goal) {
    if (!goal.phases || goal.phases.length === 0) return 0;

    let totalTasks = 0;
    let completedTasks = 0;

    goal.phases.forEach(phase => {
        if (phase.tasks) {
            phase.tasks.forEach(task => {
                totalTasks++;
                if (task.completed) completedTasks++;
            });
        }
    });

    return totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
}

// 显示创建目标模态框
function showCreateGoalModal() {
    const today = utils.formatDate(new Date());
    const nextYear = utils.formatDate(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000));

    Modal.show(`
        <div class="p-6">
            <h3 class="text-xl font-bold mb-6">创建长期目标</h3>
            <div class="space-y-4">
                <div>
                    <label class="block text-sm text-white/70 mb-2">目标名称 *</label>
                    <input type="text" id="goal-name" placeholder="输入目标名称..."
                           class="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-400 transition-colors">
                </div>
                <div>
                    <label class="block text-sm text-white/70 mb-2">目标描述</label>
                    <textarea id="goal-desc" placeholder="输入目标描述..." rows="3"
                              class="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-400 transition-colors resize-none"></textarea>
                </div>
                <div>
                    <label class="block text-sm text-white/70 mb-2">标签（用逗号分隔）</label>
                    <input type="text" id="goal-tags" placeholder="例如：学习,健康,事业"
                           class="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-400 transition-colors">
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm text-white/70 mb-2">开始日期 *</label>
                        <input type="date" id="goal-start" value="${today}"
                               class="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-400 transition-colors">
                    </div>
                    <div>
                        <label class="block text-sm text-white/70 mb-2">结束日期 *</label>
                        <input type="date" id="goal-end" value="${nextYear}"
                               class="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-400 transition-colors">
                    </div>
                </div>
                <p class="text-sm text-yellow-400/70">
                    <i class="fas fa-info-circle mr-1"></i>
                    长期目标时长至少需要1年以上
                </p>
                <div class="flex gap-3 pt-4">
                    <button id="cancel-create-goal" class="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors">
                        取消
                    </button>
                    <button id="confirm-create-goal" class="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 font-semibold hover:opacity-90 transition-opacity">
                        创建
                    </button>
                </div>
            </div>
        </div>
    `);

    document.getElementById('cancel-create-goal').addEventListener('click', Modal.hide);
    document.getElementById('confirm-create-goal').addEventListener('click', createGoal);
}

// 创建目标
function createGoal() {
    const name = document.getElementById('goal-name').value.trim();
    const description = document.getElementById('goal-desc').value.trim();
    const tagsInput = document.getElementById('goal-tags').value.trim();
    const startDate = document.getElementById('goal-start').value;
    const endDate = document.getElementById('goal-end').value;

    if (!name || !startDate || !endDate) {
        alert('请填写必填项');
        return;
    }

    const days = utils.daysBetween(startDate, endDate);
    if (days < 365) {
        alert('长期目标时长至少需要1年以上');
        return;
    }

    // 解析标签
    const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(t => t) : [];

    const goals = appState.get('goals') || [];
    goals.push({
        id: utils.generateId(),
        name,
        description,
        tags,
        startDate,
        endDate,
        phases: [],
        createdAt: new Date().toISOString()
    });

    appState.set('goals', goals);
    Modal.hide();
    renderGoalList();
}

// 显示编辑目标模态框
function showEditGoalModal(goalId) {
    const goals = appState.get('goals') || [];
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;

    const tagsValue = goal.tags ? goal.tags.join(', ') : '';

    Modal.show(`
        <div class="p-6">
            <h3 class="text-xl font-bold mb-6">编辑目标</h3>
            <div class="space-y-4">
                <div>
                    <label class="block text-sm text-white/70 mb-2">目标名称 *</label>
                    <input type="text" id="edit-goal-name" value="${goal.name}"
                           class="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-400 transition-colors">
                </div>
                <div>
                    <label class="block text-sm text-white/70 mb-2">目标描述</label>
                    <textarea id="edit-goal-desc" rows="3"
                              class="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-400 transition-colors resize-none">${goal.description || ''}</textarea>
                </div>
                <div>
                    <label class="block text-sm text-white/70 mb-2">标签（用逗号分隔）</label>
                    <input type="text" id="edit-goal-tags" value="${tagsValue}"
                           class="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-400 transition-colors">
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm text-white/70 mb-2">开始日期 *</label>
                        <input type="date" id="edit-goal-start" value="${goal.startDate}"
                               class="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-400 transition-colors">
                    </div>
                    <div>
                        <label class="block text-sm text-white/70 mb-2">结束日期 *</label>
                        <input type="date" id="edit-goal-end" value="${goal.endDate}"
                               class="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-400 transition-colors">
                    </div>
                </div>
                <div class="flex gap-3 pt-4">
                    <button id="cancel-edit-goal" class="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors">
                        取消
                    </button>
                    <button id="confirm-edit-goal" class="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 font-semibold hover:opacity-90 transition-opacity" data-id="${goalId}">
                        保存
                    </button>
                </div>
            </div>
        </div>
    `);

    document.getElementById('cancel-edit-goal').addEventListener('click', Modal.hide);
    document.getElementById('confirm-edit-goal').addEventListener('click', (e) => {
        editGoal(e.target.dataset.id);
    });
}

// 编辑目标
function editGoal(goalId) {
    const name = document.getElementById('edit-goal-name').value.trim();
    const description = document.getElementById('edit-goal-desc').value.trim();
    const tagsInput = document.getElementById('edit-goal-tags').value.trim();
    const startDate = document.getElementById('edit-goal-start').value;
    const endDate = document.getElementById('edit-goal-end').value;

    if (!name || !startDate || !endDate) {
        alert('请填写必填项');
        return;
    }

    const days = utils.daysBetween(startDate, endDate);
    if (days < 365) {
        alert('长期目标时长至少需要1年以上');
        return;
    }

    // 解析标签
    const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(t => t) : [];

    const goals = appState.get('goals') || [];
    const goalIndex = goals.findIndex(g => g.id === goalId);
    if (goalIndex !== -1) {
        goals[goalIndex] = {
            ...goals[goalIndex],
            name,
            description,
            tags,
            startDate,
            endDate
        };
        appState.set('goals', goals);
        Modal.hide();
        renderGoalList();
    }
}

// 删除目标
function deleteGoal(goalId) {
    if (!confirm('确定要删除这个目标吗？此操作不可撤销。')) return;

    const goals = appState.get('goals') || [];
    const filtered = goals.filter(g => g.id !== goalId);
    appState.set('goals', filtered);
    renderGoalList();
}

// 打开目标详情
function openGoalDetail(goalId) {
    currentGoalId = goalId;
    router.navigate('goal-detail', { goalId });
    renderGoalDetail();
}

// 渲染目标详情
function renderGoalDetail() {
    const goals = appState.get('goals') || [];
    const goal = goals.find(g => g.id === currentGoalId);
    if (!goal) return;

    document.getElementById('goal-detail-title').textContent = goal.name;
    
    const container = document.getElementById('goal-detail-content');
    const progress = calculateGoalProgress(goal);

    container.innerHTML = `
        <div class="grid lg:grid-cols-3 gap-6">
            <!-- 目标信息 -->
            <div class="lg:col-span-1 space-y-6">
                <div class="bg-black/30 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
                    <h3 class="text-lg font-semibold mb-4">目标信息</h3>
                    <div class="space-y-3">
                        ${goal.tags && goal.tags.length > 0 ? `
                            <div>
                                <span class="text-white/60 block mb-2">标签</span>
                                <div class="flex flex-wrap gap-1">
                                    ${goal.tags.map(tag => `<span class="px-2 py-1 text-xs rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30">${tag}</span>`).join('')}
                                </div>
                            </div>
                        ` : ''}
                        <div class="flex justify-between">
                            <span class="text-white/60">开始日期</span>
                            <span>${goal.startDate}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-white/60">结束日期</span>
                            <span>${goal.endDate}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-white/60">总时长</span>
                            <span>${Math.ceil(utils.daysBetween(goal.startDate, goal.endDate) / 365)} 年</span>
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
                    <h3 class="text-lg font-semibold mb-4">阶段统计</h3>
                    <div class="space-y-3">
                        <div class="flex justify-between">
                            <span class="text-white/60">阶段总数</span>
                            <span class="text-purple-400 font-bold">${goal.phases ? goal.phases.length : 0}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-white/60">已完成阶段</span>
                            <span class="text-green-400 font-bold">${goal.phases ? goal.phases.filter(p => calculatePhaseProgress(p) === 100).length : 0}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-white/60">进行中阶段</span>
                            <span class="text-yellow-400 font-bold">${goal.phases ? goal.phases.filter(p => {
                                const progress = calculatePhaseProgress(p);
                                return progress > 0 && progress < 100;
                            }).length : 0}</span>
                        </div>
                    </div>
                </div>
                <div class="bg-black/30 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
                    <h3 class="text-lg font-semibold mb-4">完成趋势</h3>
                    <div style="height: 200px;">
                        <canvas id="goal-chart"></canvas>
                    </div>
                </div>
            </div>
            
            <!-- 阶段和小目标 -->
            <div class="lg:col-span-2 bg-black/30 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
                <div class="flex items-center justify-between mb-6">
                    <h3 class="text-lg font-semibold">阶段与小目标</h3>
                    <button id="add-phase" class="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:opacity-90 transition-opacity flex items-center gap-2">
                        <i class="fas fa-plus"></i>
                        添加阶段
                    </button>
                </div>
                <div id="phase-list" class="space-y-4">
                    ${renderPhaseList(goal)}
                </div>
            </div>
        </div>
    `;

    // 绑定添加阶段按钮
    const addPhaseBtn = document.getElementById('add-phase');
    if (addPhaseBtn) {
        addPhaseBtn.addEventListener('click', () => showAddPhaseModal(goal));
    }

    // 渲染图表
    renderGoalChart(goal);
}

// 渲染阶段列表
function renderPhaseList(goal) {
    if (!goal.phases || goal.phases.length === 0) {
        return `
            <div class="text-center py-12 text-white/50">
                <i class="fas fa-layer-group text-4xl mb-4"></i>
                <p>还没有阶段</p>
                <p class="text-sm mt-2">点击左侧按钮添加阶段</p>
            </div>
        `;
    }

    return goal.phases.map((phase, phaseIndex) => {
        const currentFilter = goalTaskFilter[phase.id] || 'all';
        return `
        <div class="border border-white/10 rounded-xl overflow-hidden">
            <div class="phase-header p-4 bg-white/5 flex items-center justify-between cursor-pointer hover:bg-white/10 transition-colors" data-phase-id="${phase.id}">
                <div class="flex items-center gap-3">
                    <button class="complete-phase-toggle flex-shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all
                        ${calculatePhaseProgress(phase) === 100 ? 'bg-green-500 border-green-500 text-white' : 'border-white/30 hover:border-purple-400'}" 
                        data-phase-id="${phase.id}">
                        <i class="fas fa-check text-xs ${calculatePhaseProgress(phase) === 100 ? '' : 'opacity-0'}"></i>
                    </button>
                    <i class="fas fa-chevron-down phase-toggle transition-transform" style="transform: rotate(-90deg);"></i>
                    <div>
                        <h4 class="font-semibold">${phase.name}</h4>
                        <p class="text-sm text-white/50">${phase.startDate} - ${phase.endDate}</p>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <span class="text-sm text-purple-400">${calculatePhaseProgress(phase)}%</span>
                    <button class="edit-phase p-2 text-white/30 hover:text-yellow-400 transition-colors" data-phase-id="${phase.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="add-phase-task p-2 text-white/30 hover:text-purple-400 transition-colors" data-phase-id="${phase.id}">
                        <i class="fas fa-plus"></i>
                    </button>
                    <button class="delete-phase p-2 text-white/30 hover:text-red-400 transition-colors" data-phase-id="${phase.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="phase-content border-t border-white/10 collapsed" data-phase-id="${phase.id}">
                <div class="collapsible-content p-4 collapsible collapsed" data-phase-id="${phase.id}">
                    <!-- 任务过滤按钮 -->
                    <div class="flex items-center gap-2 mb-3">
                        <div class="flex bg-white/10 rounded-lg p-1">
                            <button class="phase-task-filter px-2 py-1 rounded-md text-xs transition-all ${currentFilter === 'all' ? 'bg-purple-500 text-white' : 'text-white/60 hover:text-white'}" 
                                    data-phase-id="${phase.id}" data-filter="all">全部</button>
                            <button class="phase-task-filter px-2 py-1 rounded-md text-xs transition-all ${currentFilter === 'active' ? 'bg-purple-500 text-white' : 'text-white/60 hover:text-white'}" 
                                    data-phase-id="${phase.id}" data-filter="active">未完成</button>
                            <button class="phase-task-filter px-2 py-1 rounded-md text-xs transition-all ${currentFilter === 'completed' ? 'bg-purple-500 text-white' : 'text-white/60 hover:text-white'}" 
                                    data-phase-id="${phase.id}" data-filter="completed">已完成</button>
                        </div>
                    </div>
                    ${renderPhaseTasks(phase, currentFilter)}
                </div>
            </div>
        </div>
    `;
    }).join('');
}

// 计算阶段进度
function calculatePhaseProgress(phase) {
    if (!phase.tasks || phase.tasks.length === 0) return 0;
    const completed = phase.tasks.filter(t => t.completed).length;
    return Math.round((completed / phase.tasks.length) * 100);
}

// 渲染阶段任务
function renderPhaseTasks(phase, filter = 'all') {
    if (!phase.tasks || phase.tasks.length === 0) {
        return `
            <div class="text-center py-6 text-white/40 text-sm">
                还没有小目标，点击 + 号添加
            </div>
        `;
    }

    let filteredTasks = phase.tasks;
    
    // 根据过滤条件筛选
    if (filter === 'active') {
        filteredTasks = phase.tasks.filter(task => !task.completed);
    } else if (filter === 'completed') {
        filteredTasks = phase.tasks.filter(task => task.completed);
    }

    if (filteredTasks.length === 0) {
        return `
            <div class="text-center py-6 text-white/40 text-sm">
                没有匹配的小目标
            </div>
        `;
    }

    return `
        <div class="space-y-2">
            ${filteredTasks.map(task => `
                <div class="phase-task-item flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors" data-task-id="${task.id}">
                    <button class="complete-phase-task flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all
                        ${task.completed ? 'bg-green-500 border-green-500 text-white' : 'border-white/30 hover:border-purple-400'}" 
                        data-phase-id="${phase.id}"
                        data-task-id="${task.id}">
                        <i class="fas fa-check text-sm ${task.completed ? '' : 'opacity-0'}"></i>
                    </button>
                    <div class="flex-1 min-w-0">
                        <p class="font-medium ${task.completed ? 'line-through text-white/50' : ''}">${task.name}</p>
                        <p class="text-xs text-white/50">截止: ${task.dueDate}</p>
                    </div>
                    <button class="edit-phase-task p-1 text-white/30 hover:text-purple-400 transition-colors"
                            data-phase-id="${phase.id}"
                            data-task-id="${task.id}">
                        <i class="fas fa-edit text-sm"></i>
                    </button>
                    <button class="delete-phase-task p-1 text-white/30 hover:text-red-400 transition-colors"
                            data-phase-id="${phase.id}"
                            data-task-id="${task.id}">
                        <i class="fas fa-trash text-sm"></i>
                    </button>
                </div>
            `).join('')}
        </div>
    `;
}

// 显示添加阶段模态框
function showAddPhaseModal(goal) {
    Modal.show(`
        <div class="p-6">
            <h3 class="text-xl font-bold mb-6">添加阶段</h3>
            <div class="space-y-4">
                <div>
                    <label class="block text-sm text-white/70 mb-2">阶段名称 *</label>
                    <input type="text" id="phase-name" placeholder="例如：第一阶段"
                           class="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-400 transition-colors">
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm text-white/70 mb-2">开始日期 *</label>
                        <input type="date" id="phase-start" min="${goal.startDate}" max="${goal.endDate}"
                               class="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-400 transition-colors">
                    </div>
                    <div>
                        <label class="block text-sm text-white/70 mb-2">结束日期 *</label>
                        <input type="date" id="phase-end" min="${goal.startDate}" max="${goal.endDate}"
                               class="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-400 transition-colors">
                    </div>
                </div>
                <div class="flex gap-3 pt-4">
                    <button id="cancel-add-phase" class="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors">
                        取消
                    </button>
                    <button id="confirm-add-phase" class="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 font-semibold hover:opacity-90 transition-opacity">
                        添加
                    </button>
                </div>
            </div>
        </div>
    `);

    document.getElementById('cancel-add-phase').addEventListener('click', Modal.hide);
    document.getElementById('confirm-add-phase').addEventListener('click', () => {
        addPhase(goal.id);
    });
}

// 添加阶段
function addPhase(goalId) {
    const name = document.getElementById('phase-name').value.trim();
    const startDate = document.getElementById('phase-start').value;
    const endDate = document.getElementById('phase-end').value;

    if (!name || !startDate || !endDate) {
        alert('请填写必填项');
        return;
    }

    const goals = appState.get('goals') || [];
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;

    if (!goal.phases) goal.phases = [];
    
    goal.phases.push({
        id: utils.generateId(),
        name,
        startDate,
        endDate,
        tasks: []
    });

    appState.set('goals', goals);
    Modal.hide();
    renderGoalDetail();
}

// 显示添加阶段任务模态框
function showAddPhaseTaskModal(phaseId) {
    const goals = appState.get('goals') || [];
    const goal = goals.find(g => g.id === currentGoalId);
    const phase = goal?.phases?.find(p => p.id === phaseId);
    if (!phase) return;

    Modal.show(`
        <div class="p-6">
            <h3 class="text-xl font-bold mb-6">添加小目标</h3>
            <div class="space-y-4">
                <div>
                    <label class="block text-sm text-white/70 mb-2">小目标名称 *</label>
                    <input type="text" id="phase-task-name" placeholder="输入小目标名称..."
                           class="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-400 transition-colors">
                </div>
                <div>
                    <label class="block text-sm text-white/70 mb-2">截止日期 *</label>
                    <input type="date" id="phase-task-date" min="${phase.startDate}" max="${phase.endDate}"
                           class="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-400 transition-colors">
                </div>
                <div class="flex gap-3 pt-4">
                    <button id="cancel-add-phase-task" class="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors">
                        取消
                    </button>
                    <button id="confirm-add-phase-task" class="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 font-semibold hover:opacity-90 transition-opacity" data-phase-id="${phaseId}">
                        添加
                    </button>
                </div>
            </div>
        </div>
    `);

    document.getElementById('cancel-add-phase-task').addEventListener('click', Modal.hide);
    document.getElementById('confirm-add-phase-task').addEventListener('click', (e) => {
        addPhaseTask(e.target.dataset.phaseId);
    });
}

// 添加阶段任务
function addPhaseTask(phaseId) {
    const name = document.getElementById('phase-task-name').value.trim();
    const dueDate = document.getElementById('phase-task-date').value;

    if (!name || !dueDate) {
        alert('请填写必填项');
        return;
    }

    const goals = appState.get('goals') || [];
    const goal = goals.find(g => g.id === currentGoalId);
    const phase = goal?.phases?.find(p => p.id === phaseId);
    if (!phase) return;

    if (!phase.tasks) phase.tasks = [];
    
    phase.tasks.push({
        id: utils.generateId(),
        name,
        dueDate,
        completed: false
    });

    appState.set('goals', goals);
    Modal.hide();
    renderGoalDetail();
}

// 初始化目标模块
function initGoalModule() {
    renderGoalList();

    // 绑定创建目标按钮
    const createBtn = document.getElementById('create-goal');
    if (createBtn) {
        createBtn.addEventListener('click', showCreateGoalModal);
    }

    // 绑定返回按钮
    const backBtn = document.getElementById('back-to-goals');
    if (backBtn) {
        backBtn.addEventListener('click', () => router.navigate('goal'));
    }

    // 绑定搜索框 - 添加防抖300ms
    const searchInput = document.getElementById('goal-search');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            clearTimeout(goalSearchTimeout);
            goalSearchTimeout = setTimeout(() => {
                goalSearchQuery = searchInput.value.trim();
                renderGoalList();
            }, 300);
        });
    }

    // 事件委托
    document.addEventListener('click', (e) => {
        // 阶段折叠/展开
        const phaseHeader = e.target.closest('.phase-header');
        if (phaseHeader) {
            const phaseId = phaseHeader.dataset.phaseId;
            const content = document.querySelector(`.collapsible-content[data-phase-id="${phaseId}"]`);
            const toggle = phaseHeader.querySelector('.phase-toggle');
            if (content && toggle) {
                content.classList.toggle('collapsed');
                // 同时切换父元素phase-content的collapsed类，用于隐藏边框
                const phaseContent = content.parentElement;
                if (phaseContent && phaseContent.classList.contains('phase-content')) {
                    phaseContent.classList.toggle('collapsed', content.classList.contains('collapsed'));
                }
                toggle.style.transform = content.classList.contains('collapsed') ? 'rotate(-90deg)' : '';
            }
        }

        // 阶段完成状态切换
        const completePhaseToggle = e.target.closest('.complete-phase-toggle');
        if (completePhaseToggle) {
            e.stopPropagation();
            togglePhaseComplete(completePhaseToggle.dataset.phaseId);
        }

        // 添加阶段任务
        const addTaskBtn = e.target.closest('.add-phase-task');
        if (addTaskBtn) {
            e.stopPropagation();
            showAddPhaseTaskModal(addTaskBtn.dataset.phaseId);
        }

        // 编辑阶段
        const editPhaseBtn = e.target.closest('.edit-phase');
        if (editPhaseBtn) {
            e.stopPropagation();
            showEditPhaseModal(editPhaseBtn.dataset.phaseId);
        }

        // 删除阶段
        const deletePhaseBtn = e.target.closest('.delete-phase');
        if (deletePhaseBtn) {
            e.stopPropagation();
            deletePhase(deletePhaseBtn.dataset.phaseId);
        }

        // 删除阶段任务
        const deleteTaskBtn = e.target.closest('.delete-phase-task');
        if (deleteTaskBtn) {
            e.stopPropagation();
            deletePhaseTask(deleteTaskBtn.dataset.phaseId, deleteTaskBtn.dataset.taskId);
        }

        // 完成阶段任务
        const completeBtn = e.target.closest('.complete-phase-task');
        if (completeBtn) {
            e.stopPropagation();
            togglePhaseTaskComplete(completeBtn.dataset.phaseId, completeBtn.dataset.taskId, completeBtn);
        }

        // 编辑阶段任务
        const editBtn = e.target.closest('.edit-phase-task');
        if (editBtn) {
            e.stopPropagation();
            showEditPhaseTaskModal(editBtn.dataset.phaseId, editBtn.dataset.taskId);
        }

        // 阶段任务过滤
        const filterBtn = e.target.closest('.phase-task-filter');
        if (filterBtn) {
            e.stopPropagation();
            const phaseId = filterBtn.dataset.phaseId;
            const filter = filterBtn.dataset.filter;
            goalTaskFilter[phaseId] = filter;
            renderGoalDetail();
        }
    });
}

// 删除阶段
function deletePhase(phaseId) {
    if (!confirm('确定要删除这个阶段吗？')) return;

    const goals = appState.get('goals') || [];
    const goal = goals.find(g => g.id === currentGoalId);
    if (goal && goal.phases) {
        goal.phases = goal.phases.filter(p => p.id !== phaseId);
        appState.set('goals', goals);
        renderGoalDetail();
    }
}

// 删除阶段任务
function deletePhaseTask(phaseId, taskId) {
    if (!confirm('确定要删除这个小目标吗？')) return;

    const goals = appState.get('goals') || [];
    const goal = goals.find(g => g.id === currentGoalId);
    const phase = goal?.phases?.find(p => p.id === phaseId);
    if (phase && phase.tasks) {
        phase.tasks = phase.tasks.filter(t => t.id !== taskId);
        appState.set('goals', goals);
        Toast.success('小目标已删除');
        renderGoalDetail();
    }
}

// 切换阶段任务完成状态
function togglePhaseTaskComplete(phaseId, taskId, buttonElement) {
    const goals = appState.get('goals') || [];
    const goal = goals.find(g => g.id === currentGoalId);
    const phase = goal?.phases?.find(p => p.id === phaseId);
    const task = phase?.tasks?.find(t => t.id === taskId);
    if (task) {
        task.completed = !task.completed;
        if (task.completed) {
            task.completedAt = new Date().toISOString();
            Toast.success('小目标已完成！🎉');
        }
        appState.set('goals', goals);
        
        // 添加完成动画
        const taskItem = buttonElement.closest('.phase-task-item');
        if (taskItem && task.completed) {
            taskItem.classList.add('completing');
            setTimeout(() => taskItem.classList.remove('completing'), 500);
        }
        
        renderGoalDetail();
    }
}

// 显示编辑阶段任务模态框
function showEditPhaseTaskModal(phaseId, taskId) {
    const goals = appState.get('goals') || [];
    const goal = goals.find(g => g.id === currentGoalId);
    const phase = goal?.phases?.find(p => p.id === phaseId);
    const task = phase?.tasks?.find(t => t.id === taskId);
    if (!phase || !task) return;

    Modal.show(`
        <div class="p-6">
            <h3 class="text-xl font-bold mb-6">编辑小目标</h3>
            <div class="space-y-4">
                <div>
                    <label class="block text-sm text-white/70 mb-2">小目标名称 *</label>
                    <input type="text" id="edit-phase-task-name" value="${task.name}"
                           class="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-400 transition-colors">
                </div>
                <div>
                    <label class="block text-sm text-white/70 mb-2">截止日期 *</label>
                    <input type="date" id="edit-phase-task-date" value="${task.dueDate}"
                           min="${phase.startDate}" max="${phase.endDate}"
                           class="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-400 transition-colors">
                </div>
                <div class="flex gap-3 pt-4">
                    <button id="cancel-edit-phase-task" class="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors">
                        取消
                    </button>
                    <button id="confirm-edit-phase-task" class="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 font-semibold hover:opacity-90 transition-opacity" 
                            data-phase-id="${phaseId}" data-task-id="${taskId}">
                        保存
                    </button>
                </div>
            </div>
        </div>
    `);

    document.getElementById('cancel-edit-phase-task').addEventListener('click', Modal.hide);
    document.getElementById('confirm-edit-phase-task').addEventListener('click', (e) => {
        editPhaseTask(e.target.dataset.phaseId, e.target.dataset.taskId);
    });
}

// 编辑阶段任务
function editPhaseTask(phaseId, taskId) {
    const name = document.getElementById('edit-phase-task-name').value.trim();
    const dueDate = document.getElementById('edit-phase-task-date').value;

    if (!name || !dueDate) {
        Toast.error('请填写必填项');
        return;
    }

    const goals = appState.get('goals') || [];
    const goal = goals.find(g => g.id === currentGoalId);
    const phase = goal?.phases?.find(p => p.id === phaseId);
    const task = phase?.tasks?.find(t => t.id === taskId);
    if (!task) return;

    task.name = name;
    task.dueDate = dueDate;

    appState.set('goals', goals);
    Modal.hide();
    Toast.success('小目标已更新');
    renderGoalDetail();
}

// 渲染目标完成趋势图表 - 显示所有小目标完成情况
function renderGoalChart(goal) {
    const ctx = document.getElementById('goal-chart');
    if (!ctx) {
        console.log('goal-chart canvas not found');
        return;
    }

    // 确保 canvas 有父容器且可见
    const parent = ctx.parentElement;
    if (!parent || parent.offsetHeight === 0) {
        console.log('Canvas parent not visible');
        return;
    }

    // 销毁旧图表
    if (goalChart) {
        try {
            goalChart.destroy();
            goalChart = null;
        } catch (e) {
            console.log('Error destroying chart:', e);
        }
    }

    // 收集所有阶段的所有小目标
    const phases = goal.phases || [];
    let allTasks = [];
    
    phases.forEach(phase => {
        const tasks = phase.tasks || [];
        allTasks = allTasks.concat(tasks.map(task => ({
            ...task,
            phaseName: phase.name
        })));
    });

    // 计算总任务数和完成数
    const totalTasks = allTasks.length;
    const completedTasks = allTasks.filter(task => task.completed).length;
    const remainingTasks = totalTasks - completedTasks;

    if (totalTasks === 0) {
        // 没有小目标时显示空状态
        ctx.parentElement.innerHTML = `
            <div class="text-center py-8 text-white/50">
                <i class="fas fa-chart-pie text-4xl mb-4"></i>
                <p>暂无小目标数据</p>
                <p class="text-sm mt-2">添加阶段和小目标后显示图表</p>
            </div>
        `;
        return;
    }

    // 准备饼状图数据 - 显示已完成和未完成
    const labels = ['已完成', '未完成'];
    const data = [completedTasks, remainingTasks];
    const backgroundColors = [
        'rgba(34, 197, 94, 0.7)',    // 绿色 - 已完成
        'rgba(239, 68, 68, 0.7)'     // 红色 - 未完成
    ];
    
    const completionRate = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

    goalChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: backgroundColors,
                borderColor: 'rgba(255, 255, 255, 0.2)',
                borderWidth: 1,
                hoverOffset: 15
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                animateScale: true,
                animateRotate: true,
                duration: 800
            },
            plugins: {
                legend: {
                    position: 'right',
                    labels: { 
                        color: 'rgba(255, 255, 255, 0.6)',
                        padding: 20,
                        font: { size: 11 }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = labels[context.dataIndex];
                            const value = data[context.dataIndex];
                            const percentage = totalTasks === 0 ? 0 : Math.round((value / totalTasks) * 100);
                            return [
                                `状态: ${label}`,
                                `数量: ${value}/${totalTasks}`,
                                `占比: ${percentage}%`
                            ];
                        },
                        afterLabel: function(context) {
                            if (context.dataIndex === 0) {
                                return `总完成率: ${completionRate}%`;
                            }
                            return null;
                        }
                    }
                }
            }
        }
    });
}

// 切换阶段完成状态
function togglePhaseComplete(phaseId) {
    const goals = appState.get('goals') || [];
    const goal = goals.find(g => g.id === currentGoalId);
    const phase = goal?.phases?.find(p => p.id === phaseId);
    if (!phase || !phase.tasks) return;
    
    // 检查阶段是否已经全部完成
    const allCompleted = phase.tasks.every(task => task.completed);
    
    // 切换所有任务的完成状态
    phase.tasks.forEach(task => {
        task.completed = !allCompleted;
        if (task.completed && !allCompleted) {
            task.completedAt = new Date().toISOString();
        }
    });
    
    appState.set('goals', goals);
    Toast.success(allCompleted ? '阶段已标记为未完成' : '阶段已标记为完成！');
    renderGoalDetail();
}

// 显示编辑阶段模态框
function showEditPhaseModal(phaseId) {
    const goals = appState.get('goals') || [];
    const goal = goals.find(g => g.id === currentGoalId);
    const phase = goal?.phases?.find(p => p.id === phaseId);
    if (!goal || !phase) return;

    Modal.show(`
        <div class="p-6">
            <h3 class="text-xl font-bold mb-6">编辑阶段</h3>
            <div class="space-y-4">
                <div>
                    <label class="block text-sm text-white/70 mb-2">阶段名称 *</label>
                    <input type="text" id="edit-phase-name" value="${phase.name}"
                           class="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-400 transition-colors">
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm text-white/70 mb-2">开始日期 *</label>
                        <input type="date" id="edit-phase-start" value="${phase.startDate}" min="${goal.startDate}" max="${goal.endDate}"
                               class="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-400 transition-colors">
                    </div>
                    <div>
                        <label class="block text-sm text-white/70 mb-2">结束日期 *</label>
                        <input type="date" id="edit-phase-end" value="${phase.endDate}" min="${goal.startDate}" max="${goal.endDate}"
                               class="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-400 transition-colors">
                    </div>
                </div>
                <div class="flex gap-3 pt-4">
                    <button id="cancel-edit-phase" class="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors">
                        取消
                    </button>
                    <button id="confirm-edit-phase" class="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 font-semibold hover:opacity-90 transition-opacity" data-phase-id="${phaseId}">
                        保存
                    </button>
                </div>
            </div>
        </div>
    `);

    document.getElementById('cancel-edit-phase').addEventListener('click', Modal.hide);
    document.getElementById('confirm-edit-phase').addEventListener('click', (e) => {
        editPhase(e.target.dataset.phaseId);
    });
}

// 编辑阶段
function editPhase(phaseId) {
    const name = document.getElementById('edit-phase-name').value.trim();
    const startDate = document.getElementById('edit-phase-start').value;
    const endDate = document.getElementById('edit-phase-end').value;

    if (!name || !startDate || !endDate) {
        alert('请填写必填项');
        return;
    }

    const goals = appState.get('goals') || [];
    const goal = goals.find(g => g.id === currentGoalId);
    const phase = goal?.phases?.find(p => p.id === phaseId);
    if (!phase) return;

    phase.name = name;
    phase.startDate = startDate;
    phase.endDate = endDate;

    appState.set('goals', goals);
    Modal.hide();
    Toast.success('阶段已更新');
    renderGoalDetail();
}

// 监听页面加载
window.addEventListener('pageLoaded', (e) => {
    if (e.detail.page === 'goal') {
        renderGoalList();
    } else if (e.detail.page === 'goal-detail') {
        if (e.detail.params?.goalId) {
            currentGoalId = e.detail.params.goalId;
        }
        renderGoalDetail();
    }
});

// 页面加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGoalModule);
} else {
    setTimeout(initGoalModule, 400);
}

// 暴露全局函数
window.initGoalModule = initGoalModule;
window.renderGoalList = renderGoalList;