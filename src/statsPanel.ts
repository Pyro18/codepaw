import * as vscode from 'vscode';
import { PetManager, PetData } from './petManager';

export class StatsWebviewPanel {
  public static currentPanel: StatsWebviewPanel | undefined;
  public static readonly viewType = 'codePaw.stats';

  public static createOrShow(extensionUri: vscode.Uri, petManager: PetManager) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (StatsWebviewPanel.currentPanel) {
      StatsWebviewPanel.currentPanel._panel.reveal(column);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      StatsWebviewPanel.viewType,
      'CodePaw Statistics',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [extensionUri],
        retainContextWhenHidden: true
      }
    );

    StatsWebviewPanel.currentPanel = new StatsWebviewPanel(panel, extensionUri, petManager);
  }

  private constructor(
    private readonly _panel: vscode.WebviewPanel,
    private readonly _extensionUri: vscode.Uri,
    private readonly petManager: PetManager
  ) {
    this._panel.webview.html = this.getHtmlForWebview();
    this._panel.onDidDispose(() => this.dispose(), null);
    
    this.petManager.onDidUpdatePet(() => {
      this._panel.webview.postMessage({
        type: 'updateStats',
        data: this.petManager.getPetData()
      });
    });

    // Send initial data
    this._panel.webview.postMessage({
      type: 'updateStats',
      data: this.petManager.getPetData()
    });
  }

  private dispose() {
    StatsWebviewPanel.currentPanel = undefined;
    this._panel.dispose();
  }

  private getHtmlForWebview(): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>CodePaw Statistics</title>
        <style>
            :root {
                --primary-color: #FF6B6B;
                --secondary-color: #4ECDC4;
                --accent-color: #FFE66D;
                --success-color: #51CF66;
                --warning-color: #FFB366;
                --chart-colors: #FF6B6B, #4ECDC4, #FFE66D, #51CF66, #FFB366, #845EC2, #FF8066, #2E8B57;
            }

            body {
                font-family: var(--vscode-font-family);
                color: var(--vscode-foreground);
                background-color: var(--vscode-editor-background);
                margin: 0;
                padding: 20px;
                line-height: 1.6;
            }

            .stats-container {
                max-width: 1400px;
                margin: 0 auto;
            }

            .header {
                text-align: center;
                margin-bottom: 40px;
                padding-bottom: 20px;
                border-bottom: 2px solid var(--vscode-widget-border);
            }

            .header h1 {
                font-size: 32px;
                margin-bottom: 10px;
                color: var(--primary-color);
            }

            .header .subtitle {
                font-size: 16px;
                color: var(--vscode-descriptionForeground);
            }

            .stats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: 20px;
                margin-bottom: 30px;
            }

            .stat-card {
                background: var(--vscode-editor-widget-background);
                border: 1px solid var(--vscode-widget-border);
                border-radius: 12px;
                padding: 24px;
                transition: transform 0.2s ease, box-shadow 0.2s ease;
            }

            .stat-card:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            }

            .card-header {
                display: flex;
                align-items: center;
                margin-bottom: 20px;
            }

            .card-icon {
                font-size: 24px;
                margin-right: 12px;
                width: 40px;
                height: 40px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 8px;
                background: var(--vscode-input-background);
            }

            .card-title {
                font-size: 18px;
                font-weight: bold;
                color: var(--secondary-color);
            }

            .big-number {
                font-size: 36px;
                font-weight: bold;
                color: var(--primary-color);
                margin: 16px 0;
                text-align: center;
            }

            .stat-list {
                list-style: none;
                padding: 0;
                margin: 0;
            }

            .stat-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 0;
                border-bottom: 1px solid var(--vscode-input-border);
            }

            .stat-item:last-child {
                border-bottom: none;
            }

            .stat-label {
                color: var(--vscode-foreground);
            }

            .stat-value {
                font-weight: bold;
                color: var(--secondary-color);
            }

            .progress-container {
                margin: 16px 0;
            }

            .progress-header {
                display: flex;
                justify-content: space-between;
                margin-bottom: 8px;
                font-size: 14px;
            }

            .progress-bar {
                width: 100%;
                height: 8px;
                background: var(--vscode-progressBar-background);
                border-radius: 4px;
                overflow: hidden;
            }

            .progress-fill {
                height: 100%;
                border-radius: 4px;
                transition: width 0.5s ease;
            }

            .xp-progress { background: var(--secondary-color); }
            .happiness-progress { background: var(--primary-color); }
            .streak-progress { background: var(--success-color); }

            .chart-container {
                background: var(--vscode-editor-widget-background);
                border: 1px solid var(--vscode-widget-border);
                border-radius: 12px;
                padding: 24px;
                margin-bottom: 20px;
            }

            .chart-title {
                font-size: 18px;
                font-weight: bold;
                color: var(--secondary-color);
                margin-bottom: 20px;
                text-align: center;
            }

            .language-chart {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                justify-content: center;
            }

            .language-item {
                display: flex;
                align-items: center;
                background: var(--vscode-input-background);
                border: 1px solid var(--vscode-input-border);
                border-radius: 20px;
                padding: 6px 12px;
                font-size: 12px;
            }

            .language-color {
                width: 12px;
                height: 12px;
                border-radius: 50%;
                margin-right: 6px;
            }

            .achievement-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 12px;
            }

            .achievement-card {
                display: flex;
                align-items: center;
                background: var(--vscode-input-background);
                border: 1px solid var(--vscode-input-border);
                border-radius: 8px;
                padding: 12px;
                transition: all 0.2s ease;
            }

            .achievement-card.unlocked {
                border-color: var(--success-color);
                background: var(--vscode-inputValidation-infoBackground);
                box-shadow: 0 0 8px rgba(81, 207, 102, 0.2);
            }

            .achievement-icon {
                font-size: 24px;
                margin-right: 12px;
                width: 40px;
                text-align: center;
            }

            .achievement-info {
                flex: 1;
            }

            .achievement-name {
                font-weight: bold;
                margin-bottom: 4px;
            }

            .achievement-desc {
                font-size: 12px;
                color: var(--vscode-descriptionForeground);
            }

            .timeline {
                position: relative;
                padding-left: 30px;
            }

            .timeline::before {
                content: '';
                position: absolute;
                left: 15px;
                top: 0;
                bottom: 0;
                width: 2px;
                background: var(--vscode-widget-border);
            }

            .timeline-item {
                position: relative;
                margin-bottom: 20px;
                background: var(--vscode-input-background);
                border: 1px solid var(--vscode-input-border);
                border-radius: 8px;
                padding: 16px;
            }

            .timeline-item::before {
                content: '';
                position: absolute;
                left: -23px;
                top: 50%;
                transform: translateY(-50%);
                width: 12px;
                height: 12px;
                border-radius: 50%;
                background: var(--secondary-color);
                border: 2px solid var(--vscode-editor-background);
            }

            .timeline-date {
                font-size: 12px;
                color: var(--vscode-descriptionForeground);
                margin-bottom: 4px;
            }

            .timeline-title {
                font-weight: bold;
                margin-bottom: 4px;
            }

            .timeline-desc {
                font-size: 14px;
                color: var(--vscode-descriptionForeground);
            }

            .summary-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 16px;
                margin-bottom: 30px;
            }

            .summary-card {
                background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
                border-radius: 12px;
                padding: 20px;
                color: white;
                text-align: center;
            }

            .summary-number {
                font-size: 28px;
                font-weight: bold;
                margin-bottom: 8px;
            }

            .summary-label {
                font-size: 14px;
                opacity: 0.9;
            }

            .activity-heatmap {
                display: grid;
                grid-template-columns: repeat(7, 1fr);
                gap: 3px;
                margin-top: 16px;
            }

            .heatmap-day {
                width: 16px;
                height: 16px;
                border-radius: 3px;
                background: var(--vscode-input-border);
                transition: background 0.2s ease;
            }

            .heatmap-day.active-1 { background: rgba(81, 207, 102, 0.3); }
            .heatmap-day.active-2 { background: rgba(81, 207, 102, 0.6); }
            .heatmap-day.active-3 { background: rgba(81, 207, 102, 0.8); }
            .heatmap-day.active-4 { background: rgba(81, 207, 102, 1); }

            .scrollable {
                max-height: 400px;
                overflow-y: auto;
                padding-right: 8px;
            }

            .scrollable::-webkit-scrollbar {
                width: 8px;
            }

            .scrollable::-webkit-scrollbar-track {
                background: var(--vscode-scrollbar-shadow);
            }

            .scrollable::-webkit-scrollbar-thumb {
                background: var(--vscode-scrollbarSlider-background);
                border-radius: 4px;
            }

            .scrollable::-webkit-scrollbar-thumb:hover {
                background: var(--vscode-scrollbarSlider-hoverBackground);
            }

            @media (max-width: 768px) {
                .stats-grid {
                    grid-template-columns: 1fr;
                }
                
                .summary-grid {
                    grid-template-columns: repeat(2, 1fr);
                }
                
                .achievement-grid {
                    grid-template-columns: 1fr;
                }
            }
        </style>
    </head>
    <body>
        <div class="stats-container">
            <div class="header">
                <h1>📊 CodePaw Statistics</h1>
                <div class="subtitle">Detailed analytics of your coding journey</div>
            </div>

            <!-- Summary Cards -->
            <div class="summary-grid">
                <div class="summary-card">
                    <div id="total-xp-summary" class="summary-number">0</div>
                    <div class="summary-label">Total XP Earned</div>
                </div>
                <div class="summary-card">
                    <div id="level-summary" class="summary-number">1</div>
                    <div class="summary-label">Current Level</div>
                </div>
                <div class="summary-card">
                    <div id="streak-summary" class="summary-number">0</div>
                    <div class="summary-label">Day Streak</div>
                </div>
                <div class="summary-card">
                    <div id="achievements-summary" class="summary-number">0</div>
                    <div class="summary-label">Achievements</div>
                </div>
            </div>

            <!-- Main Stats Grid -->
            <div class="stats-grid">
                <!-- Pet Overview -->
                <div class="stat-card">
                    <div class="card-header">
                        <div class="card-icon">🐾</div>
                        <div class="card-title">Pet Overview</div>
                    </div>
                    <div style="text-align: center;">
                        <div id="pet-emoji-large" style="font-size: 64px; margin: 16px 0;">🐣</div>
                        <div id="pet-name-large" style="font-size: 24px; font-weight: bold; margin-bottom: 8px;">Pypy</div>
                        <div id="pet-stage-large" style="color: var(--vscode-descriptionForeground);">Baby Coder</div>
                    </div>
                    <div class="progress-container">
                        <div class="progress-header">
                            <span>XP Progress</span>
                            <span id="xp-progress-text">0/100</span>
                        </div>
                        <div class="progress-bar">
                            <div id="xp-progress-bar" class="progress-fill xp-progress" style="width: 0%"></div>
                        </div>
                    </div>
                    <div class="progress-container">
                        <div class="progress-header">
                            <span>Happiness</span>
                            <span id="happiness-progress-text">80%</span>
                        </div>
                        <div class="progress-bar">
                            <div id="happiness-progress-bar" class="progress-fill happiness-progress" style="width: 80%"></div>
                        </div>
                    </div>
                </div>

                <!-- Coding Activity -->
                <div class="stat-card">
                    <div class="card-header">
                        <div class="card-icon">💻</div>
                        <div class="card-title">Coding Activity</div>
                    </div>
                    <ul class="stat-list">
                        <li class="stat-item">
                            <span class="stat-label">Files Saved</span>
                            <span id="files-saved" class="stat-value">0</span>
                        </li>
                        <li class="stat-item">
                            <span class="stat-label">Lines of Code</span>
                            <span id="lines-of-code" class="stat-value">0</span>
                        </li>
                        <li class="stat-item">
                            <span class="stat-label">Files Created</span>
                            <span id="files-created-stat" class="stat-value">0</span>
                        </li>
                        <li class="stat-item">
                            <span class="stat-label">Test Files</span>
                            <span id="test-files-stat" class="stat-value">0</span>
                        </li>
                        <li class="stat-item">
                            <span class="stat-label">Total Session Time</span>
                            <span id="total-session-time" class="stat-value">0 min</span>
                        </li>
                    </ul>
                </div>

                <!-- Git Activity -->
                <div class="stat-card">
                    <div class="card-header">
                        <div class="card-icon">🔗</div>
                        <div class="card-title">Git Activity</div>
                    </div>
                    <div id="total-commits" class="big-number">0</div>
                    <ul class="stat-list">
                        <li class="stat-item">
                            <span class="stat-label">Bug Fixes</span>
                            <span id="bug-fixes-stat" class="stat-value">0</span>
                        </li>
                        <li class="stat-item">
                            <span class="stat-label">Features Added</span>
                            <span id="features-added-stat" class="stat-value">0</span>
                        </li>
                        <li class="stat-item">
                            <span class="stat-label">Repositories</span>
                            <span id="repositories-stat" class="stat-value">0</span>
                        </li>
                        <li class="stat-item">
                            <span class="stat-label">Current Branch</span>
                            <span id="current-branch-stat" class="stat-value">main</span>
                        </li>
                    </ul>
                </div>

                <!-- Development Tools -->
                <div class="stat-card">
                    <div class="card-header">
                        <div class="card-icon">🛠️</div>
                        <div class="card-title">Development Tools</div>
                    </div>
                    <ul class="stat-list">
                        <li class="stat-item">
                            <span class="stat-label">Debug Sessions</span>
                            <span id="debug-sessions-stat" class="stat-value">0</span>
                        </li>
                        <li class="stat-item">
                            <span class="stat-label">Terminal Sessions</span>
                            <span id="terminal-sessions-stat" class="stat-value">0</span>
                        </li>
                        <li class="stat-item">
                            <span class="stat-label">Longest Session</span>
                            <span id="longest-session-stat" class="stat-value">0 min</span>
                        </li>
                        <li class="stat-item">
                            <span class="stat-label">Languages Used</span>
                            <span id="languages-used-stat" class="stat-value">0</span>
                        </li>
                    </ul>
                </div>
            </div>

            <!-- Programming Languages -->
            <div class="chart-container">
                <div class="chart-title">🗣️ Programming Languages</div>
                <div id="languages-chart" class="language-chart">
                    <!-- Languages will be populated dynamically -->
                </div>
            </div>

            <!-- Activity Heatmap -->
            <div class="chart-container">
                <div class="chart-title">🔥 Activity Heatmap (Last 7 Days)</div>
                <div class="progress-container">
                    <div class="progress-header">
                        <span>Current Streak</span>
                        <span id="streak-display">0 days</span>
                    </div>
                    <div class="progress-bar">
                        <div id="streak-progress-bar" class="progress-fill streak-progress" style="width: 0%"></div>
                    </div>
                </div>
                <div id="activity-heatmap" class="activity-heatmap">
                    <!-- Heatmap will be populated dynamically -->
                </div>
            </div>

            <!-- Achievements -->
            <div class="chart-container">
                <div class="chart-title">🏆 Achievements</div>
                <div id="achievements-grid" class="achievement-grid scrollable">
                    <!-- Achievements will be populated dynamically -->
                </div>
            </div>

            <!-- Evolution Timeline -->
            <div class="chart-container">
                <div class="chart-title">🎭 Evolution Timeline</div>
                <div id="evolution-timeline" class="timeline scrollable">
                    <!-- Timeline will be populated dynamically -->
                </div>
            </div>
        </div>

        <script>
            const languageColors = {
                'javascript': '#F7DF1E',
                'typescript': '#3178C6',
                'python': '#3776AB',
                'java': '#007396',
                'html': '#E34F26',
                'css': '#1572B6',
                'json': '#000000',
                'markdown': '#083FA1',
                'yaml': '#CB171E',
                'xml': '#0060AC',
                'sql': '#336791',
                'shell': '#89E051',
                'powershell': '#5391FE',
                'dockerfile': '#384D54',
                'go': '#00ADD8',
                'rust': '#000000',
                'cpp': '#00599C',
                'csharp': '#239120',
                'php': '#777BB4',
                'ruby': '#CC342D',
                'swift': '#FA7343',
                'kotlin': '#7F52FF',
                'dart': '#0175C2',
                'r': '#276DC3',
                'scala': '#DC322F',
                'haskell': '#5D4F85',
                'lua': '#2C2D72',
                'perl': '#39457E',
                'default': '#6C757D'
            };

            const achievements = [
                { id: 'first_milestone', icon: '🎯', name: 'First Milestone', desc: 'Reach Level 10' },
                { id: 'save_master', icon: '💾', name: 'Save Master', desc: 'Save 100 files' },
                { id: 'polyglot', icon: '🗣️', name: 'Polyglot', desc: 'Use 5 different languages' },
                { id: 'commit_master', icon: '🚀', name: 'Commit Master', desc: 'Make 50 commits' },
                { id: 'month_streak', icon: '🔥', name: '30-Day Streak', desc: 'Code for 30 consecutive days' },
                { id: 'bug_hunter', icon: '🐛', name: 'Bug Hunter', desc: 'Fix 20 bugs' },
                { id: 'test_writer', icon: '✅', name: 'Test Writer', desc: 'Create 10 test files' },
                { id: 'marathon_coder', icon: '⏱️', name: 'Marathon Coder', desc: 'Code for 2+ hours straight' },
                { id: 'repo_hopper', icon: '📁', name: 'Repository Hopper', desc: 'Work on 5 different repositories' }
            ];

            function formatTime(minutes) {
                if (minutes < 60) return minutes + ' min';
                const hours = Math.floor(minutes / 60);
                const mins = minutes % 60;
                return hours + 'h ' + mins + 'm';
            }

            function formatNumber(num) {
                if (num >= 1000000) {
                    return (num / 1000000).toFixed(1) + 'M';
                } else if (num >= 1000) {
                    return (num / 1000).toFixed(1) + 'K';
                }
                return num.toLocaleString();
            }

            function updateLanguagesChart(languages) {
                const container = document.getElementById('languages-chart');
                container.innerHTML = '';
                
                if (!languages || (Array.isArray(languages) ? languages.length === 0 : languages.size === 0)) {
                    container.innerHTML = '<div style="text-align: center; color: var(--vscode-descriptionForeground); padding: 20px;">No languages used yet</div>';
                    return;
                }
                
                const langArray = Array.isArray(languages) ? languages : Array.from(languages);
                langArray.forEach(lang => {
                    const item = document.createElement('div');
                    item.className = 'language-item';
                    
                    const color = document.createElement('div');
                    color.className = 'language-color';
                    color.style.backgroundColor = languageColors[lang.toLowerCase()] || languageColors.default;
                    
                    item.appendChild(color);
                    item.appendChild(document.createTextNode(lang));
                    container.appendChild(item);
                });
            }

            function updateAchievementsGrid(unlockedAchievements) {
                const container = document.getElementById('achievements-grid');
                container.innerHTML = '';
                
                achievements.forEach(achievement => {
                    const card = document.createElement('div');
                    card.className = 'achievement-card';
                    if (unlockedAchievements.includes(achievement.id)) {
                        card.classList.add('unlocked');
                    }
                    
                    card.innerHTML = \`
                        <div class="achievement-icon">\${achievement.icon}</div>
                        <div class="achievement-info">
                            <div class="achievement-name">\${achievement.name}</div>
                            <div class="achievement-desc">\${achievement.desc}</div>
                        </div>
                    \`;
                    
                    container.appendChild(card);
                });
            }

            function updateEvolutionTimeline(history) {
                const container = document.getElementById('evolution-timeline');
                container.innerHTML = '';
                
                if (!history || history.length === 0) {
                    container.innerHTML = '<div style="text-align: center; color: var(--vscode-descriptionForeground); padding: 20px;">No evolution history yet</div>';
                    return;
                }
                
                history.slice().reverse().forEach(evolution => {
                    const item = document.createElement('div');
                    item.className = 'timeline-item';
                    
                    const date = new Date(evolution.date);
                    const formattedDate = date.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    });
                    
                    item.innerHTML = \`
                        <div class="timeline-date">\${formattedDate}</div>
                        <div class="timeline-title">Evolved to \${evolution.stage}</div>
                        <div class="timeline-desc">Reached Level \${evolution.level}</div>
                    \`;
                    
                    container.appendChild(item);
                });
            }

            function updateActivityHeatmap(currentStreak) {
                const container = document.getElementById('activity-heatmap');
                container.innerHTML = '';
                
                // Create 7 days of heatmap
                for (let i = 6; i >= 0; i--) {
                    const day = document.createElement('div');
                    day.className = 'heatmap-day';
                    
                    if (i === 0) {
                        day.classList.add('today');
                    }
                    
                    if (i < currentStreak) {
                        const intensity = Math.min(4, Math.floor(currentStreak / 7) + 1);
                        day.classList.add(\`active-\${intensity}\`);
                    }
                    
                    container.appendChild(day);
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

            function updateStats(petData) {
                // Summary cards
                document.getElementById('total-xp-summary').textContent = formatNumber(petData.totalXpEarned || 0);
                document.getElementById('level-summary').textContent = petData.level;
                document.getElementById('streak-summary').textContent = petData.stats.currentStreak;
                document.getElementById('achievements-summary').textContent = petData.achievements.length;

                // Pet overview
                document.getElementById('pet-emoji-large').textContent = getPetEmoji(petData.stage, petData.happiness);
                document.getElementById('pet-name-large').textContent = petData.name;
                document.getElementById('pet-stage-large').textContent = petData.stage + ' • Level ' + petData.level;

                // Progress bars
                document.getElementById('xp-progress-text').textContent = \`\${petData.xp}/\${petData.maxXp}\`;
                document.getElementById('xp-progress-bar').style.width = \`\${(petData.xp / petData.maxXp) * 100}%\`;
                document.getElementById('happiness-progress-text').textContent = \`\${petData.happiness}%\`;
                document.getElementById('happiness-progress-bar').style.width = \`\${petData.happiness}%\`;

                // Coding activity
                document.getElementById('files-saved').textContent = formatNumber(petData.stats.totalSaves);
                document.getElementById('lines-of-code').textContent = formatNumber(petData.stats.totalLines);
                document.getElementById('files-created-stat').textContent = formatNumber(petData.stats.filesCreated);
                document.getElementById('test-files-stat').textContent = formatNumber(petData.stats.testFilesCreated);
                document.getElementById('total-session-time').textContent = formatTime(petData.stats.totalSessionTime);

                // Git activity
                document.getElementById('total-commits').textContent = formatNumber(petData.stats.commitsCount);
                document.getElementById('bug-fixes-stat').textContent = formatNumber(petData.stats.bugFixCount);
                document.getElementById('features-added-stat').textContent = formatNumber(petData.stats.featureCount);
                document.getElementById('repositories-stat').textContent = Array.isArray(petData.stats.repositoriesUsed) 
                    ? petData.stats.repositoriesUsed.length 
                    : petData.stats.repositoriesUsed.size || 0;
                document.getElementById('current-branch-stat').textContent = petData.stats.currentBranch;

                // Development tools
                document.getElementById('debug-sessions-stat').textContent = formatNumber(petData.stats.debugSessions);
                document.getElementById('terminal-sessions-stat').textContent = formatNumber(petData.stats.terminalSessions);
                document.getElementById('longest-session-stat').textContent = formatTime(petData.stats.longestSession);
                document.getElementById('languages-used-stat').textContent = Array.isArray(petData.stats.languagesUsed) 
                    ? petData.stats.languagesUsed.length 
                    : petData.stats.languagesUsed.size || 0;

                // Streak
                document.getElementById('streak-display').textContent = \`\${petData.stats.currentStreak} days\`;
                document.getElementById('streak-progress-bar').style.width = \`\${Math.min((petData.stats.currentStreak / 30) * 100, 100)}%\`;

                // Update charts
                updateLanguagesChart(petData.stats.languagesUsed);
                updateAchievementsGrid(petData.achievements);
                updateEvolutionTimeline(petData.evolutionHistory);
                updateActivityHeatmap(petData.stats.currentStreak);
            }

            // Listen for messages from the extension
            window.addEventListener('message', event => {
                const message = event.data;
                if (message.type === 'updateStats') {
                    updateStats(message.data);
                }
            });
        </script>
    </body>
    </html>`;
  }
}