import * as vscode from 'vscode';
import { PetData, PetManager } from './petManager';
import { ActivityTracker } from './activityTracker';
import { PetWebviewProvider } from './webview';
import { StatsWebviewPanel } from './statsPanel';
import { AchievementsWebviewPanel } from './achievementsPanel';

// Type for achievement IDs
type AchievementId = 'first_milestone' | 'save_master' | 'polyglot' | 'commit_master' | 'month_streak' | 'bug_hunter' | 'test_writer' | 'marathon_coder' | 'repo_hopper';

// Achievement names mapping with proper typing
const ACHIEVEMENT_NAMES: Record<AchievementId, string> = {
    'first_milestone': '🎯 First Milestone',
    'save_master': '💾 Save Master',
    'polyglot': '🗣️ Polyglot',
    'commit_master': '🚀 Commit Master',
    'month_streak': '🔥 30-Day Streak',
    'bug_hunter': '🐛 Bug Hunter',
    'test_writer': '✅ Test Writer',
    'marathon_coder': '⏱️ Marathon Coder',
    'repo_hopper': '📁 Repository Hopper'
};

export function activate(context: vscode.ExtensionContext) {
    console.log('🚀 CodePaw: Starting activation...');

    try {
        const petManager = new PetManager(context);
        console.log('✅ PetManager created');

        const activityTracker = new ActivityTracker(petManager);
        console.log('✅ ActivityTracker created');

        // === COMMANDS ===

        // Show Advanced Statistics Dashboard
        const showStatsCommand = vscode.commands.registerCommand('codePaw.showStats', () => {
            StatsWebviewPanel.createOrShow(context.extensionUri, petManager);
        });

        // Show Achievements Panel
        const showAchievementsCommand = vscode.commands.registerCommand('codePaw.showAchievements', () => {
            AchievementsWebviewPanel.createOrShow(context.extensionUri, petManager);
        });

        // Manual feeding command
        const feedPetCommand = vscode.commands.registerCommand('codePaw.feedPet', async () => {
            const activities = [
                { label: '🍎 Small Snack (+25 XP)', xp: 25 },
                { label: '🥇 Big Prize (+50 XP)', xp: 50 },
                { label: '🎉 Celebration (+75 XP)', xp: 75 },
                { label: '💎 Epic Reward (+100 XP)', xp: 100 }
            ];

            const selected = await vscode.window.showQuickPick(
                activities.map(a => a.label),
                { placeHolder: 'Choose a reward for your pet!' }
            );

            if (selected) {
                const activity = activities.find(a => a.label === selected);
                if (activity) {
                    petManager.addActivity('manual', activity.xp);
                    const petData = petManager.getPetData();
                    vscode.window.showInformationMessage(
                        `🎉 ${petData.name} gained ${activity.xp} XP! Now at level ${petData.level}`
                    );
                }
            }
        });

        // Pet status command
        const petStatusCommand = vscode.commands.registerCommand('codePaw.petStatus', () => {
            const pet = petManager.getPetData();
            const languageCount = Array.isArray(pet.stats.languagesUsed) ?
                pet.stats.languagesUsed.length :
                pet.stats.languagesUsed.size;

            const statusItems = [
                `🐾 **${pet.name}** (${pet.stage})`,
                `📊 Level ${pet.level} - ${pet.xp}/${pet.maxXp} XP`,
                `😊 Happiness: ${pet.happiness}%`,
                `⚡ Energy: ${pet.energy}%`,
                `🔥 Streak: ${pet.stats.currentStreak} days`,
                ``,
                `📈 **Statistics:**`,
                `💾 Files Saved: ${pet.stats.totalSaves}`,
                `🚀 Commits: ${pet.stats.commitsCount}`,
                `📝 Lines of Code: ${pet.stats.totalLines.toLocaleString()}`,
                `🗣️ Languages: ${languageCount}`,
                `🏆 Achievements: ${pet.achievements.length}/${Object.keys(ACHIEVEMENT_NAMES).length}`
            ];

            vscode.window.showInformationMessage(statusItems.join('\n'), { modal: true });
        });

        // Reset pet command (with confirmation)
        const resetPetCommand = vscode.commands.registerCommand('codePaw.resetPet', async () => {
            const pet = petManager.getPetData();
            const confirm = await vscode.window.showWarningMessage(
                `Are you sure you want to reset ${pet.name}? This will delete ALL progress including:
                
• Level ${pet.level} progress
• ${pet.totalXpEarned.toLocaleString()} total XP earned
• ${pet.achievements.length} achievements unlocked
• All statistics and evolution history

This action cannot be undone!`,
                { modal: true },
                'Yes, Reset Everything',
                'Cancel'
            );

            if (confirm === 'Yes, Reset Everything') {
                petManager.resetPet();
                vscode.window.showInformationMessage('🔄 Pet has been reset. Welcome back, baby coder!');
            }
        });

        // Quick achievements check
        const checkAchievementsCommand = vscode.commands.registerCommand('codePaw.checkAchievements', () => {
            // Just open the achievements panel instead of showing a modal
            AchievementsWebviewPanel.createOrShow(context.extensionUri, petManager);
        });

        // === SYNC COMMANDS ===

        // Setup sync with GitHub
        const setupSyncCommand = vscode.commands.registerCommand('codePaw.setupSync', async () => {
            await vscode.window.showInformationMessage(
                'To use synchronization you need to create a GitHub Personal Access Token:\n\n' +
                '1. Go to GitHub.com → Settings → Developer settings → Personal access tokens → Tokens (classic)\n' +
                '2. Click "Generate new token (classic)"\n' +
                '3. Select the "gist" scope (to create and modify Gists)\n' +
                '4. Copy the generated token\n\n' +
                'The token will be used to save your data in a private GitHub Gist.',
                { modal: true },
                'Got it'
            );

            const success = await petManager.setupSync();
            if (success) {
                vscode.window.showInformationMessage('✅ Sync configured successfully!');
            }
        });

        // Upload data to cloud
        const syncToCloudCommand = vscode.commands.registerCommand('codePaw.syncToCloud', async () => {
            const success = await petManager.syncToCloud();
            if (success) {
                vscode.window.showInformationMessage('✅ Data uploaded to cloud!');
            }
        });

        // Download data from cloud
        const syncFromCloudCommand = vscode.commands.registerCommand('codePaw.syncFromCloud', async () => {
            const pet = petManager.getPetData();
            const confirm = await vscode.window.showWarningMessage(
                `Downloading data from cloud will overwrite current local data:\n\n` +
                `• Current Level: ${pet.level}\n` +
                `• Current XP: ${pet.xp.toLocaleString()}\n` +
                `• Achievements: ${pet.achievements.length}\n\n` +
                `Do you want to continue?`,
                { modal: true },
                'Yes, download from cloud',
                'Cancel'
            );

            if (confirm === 'Yes, download from cloud') {
                const success = await petManager.syncFromCloud();
                if (success) {
                    vscode.window.showInformationMessage('✅ Data downloaded from cloud!');
                }
            }
        });

        // Show sync status
        const syncStatusCommand = vscode.commands.registerCommand('codePaw.syncStatus', async () => {
            const status = await petManager.getSyncStatus();

            if (!status.configured) {
                vscode.window.showInformationMessage(
                    '❌ Sync not configured\n\nUse "Setup Sync" command to get started.',
                    { modal: true },
                    'Setup Sync'
                ).then(selection => {
                    if (selection === 'Setup Sync') {
                        vscode.commands.executeCommand('codePaw.setupSync');
                    }
                });
            } else {
                const lastSyncText = status.lastSync ?
                    `📅 Last sync: ${status.lastSync.toLocaleString()}` :
                    '📅 No sync performed yet';

                const deviceText = status.deviceId ?
                    `🖥️ Device ID: ${status.deviceId}` :
                    '';

                vscode.window.showInformationMessage(
                    `✅ Sync configured\n\n${lastSyncText}\n${deviceText}`,
                    { modal: true },
                    'Sync now',
                    'Download from cloud'
                ).then(selection => {
                    if (selection === 'Sync now') {
                        vscode.commands.executeCommand('codePaw.syncToCloud');
                    } else if (selection === 'Download from cloud') {
                        vscode.commands.executeCommand('codePaw.syncFromCloud');
                    }
                });
            }
        });

        // Reset sync configuration
        const resetSyncCommand = vscode.commands.registerCommand('codePaw.resetSync', async () => {
            const confirm = await vscode.window.showWarningMessage(
                'Do you want to reset the sync configuration?\n\n' +
                'This will remove the access token and Gist connection, ' +
                'but will not delete data already saved on GitHub.',
                { modal: true },
                'Yes, reset',
                'Cancel'
            );

            if (confirm === 'Yes, reset') {
                await petManager.resetSync();
                vscode.window.showInformationMessage('✅ Sync configuration reset.');
            }
        });

        // === WEBVIEW PROVIDER ===
        const provider = new PetWebviewProvider(context.extensionUri, petManager);
        console.log('✅ WebviewProvider created');

        context.subscriptions.push(
            vscode.window.registerWebviewViewProvider('codePaw.petView', provider)
        );
        console.log('✅ Provider registered');

        // === REGISTER ALL COMMANDS ===
        context.subscriptions.push(
            showStatsCommand,
            showAchievementsCommand,
            feedPetCommand,
            petStatusCommand,
            resetPetCommand,
            checkAchievementsCommand,
            setupSyncCommand,
            syncToCloudCommand,
            syncFromCloudCommand,
            syncStatusCommand,
            resetSyncCommand
        );

        // === STATUS BAR ===
        const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        statusBarItem.command = 'codePaw.petStatus';
        statusBarItem.tooltip = 'Click to see pet status';

        const updateStatusBar = () => {
            const pet = petManager.getPetData();
            const emoji = getPetEmoji(pet.stage, pet.happiness);
            statusBarItem.text = `${emoji} Lv.${pet.level} (${pet.stats.currentStreak}🔥)`;
        };

        petManager.onDidUpdatePet(updateStatusBar);

        context.subscriptions.push(statusBarItem);
        console.log('✅ Status bar created');

        // Check for cloud sync on startup
        setTimeout(async () => {
            await petManager.checkSyncOnStartup();
        }, 2000); // Wait 2 seconds after activation

        console.log('✅ CodePaw activated successfully!');

        // === START TRACKING ===
        activityTracker.startTracking();

        // === WELCOME MESSAGE ===
        const pet = petManager.getPetData();
        const isFirstTime = pet.totalXpEarned === 0;

        if (isFirstTime) {
            vscode.window.showInformationMessage(
                `🐾 Welcome to CodePaw! Meet ${pet.name}, your coding companion!`,
                'View Pet',
                'Open Statistics',
                'View Achievements'
            ).then(selection => {
                if (selection === 'View Pet') {
                    vscode.commands.executeCommand('codePaw.petView.focus');
                } else if (selection === 'Open Statistics') {
                    vscode.commands.executeCommand('codePaw.showStats');
                } else if (selection === 'View Achievements') {
                    vscode.commands.executeCommand('codePaw.showAchievements');
                }
            });
        } else {
            vscode.window.showInformationMessage(`🐾 ${pet.name} is back! Level ${pet.level} ${pet.stage}`);
        }

        console.log('🎉 CodePaw activation completed!');

    } catch (error) {
        console.error('❌ CodePaw activation error:', error);
        vscode.window.showErrorMessage(`CodePaw Error: ${error instanceof Error ? error.message : String(error)}`);
    }
}

function getPetEmoji(stage: string, happiness: number): string {
    const emojis: Record<string, string> = {
        baby: happiness > 60 ? '🐣' : happiness > 30 ? '😴' : '😵',
        teen: happiness > 60 ? '🐱' : happiness > 30 ? '😾' : '🙀',
        adult: happiness > 60 ? '🦄' : happiness > 30 ? '🐴' : '🐎',
        master: happiness > 60 ? '🐉' : happiness > 30 ? '🦎' : '🐲',
        legend: happiness > 60 ? '⭐' : happiness > 30 ? '🌟' : '💫'
    };
    return emojis[stage] || '🐣';
}

export function deactivate() {
    console.log('👋 CodePaw deactivated');
}



