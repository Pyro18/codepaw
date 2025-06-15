import * as vscode from 'vscode';
import { SyncManager } from './syncManager';

export interface PetStats {
    totalSaves: number;
    totalLines: number;
    languagesUsed: Set<string>;
    timeActive: number;
    filesCreated: number;
    // === NEW GIT STATS ===
    commitsCount: number;
    lastCommitMessage: string;
    currentBranch: string;
    repositoriesUsed: Set<string>;
    // === NEW ADVANCED STATS ===
    debugSessions: number;
    terminalSessions: number;
    testFilesCreated: number;
    longestSession: number;
    totalSessionTime: number;
    averageCommitMessage: number;
    bugFixCount: number;
    featureCount: number;
    // === STREAKS ===
    currentStreak: number;
    longestStreak: number;
    lastActiveDate: string;
}

export interface PetData {
    name: string;
    level: number;
    xp: number;
    maxXp: number;
    happiness: number;
    energy: number;
    stage: 'baby' | 'teen' | 'adult' | 'master' | 'legend';
    lastActive: number;
    stats: PetStats;
    achievements: string[];
    // === NEW FIELDS ===
    totalXpEarned: number;
    createdAt: number;
    evolutionHistory: Array<{ stage: string, date: number, level: number }>;
}

export class PetManager {
    private pet: PetData;
    private context: vscode.ExtensionContext;
    private syncManager: SyncManager;
    private onPetUpdate: vscode.EventEmitter<PetData> = new vscode.EventEmitter<PetData>();
    public readonly onDidUpdatePet: vscode.Event<PetData> = this.onPetUpdate.event; constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.syncManager = new SyncManager(context);
        this.pet = this.loadPetData();
        this.startDecayTimer();
        this.checkDailyStreak();
    }

    private loadPetData(): PetData {
        const saved = this.context.globalState.get<any>('petData');
        const config = vscode.workspace.getConfiguration('codePaw');

        if (saved) {
            if (saved.stats.languagesUsed && Array.isArray(saved.stats.languagesUsed)) {
                saved.stats.languagesUsed = new Set(saved.stats.languagesUsed);
            } else {
                saved.stats.languagesUsed = new Set();
            }

            if (!saved.stats.repositoriesUsed) {
                saved.stats.repositoriesUsed = new Set();
            } else if (Array.isArray(saved.stats.repositoriesUsed)) {
                saved.stats.repositoriesUsed = new Set(saved.stats.repositoriesUsed);
            }

            return {
                ...saved,
                totalXpEarned: saved.totalXpEarned || 0,
                createdAt: saved.createdAt || Date.now(),
                evolutionHistory: saved.evolutionHistory || [],
                stats: {
                    ...saved.stats,
                    commitsCount: saved.stats.commitsCount || 0,
                    lastCommitMessage: saved.stats.lastCommitMessage || '',
                    currentBranch: saved.stats.currentBranch || 'main',
                    debugSessions: saved.stats.debugSessions || 0,
                    terminalSessions: saved.stats.terminalSessions || 0,
                    testFilesCreated: saved.stats.testFilesCreated || 0,
                    longestSession: saved.stats.longestSession || 0,
                    totalSessionTime: saved.stats.totalSessionTime || 0,
                    averageCommitMessage: saved.stats.averageCommitMessage || 0,
                    bugFixCount: saved.stats.bugFixCount || 0,
                    featureCount: saved.stats.featureCount || 0,
                    currentStreak: saved.stats.currentStreak || 1,
                    longestStreak: saved.stats.longestStreak || 1,
                    lastActiveDate: saved.stats.lastActiveDate || new Date().toDateString()
                }
            };
        }

        return {
            name: config.get('petName', 'Pypy'),
            level: 1,
            xp: 0,
            maxXp: 100,
            happiness: 80,
            energy: 70,
            stage: 'baby',
            lastActive: Date.now(),
            totalXpEarned: 0,
            createdAt: Date.now(),
            evolutionHistory: [],
            achievements: [],
            stats: {
                totalSaves: 0,
                totalLines: 0,
                languagesUsed: new Set(),
                timeActive: 0,
                filesCreated: 0,
                commitsCount: 0,
                lastCommitMessage: '',
                currentBranch: 'main',
                repositoriesUsed: new Set(),
                debugSessions: 0,
                terminalSessions: 0,
                testFilesCreated: 0,
                longestSession: 0,
                totalSessionTime: 0,
                averageCommitMessage: 0,
                bugFixCount: 0,
                featureCount: 0,
                currentStreak: 1,
                longestStreak: 1,
                lastActiveDate: new Date().toDateString()
            }
        };
    }

    private savePetData() {
        const dataToSave = {
            ...this.pet,
            stats: {
                ...this.pet.stats,
                languagesUsed: Array.from(this.pet.stats.languagesUsed),
                repositoriesUsed: Array.from(this.pet.stats.repositoriesUsed)
            }
        };
        this.context.globalState.update('petData', dataToSave);
    }

    public addActivity(type: string, xpGain: number, metadata?: any) {
        const oldLevel = this.pet.level;
        const oldStage = this.pet.stage;

        this.pet.xp += Math.floor(xpGain * (1 + (this.pet.stats.currentStreak - 1) / 10));
        this.pet.totalXpEarned += Math.floor(xpGain * (1 + (this.pet.stats.currentStreak - 1) / 10));
        this.pet.happiness = Math.min(100, this.pet.happiness + Math.floor(xpGain / 3));
        this.pet.energy = Math.min(100, this.pet.energy + Math.floor(xpGain / 5));
        this.pet.lastActive = Date.now();

        this.updateStats(type, metadata);

        while (this.pet.xp >= this.pet.maxXp) {
            this.pet.xp -= this.pet.maxXp;
            this.pet.level++;
            this.pet.maxXp = Math.floor(this.pet.maxXp * 1.3);
        }

        this.updateStage();

        if (oldStage !== this.pet.stage) {
            this.pet.evolutionHistory.push({
                stage: this.pet.stage,
                date: Date.now(),
                level: this.pet.level
            });
        }

        // ✅ FIXED: Check achievements EVERY time, not just on level up
        this.checkAchievements();

        if (oldLevel !== this.pet.level) {
            vscode.window.showInformationMessage(
                `🌟 ${this.pet.name} reached level ${this.pet.level}!`
            );
        }

        this.savePetData();
        this.onPetUpdate.fire(this.pet);

        // Auto-sync after significant progress
        this.checkAutoSync(oldLevel);
    }

    private updateStats(type: string, metadata?: any) {
        switch (type) {
            case 'save':
                this.pet.stats.totalSaves++;
                if (metadata?.language) {
                    this.pet.stats.languagesUsed.add(metadata.language);
                }
                if (metadata?.lineCount) {
                    this.pet.stats.totalLines += metadata.lineCount;
                }
                break;

            case 'newFile':
                this.pet.stats.filesCreated++;
                if (metadata?.fileName?.toLowerCase().includes('test') ||
                    metadata?.fileName?.toLowerCase().includes('spec')) {
                    this.pet.stats.testFilesCreated++;
                }
                break;

            case 'typing':
                if (metadata?.changes) {
                    this.pet.stats.totalLines += metadata.changes;
                }
                break;

            case 'commit':
                this.pet.stats.commitsCount++;
                if (metadata?.message) {
                    this.pet.stats.lastCommitMessage = metadata.message;
                    this.pet.stats.averageCommitMessage =
                        (this.pet.stats.averageCommitMessage + metadata.message.length) / 2;

                    if (metadata.message.toLowerCase().includes('fix') ||
                        metadata.message.toLowerCase().includes('bug')) {
                        this.pet.stats.bugFixCount++;
                    }
                    if (metadata.message.toLowerCase().includes('feat') ||
                        metadata.message.toLowerCase().includes('feature')) {
                        this.pet.stats.featureCount++;
                    }
                }
                if (metadata?.repository) {
                    this.pet.stats.repositoriesUsed.add(metadata.repository);
                }
                break;

            case 'branch':
                if (metadata?.branch) {
                    this.pet.stats.currentBranch = metadata.branch;
                }
                break;

            case 'debug':
                this.pet.stats.debugSessions++;
                break;

            case 'terminal':
                this.pet.stats.terminalSessions++;
                break;

            case 'timeActive':
                if (metadata?.sessionMinutes) {
                    this.pet.stats.totalSessionTime += metadata.sessionMinutes;
                    this.pet.stats.longestSession = Math.max(
                        this.pet.stats.longestSession,
                        metadata.sessionMinutes
                    );
                }
                break;
        }
    }

    private updateStage() {
        const oldStage = this.pet.stage;

        if (this.pet.level >= 100 && this.pet.stats.commitsCount >= 500) {
            this.pet.stage = 'legend';
        } else if (this.pet.level >= 50 && this.pet.stats.commitsCount >= 100) {
            this.pet.stage = 'master';
        } else if (this.pet.level >= 25 && this.pet.stats.commitsCount >= 20) {
            this.pet.stage = 'adult';
        } else if (this.pet.level >= 10 && this.pet.stats.commitsCount >= 5) {
            this.pet.stage = 'teen';
        } else {
            this.pet.stage = 'baby';
        }

        if (oldStage !== this.pet.stage) {
            const stageNames = {
                baby: 'Baby Coder',
                teen: 'Junior Developer',
                adult: 'Senior Developer',
                master: 'Tech Lead',
                legend: 'Code Legend'
            };

            vscode.window.showInformationMessage(
                `🎉 ${this.pet.name} evolved into ${stageNames[this.pet.stage]}!`
            );
        }
    }

    private checkDailyStreak() {
        const today = new Date().toDateString();
        const lastActive = this.pet.stats.lastActiveDate;

        if (lastActive !== today) {
            const lastDate = new Date(lastActive);
            const todayDate = new Date(today);
            const daysDiff = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

            if (daysDiff === 1) {
                this.pet.stats.currentStreak++;
                this.pet.stats.longestStreak = Math.max(
                    this.pet.stats.longestStreak,
                    this.pet.stats.currentStreak
                );
                this.addActivity('dailyBonus', 100);

                if (this.pet.stats.currentStreak % 7 === 0) {
                    vscode.window.showInformationMessage(
                        `🔥 ${this.pet.stats.currentStreak} day coding streak! +100 XP bonus!`
                    );
                    this.addActivity('streak', 100, { days: this.pet.stats.currentStreak });
                }
            } else if (daysDiff > 1) {
                this.pet.stats.currentStreak = 1;
            }

            this.pet.stats.lastActiveDate = today;
            this.savePetData();
        }
    }

    private checkAchievements() {
        const newAchievements: string[] = [];

        // Level-based achievements
        if (this.pet.level >= 10 && !this.pet.achievements.includes('first_milestone')) {
            newAchievements.push('first_milestone');
        }

        // Coding activity achievements
        if (this.pet.stats.totalSaves >= 100 && !this.pet.achievements.includes('save_master')) {
            newAchievements.push('save_master');
        }

        if (this.pet.stats.languagesUsed.size >= 5 && !this.pet.achievements.includes('polyglot')) {
            newAchievements.push('polyglot');
        }

        if (this.pet.stats.filesCreated >= 50 && !this.pet.achievements.includes('file_creator')) {
            newAchievements.push('file_creator');
        }

        // Git achievements
        if (this.pet.stats.commitsCount >= 50 && !this.pet.achievements.includes('commit_master')) {
            newAchievements.push('commit_master');
        }

        if (this.pet.stats.bugFixCount >= 20 && !this.pet.achievements.includes('bug_hunter')) {
            newAchievements.push('bug_hunter');
        }

        if (this.pet.stats.featureCount >= 10 && !this.pet.achievements.includes('feature_master')) {
            newAchievements.push('feature_master');
        }

        if (this.pet.stats.repositoriesUsed.size >= 5 && !this.pet.achievements.includes('repo_hopper')) {
            newAchievements.push('repo_hopper');
        }

        // Quality achievements
        if (this.pet.stats.testFilesCreated >= 10 && !this.pet.achievements.includes('test_writer')) {
            newAchievements.push('test_writer');
        }

        // Time & dedication achievements
        if (this.pet.stats.currentStreak >= 30 && !this.pet.achievements.includes('month_streak')) {
            newAchievements.push('month_streak');
        }

        if (this.pet.stats.longestSession >= 120 && !this.pet.achievements.includes('marathon_coder')) {
            newAchievements.push('marathon_coder');
        }

        if (this.pet.stats.debugSessions >= 25 && !this.pet.achievements.includes('debug_master')) {
            newAchievements.push('debug_master');
        }

        // Advanced achievements
        if (this.pet.totalXpEarned >= 10000 && !this.pet.achievements.includes('xp_collector')) {
            newAchievements.push('xp_collector');
        }

        if (this.pet.stats.totalLines >= 10000 && !this.pet.achievements.includes('code_machine')) {
            newAchievements.push('code_machine');
        }

        // Process new achievements
        newAchievements.forEach(achievement => {
            this.pet.achievements.push(achievement);
            const achievementName = this.getAchievementName(achievement);

            // Show notification with config check
            const config = vscode.workspace.getConfiguration('codePaw');
            if (config.get('enableNotifications', true)) {
                vscode.window.showInformationMessage(
                    `🏆 Achievement unlocked: ${achievementName}!`,
                    'View Achievements'
                ).then(selection => {
                    if (selection === 'View Achievements') {
                        vscode.commands.executeCommand('codePaw.showAchievements');
                    }
                });
            }
        });
    }

    private getAchievementName(achievement: string): string {
        const names: Record<string, string> = {
            'first_milestone': 'First Milestone',
            'save_master': 'Save Master',
            'polyglot': 'Polyglot',
            'commit_master': 'Commit Master',
            'month_streak': '30-Day Streak',
            'bug_hunter': 'Bug Hunter',
            'test_writer': 'Test Writer',
            'marathon_coder': 'Marathon Coder',
            'repo_hopper': 'Repository Hopper',
            'file_creator': 'File Creator',
            'feature_master': 'Feature Master',
            'debug_master': 'Debug Master',
            'xp_collector': 'XP Collector',
            'code_machine': 'Code Machine'
        };
        return names[achievement] || achievement;
    }

    private startDecayTimer() {
        setInterval(() => {
            const hoursSinceActive = (Date.now() - this.pet.lastActive) / (1000 * 60 * 60);

            if (hoursSinceActive > 2) {
                const decayAmount = Math.min(2, Math.floor(hoursSinceActive / 2));
                this.pet.happiness = Math.max(0, this.pet.happiness - decayAmount);
                this.pet.energy = Math.max(0, this.pet.energy - decayAmount);
                this.savePetData();
                this.onPetUpdate.fire(this.pet);
            }
        }, 300000);
    }

    public getPetData(): PetData {
        return { ...this.pet };
    }

    public resetPet() {
        const config = vscode.workspace.getConfiguration('codePaw');
        this.pet = {
            name: config.get('petName', 'Pypy'),
            level: 1,
            xp: 0,
            maxXp: 100,
            happiness: 80,
            energy: 70,
            stage: 'baby',
            lastActive: Date.now(),
            totalXpEarned: 0,
            createdAt: Date.now(),
            evolutionHistory: [],
            achievements: [],
            stats: {
                totalSaves: 0,
                totalLines: 0,
                languagesUsed: new Set(),
                timeActive: 0,
                filesCreated: 0,
                commitsCount: 0,
                lastCommitMessage: '',
                currentBranch: 'main',
                repositoriesUsed: new Set(),
                debugSessions: 0,
                terminalSessions: 0,
                testFilesCreated: 0,
                longestSession: 0,
                totalSessionTime: 0,
                averageCommitMessage: 0,
                bugFixCount: 0,
                featureCount: 0,
                currentStreak: 1,
                longestStreak: 1,
                lastActiveDate: new Date().toDateString()
            }
        };
        this.savePetData();
        this.onPetUpdate.fire(this.pet);
    }

    // === SYNC METHODS ===

    public async setupSync(): Promise<boolean> {
        return await this.syncManager.setupSync();
    }

    public async syncToCloud(): Promise<boolean> {
        return await this.syncManager.uploadData(this.pet);
    } public async syncFromCloud(): Promise<boolean> {
        const petData = await this.syncManager.downloadData();
        if (petData) {
            // Keep local name from config if different
            const config = vscode.workspace.getConfiguration('codePaw');
            const localName = config.get('petName', 'Pypy');

            this.pet = {
                ...petData,
                name: localName // Keep local name
            };

            // Convert Sets back from arrays
            if (Array.isArray(this.pet.stats.languagesUsed)) {
                this.pet.stats.languagesUsed = new Set(this.pet.stats.languagesUsed);
            }
            if (Array.isArray(this.pet.stats.repositoriesUsed)) {
                this.pet.stats.repositoriesUsed = new Set(this.pet.stats.repositoriesUsed);
            }

            this.savePetData();
            this.onPetUpdate.fire(this.pet);
            return true;
        }
        return false;
    }

    public async getSyncStatus(): Promise<{ configured: boolean; lastSync?: Date; deviceId?: string }> {
        return await this.syncManager.getSyncStatus();
    }

    public async resetSync(): Promise<void> {
        await this.syncManager.resetSync();
    }

    private async checkAutoSync(oldLevel: number): Promise<void> {
        const config = vscode.workspace.getConfiguration('codePaw');
        const autoSync = config.get('autoSync', false);

        if (!autoSync) {
            return;
        }

        // Auto-sync su level up significativi (ogni 5 livelli) o evoluzione
        const shouldAutoSync =
            (this.pet.level !== oldLevel && this.pet.level % 5 === 0) ||
            (this.pet.achievements.length > 0 && this.pet.level !== oldLevel);

        if (shouldAutoSync) {
            try {
                const success = await this.syncManager.uploadData(this.pet); if (success) {
                    vscode.window.showInformationMessage(
                        `📤 Data synced automatically! (Level ${this.pet.level})`,
                        { modal: false }
                    );
                }
            } catch (error) {
                console.error('Auto-sync failed:', error);
            }
        }
    }

    public async checkSyncOnStartup(): Promise<void> {
        const config = vscode.workspace.getConfiguration('codePaw');
        const syncOnStartup = config.get('syncOnStartup', false);

        if (!syncOnStartup) {
            return;
        }

        try {
            const status = await this.getSyncStatus();
            if (status.configured && status.lastSync) {
                const localLastActive = this.pet.lastActive;
                const cloudLastSync = status.lastSync.getTime();

                // Se il cloud è più recente di 1 ora rispetto ai dati locali
                if (cloudLastSync > localLastActive + (60 * 60 * 1000)) {
                    const choice = await vscode.window.showInformationMessage(
                        '☁️ Found newer data in cloud. Do you want to download it?',
                        'Yes, download',
                        'No, keep local'
                    );

                    if (choice === 'Yes, download') {
                        await this.syncFromCloud();
                    }
                }
            }
        } catch (error) {
            console.error('Startup sync check failed:', error);
        }
    }
}
