// Task Manager JavaScript
let tasks = JSON.parse(localStorage.getItem('adhdTasks')) || [];
let focusPoints = parseInt(localStorage.getItem('focusPoints')) || 0;
let monthlyCompletedTasks = JSON.parse(localStorage.getItem('monthlyCompletedTasks')) || {};
let currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
let timerInterval;
let timerMinutes = 25;
let timerSeconds = 0;
let isTimerRunning = false;

// Reward Shop System Variables
let rewards = JSON.parse(localStorage.getItem('rewards')) || [];
let purchasedRewards = JSON.parse(localStorage.getItem('purchasedRewards')) || [];
let pointHistory = JSON.parse(localStorage.getItem('pointHistory')) || [];

// Gantt Chart Variables
let ganttView = 'week'; // 'week' or 'month'
let currentGanttDate = new Date();
let ganttData = {
    dependencies: new Map(),
    milestones: new Map(),
    dragState: null,
    selectedTasks: new Set(),
    connectionState: null
};
let ganttFilters = {
    priority: 'all', // 'all', 'high', 'medium', 'low'
    status: 'all', // 'all', 'active', 'completed'
    search: ''
};

// CSV Import Variables
let csvData = [];
let csvHeaders = [];
let csvImportVisible = false;

console.log('🚀 Task Manager システム初期化開始');

// 既存タスクのcompletedAtフィールドを補完
function migrateTaskData() {
    let migrated = false;
    tasks.forEach(task => {
        if (task.completed && !task.completedAt) {
            // 完了済みだがcompletedAtがない場合、createdAtを使用
            task.completedAt = task.createdAt || new Date().toISOString();
            migrated = true;
        }
    });
    
    if (migrated) {
        saveData();
        console.log('📊 タスクデータ移行完了: completedAtフィールドを追加');
    }
}

// データ移行を実行
migrateTaskData();

function saveData() {
    localStorage.setItem('adhdTasks', JSON.stringify(tasks));
    localStorage.setItem('focusPoints', focusPoints.toString());
    localStorage.setItem('pointHistory', JSON.stringify(pointHistory));
    localStorage.setItem('monthlyCompletedTasks', JSON.stringify(monthlyCompletedTasks));
    localStorage.setItem('rewards', JSON.stringify(rewards));
    localStorage.setItem('purchasedRewards', JSON.stringify(purchasedRewards));
    localStorage.setItem('ganttData', JSON.stringify({
        dependencies: Array.from(ganttData.dependencies.entries()),
        milestones: Array.from(ganttData.milestones.entries())
    }));
}

function loadGanttData() {
    const saved = localStorage.getItem('ganttData');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            ganttData.dependencies = new Map(data.dependencies || []);
            ganttData.milestones = new Map(data.milestones || []);
            console.log('✅ ガントデータ読み込み完了:', {
                依存関係: ganttData.dependencies.size,
                マイルストーン: ganttData.milestones.size
            });
        } catch (e) {
            console.warn('⚠️ ガントデータ読み込みエラー:', e);
        }
    }
}

// Page Navigation
function switchPage(pageId) {
    console.log('🔄 ページ切り替え開始:', pageId);
    
    try {
        // Hide all pages
        document.querySelectorAll('.page-content').forEach(page => {
            page.classList.remove('active');
        });
        
        // Remove active class from all nav buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Show selected page
        const targetPage = document.getElementById(pageId + 'Page');
        if (targetPage) {
            targetPage.classList.add('active');
            console.log('✅ ページ表示:', pageId + 'Page');
        } else {
            console.error('❌ ページが見つかりません:', pageId + 'Page');
            return;
        }
        
        // Add active class to clicked nav button
        const activeBtn = document.querySelector(`[onclick="switchPage('${pageId}')"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
        
        // ページ固有の初期化処理
        if (pageId === 'gantt') {
            // ガントチャートページに切り替えた時の処理
            setTimeout(() => {
                renderGanttChart();
            }, 100);
        } else if (pageId === 'character') {
            // ご褒美ショップページに切り替えた時の処理
            setTimeout(() => {
                renderRewards();
                updateShopPoints();
            }, 100);
        } else if (pageId === 'tasks') {
            // タスク管理ページに切り替えた時の処理
            setTimeout(() => {
                updateStats();
                renderTasks();
            }, 100);
        }
        
        console.log('✅ ページ切り替え完了:', pageId);
        
    } catch (error) {
        console.error('❌ ページ切り替えエラー:', error);
    }
}

// Task Management Functions
function addTask() {
    const taskInput = document.getElementById('taskInput');
    const prioritySelect = document.getElementById('prioritySelect');
    const pointsSelect = document.getElementById('taskPoints');
    const startDateInput = document.getElementById('taskStartDate');
    const endDateInput = document.getElementById('taskEndDate');
    
    const taskText = taskInput.value.trim();
    const priority = prioritySelect.value;
    const pointsType = pointsSelect.value;
    const startDate = startDateInput.value;
    const endDate = endDateInput.value;
    
    if (taskText === '') {
        alert('タスクを入力してください');
        return;
    }
    
    // Calculate points based on selection
    let points;
    switch(pointsType) {
        case 'high': points = 20; break;
        case 'medium': points = 15; break;
        case 'low': points = 10; break;
        default: points = 15;
    }
    
    const task = {
        id: Date.now(),
        content: taskText,
        priority: priority,
        points: points,
        completed: false,
        createdAt: new Date().toISOString(),
        startDate: startDate || null,
        endDate: endDate || null
    };
    
    tasks.push(task);
    saveData();
    
    // Clear inputs
    taskInput.value = '';
    prioritySelect.value = 'medium';
    pointsSelect.value = 'medium';
    
    // Set default dates for next task
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    startDateInput.value = today.toISOString().split('T')[0];
    endDateInput.value = tomorrow.toISOString().split('T')[0];
    
    updateStats();
    renderTasks();
    
    console.log('✅ タスク追加:', task);
}

function completeTask(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (task && !task.completed) {
        task.completed = true;
        task.completedAt = new Date().toISOString();
        
        // Add points
        focusPoints += task.points;
        
        // Add to point history
        addPointHistory(task.points, `タスク完了: ${task.content}`);
        
        // Update monthly completed tasks
        if (!monthlyCompletedTasks[currentMonth]) {
            monthlyCompletedTasks[currentMonth] = 0;
        }
        monthlyCompletedTasks[currentMonth]++;
        
        saveData();
        updateStats();
        renderTasks();
        
        // Show achievement
        showAchievement('🎉', `タスク完了！\n+${task.points}ポイント獲得`);
        
        console.log('✅ タスク完了:', task);
    }
}

function deleteTask(taskId) {
    if (confirm('このタスクを削除しますか？')) {
        tasks = tasks.filter(t => t.id !== taskId);
        saveData();
        updateStats();
        renderTasks();
        
        console.log('🗑️ タスク削除:', taskId);
    }
}

function renderTasks() {
    const urgentContainer = document.getElementById('urgentTasks');
    const normalContainer = document.getElementById('normalTasks');
    
    if (!urgentContainer || !normalContainer) return;
    
    urgentContainer.innerHTML = '';
    normalContainer.innerHTML = '';
    
    const incompleteTasks = tasks.filter(task => !task.completed);
    
    incompleteTasks.forEach(task => {
        const taskElement = createTaskElement(task);
        
        if (task.priority === 'high') {
            urgentContainer.appendChild(taskElement);
        } else {
            normalContainer.appendChild(taskElement);
        }
    });
}

function createTaskElement(task) {
    const taskDiv = document.createElement('div');
    taskDiv.className = `task-item priority-${task.priority}`;
    
    const priorityText = {
        'high': '緊急・重要',
        'medium': '普通',
        'low': '低優先度'
    };
    
    taskDiv.innerHTML = `
        <div class="task-content">${task.content}</div>
        <div class="task-meta">
            <span class="priority-badge priority-${task.priority}">${priorityText[task.priority]}</span>
            <span class="task-points">
                <i class="fas fa-star"></i>
                ${task.points}pt
            </span>
        </div>
        ${task.startDate && task.endDate ? `
        <div class="task-dates">
            <small>📅 ${task.startDate} → ${task.endDate}</small>
        </div>
        ` : ''}
        <div class="task-actions">
            <button class="action-btn complete-btn" onclick="completeTask(${task.id})">
                <i class="fas fa-check"></i>
                完了
            </button>
            <button class="action-btn delete-btn" onclick="deleteTask(${task.id})">
                <i class="fas fa-trash"></i>
                削除
            </button>
        </div>
    `;
    
    return taskDiv;
}

function updateStats() {
    const incompleteTasks = tasks.filter(task => !task.completed);
    
    // 実際に完了したタスクの数を計算（今月完了したタスクを正確にカウント）
    const currentMonthStart = new Date();
    currentMonthStart.setDate(1);
    currentMonthStart.setHours(0, 0, 0, 0);
    
    const completedTasksThisMonth = tasks.filter(task => {
        if (!task.completed || !task.completedAt) return false;
        const completedDate = new Date(task.completedAt);
        return completedDate >= currentMonthStart;
    }).length;
    
    // Update task counts
    document.getElementById('totalTasks').textContent = incompleteTasks.length;
    document.getElementById('completedTasks').textContent = completedTasksThisMonth;
    document.getElementById('focusPoints').textContent = focusPoints;
    
    // Update shop points
    const shopPointsElement = document.getElementById('shopPoints');
    if (shopPointsElement) {
        shopPointsElement.textContent = focusPoints;
    }
    
    // Update progress bars
    const totalProgress = Math.min((10 - incompleteTasks.length) / 10 * 100, 100);
    document.getElementById('totalProgress').style.width = `${Math.max(totalProgress, 0)}%`;
    
    const completedProgress = Math.min(completedTasksThisMonth / 30 * 100, 100);
    document.getElementById('completedProgress').style.width = `${completedProgress}%`;
    
    const pointsProgress = Math.min(focusPoints / 1000 * 100, 100);
    document.getElementById('pointsProgress').style.width = `${pointsProgress}%`;
    
    // Update text displays
    document.getElementById('pointsLevel').textContent = `${focusPoints}pt`;
}

// Timer Functions
function updateTimerSetting() {
    const input = document.getElementById('timerMinutes');
    timerMinutes = parseInt(input.value) || 25;
    if (!isTimerRunning) {
        timerSeconds = 0;
        updateTimerDisplay();
    }
}

function adjustTimer(minutes) {
    const input = document.getElementById('timerMinutes');
    const currentValue = parseInt(input.value) || 25;
    const newValue = Math.max(1, Math.min(120, currentValue + minutes));
    input.value = newValue;
    updateTimerSetting();
}

function updateTimerDisplay() {
    const display = document.getElementById('timerDisplay');
    const minutes = Math.floor((timerMinutes * 60 + timerSeconds) / 60);
    const seconds = (timerMinutes * 60 + timerSeconds) % 60;
    display.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function startTimer() {
    if (!isTimerRunning) {
        isTimerRunning = true;
        timerInterval = setInterval(() => {
            if (timerMinutes === 0 && timerSeconds === 0) {
                // Timer finished
                clearInterval(timerInterval);
                isTimerRunning = false;
                
                // Add focus points
                const points = 25; // Fixed points for completing a focus session
                focusPoints += points;
                addPointHistory(points, 'ポモドーロタイマー完了');
                
                saveData();
                updateStats();
                
                showAchievement('🍅', `ポモドーロ完了！\n+${points}ポイント獲得`);
                
                // Reset timer
                timerMinutes = parseInt(document.getElementById('timerMinutes').value) || 25;
                timerSeconds = 0;
                updateTimerDisplay();
            } else {
                if (timerSeconds === 0) {
                    timerMinutes--;
                    timerSeconds = 59;
                } else {
                    timerSeconds--;
                }
                updateTimerDisplay();
            }
        }, 1000);
    }
}

function pauseTimer() {
    if (isTimerRunning) {
        clearInterval(timerInterval);
        isTimerRunning = false;
    }
}

function resetTimer() {
    clearInterval(timerInterval);
    isTimerRunning = false;
    timerMinutes = parseInt(document.getElementById('timerMinutes').value) || 25;
    timerSeconds = 0;
    updateTimerDisplay();
}

// Points Management
function addPointHistory(points, reason) {
    const entry = {
        id: Date.now(),
        points: points,
        reason: reason,
        timestamp: new Date().toISOString()
    };
    
    pointHistory.unshift(entry);
    
    // Keep only last 50 entries
    if (pointHistory.length > 50) {
        pointHistory = pointHistory.slice(0, 50);
    }
}

function showPointsMenu(event) {
    event.stopPropagation();
    const overlay = document.getElementById('pointsMenuOverlay');
    overlay.style.display = 'block';
    
    renderPointHistory();
}

function closePointsMenu() {
    const overlay = document.getElementById('pointsMenuOverlay');
    overlay.style.display = 'none';
}

function renderPointHistory() {
    const container = document.getElementById('pointHistoryContainer');
    if (!container) return;
    
    const recent = pointHistory.slice(0, 10);
    
    container.innerHTML = recent.map(entry => `
        <div class="history-item">
            <div class="history-content">
                <div class="history-date">${new Date(entry.timestamp).toLocaleDateString('ja-JP')}</div>
                <div class="history-reason">${entry.reason}</div>
            </div>
            <div class="history-points">+${entry.points}pt</div>
        </div>
    `).join('');
}

function addManualPoints() {
    const input = document.getElementById('manualPointsInput');
    const points = parseInt(input.value);
    
    if (points && points > 0) {
        focusPoints += points;
        addPointHistory(points, '手動追加');
        saveData();
        updateStats();
        renderPointHistory();
        input.value = '';
        
        showAchievement('⭐', `+${points}ポイント追加！`);
    }
}

function subtractManualPoints() {
    const input = document.getElementById('manualPointsInput');
    const points = parseInt(input.value);
    
    if (points && points > 0) {
        focusPoints = Math.max(0, focusPoints - points);
        addPointHistory(-points, '手動減算');
        saveData();
        updateStats();
        renderPointHistory();
        input.value = '';
    }
}

function resetPoints() {
    if (confirm('ポイントをリセットしますか？この操作は取り消せません。')) {
        focusPoints = 0;
        pointHistory = [];
        addPointHistory(0, 'ポイントリセット');
        saveData();
        updateStats();
        renderPointHistory();
        
        showAchievement('🔄', 'ポイントをリセットしました');
    }
}

// Achievement System
function showAchievement(emoji, text) {
    const achievement = document.createElement('div');
    achievement.className = 'achievement';
    achievement.innerHTML = `
        <div class="achievement-emoji">${emoji}</div>
        <div class="achievement-text">${text}</div>
    `;
    
    document.body.appendChild(achievement);
    
    setTimeout(() => {
        achievement.remove();
    }, 3000);
}

// Reward Shop Functions
function addReward() {
    const nameInput = document.getElementById('rewardName');
    const costInput = document.getElementById('rewardCost');
    const categorySelect = document.getElementById('rewardCategory');
    
    const name = nameInput.value.trim();
    const cost = parseInt(costInput.value);
    const category = categorySelect.value;
    
    if (!name || !cost || cost <= 0) {
        alert('ご褒美の名前と必要ポイントを正しく入力してください');
        return;
    }
    
    const reward = {
        id: Date.now(),
        name: name,
        cost: cost,
        category: category,
        createdAt: new Date().toISOString()
    };
    
    rewards.push(reward);
    saveData();
    
    nameInput.value = '';
    costInput.value = '';
    categorySelect.value = 'food';
    
    renderRewards();
    
    console.log('✅ ご褒美追加:', reward);
}

function purchaseReward(rewardId) {
    const reward = rewards.find(r => r.id === rewardId);
    if (!reward) return;
    
    if (focusPoints >= reward.cost) {
        if (confirm(`「${reward.name}」を${reward.cost}ポイントで購入しますか？`)) {
            focusPoints -= reward.cost;
            
            const purchase = {
                ...reward,
                purchasedAt: new Date().toISOString(),
                purchaseId: Date.now()
            };
            
            purchasedRewards.unshift(purchase);
            addPointHistory(-reward.cost, `ご褒美購入: ${reward.name}`);
            
            saveData();
            updateStats();
            renderRewards();
            
            showAchievement('🎁', `「${reward.name}」を購入しました！`);
        }
    } else {
        alert(`ポイントが不足しています。必要: ${reward.cost}pt, 現在: ${focusPoints}pt`);
    }
}

function deleteReward(rewardId) {
    if (confirm('このご褒美を削除しますか？')) {
        rewards = rewards.filter(r => r.id !== rewardId);
        saveData();
        renderRewards();
    }
}

function renderRewards() {
    const availableContainer = document.getElementById('availableRewards');
    const purchasedContainer = document.getElementById('purchasedRewards');
    
    if (!availableContainer || !purchasedContainer) return;
    
    // Render available rewards
    availableContainer.innerHTML = rewards.map(reward => {
        const categoryEmojis = {
            food: '🍰',
            entertainment: '🎮',
            shopping: '🛍️',
            relaxation: '🛁',
            other: '✨'
        };
        
        const canAfford = focusPoints >= reward.cost;
        
        return `
            <div class="task-item ${canAfford ? 'priority-low' : 'priority-medium'}">
                <div class="task-content">
                    ${categoryEmojis[reward.category]} ${reward.name}
                </div>
                <div class="task-meta">
                    <span class="task-points">
                        <i class="fas fa-star"></i>
                        ${reward.cost}pt
                    </span>
                </div>
                <div class="task-actions">
                    <button class="action-btn complete-btn" onclick="purchaseReward(${reward.id})" ${!canAfford ? 'disabled' : ''}>
                        <i class="fas fa-shopping-cart"></i>
                        購入
                    </button>
                    <button class="action-btn delete-btn" onclick="deleteReward(${reward.id})">
                        <i class="fas fa-trash"></i>
                        削除
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    // Render purchased rewards
    purchasedContainer.innerHTML = purchasedRewards.slice(0, 10).map(purchase => {
        const categoryEmojis = {
            food: '🍰',
            entertainment: '🎮',
            shopping: '🛍️',
            relaxation: '🛁',
            other: '✨'
        };
        
        return `
            <div class="task-item completed">
                <div class="task-content">
                    ${categoryEmojis[purchase.category]} ${purchase.name}
                </div>
                <div class="task-meta">
                    <span class="task-points">
                        <i class="fas fa-star"></i>
                        ${purchase.cost}pt
                    </span>
                    <small>購入日: ${new Date(purchase.purchasedAt).toLocaleDateString('ja-JP')}</small>
                </div>
            </div>
        `;
    }).join('');
}

function updateShopPoints() {
    const shopPointsElement = document.getElementById('shopPoints');
    if (shopPointsElement) {
        shopPointsElement.textContent = focusPoints;
    }
}

// Gantt Chart Functions
function renderGanttChart() {
    console.log('📊 ガントチャート描画開始');
    
    try {
        updateGanttStats();
        
        const ganttBody = document.getElementById('ganttBody');
        const timelineHeader = document.getElementById('timelineHeader');
        
        if (!ganttBody || !timelineHeader) {
            console.error('❌ ガントチャート要素が見つかりません', {
                ganttBody: !!ganttBody,
                timelineHeader: !!timelineHeader
            });
            return;
        }
        
        // Clear existing content
        ganttBody.innerHTML = '';
        timelineHeader.innerHTML = '';
        
        // Generate timeline
        const timeline = generateTimeline(ganttView, currentGanttDate);
        if (!timeline || timeline.length === 0) {
            console.error('❌ タイムライン生成に失敗');
            ganttBody.innerHTML = '<div class="gantt-error">タイムラインの生成に失敗しました</div>';
            return;
        }
        
        renderTimelineHeader(timeline);
        
        // Filter and sort tasks
        const filteredTasks = filterTasks(tasks);
        console.log('🔍 ソート関数呼び出し開始 - フィルタ後タスク数:', filteredTasks.length);
        const sortedTasks = sortTasksByDueDate(filteredTasks);
        console.log('🔍 ソート関数呼び出し完了 - ソート後タスク数:', sortedTasks.length);
        
        console.log(`📋 タスク処理完了:`, {
            全タスク: tasks.length,
            フィルタ後: filteredTasks.length,
            ソート後: sortedTasks.length,
            フィルタ条件: ganttFilters
        });
        
        // タスクが存在しない場合の表示
        if (sortedTasks.length === 0) {
            ganttBody.innerHTML = `
                <div class="gantt-empty">
                    <div class="gantt-empty-icon">📋</div>
                    <div class="gantt-empty-title">表示するタスクがありません</div>
                    <div class="gantt-empty-description">
                        ${tasks.length === 0 ? 
                            'タスクを追加してください' : 
                            'フィルタ条件を変更するか、新しいタスクを追加してください'
                        }
                    </div>
                </div>
            `;
            updateCurrentPeriodDisplay();
            console.log('ℹ️ 表示するタスクがありません');
            return;
        }
        
        // Render task rows
        let successCount = 0;
        let errorCount = 0;
        
        sortedTasks.forEach((task, index) => {
            try {
                const row = createGanttTaskRow(task, timeline, 100 / timeline.length, 100);
                if (row) {
                    ganttBody.appendChild(row);
                    successCount++;
                } else {
                    console.warn('⚠️ タスク行の作成に失敗:', task.id);
                    errorCount++;
                }
            } catch (error) {
                console.error('❌ タスク行作成エラー:', task.id, error);
                errorCount++;
            }
        });
        
        // Update period display
        updateCurrentPeriodDisplay();
        
        console.log('✅ ガントチャート描画完了:', {
            成功: successCount,
            エラー: errorCount,
            タイムライン長: timeline.length
        });
        
    } catch (error) {
        console.error('❌ ガントチャート描画で致命的エラー:', error);
        const ganttBody = document.getElementById('ganttBody');
        if (ganttBody) {
            ganttBody.innerHTML = `
                <div class="gantt-error">
                    <div class="gantt-error-icon">⚠️</div>
                    <div class="gantt-error-title">ガントチャートの表示でエラーが発生しました</div>
                    <div class="gantt-error-description">ページを再読み込みしてください</div>
                </div>
            `;
        }
    }
}

function filterTasks(taskList) {
    if (!Array.isArray(taskList)) {
        console.warn('⚠️ タスクリストが配列ではありません:', taskList);
        return [];
    }
    
    return taskList.filter(task => {
        if (!task) return false;
        
        // Search filter
        if (ganttFilters.search) {
            const searchTerm = ganttFilters.search.toLowerCase();
            const content = (task.content || '').toLowerCase();
            if (!content.includes(searchTerm)) {
                return false;
            }
        }
        
        // Priority filter
        if (ganttFilters.priority !== 'all') {
            const taskPriority = task.priority || 'medium';
            if (taskPriority !== ganttFilters.priority) {
                return false;
            }
        }
        
        // Status filter
        if (ganttFilters.status === 'active' && task.completed) {
            return false;
        }
        if (ganttFilters.status === 'completed' && !task.completed) {
            return false;
        }
        
        return true;
    });
}

function sortTasksByDueDate(taskList) {
    if (!Array.isArray(taskList)) {
        console.warn('⚠️ ソート対象が配列ではありません:', taskList);
        return [];
    }
    
    console.log('🔄 ソート前のタスク順序:');
    taskList.forEach((task, index) => {
        console.log(`  ${index + 1}. ${task.content} - 期日: ${task.endDate || '未設定'} - 優先度: ${task.priority || 'medium'} - 完了: ${task.completed ? 'はい' : 'いいえ'}`);
    });
    
    const sorted = [...taskList].sort((a, b) => {
        // 完了タスクを下に移動
        if (a.completed && !b.completed) return 1;
        if (!a.completed && b.completed) return -1;
        
        // 期日が近いものを最優先で上に
        const aEndDate = parseTaskDate(a.endDate) || new Date('9999-12-31');
        const bEndDate = parseTaskDate(b.endDate) || new Date('9999-12-31');
        
        // 期日が異なる場合は期日順
        if (aEndDate.getTime() !== bEndDate.getTime()) {
            return aEndDate - bEndDate;
        }
        
        // 期日が同じ場合は優先度でソート（高→中→低）
        const priorityOrder = { 'high': 0, 'medium': 1, 'low': 2 };
        const aPriority = priorityOrder[a.priority] ?? 1;
        const bPriority = priorityOrder[b.priority] ?? 1;
        
        return aPriority - bPriority;
    });
    
    console.log('✅ ソート後のタスク順序:');
    sorted.forEach((task, index) => {
        console.log(`  ${index + 1}. ${task.content} - 期日: ${task.endDate || '未設定'} - 優先度: ${task.priority || 'medium'} - 完了: ${task.completed ? 'はい' : 'いいえ'}`);
    });
    
    return sorted;
}

function setGanttSearchFilter() {
    const searchInput = document.getElementById('ganttSearchInput');
    if (searchInput) {
        ganttFilters.search = searchInput.value.trim();
        console.log('🔍 検索フィルタ設定:', ganttFilters.search);
        renderGanttChart();
    }
}

function setGanttFilter(filterType, filterValue) {
    console.log('🔧 フィルタ設定:', filterType, filterValue);
    
    if (filterType === 'priority') {
        ganttFilters.priority = filterValue;
        
        // ボタンのアクティブ状態を更新
        document.querySelectorAll('.priority-filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const activeBtn = document.querySelector(`[onclick="setGanttFilter('priority', '${filterValue}')"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
        
    } else if (filterType === 'status') {
        ganttFilters.status = filterValue;
        
        // ボタンのアクティブ状態を更新
        document.querySelectorAll('.status-filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const activeBtn = document.querySelector(`[onclick="setGanttFilter('status', '${filterValue}')"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
    }
    
    console.log('📋 現在のフィルタ:', ganttFilters);
    renderGanttChart();
}

function clearGanttFilters() {
    console.log('🧹 フィルタクリア');
    
    // フィルタをリセット
    ganttFilters = {
        priority: 'all',
        status: 'all',
        search: ''
    };
    
    // 検索入力をクリア
    const searchInput = document.getElementById('ganttSearchInput');
    if (searchInput) {
        searchInput.value = '';
    }
    
    // すべてのフィルタボタンをリセット
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // 「すべて」ボタンをアクティブに
    document.querySelectorAll('[onclick*="\'all\'"]').forEach(btn => {
        btn.classList.add('active');
    });
    
    renderGanttChart();
}

function generateTimeline(view, date) {
    const timeline = [];
    const today = new Date(date);
    
    if (view === 'week') {
        // Generate 14 days (2 weeks) - 現在の週を中心に
        const startDate = new Date(today);
        startDate.setDate(today.getDate() - today.getDay()); // Start from Sunday
        
        for (let i = 0; i < 14; i++) {
            const currentDate = new Date(startDate);
            currentDate.setDate(startDate.getDate() + i);
            timeline.push(currentDate);
        }
    } else {
        // Generate current month
        const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
        
        for (let i = 0; i < daysInMonth; i++) {
            const currentDate = new Date(startDate);
            currentDate.setDate(i + 1);
            timeline.push(currentDate);
        }
    }
    
    console.log('📅 タイムライン生成完了:', {
        view: view,
        baseDate: today.toISOString().split('T')[0],
        timelineLength: timeline.length,
        startDate: timeline[0]?.toISOString().split('T')[0],
        endDate: timeline[timeline.length - 1]?.toISOString().split('T')[0]
    });
    
    return timeline;
}

function renderTimelineHeader(timeline) {
    const timelineHeader = document.getElementById('timelineHeader');
    if (!timelineHeader) {
        console.error('❌ timelineHeader要素が見つかりません');
        return;
    }
    
    const cellWidth = ganttView === 'week' ? 80 : 60;
    
    timelineHeader.innerHTML = timeline.map(date => {
        const isToday = isDateToday(date);
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        
        return `
            <div class="timeline-cell ${isToday ? 'today' : ''} ${isWeekend ? 'weekend' : ''}" 
                 style="min-width: ${cellWidth}px; width: ${cellWidth}px;">
                <div class="timeline-date">${formatTimelineDate(date)}</div>
                <div class="timeline-day">${formatDayOfWeek(date)}</div>
            </div>
        `;
    }).join('');
    
    console.log('📊 タイムラインヘッダー描画完了:', timeline.length, 'セル');
}

function formatTimelineDate(date) {
    if (ganttView === 'week') {
        return `${date.getMonth() + 1}/${date.getDate()}`;
    } else {
        return date.getDate().toString();
    }
}

function formatDayOfWeek(date) {
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    return days[date.getDay()];
}

function isDateToday(date) {
    const today = new Date();
    return date.getFullYear() === today.getFullYear() &&
           date.getMonth() === today.getMonth() &&
           date.getDate() === today.getDate();
}

function createGanttTaskRow(task, timeline, cellWidth, totalTimelineWidth) {
    console.log('🔨 タスク行作成開始:', {
        taskId: task.id,
        content: task.content,
        startDate: task.startDate,
        endDate: task.endDate,
        timelineLength: timeline.length
    });
    
    const row = document.createElement('div');
    row.className = 'gantt-row';
    row.setAttribute('data-task-id', task.id);
    
    // タスク情報部分
    const taskInfo = document.createElement('div');
    taskInfo.className = 'gantt-task-info';
    
    const priorityText = {
        'high': '緊急',
        'medium': '普通', 
        'low': '低'
    };
    
    const pointsValue = task.points || getDefaultPoints(task.priority);
    
    taskInfo.innerHTML = `
        <div class="gantt-task-header">
            <div class="gantt-task-title">${task.content || 'タスク名なし'}</div>
            <div class="gantt-task-actions">
                ${!task.completed ? `
                    <button class="gantt-action-btn complete-btn" onclick="completeTaskFromGantt(${task.id})" title="完了">
                        <i class="fas fa-check"></i>
                    </button>
                ` : ''}
                <button class="gantt-action-btn delete-btn" onclick="deleteTaskFromGantt(${task.id})" title="削除">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
        <div class="gantt-task-meta">
            <span class="priority-badge priority-${task.priority || 'medium'}">
                ${priorityText[task.priority] || '普通'}
            </span>
            <span class="gantt-task-points">${pointsValue}pt</span>
            <span class="gantt-task-dates">
                ${formatTaskDate(task.startDate)} → ${formatTaskDate(task.endDate)}
            </span>
            ${task.completed ? '<span class="task-status completed">✓ 完了</span>' : '<span class="task-status active">進行中</span>'}
        </div>
    `;
    
    // タイムライン部分
    const ganttTimeline = document.createElement('div');
    ganttTimeline.className = 'gantt-timeline';
    
    const actualCellWidth = ganttView === 'week' ? 80 : 60;
    
    // タスクの開始日と終了日を解析
    const taskStartDate = parseTaskDate(task.startDate);
    const taskEndDate = parseTaskDate(task.endDate);
    
    console.log('📅 タスク日付解析:', {
        taskId: task.id,
        originalStart: task.startDate,
        originalEnd: task.endDate,
        parsedStart: taskStartDate?.toISOString().split('T')[0],
        parsedEnd: taskEndDate?.toISOString().split('T')[0]
    });
    
    // タイムラインセルを作成
    timeline.forEach((date, index) => {
        const cell = document.createElement('div');
        cell.className = 'gantt-cell';
        cell.style.minWidth = `${actualCellWidth}px`;
        cell.style.width = `${actualCellWidth}px`;
        
        const isToday = isDateToday(date);
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        
        if (isToday) cell.classList.add('today');
        if (isWeekend) cell.classList.add('weekend');
        
        // タスクがこの日付に該当するかチェック
        if (taskStartDate && taskEndDate && isDateInRange(date, taskStartDate, taskEndDate)) {
            const bar = document.createElement('div');
            bar.className = `gantt-bar priority-${task.priority || 'medium'}`;
            
            if (task.completed) {
                bar.classList.add('completed');
            }
            
            // 開始日と終了日の場合は特別なスタイル
            if (isSameDate(date, taskStartDate)) {
                bar.classList.add('start');
            }
            if (isSameDate(date, taskEndDate)) {
                bar.classList.add('end');
            }
            
            // 期限切れチェック
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (!task.completed && taskEndDate < today) {
                bar.classList.add('overdue');
            }
            
            bar.title = `${task.content} (${pointsValue}pt)\n${formatTaskDate(task.startDate)} - ${formatTaskDate(task.endDate)}`;
            
            cell.appendChild(bar);
        }
        
        ganttTimeline.appendChild(cell);
    });
    
    row.appendChild(taskInfo);
    row.appendChild(ganttTimeline);
    
    console.log('✅ タスク行作成完了:', task.id);
    return row;
}

function parseTaskDate(dateString) {
    if (!dateString) return null;
    
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            console.warn('⚠️ 無効な日付:', dateString);
            return null;
        }
        
        // 時間を00:00:00に設定
        date.setHours(0, 0, 0, 0);
        return date;
    } catch (e) {
        console.warn('⚠️ 日付解析エラー:', dateString, e);
        return null;
    }
}

function formatTaskDate(dateString) {
    if (!dateString) return '未設定';
    
    const date = parseTaskDate(dateString);
    if (!date) return '無効な日付';
    
    return `${date.getMonth() + 1}/${date.getDate()}`;
}

function isDateInRange(date, startDate, endDate) {
    if (!startDate || !endDate) return false;
    
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    
    return checkDate >= startDate && checkDate <= endDate;
}

function isSameDate(date1, date2) {
    if (!date1 || !date2) return false;
    
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
}

function updateGanttStats() {
    try {
        const totalTasks = tasks.length;
        const activeTasks = tasks.filter(task => !task.completed).length;
        const completedThisMonth = getCompletedTasksThisMonth();
        const overdueTasks = getOverdueTasks().length;
        
        // DOM要素の更新
        const elements = {
            ganttTotalTasks: document.getElementById('ganttTotalTasks'),
            ganttActiveTasks: document.getElementById('ganttActiveTasks'),
            ganttCompletedTasks: document.getElementById('ganttCompletedTasks'),
            ganttOverdueTasks: document.getElementById('ganttOverdueTasks')
        };
        
        // 各要素が存在するかチェックして更新
        if (elements.ganttTotalTasks) elements.ganttTotalTasks.textContent = totalTasks;
        if (elements.ganttActiveTasks) elements.ganttActiveTasks.textContent = activeTasks;
        if (elements.ganttCompletedTasks) elements.ganttCompletedTasks.textContent = completedThisMonth;
        if (elements.ganttOverdueTasks) elements.ganttOverdueTasks.textContent = overdueTasks;
        
        console.log('📊 ガント統計更新完了:', {
            総タスク: totalTasks,
            進行中: activeTasks,
            今月完了: completedThisMonth,
            期限切れ: overdueTasks
        });
        
    } catch (error) {
        console.error('❌ ガント統計更新エラー:', error);
    }
}

function getCompletedTasksThisMonth() {
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    return tasks.filter(task => {
        if (!task.completed || !task.completedDate) return false;
        const completedMonth = task.completedDate.slice(0, 7);
        return completedMonth === currentMonth;
    }).length;
}

function getOverdueTasks() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return tasks.filter(task => {
        if (task.completed) return false;
        const endDate = parseTaskDate(task.endDate);
        return endDate && endDate < today;
    });
}

function setGanttView(view) {
    console.log('👁️ ビュー変更:', view);
    
    ganttView = view;
    
    // ビューボタンのアクティブ状態を更新
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const activeBtn = document.querySelector(`[onclick="setGanttView('${view}')"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
    
    updateCurrentPeriodDisplay();
    renderGanttChart();
}

function navigateGantt(direction) {
    console.log('🗓️ ナビゲーション:', direction);
    
    const currentDate = new Date(currentGanttDate);
    
    if (ganttView === 'week') {
        // 週単位で移動
        currentDate.setDate(currentDate.getDate() + (direction * 7));
    } else {
        // 月単位で移動
        currentDate.setMonth(currentDate.getMonth() + direction);
    }
    
    currentGanttDate = currentDate;
    updateCurrentPeriodDisplay();
    renderGanttChart();
}

function goToToday() {
    console.log('📅 今日に移動');
    currentGanttDate = new Date();
    updateCurrentPeriodDisplay();
    renderGanttChart();
}

function updateCurrentPeriodDisplay() {
    const periodElement = document.getElementById('currentPeriod');
    if (!periodElement) {
        console.warn('⚠️ currentPeriod要素が見つかりません');
        return;
    }
    
    const date = new Date(currentGanttDate);
    
    try {
        if (ganttView === 'week') {
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay()); // 日曜日に設定
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6); // 土曜日に設定
            
            const formatDate = (d) => `${d.getMonth() + 1}/${d.getDate()}`;
            periodElement.textContent = `${formatDate(weekStart)} - ${formatDate(weekEnd)}`;
            
        } else {
            const year = date.getFullYear();
            const month = date.getMonth() + 1;
            periodElement.textContent = `${year}年${month}月`;
        }
        
        console.log('📅 期間表示更新:', periodElement.textContent);
        
    } catch (error) {
        console.error('❌ 期間表示更新エラー:', error);
        periodElement.textContent = 'エラー';
    }
}

function completeTaskFromGantt(taskId) {
    console.log('✅ ガントチャートからタスク完了:', taskId);
    
    const task = tasks.find(t => t.id === taskId);
    if (task && !task.completed) {
        task.completed = true;
        task.completedDate = new Date().toISOString().split('T')[0];
        
        // ポイント追加
        const points = task.points || getDefaultPoints(task.priority);
        focusPoints += points;
        addPointHistory('タスク完了', points);
        
        saveData();
        updateStats();
        renderTasks();
        renderGanttChart();
        
        console.log('🎉 ガントチャートからタスク完了:', task.content, `+${points}pt`);
        showAchievement('🎉', `タスク完了！ +${points}ポイント`);
    } else {
        console.warn('⚠️ タスクが見つからないか、既に完了済み:', taskId);
    }
}

function deleteTaskFromGantt(taskId) {
    console.log('🗑️ ガントチャートからタスク削除:', taskId);
    
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    if (taskIndex !== -1) {
        const task = tasks[taskIndex];
        
        if (confirm(`タスク「${task.content}」を削除しますか？`)) {
            tasks.splice(taskIndex, 1);
            
            saveData();
            updateStats();
            renderTasks();
            renderGanttChart();
            
            console.log('🗑️ ガントチャートからタスク削除:', task.content);
            showAchievement('🗑️', 'タスクを削除しました');
        }
    } else {
        console.warn('⚠️ 削除対象のタスクが見つかりません:', taskId);
    }
}

// Event Listeners
document.addEventListener('click', function(event) {
    // Close points menu when clicking outside
    if (!event.target.closest('.points-menu') && !event.target.closest('.stat-menu-icon')) {
        closePointsMenu();
    }
});

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 アプリケーション初期化開始');
    
    try {
        // データ読み込み
        loadGanttData();
        
        // 基本機能の初期化
        updateStats();
        renderTasks();
        updateTimerDisplay();
        renderRewards();
        
        // ガントチャートの初期化
        initializeGanttChart();
        
        // デフォルト日付の設定
        setDefaultDates();
        
        console.log('✅ Task Manager アプリケーション初期化完了');
        
    } catch (error) {
        console.error('❌ アプリケーション初期化エラー:', error);
    }
});

function initializeGanttChart() {
    try {
        console.log('📊 ガントチャート初期化開始');
        
        // 現在の日付を設定
        currentGanttDate = new Date();
        
        // フィルタの初期化
        ganttFilters = {
            priority: 'all',
            status: 'all',
            search: ''
        };
        
        // ビューの初期化（週表示）
        ganttView = 'week';
        
        // フィルタボタンの初期状態設定
        setTimeout(() => {
            // 「すべて」ボタンをアクティブに設定
            document.querySelectorAll('.filter-btn[onclick*="\'all\'"]').forEach(btn => {
                btn.classList.add('active');
            });
            
            // 週表示ボタンをアクティブに設定
            const weekBtn = document.querySelector('[onclick="setGanttView(\'week\')"]');
            if (weekBtn) {
                weekBtn.classList.add('active');
            }
        }, 100);
        
        // ガントチャートを描画
        renderGanttChart();
        
        console.log('✅ ガントチャート初期化完了');
        
    } catch (error) {
        console.error('❌ ガントチャート初期化エラー:', error);
    }
}

function setDefaultDates() {
    try {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const startDateInput = document.getElementById('taskStartDate');
        const endDateInput = document.getElementById('taskEndDate');
        
        if (startDateInput && endDateInput) {
            startDateInput.value = today.toISOString().split('T')[0];
            endDateInput.value = tomorrow.toISOString().split('T')[0];
            console.log('📅 デフォルト日付設定完了');
        }
    } catch (error) {
        console.error('❌ デフォルト日付設定エラー:', error);
    }
}

// ヘルパー関数の追加
function getDefaultPoints(priority) {
    const pointsMap = {
        'high': 20,
        'medium': 15,
        'low': 10
    };
    return pointsMap[priority] || 15;
}

function addPointHistory(action, points) {
    const today = new Date().toISOString().split('T')[0];
    
    if (!pointHistory) {
        pointHistory = [];
    }
    
    pointHistory.unshift({
        date: today,
        action: action,
        points: points,
        timestamp: new Date().toISOString()
    });
    
    // 履歴は最新30件まで保持
    if (pointHistory.length > 30) {
        pointHistory = pointHistory.slice(0, 30);
    }
    
    console.log('📝 ポイント履歴追加:', action, points);
}

// CSV Import Functions
function downloadCSVTemplate() {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const dayAfterTomorrow = new Date(today);
    dayAfterTomorrow.setDate(today.getDate() + 2);
    const threeDaysLater = new Date(today);
    threeDaysLater.setDate(today.getDate() + 3);
    const fiveDaysLater = new Date(today);
    fiveDaysLater.setDate(today.getDate() + 5);
    
    const formatDate = (date) => {
        return date.toISOString().split('T')[0];
    };
    
    const template = [
        ['タスク名', '開始日', '終了日', '優先度', 'ポイント'],
        ['サンプルタスク1', formatDate(today), formatDate(threeDaysLater), 'high', '20'],
        ['サンプルタスク2', formatDate(tomorrow), formatDate(dayAfterTomorrow), 'medium', '15'],
        ['サンプルタスク3', formatDate(dayAfterTomorrow), formatDate(fiveDaysLater), 'low', '10']
    ];
    
    // より標準的なCSV形式で生成
    const csvContent = template.map(row => 
        row.map((cell, index) => {
            // 数値以外は引用符で囲む
            if (index === 4) { // ポイント列は数値
                return cell;
            } else {
                return `"${cell}"`;
            }
        }).join(',')
    ).join('\n');
    
    console.log('📄 生成されたCSVテンプレート:');
    console.log(csvContent);
    
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', 'タスクテンプレート.csv');
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log('📥 CSVテンプレートダウンロード完了');
    showAchievement('📄', 'CSVテンプレートをダウンロードしました！');
}

function handleCSVUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const fileName = file.name;
    document.getElementById('csvFileName').textContent = fileName;
    
    // キャンセルボタンを表示
    document.getElementById('csvCancelBtn').style.display = 'inline-flex';
    
    console.log('📁 CSVファイル選択:', fileName, 'サイズ:', file.size, 'bytes');
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            let csvText = e.target.result;
            
            // Remove BOM if present
            if (csvText.charCodeAt(0) === 0xFEFF) {
                csvText = csvText.slice(1);
                console.log('🔧 BOM除去完了');
            }
            
            console.log('📊 CSVテキスト読み込み完了:', csvText.length, '文字');
            console.log('📊 CSVテキスト先頭100文字:', csvText.substring(0, 100));
            
            parseCSV(csvText);
            console.log('📊 CSVファイル読み込み完了:', fileName);
        } catch (error) {
            console.error('❌ CSVファイル読み込みエラー:', error);
            showCSVError('CSVファイルの読み込みに失敗しました: ' + error.message);
        }
    };
    
    reader.onerror = function() {
        console.error('❌ ファイル読み込みエラー');
        showCSVError('ファイルの読み込みに失敗しました。');
    };
    
    reader.readAsText(file, 'UTF-8');
}

// CSVアップロードをキャンセルする関数
function cancelCSVUpload() {
    console.log('🚫 CSVアップロードキャンセル');
    
    // ファイル入力をクリア
    document.getElementById('csvFileInput').value = '';
    document.getElementById('csvFileName').textContent = '';
    
    // ボタンの状態をリセット
    document.getElementById('csvImportBtn').disabled = true;
    document.getElementById('csvCancelBtn').style.display = 'none';
    
    // プレビューを非表示
    document.getElementById('csvPreview').style.display = 'none';
    
    // データをクリア
    csvData = [];
    csvHeaders = [];
    
    // エラー・成功メッセージを削除
    const existingMessages = document.querySelectorAll('.csv-error, .csv-success');
    existingMessages.forEach(msg => msg.remove());
    
    console.log('✅ CSVアップロードキャンセル完了');
}

function parseCSV(csvText) {
    console.log('🔍 CSVパース開始');
    
    const lines = csvText.split('\n').filter(line => line.trim());
    console.log('📋 CSVライン数:', lines.length);
    console.log('📋 最初の3行:', lines.slice(0, 3));
    
    if (lines.length < 2) {
        showCSVError('CSVファイルにデータが不足しています。ヘッダー行とデータ行が必要です。');
        return;
    }
    
    // Parse headers
    csvHeaders = parseCSVLine(lines[0]);
    console.log('📝 CSVヘッダー:', csvHeaders);
    
    // Parse data
    csvData = [];
    for (let i = 1; i < lines.length; i++) {
        const row = parseCSVLine(lines[i]);
        console.log(`📄 行${i}:`, row);
        
        if (row.length > 0 && row.some(cell => cell && cell.trim())) {
            csvData.push(row);
        }
    }
    
    console.log('📊 パース済みデータ行数:', csvData.length);
    
    if (csvData.length === 0) {
        showCSVError('CSVファイルにタスクデータが見つかりません。');
        return;
    }
    
    // Validate CSV structure
    const requiredColumns = ['タスク名', '開始日', '終了日', '優先度', 'ポイント'];
    const missingColumns = requiredColumns.filter(col => !csvHeaders.includes(col));
    
    console.log('🔍 必須列チェック:', {
        必須列: requiredColumns,
        検出列: csvHeaders,
        不足列: missingColumns
    });
    
    if (missingColumns.length > 0) {
        showCSVError(`必要な列が不足しています: ${missingColumns.join(', ')}\n\n検出された列: ${csvHeaders.join(', ')}`);
        return;
    }
    
    showCSVPreview();
    document.getElementById('csvImportBtn').disabled = false;
    console.log('✅ CSVパース完了');
}

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    let i = 0;
    
    // 行の前後の空白を除去
    line = line.trim();
    
    while (i < line.length) {
        const char = line[i];
        
        if (char === '"') {
            if (!inQuotes) {
                // 引用符開始
                inQuotes = true;
            } else if (i + 1 < line.length && line[i + 1] === '"') {
                // エスケープされた引用符 ("")
                current += '"';
                i++; // 次の引用符をスキップ
            } else {
                // 引用符終了
                inQuotes = false;
            }
        } else if (char === ',' && !inQuotes) {
            // フィールド区切り
            result.push(cleanField(current));
            current = '';
        } else {
            current += char;
        }
        
        i++;
    }
    
    // 最後のフィールドを追加
    result.push(cleanField(current));
    
    return result;
}

function cleanField(field) {
    // 前後の空白を除去
    field = field.trim();
    
    // 前後の引用符を除去（必要に応じて）
    if (field.startsWith('"') && field.endsWith('"') && field.length >= 2) {
        field = field.slice(1, -1);
        // エスケープされた引用符を元に戻す
        field = field.replace(/""/g, '"');
    }
    
    return field;
}

function showCSVPreview() {
    const preview = document.getElementById('csvPreview');
    const content = document.getElementById('csvPreviewContent');
    
    let tableHTML = '<table class="csv-preview-table">';
    
    // Headers
    tableHTML += '<thead><tr>';
    csvHeaders.forEach(header => {
        tableHTML += `<th>${header}</th>`;
    });
    tableHTML += '</tr></thead>';
    
    // Data (show first 10 rows)
    tableHTML += '<tbody>';
    const previewData = csvData.slice(0, 10);
    previewData.forEach(row => {
        tableHTML += '<tr>';
        row.forEach(cell => {
            tableHTML += `<td>${cell || '-'}</td>`;
        });
        tableHTML += '</tr>';
    });
    tableHTML += '</tbody>';
    
    if (csvData.length > 10) {
        tableHTML += `<tfoot><tr><td colspan="${csvHeaders.length}" style="text-align: center; font-style: italic; color: var(--text-muted);">... 他 ${csvData.length - 10} 行</td></tr></tfoot>`;
    }
    
    tableHTML += '</table>';
    
    content.innerHTML = tableHTML;
    preview.style.display = 'block';
    
    console.log('👀 CSVプレビュー表示:', csvData.length, '行');
}

function importCSVTasks() {
    if (csvData.length === 0) {
        showCSVError('インポートするデータがありません。');
        return;
    }
    
    const taskNameIndex = csvHeaders.indexOf('タスク名');
    const startDateIndex = csvHeaders.indexOf('開始日');
    const endDateIndex = csvHeaders.indexOf('終了日');
    const priorityIndex = csvHeaders.indexOf('優先度');
    const pointsIndex = csvHeaders.indexOf('ポイント');
    
    console.log('📊 列インデックス:', {
        タスク名: taskNameIndex,
        開始日: startDateIndex,
        終了日: endDateIndex,
        優先度: priorityIndex,
        ポイント: pointsIndex
    });
    
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    csvData.forEach((row, index) => {
        try {
            console.log(`🔍 処理中の行 ${index + 2}:`, row);
            
            const taskName = row[taskNameIndex]?.trim();
            const startDate = row[startDateIndex]?.trim();
            const endDate = row[endDateIndex]?.trim();
            const priorityRaw = row[priorityIndex]?.trim().toLowerCase();
            const pointsRaw = row[pointsIndex]?.trim();
            
            console.log(`📝 抽出データ:`, {
                タスク名: taskName,
                開始日: startDate,
                終了日: endDate,
                優先度: priorityRaw,
                ポイント: pointsRaw
            });
            
            // Validation
            if (!taskName) {
                throw new Error('タスク名が空です');
            }
            
            // 優先度の正規化
            let priority = priorityRaw;
            if (['高', 'high', 'h', '緊急', '重要'].includes(priority)) {
                priority = 'high';
            } else if (['中', 'medium', 'm', '普通', '通常'].includes(priority)) {
                priority = 'medium';
            } else if (['低', 'low', 'l', '軽微'].includes(priority)) {
                priority = 'low';
            } else if (!['high', 'medium', 'low'].includes(priority)) {
                throw new Error(`優先度が不正です: "${priorityRaw}" (high, medium, low, または 高, 中, 低 を使用してください)`);
            }
            
            // ポイントの処理
            let points = 15; // デフォルト値
            if (pointsRaw) {
                const parsedPoints = parseInt(pointsRaw);
                if (isNaN(parsedPoints)) {
                    throw new Error(`ポイントが数値ではありません: "${pointsRaw}"`);
                }
                points = Math.max(1, Math.min(100, parsedPoints));
            }
            
            // 日付の検証と正規化
            let normalizedStartDate = startDate;
            let normalizedEndDate = endDate;
            
            if (startDate) {
                if (!isValidDate(startDate)) {
                    throw new Error(`開始日の形式が正しくありません: "${startDate}" (YYYY-MM-DD または YYYY/MM/DD 形式で入力してください)`);
                }
                normalizedStartDate = normalizeDateString(startDate);
            }
            
            if (endDate) {
                if (!isValidDate(endDate)) {
                    throw new Error(`終了日の形式が正しくありません: "${endDate}" (YYYY-MM-DD または YYYY/MM/DD 形式で入力してください)`);
                }
                normalizedEndDate = normalizeDateString(endDate);
            }
            
            // Create task
            const taskId = Date.now() + index;
            const task = {
                id: taskId,
                content: taskName,
                priority: priority,
                points: points,
                completed: false,
                createdAt: new Date().toISOString(),
                startDate: normalizedStartDate || null,
                endDate: normalizedEndDate || null
            };
            
            tasks.push(task);
            successCount++;
            
            console.log(`✅ タスク作成成功:`, task);
            
        } catch (error) {
            errorCount++;
            const errorMsg = `行 ${index + 2}: ${error.message}`;
            errors.push(errorMsg);
            console.error(`❌ 行 ${index + 2} エラー:`, error.message);
        }
    });
    
    // Save and update
    saveData();
    updateStats();
    renderTasks();
    
    console.log('📊 CSVインポート結果:', {
        successCount: successCount,
        errorCount: errorCount,
        条件チェック: successCount > 0
    });
    
    // Show results
    if (successCount > 0) {
        console.log('✅ 成功条件に入りました:', successCount);
        
        // Reset CSV import (プレビューなどをクリア)
        resetCSVImportPreview();
        
        // 少し遅延してから成功メッセージを表示
        setTimeout(() => {
            showCSVSuccess(`${successCount} 個のタスクをインポートしました！`);
        }, 100);
        
        console.log('✅ CSVインポート完了:', successCount, '成功,', errorCount, 'エラー');
    } else {
        console.log('❌ 成功条件に入りませんでした:', successCount);
    }
    
    if (errorCount > 0) {
        showCSVError(`${errorCount} 個のタスクでエラーが発生しました:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? '\n...' : ''}`);
    }
}

function isValidDate(dateString) {
    // 空の場合は有効とする
    if (!dateString || dateString.trim() === '') {
        return true;
    }
    
    // スラッシュをハイフンに変換して正規化
    let normalizedDate = dateString.replace(/\//g, '-');
    
    // YYYY-M-D や YYYY-MM-D のような形式を YYYY-MM-DD に変換
    const parts = normalizedDate.split('-');
    if (parts.length === 3) {
        const year = parts[0].padStart(4, '0');
        const month = parts[1].padStart(2, '0');
        const day = parts[2].padStart(2, '0');
        normalizedDate = `${year}-${month}-${day}`;
    }
    
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(normalizedDate)) return false;
    
    const date = new Date(normalizedDate + 'T00:00:00');
    const dateParts = normalizedDate.split('-');
    const year = parseInt(dateParts[0]);
    const month = parseInt(dateParts[1]);
    const day = parseInt(dateParts[2]);
    
    // 年、月、日の範囲チェック
    if (year < 1900 || year > 2100) return false;
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;
    
    // 実際の日付として有効かチェック
    return date.getFullYear() === year && 
           date.getMonth() === month - 1 && 
           date.getDate() === day;
}

function normalizeDateString(dateString) {
    // 空の場合はそのまま返す
    if (!dateString || dateString.trim() === '') {
        return dateString;
    }
    
    // スラッシュをハイフンに変換
    let normalized = dateString.replace(/\//g, '-');
    
    // YYYY-M-D や YYYY-MM-D のような形式を YYYY-MM-DD に変換
    const parts = normalized.split('-');
    if (parts.length === 3) {
        const year = parts[0].padStart(4, '0');
        const month = parts[1].padStart(2, '0');
        const day = parts[2].padStart(2, '0');
        normalized = `${year}-${month}-${day}`;
    }
    
    return normalized;
}

function resetCSVImport() {
    csvData = [];
    csvHeaders = [];
    document.getElementById('csvFileInput').value = '';
    document.getElementById('csvFileName').textContent = '';
    document.getElementById('csvImportBtn').disabled = true;
    document.getElementById('csvCancelBtn').style.display = 'none';
    document.getElementById('csvPreview').style.display = 'none';
    
    // Remove any existing messages
    const existingMessages = document.querySelectorAll('.csv-error, .csv-success');
    existingMessages.forEach(msg => msg.remove());
}

function resetCSVImportPreview() {
    // プレビューとファイル選択のみクリア
    csvData = [];
    csvHeaders = [];
    document.getElementById('csvFileInput').value = '';
    document.getElementById('csvFileName').textContent = '';
    document.getElementById('csvImportBtn').disabled = true;
    document.getElementById('csvCancelBtn').style.display = 'none';
    document.getElementById('csvPreview').style.display = 'none';
}

function showCSVError(message) {
    // Remove existing messages
    const existingMessages = document.querySelectorAll('.csv-error, .csv-success');
    existingMessages.forEach(msg => msg.remove());
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'csv-error';
    errorDiv.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${message}`;
    
    const csvSection = document.querySelector('.csv-import-section');
    csvSection.appendChild(errorDiv);
    
    // Auto remove after 10 seconds
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.remove();
        }
    }, 10000);
}

function showCSVSuccess(message) {
    // Remove existing messages
    const existingMessages = document.querySelectorAll('.csv-error, .csv-success');
    existingMessages.forEach(msg => msg.remove());
    
    const successDiv = document.createElement('div');
    successDiv.className = 'csv-success';
    successDiv.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
    
    const csvSection = document.querySelector('.csv-import-section');
    csvSection.appendChild(successDiv);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (successDiv.parentNode) {
            successDiv.remove();
        }
    }, 5000);
}

// CSV Toggle Function
function toggleCSVImport() {
    const section = document.getElementById('csvImportSection');
    const icon = document.getElementById('csvToggleIcon');
    
    if (csvImportVisible) {
        // Hide section
        section.classList.add('closing');
        icon.classList.remove('rotated');
        
        setTimeout(() => {
            section.style.display = 'none';
            section.classList.remove('closing');
        }, 300);
        
        csvImportVisible = false;
        console.log('📁 CSVインポートセクション非表示');
    } else {
        // Show section
        section.style.display = 'block';
        icon.classList.add('rotated');
        
        csvImportVisible = true;
        console.log('📂 CSVインポートセクション表示');
    }
}
