# Feature: Brutalist Kanban UI Redesign

## Metadata
issue_number: `3`
adw_id: `104fa5f0`
issue_json: `{"number":3,"title":"<!DOCTYPE html><html lang=\"en\"><head>    <meta cha...","body":"<!DOCTYPE html><html lang=\"en\"><head>    <meta charset=\"UTF-8\">    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">    <title>Brutalist Kanban - Complete</title>    <style>        * {            margin: 0;            padding: 0;            box-sizing: border-box;        }        body {            font-family: 'Courier New', monospace;            background: #fff;            color: #000;            min-height: 100vh;        }        /* HEADER */        .header {            background: #000;            color: #fff;            padding: 16px 32px;            border-bottom: 6px solid #000;            position: sticky;            top: 0;            z-index: 1000;        }        .header-content {            display: flex;            justify-content: space-between;            align-items: center;        }        .header-left {            display: flex;            align-items: center;            gap: 24px;        }        .project-name {            font-size: 28px;            font-weight: bold;            letter-spacing: -2px;            text-transform: uppercase;        }        .stats {            display: flex;            gap: 24px;            font-size: 12px;            font-weight: bold;        }        .stat {            display: flex;            flex-direction: column;            align-items: flex-end;        }        .stat-value {            font-size: 24px;            line-height: 1;        }        .search-container {            position: relative;        }        .search-bar {            width: 280px;            padding: 8px 12px 8px 36px;            border: 3px solid #fff;            background: #fff;            color: #000;            font-family: 'Courier New', monospace;            font-size: 12px;            font-weight: bold;            text-transform: uppercase;            outline: none;        }        .search-bar::placeholder {            color: #666;        }        .search-icon {            position: absolute;            left: 10px;            top: 50%;            transform: translateY(-50%);            font-size: 16px;        }        .connection-status {            display: flex;            align-items: center;            gap: 8px;            padding: 6px 12px;            background: #fff;            color: #000;            font-size: 11px;            font-weight: bold;        }        .status-dot {            width: 10px;            height: 10px;            border-radius: 50%;            background: #10b981;            animation: pulse 2s infinite;        }        .status-dot.disconnected {            background: #ef4444;            animation: none;        }        @keyframes pulse {            0%, 100% { opacity: 1; }            50% { opacity: 0.5; }        }        .header-right {            display: flex;            gap: 8px;            align-items: center;            position: relative;        }        .icon-btn {            background: #fff;            border: 3px solid #fff;            width: 36px;            height: 36px;            font-size: 16px;            cursor: pointer;            display: flex;            align-items: center;            justify-content: center;            transition: all 0.1s;        }        .icon-btn:hover {            background: #000;            color: #fff;        }        .menu-btn {            background: #fff;            border: 3px solid #fff;            width: 36px;            height: 36px;            font-size: 20px;            cursor: pointer;            display: flex;            align-items: center;            justify-content: center;        }        .menu-btn:hover,        .menu-btn.active {            background: #000;            color: #fff;        }        .dropdown-menu {            display: none;            position: absolute;            top: 45px;            right: 0;            background: #fff;            border: 4px solid #000;            min-width: 220px;            z-index: 2000;            box-shadow: 4px 4px 0 rgba(0,0,0,0.2);        }        .dropdown-menu.active {            display: block;        }        .dropdown-item {            padding: 12px 16px;            font-size: 11px;            font-weight: bold;            text-transform: uppercase;            cursor: pointer;            border-bottom: 2px solid #000;            display: flex;            align-items: center;            gap: 10px;            color: #000;        }        .dropdown-item:last-child {            border-bottom: none;        }        .dropdown-item:hover {            background: #000;            color: #fff;        }        .dropdown-item.success:hover { background: #10b981; }        .dropdown-item.warning:hover { background: #f59e0b; }        .dropdown-item.danger:hover { background: #ef4444; }        /* BOARD */        .board-container {            overflow-x: auto;            height: calc(100vh - 68px);        }        .board {            display: flex;            min-width: 100%;            height: 100%;            border-bottom: 6px solid #000;        }        .column {            min-width: 280px;            max-width: 280px;            border-right: 6px solid #000;            display: flex;            flex-direction: column;            height: 100%;        }        .column:last-child {            border-right: none;        }        .column-header {            background: #000;            color: #fff;            padding: 14px 16px;            font-size: 14px;            font-weight: bold;            text-transform: uppercase;            display: flex;            justify-content: space-between;            align-items: center;            border-bottom: 6px solid #000;            cursor: pointer;            min-height: 60px;        }        .column-header:hover {            background: #333;        }        .column-title {            display: flex;            align-items: center;            gap: 10px;        }        .column-icon {            font-size: 20px;        }        .column-count {            font-size: 16px;            background: #fff;            color: #000;            padding: 3px 10px;        }        .tasks {            padding: 10px;            display: flex;            flex-direction: column;            gap: 10px;            flex: 1;            overflow-y: auto;        }        /* TASK CARDS */        .task-card {            background: #fff;            border: 4px solid #000;            cursor: pointer;            transition: all 0.1s;            position: relative;        }        .task-card:hover {            transform: translate(-3px, -3px);            box-shadow: 3px 3px 0 #000;        }        .task-card-header {            padding: 8px 10px;            border-bottom: 3px solid #000;            display: flex;            justify-content: space-between;            background: #f8f8f8;        }        .task-number {            display: flex;            align-items: center;            gap: 8px;        }        .issue-num {            font-size: 20px;            font-weight: bold;        }        .task-id {            font-size: 10px;            background: #000;            color: #fff;            padding: 3px 6px;        }        .task-card-body {            padding: 10px;        }        .task-title {            font-size: 14px;            font-weight: bold;            margin-bottom: 6px;            text-transform: uppercase;        }        .pipeline-indicator {            display: flex;            gap: 3px;            margin-bottom: 6px;            padding: 5px;            background: #f0f0f0;            border: 2px solid #000;        }        .pipeline-stage {            flex: 1;            padding: 4px 2px;            text-align: center;            font-size: 9px;            font-weight: bold;            border: 2px solid #000;            background: #fff;            color: #999;        }        .pipeline-stage.completed {            background: #3b82f6;            color: #fff;        }        .pipeline-stage.active {            background: #f59e0b;            color: #000;        }        .task-description {            font-size: 12px;            line-height: 1.4;            margin-bottom: 8px;            color: #444;        }        .task-meta-footer {            display: flex;            justify-content: space-between;            align-items: center;            gap: 6px;            padding-top: 6px;            border-top: 2px solid #000;        }        .task-meta-badges {            display: flex;            gap: 4px;        }        .meta-badge {            background: #e0e0e0;            padding: 3px 6px;            border: 2px solid #000;            font-size: 10px;            font-weight: bold;        }        .meta-badge.time {            background: #fef3c7;            border-color: #f59e0b;        }        .meta-badge.status {            background: #dbeafe;            border-color: #3b82f6;        }        .task-labels {            display: flex;            gap: 4px;        }        .label {            padding: 4px 7px;            font-size: 9px;            font-weight: bold;            border: 2px solid #000;            text-transform: uppercase;        }        .label.bug {            background: #fee2e2;            color: #991b1b;            border-color: #ef4444;        }        .label.feature {            background: #dbeafe;            color: #1e40af;            border-color: #3b82f6;        }        .live-log-preview {            margin-top: 8px;            padding: 6px 8px;            background: #f8f8f8;            border: 2px solid #000;            font-size: 9px;            display: flex;            align-items: center;            min-height: 24px;        }        .live-log-preview::before {            content: '⚡';            margin-right: 6px;        }        .log-preview-text {            white-space: nowrap;            overflow: hidden;            text-overflow: ellipsis;            flex: 1;            transition: opacity 0.3s;        }        .log-preview-level {            font-weight: bold;            margin-right: 4px;        }        .log-preview-level.info { color: #3b82f6; }        .log-preview-level.success { color: #10b981; }        .log-preview-level.warning { color: #f59e0b; }        .log-preview-level.error { color: #ef4444; }        .context-progress {            position: absolute;            bottom: 0;            left: 0;            right: 0;            height: 8px;            background: #f0f0f0;            border-top: 2px solid #000;        }        .context-progress-bar {            height: 100%;            background: linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%);            position: relative;        }        .context-progress-bar::after {            content: '';            position: absolute;            inset: 0;            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);            animation: shimmer 2s infinite;        }        @keyframes shimmer {            0% { transform: translateX(-100%); }            100% { transform: translateX(100%); }        }        .add-task {            border: 3px dashed #000;            padding: 12px;            text-align: center;            font-size: 11px;            font-weight: bold;            text-transform: uppercase;            cursor: pointer;        }        .add-task:hover {            background: #000;            color: #fff;        }        /* MODAL */        .modal {            display: none;            position: fixed;            inset: 0;            background: rgba(0, 0, 0, 0.9);            z-index: 2000;            align-items: center;            justify-content: center;            padding: 20px;        }        .modal.active {            display: flex;        }        .modal-content {            background: #fff;            border: 8px solid #000;            max-width: 1200px;            width: 100%;            max-height: 90vh;            display: flex;            flex-direction: column;        }        .modal-header {            background: #000;            color: #fff;            padding: 16px 24px;            border-bottom: 6px solid #000;            display: flex;            justify-content: space-between;            align-items: center;        }        .modal-title {            font-size: 18px;            font-weight: bold;            text-transform: uppercase;            display: flex;            gap: 12px;        }        .modal-close {            font-size: 28px;            cursor: pointer;            width: 36px;            height: 36px;            display: flex;            align-items: center;            justify-content: center;            border: 2px solid #fff;        }        .modal-close:hover {            background: #fff;            color: #000;        }        .modal-body {            display: flex;            flex-direction: column;            overflow: hidden;        }        .modal-grid {            display: grid;            grid-template-columns: 320px 1fr;            height: 100%;            overflow: hidden;        }        .modal-left {            background: #f8f8f8;            border-right: 6px solid #000;            padding: 20px;            overflow-y: auto;        }        .modal-right {            display: flex;            flex-direction: column;            overflow: hidden;        }        .detail-section {            margin-bottom: 16px;            padding-bottom: 16px;            border-bottom: 3px solid #000;        }        .detail-section:last-child {            border-bottom: none;        }        .section-title {            font-size: 10px;            font-weight: bold;            text-transform: uppercase;            margin-bottom: 10px;            background: #000;            color: #fff;            padding: 5px 8px;        }        .info-row {            display: flex;            justify-content: space-between;            margin-bottom: 6px;            font-size: 10px;            gap: 8px;        }        .info-row.description-row {            flex-direction: column;        }        .info-label {            font-weight: bold;            font-size: 8px;            background: #000;            color: #fff;            padding: 2px 5px;            white-space: nowrap;        }        .info-value {            font-size: 10px;            text-align: right;        }        .description-row .info-value {            text-align: left;        }        .phase-navigator {            background: #f8f8f8;            border-bottom: 6px solid #000;            padding: 12px;        }        .phase-nav-title {            font-size: 10px;            font-weight: bold;            margin-bottom: 8px;        }        .phase-tabs {            display: flex;            gap: 6px;        }        .phase-tab {            flex: 1;            background: #fff;            border: 3px solid #000;            padding: 8px 6px;            cursor: pointer;            text-align: center;        }        .phase-tab:hover {            transform: translateY(-2px);        }        .phase-tab.active {            background: #3b82f6;            color: #fff;        }        .phase-icon {            font-size: 14px;        }        .phase-letter {            font-size: 12px;            font-weight: bold;        }        .phase-name {            font-size: 8px;            font-weight: bold;            margin: 3px 0;        }        .phase-status {            font-size: 10px;        }        .phase-status.completed { color: #10b981; }        .phase-status.active { color: #f59e0b; }        .phase-status.pending { color: #999; }        .phase-tab.active .phase-status { color: #fff; }        .phase-content-area {            flex: 1;            overflow-y: auto;            padding: 16px;        }        .phase-content {            display: none;        }        .phase-content.active {            display: block;        }        .phase-content-header {            display: flex;            justify-content: space-between;            margin-bottom: 12px;            padding-bottom: 10px;            border-bottom: 3px solid #000;        }        .phase-badge {            padding: 3px 8px;            font-size: 8px;            font-weight: bold;            border: 2px solid #000;        }        .phase-badge.completed {            background: #d1fae5;            color: #065f46;        }        .phase-badge.active {            background: #fef3c7;            color: #92400e;        }        .phase-badge.pending {            background: #f3f4f6;            color: #6b7280;        }        .logs-container {            border: 4px solid #000;            margin-top: 12px;        }        .logs-header {            background: #f8f8f8;            padding: 8px 10px;            border-bottom: 3px solid #000;            display: flex;            justify-content: space-between;            font-size: 9px;            font-weight: bold;        }        .logs-status {            display: flex;            align-items: center;            gap: 5px;        }        .live-indicator {            width: 7px;            height: 7px;            background: #10b981;            border-radius: 50%;            animation: pulse 1.5s infinite;        }        .logs-body {            padding: 10px;            font-size: 10px;            line-height: 1.5;            min-height: 200px;            max-height: 350px;            overflow-y: auto;        }        .log-line {            margin-bottom: 3px;            animation: slideIn 0.3s ease;        }        @keyframes slideIn {            from {                opacity: 0;                transform: translateX(-10px);            }            to {                opacity: 1;                transform: translateX(0);            }        }        .log-timestamp { color: #6b7280; font-weight: bold; }        .log-level-info { color: #3b82f6; font-weight: bold; }        .log-level-success { color: #10b981; font-weight: bold; }        .log-level-warning { color: #f59e0b; font-weight: bold; }        .log-level-error { color: #ef4444; font-weight: bold; }        .logs-controls {            padding: 8px 10px;            border-top: 3px solid #000;            display: flex;            gap: 6px;            background: #f8f8f8;        }        .log-btn {            padding: 5px 10px;            background: #fff;            border: 3px solid #000;            font-family: 'Courier New', monospace;            font-size: 8px;            font-weight: bold;            cursor: pointer;        }        .log-btn:hover {            background: #000;            color: #fff;        }        .log-btn.active {            background: #3b82f6;            color: #fff;        }        .empty-logs {            text-align: center;            padding: 35px;            color: #9ca3af;        }        .actions-bar {            background: #f5f5f5;            padding: 16px 20px;            border-top: 6px solid #000;            display: flex;            gap: 8px;        }        .btn {            padding: 10px 16px;            border: 4px solid #000;            font-family: 'Courier New', monospace;            font-size: 10px;            font-weight: bold;            cursor: pointer;            background: #fff;        }        .btn:hover {            background: #000;            color: #fff;        }        .btn-primary {            background: #3b82f6;            color: #fff;        }        /* TOAST */        .toast {            position: fixed;            bottom: 28px;            right: 28px;            background: #000;            color: #fff;            padding: 14px 20px;            border: 4px solid #000;            font-weight: bold;            z-index: 3000;            transform: translateX(400px);            transition: transform 0.3s;            font-size: 10px;        }        .toast.show {            transform: translateX(0);        }        /* COLUMN COLORS */        .column.backlog .column-header { background: #6b7280; }        .column.plan .column-header { background: #3b82f6; }        .column.build .column-header { background: #f59e0b; }        .column.test .column-header { background: #10b981; }        .column.review .column-header { background: #8b5cf6; }        .column.document .column-header { background: #ec4899; }        .column.ready .column-header { background: #14b8a6; }        .column.errored .column-header { background: #ef4444; }        ::-webkit-scrollbar { width: 10px; height: 10px; }        ::-webkit-scrollbar-track { background: #f0f0f0; }        ::-webkit-scrollbar-thumb { background: #000; }    </style></head><body>    <div class=\"header\">        <div class=\"header-content\">            <div class=\"header-left\">                <div class=\"project-name\">KANBAN.V4</div>                <div class=\"stats\">                    <div class=\"stat\">                        <span class=\"stat-value\">05</span>                        <span>ACTIVE</span>                    </div>                    <div class=\"stat\">                        <span class=\"stat-value\">23</span>                        <span>TOTAL</span>                    </div>                </div>                <div class=\"search-container\">                    <span class=\"search-icon\">🔍</span>                    <input type=\"text\" class=\"search-bar\" placeholder=\"SEARCH TASKS...\" id=\"searchBar\">                </div>                <div class=\"connection-status\">                    <div class=\"status-dot\" id=\"statusDot\"></div>                    <span id=\"statusText\">CONNECTED</span>                </div>            </div>            <div class=\"header-right\">                <button class=\"icon-btn\">⚡</button>                <button class=\"icon-btn\">⇅</button>                <button class=\"icon-btn\">⚙</button>                <button class=\"menu-btn\" id=\"menuBtn\">⋮</button>                <div class=\"dropdown-menu\" id=\"dropdownMenu\">                    <div class=\"dropdown-item success\" onclick=\"handleAction('resume')\">                        <span>▶</span><span>RESUME WORKFLOW</span>                    </div>                    <div class=\"dropdown-item warning\" onclick=\"handleAction('pause')\">                        <span>⏸</span><span>PAUSE WORKFLOW</span>                    </div>                    <div class=\"dropdown-item\" onclick=\"handleAction('restart')\">                        <span>🔄</span><span>RESTART WORKFLOW</span>                    </div>                    <div class=\"dropdown-item\" onclick=\"handleAction('stop')\">                        <span>⏹</span><span>STOP WORKFLOW</span>                    </div>                    <div class=\"dropdown-item danger\" onclick=\"handleAction('delete')\">                        <span>🗑</span><span>DELETE ALL TASKS</span>                    </div>                </div>            </div>        </div>    </div>    <div class=\"board-container\">        <div class=\"board\" id=\"board\"></div>    </div>    <div class=\"modal\" id=\"taskModal\"></div>    <div class=\"toast\" id=\"toast\"></div>    <script>        const TASKS_DATA = [            { id: 1, num: 1, taskId: '40A3DE9F', title: 'CLICK ERROR FIX', column: 'plan', stage: 'P', desc: 'As soon as I click on add new task I see all these errors in the console...', badges: [{type:'time',text:'🕒 2H'}], labels: [{type:'bug',text:'🐛 BUG'}], progress: 45 },            { id: 2, num: 2, taskId: '36000B99', title: 'WEBSOCKET LOGS', column: 'plan', stage: 'P', desc: 'Backend websocket updates not appearing in frontend console...', badges: [{type:'time',text:'🕒 2H'}], labels: [{type:'feature',text:'✨ FEATURE'}], progress: 67 },            { id: 3, num: 14, taskId: 'FE95E', title: 'PATCH CONFIG', column: 'build', stage: 'B', desc: 'Github issues patch configuration needs verification before deployment...', badges: [{type:'status',text:'⚡ IMPL'},{type:'time',text:'🕒 3M'}], labels: [{type:'bug',text:'🐛 BUG'}], progress: 82 },            { id: 4, num: 15, taskId: 'D5D56E', title: 'COPY BUTTON', column: 'build', stage: 'B', desc: 'Copy CTA not working on card click event handler...', badges: [{type:'status',text:'⚡ IMPL'}], labels: [{type:'feature',text:'✨ FEATURE'}], progress: 56 },            { id: 5, num: 13, taskId: '6D475C', title: 'REFRESH LOOP', column: 'test', stage: 'T', desc: 'App refreshing multiple times on ticket creation - need to find root cause...', badges: [{type:'time',text:'🕒 4M'}], labels: [{type:'bug',text:'🐛 BUG'}], progress: 91 }        ];        const CARD_LOGS = {            1: [                { level: 'info', msg: 'Analyzing error patterns...' },                { level: 'warning', msg: 'Reviewing event propagation...' },                { level: 'info', msg: 'Testing click handlers...' }            ],            2: [                { level: 'success', msg: 'Connected to server port 8080' },                { level: 'info', msg: 'Receiving data stream...' },                { level: 'success', msg: 'Handshake completed' }            ],            3: [                { level: 'warning', msg: 'Verifying config changes...' },                { level: 'info', msg: 'Running validation tests...' }            ],            4: [                { level: 'info', msg: 'Implementing clipboard API...' },                { level: 'success', msg: 'Testing copy functionality...' }            ],            5: [                { level: 'error', msg: 'Infinite loop detected...' },                { level: 'warning', msg: 'Analyzing lifecycle methods...' }            ]        };        const MODAL_LOGS = [            'Initializing websocket connection...',            'Connected to server on port 8080',            'Handshake completed successfully',            'Subscribing to channel: task-updates',            'Receiving data stream...',            'Processing incoming message batch',            'Validating payload structure',            'Parsing JSON data'        ];        // State        let logIntervals = {};        let isActive = true;        let modalStreamInterval = null;        let modalLogCount = 0;        let modalLogsPerSec = 0;        let autoScroll = true;        let isModalStreaming = false;        // Initialize board        function initBoard() {            const board = document.getElementById('board');            const columns = ['backlog', 'plan', 'build', 'test', 'review', 'document', 'ready', 'errored'];            const columnIcons = {                backlog: '📥', plan: '📋', build: '🔨', test: '🧪',                review: '👀', document: '📄', ready: '✅', errored: '⚠️'            };            columns.forEach(col => {                const tasks = TASKS_DATA.filter(t => t.column === col);                const colDiv = document.createElement('div');                colDiv.className = column ${col};                colDiv.innerHTML = `                    <div class=\"column-header\">                        <div class=\"column-title\">                            <span class=\"column-icon\">${columnIcons[col]}</span>                            <span>${col.toUpperCase()}</span>                        </div>                        <span class=\"column-count\">${tasks.length}</span>                    </div>                    <div class=\"tasks\">                        ${tasks.map(renderTask).join('')}                        ${tasks.length === 0 ? '<div style=\"text-align:center;padding:32px;opacity:0.3;font-size:11px;\">EMPTY</div>' : ''}                        <div class=\"add-task\">+ NEW</div>                    </div>                `;                board.appendChild(colDiv);            });            document.querySelectorAll('.task-card').forEach(card => {                card.addEventListener('click', () => openModal(card.dataset.id));            });        }        function renderTask(task) {            const stages = ['P','B','T','R','D'];            const stageIndex = stages.indexOf(task.stage);                        return `                <div class=\"task-card\" data-id=\"${task.id}\">                    <div class=\"task-card-header\">                        <div class=\"task-number\">                            <span class=\"issue-num\">${task.num}</span>                            <span class=\"task-id\">${task.taskId}</span>                        </div>                    </div>                    <div class=\"task-card-body\">                        <div class=\"task-title\">${task.title}</div>                        <div class=\"pipeline-indicator\">                            ${stages.map((s,i) => `                                <div class=\"pipeline-stage ${i < stageIndex ? 'completed' : i === stageIndex ? 'active' : ''}\">${s}</div>                            `).join('')}                        </div>                        <div class=\"task-description\">${task.desc}</div>                        <div class=\"task-meta-footer\">                            <div class=\"task-meta-badges\">                                ${task.badges.map(b => <span class=\"meta-badge ${b.type}\">${b.text}</span>).join('')}                            </div>                            <div class=\"task-labels\">                                ${task.labels.map(l => <span class=\"label ${l.type}\">${l.text}</span>).join('')}                            </div>                        </div>                        <div class=\"live-log-preview\" id=\"log-${task.id}\">                            <div class=\"log-preview-text\">                                <span class=\"log-preview-level info\">INFO</span>                                <span>Initializing...</span>                            </div>                        </div>                    </div>                    <div class=\"context-progress\">                        <div class=\"context-progress-bar\" style=\"width:${task.progress}%\"></div>                    </div>                </div>            `;        }        // Card log updates        function updateCardLog(id) {            const el = document.getElementById('log-' + id);            if (!el) return;            const logs = CARD_LOGS[id];            const log = logs[Math.floor(Math.random() * logs.length)];            const textEl = el.querySelector('.log-preview-text');            textEl.style.opacity = '0';            setTimeout(() => {                textEl.innerHTML = <span class=\"log-preview-level ${log.level}\">${log.level.toUpperCase()}</span><span>${log.msg}</span>;                textEl.style.opacity = '1';            }, 200);        }        function startLogs() {            isActive = true;            [1,2,3,4,5].forEach(id => {                if (logIntervals[id]) clearInterval(logIntervals[id]);                logIntervals[id] = setInterval(() => {                    if (isActive) updateCardLog(id);                }, 3000 + Math.random() * 4000);            });        }        function stopLogs() {            isActive = false;            Object.values(logIntervals).forEach(clearInterval);            logIntervals = {};        }        // Modal        function openModal(id) {            const task = TASKS_DATA.find(t => t.id == id) || TASKS_DATA[1];            const modal = document.getElementById('taskModal');            modal.innerHTML = `                <div class=\"modal-content\">                    <div class=\"modal-header\">                        <div class=\"modal-title\">                            <span>#${task.num}</span>                            <span>${task.title}</span>                        </div>                        <div class=\"modal-close\" onclick=\"closeModal()\">✕</div>                    </div>                    <div class=\"modal-body\">                        <div class=\"modal-grid\">                            <div class=\"modal-left\">                                <div class=\"detail-section\">                                    <div class=\"section-title\">📋 CARD INFO</div>                                    <div class=\"info-row\"><span class=\"info-label\">TASK ID</span><span class=\"info-value\">${task.taskId}</span></div>                                    <div class=\"info-row\"><span class=\"info-label\">STAGE</span><span class=\"info-value\">${task.column}</span></div>                                    <div class=\"info-row description-row\">                                        <span class=\"info-label\">DESCRIPTION</span>                                        <div class=\"info-value\">${task.desc}</div>                                    </div>                                </div>                                <div class=\"detail-section\">                                    <div class=\"section-title\">⚙️ ADW METADATA</div>                                    <div class=\"info-row\"><span class=\"info-label\">ADW ID</span><span class=\"info-value\">${task.taskId.toLowerCase()}</span></div>                                    <div class=\"info-row\"><span class=\"info-label\">WORKFLOW</span><span class=\"info-value\">adw_sdlc_iso</span></div>                                </div>                            </div>                            <div class=\"modal-right\">                                <div class=\"phase-navigator\">                                    <div class=\"phase-nav-title\">📊 WORKFLOW PHASES</div>                                    <div class=\"phase-tabs\">                                        ${renderPhaseTab('plan', '📋', 'P', 'PLAN', 'completed', false)}                                        ${renderPhaseTab('build', '🔨', 'B', 'BUILD', 'active', true)}                                        ${renderPhaseTab('test', '🧪', 'T', 'TEST', 'pending', false)}                                        ${renderPhaseTab('review', '👀', 'R', 'REVIEW', 'pending', false)}                                        ${renderPhaseTab('document', '📄', 'D', 'DOC', 'pending', false)}                                    </div>                                </div>                                <div class=\"phase-content-area\">                                    ${renderPhaseContent('plan', '📋 PLAN PHASE', 'completed', 'Planning completed successfully.', false)}                                    ${renderPhaseContent('build', '🔨 BUILD PHASE', 'active', '', true)}                                    ${renderPhaseContent('test', '🧪 TEST PHASE', 'pending', '<div class=\"empty-logs\">⏳<br>Phase not started</div>', false)}                                    ${renderPhaseContent('review', '👀 REVIEW PHASE', 'pending', '<div class=\"empty-logs\">⏳<br>Phase not started</div>', false)}                                    ${renderPhaseContent('document', '📄 DOCUMENT PHASE', 'pending', '<div class=\"empty-logs\">⏳<br>Phase not started</div>', false)}                                </div>                            </div>                        </div>                    </div>                    <div class=\"actions-bar\">                        <button class=\"btn btn-primary\">▶ TRIGGER</button>                        <button class=\"btn\">✎ EDIT</button>                        <button class=\"btn\">🗑 DELETE</button>                        <button class=\"btn\" style=\"margin-left:auto;\" onclick=\"closeModal()\">CLOSE</button>                    </div>                </div>            `;            modal.classList.add('active');            startModalStream();        }        function renderPhaseTab(id, icon, letter, name, status, active) {            const symbols = { completed: '✓', active: '●', pending: '○' };            return `                <div class=\"phase-tab ${active?'active':''}\" onclick=\"switchPhase('${id}')\">                    <div><span class=\"phase-icon\">${icon}</span><span class=\"phase-letter\">${letter}</span></div>                    <div class=\"phase-name\">${name}</div>                    <div class=\"phase-status ${status}\">${symbols[status]}</div>                </div>            `;        }        function renderPhaseContent(id, title, status, content, active) {            if (id === 'build') {                return `                    <div class=\"phase-content ${active?'active':''}\" id=\"phase-${id}\">                        <div class=\"phase-content-header\">                            <h3>${title}</h3>                            <span class=\"phase-badge ${status}\">${status.toUpperCase()}</span>                        </div>                        <div class=\"logs-container\">                            <div class=\"logs-header\">                                <div class=\"logs-status\">                                    <div class=\"live-indicator\"></div>                                    <span>LIVE • <span id=\"modalLogCount\">0 logs</span></span>                                </div>                                <span id=\"modalStreamRate\">0 logs/sec</span>                            </div>                            <div class=\"logs-body\" id=\"modalLogsBody\"><div class=\"empty-logs\">Connecting...</div></div>                            <div class=\"logs-controls\">                                <button class=\"log-btn active\" id=\"autoScrollBtn\" onclick=\"toggleAutoScroll()\">AUTO</button>                                <button class=\"log-btn\" onclick=\"clearModalLogs()\">CLEAR</button>                                <button class=\"log-btn\" onclick=\"pauseModalStream()\">PAUSE</button>                            </div>                        </div>                    </div>                `;            }            return `                <div class=\"phase-content ${active?'active':''}\" id=\"phase-${id}\">                    <div class=\"phase-content-header\">                        <h3>${title}</h3>                        <span class=\"phase-badge ${status}\">${status.toUpperCase()}</span>                    </div>                    ${content}                </div>            `;        }        function closeModal() {            document.getElementById('taskModal').classList.remove('active');            stopModalStream();        }        function switchPhase(phase) {            document.querySelectorAll('.phase-tab').forEach(t => t.classList.remove('active'));            document.querySelectorAll('.phase-content').forEach(c => c.classList.remove('active'));            event.target.closest('.phase-tab').classList.add('active');            document.getElementById('phase-' + phase).classList.add('active');            showToast('SWITCHED TO ' + phase.toUpperCase());            if (phase === 'build') startModalStream();        }        function startModalStream() {            if (isModalStreaming) return;            isModalStreaming = true;            modalLogCount = 0;            modalLogsPerSec = 0;            const body = document.getElementById('modalLogsBody');            if (body) body.innerHTML = '';            modalStreamInterval = setInterval(() => {                if (!isModalStreaming) return;                const types = ['INFO','SUCCESS','WARNING','ERROR'];                const type = types[Math.floor(Math.random() * types.length)];                const msg = MODAL_LOGS[Math.floor(Math.random() * MODAL_LOGS.length)];                addModalLog(type, msg);                modalLogsPerSec++;            }, Math.random() * 300 + 100);            setInterval(() => {                const el = document.getElementById('modalStreamRate');                if (el) el.textContent = modalLogsPerSec + ' logs/sec';                modalLogsPerSec = 0;            }, 1000);        }        function stopModalStream() {            isModalStreaming = false;            if (modalStreamInterval) clearInterval(modalStreamInterval);        }        function addModalLog(level, msg) {            const body = document.getElementById('modalLogsBody');            if (!body) return;            const time = new Date().toISOString().substring(11, 23);            const line = document.createElement('div');            line.className = 'log-line';            line.innerHTML = <span class=\"log-timestamp\">[${time}]</span> <span class=\"log-level-${level.toLowerCase()}\">[${level}]</span> ${msg};            body.appendChild(line);            modalLogCount++;            const countEl = document.getElementById('modalLogCount');            if (countEl) countEl.textContent = modalLogCount + ' logs';            if (autoScroll) body.scrollTop = body.scrollHeight;            if (modalLogCount > 500) body.removeChild(body.firstChild);        }        function toggleAutoScroll() {            autoScroll = !autoScroll;            const btn = document.getElementById('autoScrollBtn');            if (btn) btn.classList.toggle('active', autoScroll);            showToast('AUTO-SCROLL ' + (autoScroll ? 'ON' : 'OFF'));        }        function clearModalLogs() {            const body = document.getElementById('modalLogsBody');            if (body) body.innerHTML = '';            modalLogCount = 0;            const countEl = document.getElementById('modalLogCount');            if (countEl) countEl.textContent = '0 logs';            showToast('LOGS CLEARED');        }        function pauseModalStream() {            if (isModalStreaming) {                stopModalStream();                showToast('STREAM PAUSED');            } else {                startModalStream();                showToast('STREAM RESUMED');            }        }        // Menu        document.getElementById('menuBtn').addEventListener('click', (e) => {            e.stopPropagation();            const menu = document.getElementById('dropdownMenu');            const btn = document.getElementById('menuBtn');            menu.classList.toggle('active');            btn.classList.toggle('active');        });        document.addEventListener('click', (e) => {            const menu = document.getElementById('dropdownMenu');            const btn = document.getElementById('menuBtn');            if (!menu.contains(e.target) && !btn.contains(e.target)) {                menu.classList.remove('active');                btn.classList.remove('active');            }        });        function handleAction(action) {            document.getElementById('dropdownMenu').classList.remove('active');            document.getElementById('menuBtn').classList.remove('active');            switch(action) {                case 'resume': startLogs(); showToast('WORKFLOW RESUMED'); break;                case 'pause': stopLogs(); showToast('WORKFLOW PAUSED'); break;                case 'restart': stopLogs(); setTimeout(startLogs, 500); showToast('WORKFLOW RESTARTED'); break;                case 'stop': stopLogs(); showToast('WORKFLOW STOPPED'); break;                case 'delete': if (confirm('Delete all tasks?')) { stopLogs(); showToast('ALL TASKS DELETED'); } break;            }        }        // Search        document.getElementById('searchBar').addEventListener('keyup', (e) => {            const term = e.target.value.toLowerCase();            const cards = document.querySelectorAll('.task-card');            let count = 0;            cards.forEach(card => {                const text = card.textContent.toLowerCase();                if (text.includes(term)) {                    card.style.display = '';                    count++;                } else {                    card.style.display = 'none';                }            });            if (term) showToast(count === 0 ? 'NO TASKS FOUND' : count + ' TASK' + (count!==1?'S':'') + ' FOUND');        });        function showToast(msg) {            const toast = document.getElementById('toast');            toast.textContent = msg;            toast.classList.add('show');            setTimeout(() => toast.classList.remove('show'), 2000);        }        // Keyboard        document.addEventListener('keydown', (e) => {            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {                e.preventDefault();                document.getElementById('searchBar').focus();            }            if (e.key === 'Escape') {                const modal = document.getElementById('taskModal');                if (modal.classList.contains('active')) {                    closeModal();                } else {                    document.getElementById('searchBar').value = '';                    document.querySelectorAll('.task-card').forEach(c => c.style.display = '');                }            }        });        // Init        initBoard();        startLogs();        setTimeout(() => document.getElementById('statusDot').classList.remove('disconnected'), 1000);    </script></body></html>finally this is the design i am looking to implementrefer to this artifact for more design https://claude.ai/public/artifacts/64ab25c9-e2c7-49f6-99d9-2fdc16531a74"}`

## Feature Description
Redesign the AgenticKanban user interface using a bold, brutalist design aesthetic that emphasizes functionality, raw elements, stark contrasts, and monospace typography. The design features a high-contrast black-and-white color scheme with bold borders, hard edges, no rounded corners, and a utilitarian layout that puts task workflow and real-time log streaming front and center. This redesign transforms the current polished, gradient-heavy UI into a raw, functional, command-center aesthetic inspired by terminal interfaces and brutalist web design principles.

The brutalist kanban UI will feature:
- Black header with white text and harsh 6px borders throughout
- Monospace 'Courier New' typography for a technical, terminal-like feel
- Hard-edged task cards with 4px solid black borders and box-shadow offsets on hover
- Pipeline stage indicators with letter abbreviations (P, B, T, R, D)
- Live log previews on each card with real-time updates
- Context progress bars showing workflow completion percentage
- Brutalist modal design with phase navigation and live streaming logs
- Prominent stats display (ACTIVE, TOTAL counts)
- Toast notifications with hard edges
- Column-specific bold background colors for stage differentiation

## User Story
As a developer using AgenticKanban
I want a brutalist, high-contrast, terminal-inspired user interface
So that I can focus on workflow execution, task progression, and real-time logs without visual distractions, creating a command-center aesthetic that emphasizes raw functionality over decorative design elements

## Problem Statement
The current AgenticKanban UI uses a polished, rounded, gradient-heavy design with soft shadows and pastel colors. While aesthetically pleasing, this design language doesn't align with the technical, AI-driven, automation-focused nature of the ADW workflow system. Users who prefer a more utilitarian, terminal-like interface for development tools would benefit from a stark, high-contrast alternative that emphasizes information density, real-time updates, and workflow status at a glance. The brutalist design philosophy—with its emphasis on raw, unadorned functionality—is a perfect match for a Kanban board managing automated AI developer workflows.

## Solution Statement
Implement a complete brutalist UI redesign using CSS-first principles that transform the existing React components with minimal structural changes. The solution will:

1. Create a new brutalist CSS theme file that overrides existing styles with monospace fonts, black/white color scheme, hard borders, and box-shadow hover effects
2. Update the KanbanBoard header to display bold stats, search bar, connection status, and dropdown menu with the brutalist aesthetic
3. Redesign KanbanCard components with pipeline stage indicators (P/B/T/R/D letters), live log previews, and context progress bars
4. Transform the CardExpandModal into a brutalist modal with phase navigation tabs and live-streaming logs display
5. Apply column-specific bold header colors (gray, blue, yellow, green, purple, pink, teal, red) to differentiate stages
6. Add brutalist scrollbar styling, toast notifications, and dropdown menus
7. Ensure all interactive elements use instant transitions (0.1s) and hard-edged hover states

The implementation will preserve all existing functionality while dramatically changing the visual presentation to match the brutalist design reference.

## Relevant Files
Use these files to implement the feature:

- **src/styles/kanban.css** - Main kanban-specific styles; will be heavily modified to implement brutalist theme overrides
- **src/index.css** - Global styles and CSS variables; will add brutalist CSS custom properties and base styles
- **src/components/kanban/KanbanBoard.jsx** - Main board component; will add stats display, search bar, and dropdown menu to header
- **src/components/kanban/KanbanCard.jsx** - Task card component; will add pipeline indicators, live log preview, and progress bar sections
- **src/components/kanban/CardExpandModal.jsx** - Modal component; will redesign with phase tabs and streaming logs view
- **src/components/kanban/StageProgressionIndicator.jsx** - Shows workflow stages; will simplify to letter-based (P/B/T/R/D) display
- **src/App.jsx** - Root component; may need minor updates for header layout changes
- **src/components/ui/WebSocketStatusIndicator.jsx** - Connection status display; will be integrated into brutalist header
- **src/stores/kanbanStore.js** - State management; may need to expose task stats (active/total counts)

### New Files
- **src/styles/brutalist-theme.css** - New CSS file containing all brutalist design overrides and theme-specific styles

## Implementation Plan

### Phase 1: Foundation - Brutalist CSS Theme Creation
Create the foundational brutalist CSS theme file with all necessary overrides, custom properties, typography, color definitions, and base component styles. This phase establishes the visual language that will be applied across all components.

**Key Tasks:**
- Create `src/styles/brutalist-theme.css` with monospace font stack, black/white color palette
- Define CSS custom properties for brutalist design system (border widths, shadows, spacing)
- Implement base typography rules (uppercase transforms, letter-spacing adjustments)
- Set up global border and box-shadow utilities for hard-edged aesthetics
- Create brutalist scrollbar styles for webkit browsers
- Define animation keyframes for shimmer effects and slide-in transitions

### Phase 2: Core Component Redesign
Redesign the core Kanban components (board, columns, cards) with brutalist styling while preserving all existing functionality. This phase transforms the visual presentation without breaking any workflows.

**Key Tasks:**
- Update KanbanBoard header with stats display, search bar, connection status, and menu dropdown
- Redesign column headers with bold background colors and harsh borders
- Transform KanbanCard to include pipeline stage indicators (P/B/T/R/D letters)
- Add live log preview section to cards with real-time log rotation
- Implement context progress bar at bottom of cards
- Apply brutalist hover states (translate + box-shadow offset)
- Update task metadata footer with brutalist badges and labels

### Phase 3: Modal and Interactive Elements
Transform the CardExpandModal and all interactive UI elements (dropdowns, toasts, buttons) to match the brutalist aesthetic with phase-based navigation and live log streaming.

**Key Tasks:**
- Redesign CardExpandModal with two-column grid layout (metadata left, logs right)
- Implement phase navigation tabs with icon + letter + status indicators
- Create live-streaming logs container with controls (auto-scroll, clear, pause)
- Add brutalist toast notification system
- Redesign dropdown menus with hard borders and action-specific hover colors
- Update all buttons to brutalist style (hard borders, monospace text, instant transitions)
- Apply brutalist form input styling for search bars

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Create Brutalist CSS Theme Foundation
- Create new file `src/styles/brutalist-theme.css`
- Define CSS custom properties for:
  - Monospace font stack: `'Courier New', monospace`
  - Color palette: `--color-brutalist-black: #000`, `--color-brutalist-white: #fff`
  - Border widths: `--border-thin: 2px`, `--border-medium: 3px`, `--border-thick: 4px`, `--border-ultra: 6px`
  - Box shadows: `--shadow-brutalist-hover: 3px 3px 0 #000`, `--shadow-brutalist-menu: 4px 4px 0 rgba(0,0,0,0.2)`
  - Spacing: `--spacing-xs: 6px`, `--spacing-sm: 8px`, `--spacing-md: 12px`, `--spacing-lg: 16px`
- Implement global typography overrides (uppercase transforms, monospace font application)
- Create brutalist scrollbar styles (`::-webkit-scrollbar` black thumb, light gray track)
- Define keyframe animations:
  - `@keyframes shimmer` for progress bar animation
  - `@keyframes slideIn` for log entry animations
  - `@keyframes pulse` for status dot animation

### Step 2: Update KanbanBoard Header Component
- Modify `src/components/kanban/KanbanBoard.jsx` to add header structure with:
  - Left section: Project name "KANBAN.V4" in large uppercase letters with negative letter-spacing
  - Stats display showing ACTIVE and TOTAL task counts from kanbanStore
  - Search bar with emoji icon and uppercase placeholder
  - WebSocket connection status indicator with animated dot
- Right section: Icon buttons (⚡ ⇅ ⚙) and menu dropdown (⋮)
- Implement dropdown menu with action items (RESUME, PAUSE, RESTART, STOP, DELETE)
- Apply brutalist header CSS classes to achieve black background, white text, 6px bottom border
- Connect stats display to kanbanStore to show real task counts

### Step 3: Redesign Kanban Columns with Brutalist Styling
- Update column header styles in `src/styles/kanban.css` with brutalist overrides:
  - Bold background colors per stage (backlog: #6b7280, plan: #3b82f6, build: #f59e0b, test: #10b981, review: #8b5cf6, document: #ec4899, ready-to-merge: #14b8a6, errored: #ef4444)
  - 6px solid black borders on all sides
  - Uppercase text with Courier New font
  - Column count badge with white background, black text, hard borders
- Update column body with minimal padding and hard-edged task spacing
- Apply 6px border-right between columns, 6px border-bottom on board container

### Step 4: Transform KanbanCard with Pipeline Indicators and Live Logs
- Modify `src/components/kanban/KanbanCard.jsx` structure:
  - Card header: Issue number (large, bold) + Task ID badge (black bg, white text, small uppercase)
  - Card body: Task title (uppercase, bold), pipeline indicator component, description
  - Pipeline indicator: Row of 5 letter boxes (P, B, T, R, D) with states: completed (blue bg), active (yellow bg), pending (gray/white)
  - Live log preview section: Lightning bolt emoji + rotating log line with level badge (INFO/SUCCESS/WARNING/ERROR)
  - Task meta footer: Time/status badges on left, bug/feature labels on right
  - Context progress bar at absolute bottom (8px height, gradient blue fill, shimmer animation)
- Apply brutalist card CSS:
  - 4px solid black border on all sides
  - White background with harsh corners (border-radius: 0)
  - Hover effect: `transform: translate(-3px, -3px); box-shadow: 3px 3px 0 #000`
  - No smooth transitions, instant feedback (0.1s)

### Step 5: Implement Live Log Preview with Real-Time Updates
- Add live log preview state management to KanbanCard:
  - Subscribe to workflow logs from kanbanStore via `getWorkflowLogsForTask(task.id)`
  - Display most recent log entry in card preview section
  - Show log level badge with color coding (info: blue, success: green, warning: yellow, error: red)
  - Add lightning bolt emoji indicator and truncated log message
- Style log preview with brutalist aesthetics:
  - 2px solid black border container
  - Light gray background (#f8f8f8)
  - Monospace text at 9px font size
  - Level badges in bold with appropriate colors
  - Text overflow ellipsis for long messages

### Step 6: Add Context Progress Bar to Cards
- Add progress bar component at bottom of KanbanCard:
  - Absolute positioned div at bottom: 0, spanning full card width
  - 8px height with 2px black border-top
  - Light gray background (#f0f0f0)
  - Progress bar fill with gradient (blue to light blue: `linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%)`)
  - Shimmer effect overlay using `::after` pseudo-element with animated gradient
- Connect progress bar to workflow progress from kanbanStore `getWorkflowProgressForTask(task.id)`
- Width based on percentage: `style="width: ${progress}%"`

### Step 7: Redesign CardExpandModal with Brutalist Layout
- Transform `src/components/kanban/CardExpandModal.jsx` structure:
  - Modal overlay: `rgba(0, 0, 0, 0.9)` with no blur effects
  - Modal content: 8px solid black border, white background, no rounded corners
  - Modal header: Black background, white text, uppercase title, X close button with border
  - Modal body: Two-column grid (320px left sidebar, 1fr right content)
  - Left sidebar: Task metadata sections with black section headers and info rows
  - Right content: Phase navigator + phase content area + action bar
- Apply brutalist modal CSS classes for harsh borders and instant animations

### Step 8: Implement Phase Navigator with Tabs
- Create phase navigator component in modal right section:
  - Tabs row with 5 phase buttons (PLAN, BUILD, TEST, REVIEW, DOC)
  - Each tab shows: Icon emoji (📋 🔨 🧪 👀 📄) + Letter (P/B/T/R/D) + Phase name + Status symbol (✓ ● ○)
  - Active tab: Blue background (#3b82f6), white text
  - Inactive tabs: White background, 3px solid black border, hover transform
- Connect tabs to workflow phase status from kanbanStore
- Implement tab switching to show corresponding phase content below

### Step 9: Create Live Streaming Logs Display in Modal
- Build logs container for active phase content:
  - Logs header: Live indicator dot + log count + logs/sec rate
  - Logs body: Scrollable container (200px min, 350px max height) with log lines
  - Each log line: Timestamp + Level badge + Message
  - Logs controls: AUTO (auto-scroll toggle), CLEAR, PAUSE buttons
- Implement log streaming from kanbanStore workflow logs
- Add auto-scroll behavior, log line animations (slideIn), and log level color coding
- Connect PAUSE button to start/stop log streaming, CLEAR to reset log display
- Style with brutalist aesthetics: 4px black borders, monospace text, harsh controls

### Step 10: Add Brutalist Toast Notification System
- Create toast notification component (fixed bottom-right position)
- Style with:
  - Black background, white text
  - 4px solid black border
  - Monospace uppercase text at 10px
  - Transform animation (slide in from right: `translateX(400px)` to `translateX(0)`)
  - 3s duration, auto-hide
- Connect toast to kanbanStore actions (search results, workflow events, menu actions)
- Add toast trigger functions: `showToast(message)`

### Step 11: Implement Brutalist Dropdown Menu System
- Create dropdown menu component for header menu button (⋮)
- Structure: Absolute positioned, white bg, 4px black border, shadow offset
- Menu items:
  - ▶ RESUME WORKFLOW (hover: green background)
  - ⏸ PAUSE WORKFLOW (hover: yellow background)
  - 🔄 RESTART WORKFLOW (hover: black background)
  - ⏹ STOP WORKFLOW (hover: black background)
  - 🗑 DELETE ALL TASKS (hover: red background)
- Apply 2px black borders between items, uppercase monospace text
- Implement click-outside-to-close behavior
- Connect actions to kanbanStore workflow control methods

### Step 12: Style Search Bar with Brutalist Aesthetics
- Update search bar in header:
  - 3px solid white border on black header background
  - White background with black text
  - Monospace font, uppercase placeholder: "SEARCH TASKS..."
  - 🔍 emoji icon positioned absolutely on left
  - No rounded corners, no box-shadow
- Implement search functionality:
  - Filter tasks by title/description text match
  - Show toast with result count: "X TASK(S) FOUND" or "NO TASKS FOUND"
  - Connect to kanbanStore task filtering
- Add keyboard shortcut: Cmd/Ctrl + K to focus search bar

### Step 13: Update All Interactive Button Styles
- Apply brutalist button styling globally:
  - 4px solid black borders
  - Monospace uppercase text
  - White background default
  - Hover: Black background, white text (instant transition 0.1s)
  - Primary buttons: Blue background (#3b82f6), white text
  - Icon buttons: 36px x 36px squares with centered emoji/icon
- Update buttons in:
  - Card action menus
  - Modal action bars (TRIGGER, EDIT, DELETE, CLOSE)
  - Log controls (AUTO, CLEAR, PAUSE)
  - Dropdown menu items

### Step 14: Apply Column-Specific Bold Colors
- Define column header background colors in CSS:
  - Backlog: `#6b7280` (gray)
  - Plan: `#3b82f6` (blue)
  - Build: `#f59e0b` (yellow/orange)
  - Test: `#10b981` (green)
  - Review: `#8b5cf6` (purple)
  - Document: `#ec4899` (pink)
  - Ready-to-Merge: `#14b8a6` (teal)
  - Errored: `#ef4444` (red)
- Apply color classes to column headers based on stage ID
- Ensure white text contrast on all colored backgrounds

### Step 15: Implement Brutalist Form Input Styling
- Create form input styles for modals and forms:
  - 3px solid black borders
  - White background, black text
  - Monospace font for text inputs
  - No rounded corners, no box-shadow
  - Focus state: Maintain border, no glow effects
  - Placeholder text: Gray (#666), uppercase
- Apply to existing form inputs in TaskEditModal, SettingsModal, etc.

### Step 16: Add "Add Task" Button to Columns
- Create "ADD TASK" button at bottom of each column's task list
- Style as dashed border box:
  - 3px dashed black border
  - White background default
  - Hover: Black background, white text
  - Uppercase monospace text: "+ NEW"
  - Full width, 12px padding, centered text
- Connect to toggleTaskInput from kanbanStore to open task creation modal

### Step 17: Integration Testing and CSS Cleanup
- Import `brutalist-theme.css` into `src/App.jsx` or `src/index.css`
- Test all interactive elements for brutalist styling consistency
- Verify hover states, transitions (should be instant 0.1s), and border widths
- Check responsiveness: Ensure brutalist design works on various screen sizes
- Remove conflicting CSS from existing kanban.css that interferes with brutalist theme
- Validate color contrast for accessibility (black/white should pass AAA standards)

### Step 18: Create E2E Test for Brutalist UI
- Create new E2E test file: `.claude/commands/e2e/test_brutalist_ui.md`
- Test scenarios:
  1. Header displays with stats, search bar, connection status, and menu
  2. Kanban columns show with bold colored headers and task counts
  3. Task cards display with pipeline indicators (P/B/T/R/D), live logs, and progress bars
  4. Card hover effect shows translate + box-shadow offset
  5. Clicking card opens brutalist modal with phase tabs and streaming logs
  6. Phase tab switching works and displays correct content
  7. Search bar filters tasks and shows toast notification
  8. Dropdown menu opens and action items have correct hover colors
  9. Toast notifications appear and auto-hide
  10. All buttons use brutalist styling (hard borders, monospace, instant hover)
- Include screenshots for visual validation of brutalist aesthetic

### Step 19: Run Validation Commands
Execute the following validation commands to ensure zero regressions:
- Read `.claude/commands/test_e2e.md`, then read and execute `.claude/commands/e2e/test_brutalist_ui.md`
- `cd server && uv run pytest` - Run server tests
- `bun tsc --noEmit` - Run frontend TypeScript validation
- `bun run build` - Build frontend to check for errors
- Manually test in browser:
  - Verify all brutalist styles are applied correctly
  - Test interactive elements (search, dropdown, modals, buttons)
  - Check live log streaming and progress bars
  - Validate phase navigation and toast notifications
  - Confirm no visual regressions in existing functionality

## Testing Strategy

### Unit Tests
- **CSS Theme Tests**: Verify brutalist CSS custom properties are defined and accessible
- **Component Rendering**: Test KanbanBoard header renders with stats, search, and menu
- **Card Structure**: Validate KanbanCard includes pipeline indicator, log preview, progress bar
- **Modal Layout**: Test CardExpandModal renders with two-column grid and phase tabs
- **State Integration**: Verify stats display correctly pulls from kanbanStore (active/total counts)
- **Log Preview**: Test live log preview updates when workflow logs change
- **Progress Bar**: Verify progress bar width calculates correctly from workflow progress percentage

### Edge Cases
- **Empty States**: Columns with no tasks show "EMPTY" text, modal phases with no logs show "⏳ Phase not started"
- **Long Text**: Task titles and descriptions that exceed container width should truncate with ellipsis
- **Rapid Log Streaming**: Log preview should handle high-frequency updates without performance degradation
- **Search with No Results**: Search bar should display "NO TASKS FOUND" toast when query returns zero matches
- **Disconnected WebSocket**: Connection status dot should turn red when WebSocket disconnects
- **Mobile Responsiveness**: Brutalist design should adapt to smaller screens (stacked layout, smaller borders)
- **High Task Counts**: Stats display should handle large numbers (e.g., "999+ ACTIVE")
- **Modal Overflow**: Long log streams should scroll correctly within fixed-height containers

## Acceptance Criteria
- [ ] Brutalist CSS theme file is created with monospace fonts, black/white palette, and hard-edged borders
- [ ] KanbanBoard header displays project name, stats (ACTIVE/TOTAL), search bar, connection status, and dropdown menu
- [ ] All columns show bold colored headers with stage-specific colors (gray, blue, yellow, green, purple, pink, teal, red)
- [ ] Task cards display with 4px solid black borders, pipeline indicators (P/B/T/R/D), live log preview, and context progress bar
- [ ] Card hover effect translates card (-3px, -3px) and adds box-shadow (3px 3px 0 #000)
- [ ] CardExpandModal uses brutalist two-column layout with metadata sidebar and phase content area
- [ ] Phase navigator shows 5 tabs (PLAN, BUILD, TEST, REVIEW, DOC) with icons, letters, names, and status symbols
- [ ] Live streaming logs display in active phase with auto-scroll, clear, and pause controls
- [ ] Search bar filters tasks in real-time and shows toast notification with result count
- [ ] Dropdown menu displays 5 action items with correct hover colors (green, yellow, black, red)
- [ ] Toast notifications slide in from right with black background, white text, and auto-hide after 3s
- [ ] All buttons use brutalist styling: 4px borders, monospace text, instant hover (0.1s)
- [ ] "ADD TASK" button appears at bottom of columns with dashed border and hover inversion
- [ ] All text is monospace ('Courier New'), uppercase where appropriate, with negative letter-spacing for headers
- [ ] Progress bars show gradient blue fill with shimmer animation overlay
- [ ] Brutalist scrollbars (black thumb, light gray track) appear on all scrollable containers
- [ ] E2E test file validates brutalist UI with screenshots proving visual design matches reference
- [ ] Zero regressions: All existing functionality works, no TypeScript errors, build succeeds, tests pass

## Validation Commands
Execute every command to validate the feature works correctly with zero regressions.

- Read `.claude/commands/test_e2e.md`, then read and execute `.claude/commands/e2e/test_brutalist_ui.md` to validate brutalist UI functionality works
- `cd server && uv run pytest` - Run server tests to validate the feature works with zero regressions
- `bun tsc --noEmit` - Run frontend tests to validate the feature works with zero regressions
- `bun run build` - Run frontend build to validate the feature works with zero regressions

## Notes
- **Design Reference**: The HTML/CSS artifact provided in the issue body serves as the primary design reference. Reference the Claude artifact at https://claude.ai/public/artifacts/64ab25c9-e2c7-49f6-99d9-2fdc16531a74 for additional visual context.
- **CSS-First Approach**: This implementation prioritizes CSS styling changes over JavaScript structural changes. Most components can be restyled with brutalist CSS classes without modifying JSX structure.
- **Monospace Typography**: 'Courier New' is chosen for its universal availability and strong terminal/code aesthetic. Consider fallback stack: `'Courier New', 'Courier', Monaco, monospace`.
- **Performance Consideration**: Live log streaming and progress bar shimmer animations should use CSS transforms and GPU-accelerated properties for smooth performance.
- **Accessibility**: Despite the stark black/white aesthetic, ensure all interactive elements have sufficient focus indicators and maintain WCAG AAA contrast ratios (minimum 7:1).
- **Responsive Design**: Brutalist design can be challenging on mobile due to large borders and fixed widths. Consider reducing border widths (4px → 2px) and adjusting font sizes on screens < 768px.
- **Theme Toggle Future**: This implementation creates a brutalist theme as the default. In the future, consider adding a theme toggle to switch between brutalist and the original polished design.
- **Browser Compatibility**: Brutalist scrollbar styles use `::-webkit-scrollbar` which only works in Chrome/Safari/Edge. Consider adding Firefox scrollbar styling with `scrollbar-width` and `scrollbar-color` properties.
- **Animation Performance**: The shimmer effect on progress bars uses `transform: translateX()` which is hardware-accelerated. Avoid animating `left` or `margin` properties for better performance.
