import * as vscode from 'vscode';
import { PetManager, PetData } from './petManager';

interface Achievement {
    id: string;
    icon: string;
    name: string;
    description: string;
    category: string;
    requirement: string;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    xpReward: number;
}

export class AchievementsWebviewPanel {
    public static currentPanel: AchievementsWebviewPanel | undefined;
    public static readonly viewType = 'codePaw.achievements';

    private static readonly achievements: Achievement[] = [
        {
            id: 'first_milestone',
            icon: '🎯',
            name: 'First Milestone',
            description: 'Take your first steps into coding mastery',
            category: 'Progress',
            requirement: 'Reach Level 10',
            rarity: 'common',
            xpReward: 100
        },
        {
            id: 'save_master',
            icon: '💾',
            name: 'Save Master',
            description: 'A true saver of code and progress',
            category: 'Coding',
            requirement: 'Save 100 files',
            rarity: 'common',
            xpReward: 150
        },
        {
            id: 'polyglot',
            icon: '🗣️',
            name: 'Polyglot',
            description: 'Master of multiple programming languages',
            category: 'Skills',
            requirement: 'Use 5 different programming languages',
            rarity: 'rare',
            xpReward: 200
        },
        {
            id: 'commit_master',
            icon: '🚀',
            name: 'Commit Master',
            description: 'Git commit champion and version control expert',
            category: 'Git',
            requirement: 'Make 50 commits',
            rarity: 'rare',
            xpReward: 250
        },
        {
            id: 'month_streak',
            icon: '🔥',
            name: '30-Day Streak',
            description: 'Consistency is the key to mastery',
            category: 'Dedication',
            requirement: 'Code for 30 consecutive days',
            rarity: 'epic',
            xpReward: 500
        },
        {
            id: 'bug_hunter',
            icon: '🐛',
            name: 'Bug Hunter',
            description: 'Destroyer of bugs and bringer of fixes',
            category: 'Quality',
            requirement: 'Fix 20 bugs',
            rarity: 'rare',
            xpReward: 300
        },
        {
            id: 'test_writer',
            icon: '✅',
            name: 'Test Writer',
            description: 'Guardian of code quality and reliability',
            category: 'Quality',
            requirement: 'Create 10 test files',
            rarity: 'rare',
            xpReward: 275
        },
        {
            id: 'marathon_coder',
            icon: '⏱️',
            name: 'Marathon Coder',
            description: 'Endurance coding champion',
            category: 'Endurance',
            requirement: 'Code for 2+ hours straight',
            rarity: 'epic',
            xpReward: 400
        },
        {
            id: 'repo_hopper',
            icon: '📁',
            name: 'Repository Hopper',
            description: 'Explorer of codebases and projects',
            category: 'Exploration',
            requirement: 'Work on 5 different repositories',
            rarity: 'common',
            xpReward: 200
        }
    ];

    public static createOrShow(extensionUri: vscode.Uri, petManager: PetManager) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (AchievementsWebviewPanel.currentPanel) {
            AchievementsWebviewPanel.currentPanel._panel.reveal(column);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            AchievementsWebviewPanel.viewType,
            'CodePaw Achievements',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [extensionUri],
                retainContextWhenHidden: true
            }
        );

        AchievementsWebviewPanel.currentPanel = new AchievementsWebviewPanel(panel, extensionUri, petManager);
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
                type: 'updateAchievements',
                data: this.petManager.getPetData()
            });
        });

        // Send initial data
        this._panel.webview.postMessage({
            type: 'updateAchievements',
            data: this.petManager.getPetData()
        });
    }

    private dispose() {
        AchievementsWebviewPanel.currentPanel = undefined;
        this._panel.dispose();
    }

    private getHtmlForWebview(): string {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>CodePaw Achievements</title>
            <style>
                :root {
                    --primary-color: #FF6B6B;
                    --secondary-color: #4ECDC4;
                    --accent-color: #FFE66D;
                    --success-color: #51CF66;
                    --warning-color: #FFB366;
                    --epic-color: #845EC2;
                    --legendary-color: #FF8500;
                    --common-color: #6C757D;
                    --rare-color: #0096FF;
                }

                body {
                    font-family: var(--vscode-font-family);
                    color: var(--vscode-foreground);
                    background-color: var(--vscode-editor-background);
                    margin: 0;
                    padding: 20px;
                    line-height: 1.6;
                }

                .achievements-container {
                    max-width: 1200px;
                    margin: 0 auto;
                }

                .header {
                    text-align: center;
                    margin-bottom: 40px;
                    padding-bottom: 20px;
                    border-bottom: 2px solid var(--vscode-widget-border);
                }

                .header h1 {
                    font-size: 36px;
                    margin-bottom: 10px;
                    color: var(--primary-color);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 15px;
                }

                .progress-overview {
                    background: var(--vscode-editor-widget-background);
                    border: 1px solid var(--vscode-widget-border);
                    border-radius: 12px;
                    padding: 24px;
                    margin-bottom: 30px;
                    text-align: center;
                }

                .progress-stats {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                    gap: 20px;
                    margin-top: 20px;
                }

                .progress-stat {
                    background: var(--vscode-input-background);
                    border: 1px solid var(--vscode-input-border);
                    border-radius: 8px;
                    padding: 16px;
                }

                .stat-number {
                    font-size: 24px;
                    font-weight: bold;
                    color: var(--secondary-color);
                }

                .stat-label {
                    font-size: 12px;
                    color: var(--vscode-descriptionForeground);
                    margin-top: 4px;
                }

                .overall-progress {
                    margin: 20px 0;
                }

                .progress-bar {
                    width: 100%;
                    height: 12px;
                    background: var(--vscode-progressBar-background);
                    border-radius: 6px;
                    overflow: hidden;
                    margin: 8px 0;
                }

                .progress-fill {
                    height: 100%;
                    background: linear-gradient(90deg, var(--secondary-color), var(--primary-color));
                    border-radius: 6px;
                    transition: width 0.5s ease;
                }

                .categories-filter {
                    display: flex;
                    justify-content: center;
                    gap: 12px;
                    margin-bottom: 30px;
                    flex-wrap: wrap;
                }

                .category-btn {
                    background: var(--vscode-input-background);
                    border: 1px solid var(--vscode-input-border);
                    color: var(--vscode-foreground);
                    padding: 8px 16px;
                    border-radius: 20px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    font-size: 14px;
                }

                .category-btn:hover, .category-btn.active {
                    background: var(--secondary-color);
                    color: var(--vscode-editor-background);
                    border-color: var(--secondary-color);
                }

                .achievements-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
                    gap: 20px;
                }

                .achievement-card {
                    background: var(--vscode-editor-widget-background);
                    border: 1px solid var(--vscode-widget-border);
                    border-radius: 12px;
                    padding: 24px;
                    transition: all 0.3s ease;
                    position: relative;
                    overflow: hidden;
                }

                .achievement-card::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 4px;
                    background: var(--vscode-input-border);
                    transition: background 0.3s ease;
                }

                .achievement-card.unlocked {
                    border-color: var(--success-color);
                    box-shadow: 0 4px 20px rgba(81, 207, 102, 0.1);
                }

                .achievement-card.unlocked::before {
                    background: linear-gradient(90deg, var(--success-color), var(--secondary-color));
                }

                .achievement-card.common::before { background: var(--common-color); }
                .achievement-card.rare::before { background: var(--rare-color); }
                .achievement-card.epic::before { background: var(--epic-color); }
                .achievement-card.legendary::before { background: var(--legendary-color); }

                .achievement-card:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 8px 25px rgba(0,0,0,0.15);
                }

                .achievement-header {
                    display: flex;
                    align-items: center;
                    margin-bottom: 16px;
                }

                .achievement-icon {
                    font-size: 32px;
                    margin-right: 16px;
                    width: 50px;
                    height: 50px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 50%;
                    background: var(--vscode-input-background);
                    border: 2px solid var(--vscode-input-border);
                }

                .achievement-card.unlocked .achievement-icon {
                    background: var(--success-color);
                    border-color: var(--success-color);
                    color: white;
                    animation: pulse 2s infinite;
                }

                @keyframes pulse {
                    0% { box-shadow: 0 0 0 0 rgba(81, 207, 102, 0.7); }
                    70% { box-shadow: 0 0 0 10px rgba(81, 207, 102, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(81, 207, 102, 0); }
                }

                .achievement-info {
                    flex: 1;
                }

                .achievement-name {
                    font-size: 18px;
                    font-weight: bold;
                    margin-bottom: 4px;
                    color: var(--vscode-foreground);
                }

                .achievement-card.unlocked .achievement-name {
                    color: var(--success-color);
                }

                .achievement-category {
                    font-size: 12px;
                    color: var(--vscode-descriptionForeground);
                    background: var(--vscode-input-background);
                    padding: 2px 8px;
                    border-radius: 10px;
                    display: inline-block;
                }

                .achievement-description {
                    margin: 12px 0;
                    color: var(--vscode-descriptionForeground);
                    font-style: italic;
                }

                .achievement-requirement {
                    font-size: 14px;
                    font-weight: bold;
                    margin: 8px 0;
                    padding: 8px 12px;
                    background: var(--vscode-input-background);
                    border-radius: 6px;
                    border-left: 4px solid var(--vscode-input-border);
                }

                .achievement-card.unlocked .achievement-requirement {
                    border-left-color: var(--success-color);
                    background: var(--vscode-inputValidation-infoBackground);
                }

                .achievement-footer {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-top: 16px;
                    padding-top: 16px;
                    border-top: 1px solid var(--vscode-input-border);
                }

                .achievement-rarity {
                    font-size: 12px;
                    font-weight: bold;
                    padding: 4px 8px;
                    border-radius: 12px;
                    text-transform: uppercase;
                }

                .rarity-common { background: var(--common-color); color: white; }
                .rarity-rare { background: var(--rare-color); color: white; }
                .rarity-epic { background: var(--epic-color); color: white; }
                .rarity-legendary { background: var(--legendary-color); color: white; }

                .achievement-reward {
                    font-size: 14px;
                    font-weight: bold;
                    color: var(--accent-color);
                    background: var(--vscode-input-background);
                    padding: 4px 8px;
                    border-radius: 12px;
                }

                .locked-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.1);
                    backdrop-filter: grayscale(100%);
                    border-radius: 12px;
                    pointer-events: none;
                }

                .achievement-card.unlocked .locked-overlay {
                    display: none;
                }

                .unlock-date {
                    font-size: 11px;
                    color: var(--vscode-descriptionForeground);
                    margin-top: 4px;
                }

                @media (max-width: 768px) {
                    .achievements-grid {
                        grid-template-columns: 1fr;
                    }
                    
                    .categories-filter {
                        flex-direction: column;
                        align-items: center;
                    }
                    
                    .progress-stats {
                        grid-template-columns: repeat(2, 1fr);
                    }
                }

                .empty-state {
                    text-align: center;
                    padding: 60px 20px;
                    color: var(--vscode-descriptionForeground);
                }

                .empty-state-icon {
                    font-size: 64px;
                    margin-bottom: 20px;
                    opacity: 0.5;
                }
            </style>
        </head>
        <body>
            <div class="achievements-container">
                <div class="header">
                    <h1>🏆 Achievements</h1>
                </div>

                <!-- Progress Overview -->
                <div class="progress-overview">
                    <h2 id="progress-title">Achievement Progress</h2>
                    <div class="overall-progress">
                        <div id="progress-text">0 / 9 Unlocked</div>
                        <div class="progress-bar">
                            <div id="overall-progress-bar" class="progress-fill" style="width: 0%"></div>
                        </div>
                    </div>
                    
                    <div class="progress-stats">
                        <div class="progress-stat">
                            <div id="unlocked-count" class="stat-number">0</div>
                            <div class="stat-label">Unlocked</div>
                        </div>
                        <div class="progress-stat">
                            <div id="total-xp-earned" class="stat-number">0</div>
                            <div class="stat-label">XP from Achievements</div>
                        </div>
                        <div class="progress-stat">
                            <div id="rarest-achievement" class="stat-number">-</div>
                            <div class="stat-label">Rarest Unlocked</div>
                        </div>
                    </div>
                </div>

                <!-- Category Filter -->
                <div class="categories-filter">
                    <button class="category-btn active" onclick="filterCategory('all')">All</button>
                    <button class="category-btn" onclick="filterCategory('Progress')">Progress</button>
                    <button class="category-btn" onclick="filterCategory('Coding')">Coding</button>
                    <button class="category-btn" onclick="filterCategory('Git')">Git</button>
                    <button class="category-btn" onclick="filterCategory('Quality')">Quality</button>
                    <button class="category-btn" onclick="filterCategory('Skills')">Skills</button>
                    <button class="category-btn" onclick="filterCategory('Dedication')">Dedication</button>
                    <button class="category-btn" onclick="filterCategory('Endurance')">Endurance</button>
                    <button class="category-btn" onclick="filterCategory('Exploration')">Exploration</button>
                </div>

                <!-- Achievements Grid -->
                <div id="achievements-grid" class="achievements-grid">
                    <!-- Achievements will be populated dynamically -->
                </div>
            </div>

            <script>
                const achievements = ${JSON.stringify(AchievementsWebviewPanel.achievements)};
                let currentFilter = 'all';
                let petData = null;

                function formatNumber(num) {
                    if (num >= 1000000) {
                        return (num / 1000000).toFixed(1) + 'M';
                    } else if (num >= 1000) {
                        return (num / 1000).toFixed(1) + 'K';
                    }
                    return num.toString();
                }

                function filterCategory(category) {
                    currentFilter = category;
                    
                    // Update active button
                    document.querySelectorAll('.category-btn').forEach(btn => {
                        btn.classList.remove('active');
                    });
                    event.target.classList.add('active');
                    
                    renderAchievements();
                }

                function renderAchievements() {
                    const container = document.getElementById('achievements-grid');
                    container.innerHTML = '';
                    
                    const filteredAchievements = currentFilter === 'all' 
                        ? achievements 
                        : achievements.filter(a => a.category === currentFilter);
                    
                    if (filteredAchievements.length === 0) {
                        container.innerHTML = \`
                            <div class="empty-state">
                                <div class="empty-state-icon">🔍</div>
                                <h3>No achievements in this category</h3>
                                <p>Try selecting a different category to see more achievements.</p>
                            </div>
                        \`;
                        return;
                    }
                    
                    filteredAchievements.forEach(achievement => {
                        const isUnlocked = petData && petData.achievements.includes(achievement.id);
                        
                        const card = document.createElement('div');
                        card.className = \`achievement-card \${achievement.rarity} \${isUnlocked ? 'unlocked' : ''}\`;
                        
                        card.innerHTML = \`
                            <div class="achievement-header">
                                <div class="achievement-icon">\${achievement.icon}</div>
                                <div class="achievement-info">
                                    <div class="achievement-name">\${achievement.name}</div>
                                    <div class="achievement-category">\${achievement.category}</div>
                                </div>
                            </div>
                            <div class="achievement-description">\${achievement.description}</div>
                            <div class="achievement-requirement">\${achievement.requirement}</div>
                            <div class="achievement-footer">
                                <div class="achievement-rarity rarity-\${achievement.rarity}">\${achievement.rarity}</div>
                                <div class="achievement-reward">+\${achievement.xpReward} XP</div>
                            </div>
                            \${isUnlocked ? '' : '<div class="locked-overlay"></div>'}
                        \`;
                        
                        container.appendChild(card);
                    });
                }

                function updateAchievements(data) {
                    petData = data;
                    
                    const unlockedCount = data.achievements.length;
                    const totalCount = achievements.length;
                    const progressPercent = (unlockedCount / totalCount) * 100;
                    
                    // Update progress overview
                    document.getElementById('progress-text').textContent = \`\${unlockedCount} / \${totalCount} Unlocked\`;
                    document.getElementById('overall-progress-bar').style.width = \`\${progressPercent}%\`;
                    document.getElementById('unlocked-count').textContent = unlockedCount;
                    
                    // Calculate XP from achievements
                    const xpFromAchievements = data.achievements.reduce((total, achievementId) => {
                        const achievement = achievements.find(a => a.id === achievementId);
                        return total + (achievement ? achievement.xpReward : 0);
                    }, 0);
                    document.getElementById('total-xp-earned').textContent = formatNumber(xpFromAchievements);
                    
                    // Find rarest unlocked achievement
                    const rarityOrder = { 'common': 1, 'rare': 2, 'epic': 3, 'legendary': 4 };
                    const unlockedAchievements = achievements.filter(a => data.achievements.includes(a.id));
                    const rarestUnlocked = unlockedAchievements.reduce((rarest, current) => {
                        return rarityOrder[current.rarity] > rarityOrder[rarest?.rarity || 'common'] ? current : rarest;
                    }, null);
                    
                    document.getElementById('rarest-achievement').textContent = rarestUnlocked ? rarestUnlocked.rarity : '-';
                    
                    renderAchievements();
                }

                // Listen for messages from the extension
                window.addEventListener('message', event => {
                    const message = event.data;
                    if (message.type === 'updateAchievements') {
                        updateAchievements(message.data);
                    }
                });
            </script>
        </body>
        </html>`;
    }
}