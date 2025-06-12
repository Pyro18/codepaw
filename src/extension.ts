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
            checkAchievementsCommand
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
        updateStatusBar();
        statusBarItem.show();
        context.subscriptions.push(statusBarItem);
        
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



