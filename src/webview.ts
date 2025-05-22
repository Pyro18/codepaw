import * as vscode from 'vscode';
import { PetManager, PetData } from './petManager';

export class PetWebviewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'codePaw.petView';
  private _view?: vscode.WebviewView;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly petManager: PetManager
  ) {
    this.petManager.onDidUpdatePet(() => {
      this.updateWebview();
    });
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };

    webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);
    this.updateWebview();

    webviewView.webview.onDidReceiveMessage(data => {
      switch (data.type) {
        case 'feedPet':
          this.petManager.addActivity('manual', data.xp);
          break;
        case 'resetPet':
          this.petManager.resetPet();
          break;
        case 'switchTab':
          // Handle tab switching in the webview
          break;
      }
    });
  }

  private updateWebview() {
    if (this._view) {
      this._view.webview.postMessage({
        type: 'updatePet',
        data: this.petManager.getPetData()
      });
    }
  }

  private getHtmlForWebview(webview: vscode.Webview): string {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                :root {
                    --primary-color: #FF6B6B;
                    --secondary-color: #4ECDC4;
                    --accent-color: #FFE66D;
                    --success-color: #51CF66;
                    --warning-color: #FFB366;
                }

                body { 
                    font-family: var(--vscode-font-family);
                    color: var(--vscode-foreground);
                    background-color: var(--vscode-editor-background);
                    margin: 0;
                    padding: 0;
                    font-size: 13px;
                    line-height: 1.4;
                }

                .container {
                    padding: 16px;
                    max-width: 100%;
                    overflow-x: hidden;
                }

                /* Tab Navigation */
                .tab-navigation {
                    display: flex;
                    margin-bottom: 16px;
                    border-bottom: 1px solid var(--vscode-widget-border);
                }

                .tab-button {
                    flex: 1;
                    padding: 8px 4px;
                    background: transparent;
                    border: none;
                    color: var(--vscode-foreground);
                    cursor: pointer;
                    font-size: 11px;
                    text-align: center;
                    border-bottom: 2px solid transparent;
                    transition: all 0.2s ease;
                }

                .tab-button:hover {
                    background: var(--vscode-list-hoverBackground);
                }

                .tab-button.active {
                    border-bottom-color: var(--primary-color);
                    color: var(--primary-color);
                }

                .tab-content {
                    display: none;
                }

                .tab-content.active {
                    display: block;
                }

                /* Pet Container */
                .pet-container {
                    text-align: center;
                    padding: 20px;
                    border-radius: 8px;
                    background: var(--vscode-editor-widget-background);
                    border: 1px solid var(--vscode-widget-border);
                    margin-bottom: 16px;
                }

                .pet-emoji {
                    font-size: 48px;
                    margin: 12px 0;
                    animation: bounce 3s infinite;
                    display: block;
                }

                @keyframes bounce {
                    0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
                    40% { transform: translateY(-8px); }
                    60% { transform: translateY(-4px); }
                }

                .pet-name {
                    font-size: 18px;
                    font-weight: bold;
                    margin: 8px 0 4px 0;
                }

                .pet-level {
                    font-size: 12px;
                    color: var(--vscode-descriptionForeground);
                    margin-bottom: 16px;
                }

                /* Progress Bars */
                .progress-container {
                    margin: 12px 0;
                }

                .progress-label {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 4px;
                    font-size: 11px;
                }

                .progress-bar {
                    width: 100%;
                    height: 6px;
                    background: var(--vscode-progressBar-background);
                    border-radius: 3px;
                    overflow: hidden;
                }

                .progress-fill {
                    height: 100%;
                    border-radius: 3px;
                    transition: width 0.5s ease;
                }

                .xp-bar { background: var(--secondary-color); }
                .happiness-bar { background: var(--primary-color); }
                .energy-bar { background: var(--accent-color); }
                .streak-bar { background: var(--success-color); }

                /* Stats Grid */
                .stats-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 8px;
                    margin: 16px 0;
                }

                .stat-card {
                    background: var(--vscode-input-background);
                    border: 1px solid var(--vscode-input-border);
                    border-radius: 6px;
                    padding: 12px 8px;
                    text-align: center;
                }

                .stat-number {
                    font-size: 16px;
                    font-weight: bold;
                    color: var(--secondary-color);
                    display: block;
                }

                .stat-label {
                    font-size: 10px;
                    color: var(--vscode-descriptionForeground);
                    margin-top: 2px;
                }

                /* Action Buttons */
                .action-buttons {
                    display: flex;
                    gap: 8px;
                    margin-top: 16px;
                }

                .btn {
                    flex: 1;
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    padding: 8px 12px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 11px;
                    transition: background 0.2s ease;
                }

                .btn:hover {
                    background: var(--vscode-button-hoverBackground);
                }

                .btn-secondary {
                    background: var(--vscode-input-background);
                    color: var(--vscode-foreground);
                    border: 1px solid var(--vscode-input-border);
                }

                .btn-secondary:hover {
                    background: var(--vscode-list-hoverBackground);
                }

                /* Achievements */
                .achievements-container {
                    margin-top: 16px;
                }

                .achievement {
                    display: flex;
                    align-items: center;
                    padding: 8px;
                    margin: 4px 0;
                    background: var(--vscode-input-background);
                    border-radius: 4px;
                    border: 1px solid var(--vscode-input-border);
                }

                .achievement.unlocked {
                    border-color: var(--success-color);
                    background: var(--vscode-inputValidation-infoBackground);
                }

                .achievement-icon {
                    font-size: 16px;
                    margin-right: 8px;
                    width: 20px;
                    text-align: center;
                }

                .achievement-info {
                    flex: 1;
                }

                .achievement-name {
                    font-size: 11px;
                    font-weight: bold;
                }

                .achievement-desc {
                    font-size: 9px;
                    color: var(--vscode-descriptionForeground);
                }

                /* Detailed Stats */
                .detailed-stats {
                    margin-top: 16px;
                }

                .stat-section {
                    margin-bottom: 16px;
                    padding: 12px;
                    background: var(--vscode-editor-widget-background);
                    border-radius: 6px;
                    border: 1px solid var(--vscode-widget-border);
                }

                .stat-section-title {
                    font-size: 12px;
                    font-weight: bold;
                    margin-bottom: 8px;
                    color: var(--secondary-color);
                }

                .stat-row {
                    display: flex;
                    justify-content: space-between;
                    margin: 4px 0;
                    font-size: 11px;
                }

                .stat-value {
                    font-weight: bold;
                    color: var(--primary-color);
                }

                /* Evolution History */
                .evolution-history {
                    margin-top: 16px;
                }

                .evolution-item {
                    display: flex;
                    align-items: center;
                    padding: 8px;
                    margin: 4px 0;
                    background: var(--vscode-input-background);
                    border-radius: 4px;
                    border-left: 3px solid var(--secondary-color);
                }

                .evolution-date {
                    font-size: 9px;
                    color: var(--vscode-descriptionForeground);
                    margin-left: auto;
                }

                /* Scrollable containers */
                .scrollable {
                    max-height: 200px;
                    overflow-y: auto;
                    margin: 8px 0;
                }

                .scrollable::-webkit-scrollbar {
                    width: 6px;
                }

                .scrollable::-webkit-scrollbar-track {
                    background: var(--vscode-scrollbar-shadow);
                }

                .scrollable::-webkit-scrollbar-thumb {
                    background: var(--vscode-scrollbarSlider-background);
                    border-radius: 3px;
                }

                .scrollable::-webkit-scrollbar-thumb:hover {
                    background: var(--vscode-scrollbarSlider-hoverBackground);
                }

                /* Responsive Design */
                @media (max-width: 300px) {
                    .stats-grid {
                        grid-template-columns: 1fr;
                    }
                    
                    .tab-button {
                        font-size: 10px;
                        padding: 6px 2px;
                    }
                    
                    .pet-emoji {
                        font-size: 36px;
                    }
                }

                /* Activity Timeline */
                .activity-timeline {
                    margin-top: 16px;
                }

                .activity-item {
                    display: flex;
                    align-items: center;
                    padding: 6px 8px;
                    margin: 2px 0;
                    background: var(--vscode-input-background);
                    border-radius: 3px;
                    font-size: 10px;
                }

                .activity-icon {
                    margin-right: 6px;
                    width: 16px;
                    text-align: center;
                }

                .activity-text {
                    flex: 1;
                }

                .activity-xp {
                    color: var(--success-color);
                    font-weight: bold;
                }

                /* Language Stats */
                .language-stats {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 4px;
                    margin-top: 8px;
                }

                .language-tag {
                    padding: 2px 6px;
                    background: var(--secondary-color);
                    color: var(--vscode-editor-background);
                    border-radius: 10px;
                    font-size: 9px;
                    font-weight: bold;
                }

                /* Milestone Indicators */
                .milestone-indicator {
                    display: inline-block;
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    margin: 0 2px;
                }

                .milestone-completed { background: var(--success-color); }
                .milestone-pending { background: var(--vscode-input-border); }

                /* Streak Visualization */
                .streak-calendar {
                    display: grid;
                    grid-template-columns: repeat(7, 1fr);
                    gap: 2px;
                    margin-top: 8px;
                }

                .streak-day {
                    width: 16px;
                    height: 16px;
                    border-radius: 2px;
                    background: var(--vscode-input-border);
                }

                .streak-day.active {
                    background: var(--success-color);
                }

                .streak-day.today {
                    border: 1px solid var(--primary-color);
                }
            </style>
        </head>
        <body>
            <div class="container">
                <!-- Tab Navigation -->
                <div class="tab-navigation">
                    <button class="tab-button active" onclick="switchTab('pet')">🐾 Pet</button>
                    <button class="tab-button" onclick="switchTab('stats')">📊 Stats</button>
                    <button class="tab-button" onclick="switchTab('achievements')">🏆 Goals</button>
                    <button class="tab-button" onclick="switchTab('history')">📈 History</button>
                </div>

                <!-- Pet Tab -->
                <div id="pet-tab" class="tab-content active">
                    <div class="pet-container">
                        <div id="pet-emoji" class="pet-emoji">🐣</div>
                        <div id="pet-name" class="pet-name">Pypy</div>
                        <div id="pet-level" class="pet-level">Baby Coder • Level 1</div>
                        
                        <div class="progress-container">
                            <div class="progress-label">
                                <span>XP</span>
                                <span id="xp-text">0/100</span>
                            </div>
                            <div class="progress-bar">
                                <div id="xp-bar" class="progress-fill xp-bar" style="width: 0%"></div>
                            </div>
                        </div>
                        
                        <div class="progress-container">
                            <div class="progress-label">
                                <span>Happiness</span>
                                <span id="happiness-text">80%</span>
                            </div>
                            <div class="progress-bar">
                                <div id="happiness-bar" class="progress-fill happiness-bar" style="width: 80%"></div>
                            </div>
                        </div>

                        <div class="progress-container">
                            <div class="progress-label">
                                <span>Energy</span>
                                <span id="energy-text">70%</span>
                            </div>
                            <div class="progress-bar">
                                <div id="energy-bar" class="progress-fill energy-bar" style="width: 70%"></div>
                            </div>
                        </div>

                        <div class="progress-container">
                            <div class="progress-label">
                                <span>🔥 Streak</span>
                                <span id="streak-text">1 days</span>
                            </div>
                            <div class="progress-bar">
                                <div id="streak-bar" class="progress-fill streak-bar" style="width: 10%"></div>
                            </div>
                        </div>
                    </div>

                    <div class="stats-grid">
                        <div class="stat-card">
                            <span id="saves-count" class="stat-number">0</span>
                            <div class="stat-label">Saves</div>
                        </div>
                        <div class="stat-card">
                            <span id="commits-count" class="stat-number">0</span>
                            <div class="stat-label">Commits</div>
                        </div>
                        <div class="stat-card">
                            <span id="files-count" class="stat-number">0</span>
                            <div class="stat-label">Files</div>
                        </div>
                        <div class="stat-card">
                            <span id="languages-count" class="stat-number">0</span>
                            <div class="stat-label">Languages</div>
                        </div>
                    </div>

                    <div class="action-buttons">
                        <button class="btn" onclick="feedPet(25)">🍎 Snack</button>
                        <button class="btn" onclick="feedPet(50)">🥇 Prize</button>
                        <button class="btn btn-secondary" onclick="resetPet()">🔄 Reset</button>
                    </div>
                </div>

                <!-- Stats Tab -->
                <div id="stats-tab" class="tab-content">
                    <div class="detailed-stats">
                        <div class="stat-section">
                            <div class="stat-section-title">📝 Coding Activity</div>
                            <div class="stat-row">
                                <span>Total Lines Written</span>
                                <span id="total-lines" class="stat-value">0</span>
                            </div>
                            <div class="stat-row">
                                <span>Files Created</span>
                                <span id="files-created" class="stat-value">0</span>
                            </div>
                            <div class="stat-row">
                                <span>Test Files</span>
                                <span id="test-files" class="stat-value">0</span>
                            </div>
                            <div class="stat-row">
                                <span>Total XP Earned</span>
                                <span id="total-xp" class="stat-value">0</span>
                            </div>
                        </div>

                        <div class="stat-section">
                            <div class="stat-section-title">🔧 Git Activity</div>
                            <div class="stat-row">
                                <span>Total Commits</span>
                                <span id="git-commits" class="stat-value">0</span>
                            </div>
                            <div class="stat-row">
                                <span>Bug Fixes</span>
                                <span id="bug-fixes" class="stat-value">0</span>
                            </div>
                            <div class="stat-row">
                                <span>Features Added</span>
                                <span id="features-added" class="stat-value">0</span>
                            </div>
                            <div class="stat-row">
                                <span>Current Branch</span>
                                <span id="current-branch" class="stat-value">main</span>
                            </div>
                            <div class="stat-row">
                                <span>Repositories Used</span>
                                <span id="repositories-used" class="stat-value">0</span>
                            </div>
                        </div>

                        <div class="stat-section">
                            <div class="stat-section-title">⏱️ Time Tracking</div>
                            <div class="stat-row">
                                <span>Total Session Time</span>
                                <span id="session-time" class="stat-value">0 min</span>
                            </div>
                            <div class="stat-row">
                                <span>Longest Session</span>
                                <span id="longest-session" class="stat-value">0 min</span>
                            </div>
                            <div class="stat-row">
                                <span>Debug Sessions</span>
                                <span id="debug-sessions" class="stat-value">0</span>
                            </div>
                            <div class="stat-row">
                                <span>Terminal Sessions</span>
                                <span id="terminal-sessions" class="stat-value">0</span>
                            </div>
                        </div>

                        <div class="stat-section">
                            <div class="stat-section-title">🗣️ Programming Languages</div>
                            <div id="language-list" class="language-stats">
                                <!-- Languages will be populated dynamically -->
                            </div>
                        </div>

                        <div class="stat-section">
                            <div class="stat-section-title">🔥 Streak Information</div>
                            <div class="stat-row">
                                <span>Current Streak</span>
                                <span id="current-streak" class="stat-value">1 days</span>
                            </div>
                            <div class="stat-row">
                                <span>Longest Streak</span>
                                <span id="longest-streak" class="stat-value">1 days</span>
                            </div>
                            <div class="stat-row">
                                <span>Last Active</span>
                                <span id="last-active" class="stat-value">Today</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Achievements Tab -->
                <div id="achievements-tab" class="tab-content">
                    <div class="achievements-container">
                        <div class="scrollable">
                            <div id="achievement-first_milestone" class="achievement">
                                <div class="achievement-icon">🎯</div>
                                <div class="achievement-info">
                                    <div class="achievement-name">First Milestone</div>
                                    <div class="achievement-desc">Reach Level 10</div>
                                </div>
                            </div>
                            
                            <div id="achievement-save_master" class="achievement">
                                <div class="achievement-icon">💾</div>
                                <div class="achievement-info">
                                    <div class="achievement-name">Save Master</div>
                                    <div class="achievement-desc">Save 100 files</div>
                                </div>
                            </div>
                            
                            <div id="achievement-polyglot" class="achievement">
                                <div class="achievement-icon">🗣️</div>
                                <div class="achievement-info">
                                    <div class="achievement-name">Polyglot</div>
                                    <div class="achievement-desc">Use 5 different languages</div>
                                </div>
                            </div>
                            
                            <div id="achievement-commit_master" class="achievement">
                                <div class="achievement-icon">🚀</div>
                                <div class="achievement-info">
                                    <div class="achievement-name">Commit Master</div>
                                    <div class="achievement-desc">Make 50 commits</div>
                                </div>
                            </div>
                            
                            <div id="achievement-month_streak" class="achievement">
                                <div class="achievement-icon">🔥</div>
                                <div class="achievement-info">
                                    <div class="achievement-name">30-Day Streak</div>
                                    <div class="achievement-desc">Code for 30 consecutive days</div>
                                </div>
                            </div>
                            
                            <div id="achievement-bug_hunter" class="achievement">
                                <div class="achievement-icon">🐛</div>
                                <div class="achievement-info">
                                    <div class="achievement-name">Bug Hunter</div>
                                    <div class="achievement-desc">Fix 20 bugs</div>
                                </div>
                            </div>
                            
                            <div id="achievement-test_writer" class="achievement">
                                <div class="achievement-icon">✅</div>
                                <div class="achievement-info">
                                    <div class="achievement-name">Test Writer</div>
                                    <div class="achievement-desc">Create 10 test files</div>
                                </div>
                            </div>
                            
                            <div id="achievement-marathon_coder" class="achievement">
                                <div class="achievement-icon">⏱️</div>
                                <div class="achievement-info">
                                    <div class="achievement-name">Marathon Coder</div>
                                    <div class="achievement-desc">Code for 2+ hours straight</div>
                                </div>
                            </div>
                            
                            <div id="achievement-repo_hopper" class="achievement">
                                <div class="achievement-icon">📁</div>
                                <div class="achievement-info">
                                    <div class="achievement-name">Repository Hopper</div>
                                    <div class="achievement-desc">Work on 5 different repositories</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- History Tab -->
                <div id="history-tab" class="tab-content">
                    <div class="evolution-history">
                        <div class="stat-section-title">🎭 Evolution History</div>
                        <div id="evolution-list" class="scrollable">
                            <!-- Evolution history will be populated dynamically -->
                        </div>
                    </div>
                    
                    <div class="activity-timeline">
                        <div class="stat-section-title">📅 Recent Activity</div>
                        <div id="activity-list" class="scrollable">
                            <!-- Recent activities will be populated dynamically -->
                        </div>
                    </div>
                </div>
            </div>

            <script>
                const vscode = acquireVsCodeApi();
                
                // Tab switching
                function switchTab(tabName) {
                    // Hide all tabs
                    document.querySelectorAll('.tab-content').forEach(tab => {
                        tab.classList.remove('active');
                    });
                    document.querySelectorAll('.tab-button').forEach(btn => {
                        btn.classList.remove('active');
                    });
                    
                    // Show selected tab
                    document.getElementById(tabName + '-tab').classList.add('active');
                    event.target.classList.add('active');
                    
                    vscode.postMessage({ type: 'switchTab', tab: tabName });
                }
                
                function feedPet(xp) {
                    vscode.postMessage({ type: 'feedPet', xp: xp });
                }
                
                function resetPet() {
                    if (confirm('Are you sure you want to reset your pet? This will delete all progress!')) {
                        vscode.postMessage({ type: 'resetPet' });
                    }
                }

                function getPetEmoji(stage, happiness) {
                    const emojis = {
                        baby: happiness > 60 ? '🐣' : happiness > 30 ? '😴' : '😵',
                        teen: happiness > 60 ? '🐱' : happiness > 30 ? '😾' : '🙀',  
                        adult: happiness > 60 ? '🦄' : happiness > 30 ? '🐴' : '🐎',
                        master: happiness > 60 ? '🐉' : happiness > 30 ? '🦎' : '🐲',
                        legend: happiness > 60 ? '⭐' : happiness > 30 ? '🌟' : '💫'
                    };
                    return emojis[stage] || '🐣';
                }

                function formatTime(minutes) {
                    if (minutes < 60) return minutes + ' min';
                    const hours = Math.floor(minutes / 60);
                    const mins = minutes % 60;
                    return hours + 'h ' + mins + 'm';
                }

                function updateLanguageStats(languages) {
                    const container = document.getElementById('language-list');
                    container.innerHTML = '';
                    
                    const langArray = Array.isArray(languages) ? languages : Array.from(languages || []);
                    langArray.forEach(lang => {
                        const tag = document.createElement('div');
                        tag.className = 'language-tag';
                        tag.textContent = lang;
                        container.appendChild(tag);
                    });
                }

                function updateEvolutionHistory(history) {
                    const container = document.getElementById('evolution-list');
                    container.innerHTML = '';
                    
                    if (!history || history.length === 0) {
                        container.innerHTML = '<div style="text-align: center; color: var(--vscode-descriptionForeground); padding: 20px;">No evolution history yet</div>';
                        return;
                    }
                    
                    history.reverse().forEach(evolution => {
                        const item = document.createElement('div');
                        item.className = 'evolution-item';
                        
                        const date = new Date(evolution.date);
                        const formattedDate = date.toLocaleDateString();
                        
                        item.innerHTML = \`
                            <div>
                                <strong>\${evolution.stage}</strong> - Level \${evolution.level}
                            </div>
                            <div class="evolution-date">\${formattedDate}</div>
                        \`;
                        
                        container.appendChild(item);
                    });
                }

                function updateAchievements(achievements) {
                    achievements.forEach(achievementId => {
                        const element = document.getElementById('achievement-' + achievementId);
                        if (element) {
                            element.classList.add('unlocked');
                        }
                    });
                }

                // Handle messages from extension
                window.addEventListener('message', event => {
                    const message = event.data;
                    if (message.type === 'updatePet') {
                        const pet = message.data;
                        
                        // Update pet display
                        document.getElementById('pet-emoji').textContent = getPetEmoji(pet.stage, pet.happiness);
                        document.getElementById('pet-name').textContent = pet.name;
                        document.getElementById('pet-level').textContent = \`\${pet.stage} • Level \${pet.level}\`;
                        
                        // Update progress bars
                        document.getElementById('xp-text').textContent = \`\${pet.xp}/\${pet.maxXp}\`;
                        document.getElementById('xp-bar').style.width = \`\${(pet.xp / pet.maxXp) * 100}%\`;
                        
                        document.getElementById('happiness-text').textContent = \`\${pet.happiness}%\`;
                        document.getElementById('happiness-bar').style.width = \`\${pet.happiness}%\`;
                        
                        document.getElementById('energy-text').textContent = \`\${pet.energy}%\`;
                        document.getElementById('energy-bar').style.width = \`\${pet.energy}%\`;
                        
                        document.getElementById('streak-text').textContent = \`\${pet.stats.currentStreak} days\`;
                        document.getElementById('streak-bar').style.width = \`\${Math.min((pet.stats.currentStreak / 30) * 100, 100)}%\`;
                        
                        // Update basic stats
                        document.getElementById('saves-count').textContent = pet.stats.totalSaves;
                        document.getElementById('commits-count').textContent = pet.stats.commitsCount;
                        document.getElementById('files-count').textContent = pet.stats.filesCreated;
                        document.getElementById('languages-count').textContent = Array.isArray(pet.stats.languagesUsed) 
                            ? pet.stats.languagesUsed.length 
                            : pet.stats.languagesUsed.size || 0;
                        
                        // Update detailed stats
                        document.getElementById('total-lines').textContent = pet.stats.totalLines.toLocaleString();
                        document.getElementById('files-created').textContent = pet.stats.filesCreated;
                        document.getElementById('test-files').textContent = pet.stats.testFilesCreated;
                        document.getElementById('total-xp').textContent = pet.totalXpEarned.toLocaleString();
                        
                        // Git stats
                        document.getElementById('git-commits').textContent = pet.stats.commitsCount;
                        document.getElementById('bug-fixes').textContent = pet.stats.bugFixCount;
                        document.getElementById('features-added').textContent = pet.stats.featureCount;
                        document.getElementById('current-branch').textContent = pet.stats.currentBranch;
                        document.getElementById('repositories-used').textContent = Array.isArray(pet.stats.repositoriesUsed) 
                            ? pet.stats.repositoriesUsed.length 
                            : pet.stats.repositoriesUsed.size || 0;
                        
                        // Time stats
                        document.getElementById('session-time').textContent = formatTime(pet.stats.totalSessionTime);
                        document.getElementById('longest-session').textContent = formatTime(pet.stats.longestSession);
                        document.getElementById('debug-sessions').textContent = pet.stats.debugSessions;
                        document.getElementById('terminal-sessions').textContent = pet.stats.terminalSessions;
                        
                        // Streak stats
                        document.getElementById('current-streak').textContent = \`\${pet.stats.currentStreak} days\`;
                        document.getElementById('longest-streak').textContent = \`\${pet.stats.longestStreak} days\`;
                        document.getElementById('last-active').textContent = pet.stats.lastActiveDate;
                        
                        // Update languages
                        updateLanguageStats(pet.stats.languagesUsed);
                        
                        // Update achievements
                        updateAchievements(pet.achievements);
                        
                        // Update evolution history
                        updateEvolutionHistory(pet.evolutionHistory);
                    }
                });
            </script>
        </body>
        </html>`;
  }
}