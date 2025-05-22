import * as vscode from 'vscode';
import { PetData, PetManager } from './petManager';
import { ActivityTracker } from './activityTracker';
import { PetWebviewPanel, PetWebviewProvider } from './webview';

export function activate(context: vscode.ExtensionContext) {
    console.log('🚀 INIZIO ATTIVAZIONE!');
    
    try {
        const petManager = new PetManager(context);
        console.log('✅ PetManager creato');
        
        const activityTracker = new ActivityTracker(petManager);  
        console.log('✅ ActivityTracker creato');
        
        const showPetCommand = vscode.commands.registerCommand('codePaw.showPet', () => {
            PetWebviewPanel.createOrShow(context.extensionUri, petManager);
        });

        const feedPetCommand = vscode.commands.registerCommand('codePaw.feedPet', async () => {
            const activities = [
                'File Save (+10 XP)',
                'New Function (+20 XP)', 
                'Debug Completed (+30 XP)',
                'Git Commit (+25 XP)'
            ];
            
            const selected = await vscode.window.showQuickPick(activities, {
                placeHolder: 'What activity did you complete?'
            });
            
            if (selected) {
                const xp = parseInt(selected.match(/\d+/)?.[0] || '10');
                petManager.addActivity('manual', xp);
                vscode.window.showInformationMessage(`🎉 ${petManager.getPetData().name} gained ${xp} XP!`);
            }
        });
        
        const provider = new PetWebviewProvider(context.extensionUri, petManager);
        console.log('✅ WebviewProvider creato');
        
        context.subscriptions.push(
            vscode.window.registerWebviewViewProvider('codePaw.petView', provider)
        );
        console.log('✅ Provider registrato');
        
        context.subscriptions.push(showPetCommand, feedPetCommand);
        
        activityTracker.startTracking();
        
        console.log('🎉 ATTIVAZIONE COMPLETATA!');
        vscode.window.showInformationMessage('🐾 CodePaw activated!');
        
    } catch (error) {
        console.error('❌ ERRORE ATTIVAZIONE:', error);
        vscode.window.showErrorMessage(`CodePaw Error: ${error}`);
    }
}

export function deactivate() {}