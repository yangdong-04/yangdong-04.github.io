// 心情记录模块

const moodOptions = [
    { emoji: '😊', label: '开心', color: '#fbbf24' },
    { emoji: '😄', label: '兴奋', color: '#f97316' },
    { emoji: '😌', label: '平静', color: '#22c55e' },
    { emoji: '😔', label: '难过', color: '#60a5fa' },
    { emoji: '😤', label: '生气', color: '#ef4444' },
    { emoji: '😴', label: '疲惫', color: '#a78bfa' },
    { emoji: '🤔', label: '思考', color: '#06b6d4' },
    { emoji: '🥰', label: '感恩', color: '#ec4899' }
];

let selectedMood = null;

// 渲染心情选项
function renderMoodOptions() {
    const container = document.getElementById('mood-options');
    if (!container) return;

    container.innerHTML = moodOptions.map((mood, index) => `
        <button type="button" class="mood-btn flex flex-col items-center p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all" data-index="${index}">
            <span class="text-4xl mb-2">${mood.emoji}</span>
            <span class="text-sm text-white/70">${mood.label}</span>
        </button>
    `).join('');

    // 绑定点击事件
    container.querySelectorAll('.mood-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const index = parseInt(btn.dataset.index);
            selectMood(index);
        });
    });
}

// 选择心情
function selectMood(index) {
    selectedMood = moodOptions[index];
    
    // 更新UI
    document.querySelectorAll('.mood-btn').forEach((btn, i) => {
        if (i === index) {
            btn.classList.add('selected', 'ring-2', 'ring-purple-400');
            btn.style.background = `${selectedMood.color}30`;
        } else {
            btn.classList.remove('selected', 'ring-2', 'ring-purple-400');
            btn.style.background = '';
        }
    });

    // 清空自定义输入
    document.getElementById('custom-mood').value = '';
}

// 保存心情
function saveMood() {
    const customMood = document.getElementById('custom-mood').value.trim();
    const note = document.getElementById('mood-note').value.trim();

    if (!selectedMood && !customMood) {
        alert('请选择或输入一个心情');
        return;
    }

    const mood = {
        id: utils.generateId(),
        emoji: selectedMood ? selectedMood.emoji : '❤️',
        label: customMood || selectedMood.label,
        color: selectedMood ? selectedMood.color : '#ec4899',
        note: note,
        timestamp: new Date().toISOString()
    };

    const moods = appState.get('moods') || [];
    moods.unshift(mood); // 添加到开头
    appState.set('moods', moods);

    // 清空表单
    selectedMood = null;
    document.getElementById('custom-mood').value = '';
    document.getElementById('mood-note').value = '';
    document.querySelectorAll('.mood-btn').forEach(btn => {
        btn.classList.remove('selected', 'ring-2', 'ring-purple-400');
        btn.style.background = '';
    });

    // 重新渲染历史
    renderMoodHistory();
}

// 渲染心情历史
function renderMoodHistory() {
    const container = document.getElementById('mood-history');
    if (!container) return;

    const moods = appState.get('moods') || [];

    if (moods.length === 0) {
        container.innerHTML = `
            <div class="text-center py-12 text-white/50">
                <i class="fas fa-heart text-4xl mb-4"></i>
                <p>还没有心情记录</p>
                <p class="text-sm mt-2">记录你的第一条心情吧！</p>
            </div>
        `;
        return;
    }

    container.innerHTML = moods.map(mood => `
        <div class="flex items-start gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
            <div class="text-3xl">${mood.emoji}</div>
            <div class="flex-1">
                <div class="flex items-center justify-between mb-1">
                    <span class="font-semibold" style="color: ${mood.color}">${mood.label}</span>
                    <span class="text-sm text-white/50">
                        ${new Date(mood.timestamp).toLocaleString('zh-CN')}
                    </span>
                </div>
                ${mood.note ? `<p class="text-white/70 text-sm">${mood.note}</p>` : ''}
            </div>
            <button class="delete-mood p-2 text-white/30 hover:text-red-400 transition-colors" data-id="${mood.id}">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');

    // 绑定删除事件
    container.querySelectorAll('.delete-mood').forEach(btn => {
        btn.addEventListener('click', () => {
            if (confirm('确定要删除这条记录吗？')) {
                const id = btn.dataset.id;
                const filtered = moods.filter(m => m.id !== id);
                appState.set('moods', filtered);
                renderMoodHistory();
            }
        });
    });
}

// 初始化模块
function initMoodModule() {
    renderMoodOptions();
    renderMoodHistory();

    // 绑定保存按钮
    const saveBtn = document.getElementById('save-mood');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveMood);
    }
}

// 监听页面加载
window.addEventListener('pageLoaded', (e) => {
    if (e.detail.page === 'mood') {
        renderMoodHistory();
    }
});

// 页面加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMoodModule);
} else {
    setTimeout(initMoodModule, 200);
}

// 暴露全局函数
window.initMoodModule = initMoodModule;
window.renderMoodHistory = renderMoodHistory;
