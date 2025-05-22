import * as vscode from 'vscode';
import { PetManager } from './petManager';

export class ActivityTracker {
    private petManager: PetManager;
    private disposables: vscode.Disposable[] = [];
    private typingTimer: NodeJS.Timeout | undefined;
    private sessionStartTime: number = Date.now();
    private timeTrackingInterval: NodeJS.Timeout | undefined;
    private gitExtension: any;

    constructor(petManager: PetManager) {
        this.petManager = petManager;
        this.initializeGitExtension();
    }

    private async initializeGitExtension() {
        try {
            // Ottieni l'estensione Git integrata di VSCode
            const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
            this.gitExtension = gitExtension?.getAPI(1);
            
            if (this.gitExtension) {
                console.log('✅ Git extension connected');
                this.setupGitTracking();
            }
        } catch (error) {
            console.log('⚠️ Git extension not available:', error);
        }
    }

    private setupGitTracking() {
        if (!this.gitExtension) return;

        // Traccia i repository aperti
        this.gitExtension.repositories.forEach((repo: any) => {
            this.setupRepositoryTracking(repo);
        });

        // Traccia nuovi repository che vengono aperti
        this.gitExtension.onDidOpenRepository((repo: any) => {
            this.setupRepositoryTracking(repo);
        });
    }

    private setupRepositoryTracking(repository: any) {
        console.log('🔗 Setting up tracking for repository:', repository.rootUri.path);

        // Traccia i commit
        repository.state.onDidChange(() => {
            this.checkForNewCommits(repository);
        });

        // Traccia modifiche al branch
        repository.state.onDidChange(() => {
            this.trackBranchChanges(repository);
        });
    }

    private async checkForNewCommits(repository: any) {
        try {
            const commits = await repository.log({ maxEntries: 1 });
            if (commits.length > 0) {
                const lastCommit = commits[0];
                const commitMessage = lastCommit.message || '';
                
                // XP basato sulla lunghezza del messaggio di commit
                let xp = 25; // Base XP per commit
                if (commitMessage.length > 50) xp += 10; // Messaggio dettagliato
                if (commitMessage.includes('fix') || commitMessage.includes('bug')) xp += 15; // Bug fix
                if (commitMessage.includes('feat') || commitMessage.includes('feature')) xp += 20; // Nuova feature
                
                this.petManager.addActivity('commit', xp, {
                    message: commitMessage,
                    hash: lastCommit.hash?.substring(0, 8),
                    repository: repository.rootUri.path
                });

                vscode.window.showInformationMessage(
                    `🚀 Commit detected! +${xp} XP`, 
                    { modal: false }
                );
            }
        } catch (error) {
            console.log('Error checking commits:', error);
        }
    }

    private trackBranchChanges(repository: any) {
        const currentBranch = repository.state.HEAD?.name;
        if (currentBranch && currentBranch !== 'main' && currentBranch !== 'master') {
            // Bonus XP per lavorare su feature branch
            this.petManager.addActivity('branch', 5, { branch: currentBranch });
        }
    }

    public startTracking() {
        console.log('🚀 Starting enhanced activity tracking...');

        // === FILE TRACKING ===
        this.disposables.push(
            vscode.workspace.onDidSaveTextDocument((document) => {
                const language = document.languageId;
                const lineCount = document.lineCount;
                
                // XP basato sulla dimensione del file
                let xp = 15;
                if (lineCount > 100) xp += 5;
                if (lineCount > 500) xp += 10;
                
                this.petManager.addActivity('save', xp, { 
                    language,
                    lineCount,
                    fileName: document.fileName.split('/').pop()
                });
            })
        );

        // === FILE CREATION ===
        this.disposables.push(
            vscode.workspace.onDidCreateFiles((event) => {
                event.files.forEach((file) => {
                    const fileName = file.path.split('/').pop() || '';
                    const extension = fileName.split('.').pop() || '';
                    
                    let xp = 20;
                    // Bonus per tipi di file specifici
                    if (['test', 'spec'].some(keyword => fileName.toLowerCase().includes(keyword))) {
                        xp += 15; // Bonus per file di test
                    }
                    if (['config', 'setup'].some(keyword => fileName.toLowerCase().includes(keyword))) {
                        xp += 10; // Bonus per file di configurazione
                    }
                    
                    this.petManager.addActivity('newFile', xp, { 
                        fileName,
                        extension
                    });
                });
            })
        );

        // === ADVANCED TYPING TRACKING ===
        this.disposables.push(
            vscode.workspace.onDidChangeTextDocument((event) => {
                if (event.contentChanges.length > 0) {
                    if (this.typingTimer) {
                        clearTimeout(this.typingTimer);
                    }
                    
                    this.typingTimer = setTimeout(() => {
                        const totalChanges = event.contentChanges.reduce((total, change) => {
                            const addedLines = (change.text.match(/\n/g) || []).length;
                            const addedChars = change.text.length;
                            return total + addedLines + Math.floor(addedChars / 50); // 1 XP ogni 50 caratteri
                        }, 0);
                        
                        if (totalChanges > 0) {
                            this.petManager.addActivity('typing', Math.min(totalChanges * 2, 15), {
                                language: event.document.languageId,
                                changes: totalChanges
                            });
                        }
                    }, 3000);
                }
            })
        );

        // === DEBUGGING TRACKING ===
        this.disposables.push(
            vscode.debug.onDidStartDebugSession(() => {
                this.petManager.addActivity('debug', 20, { type: 'start' });
                vscode.window.showInformationMessage('🐛 Debug session started! +20 XP');
            })
        );

        this.disposables.push(
            vscode.debug.onDidTerminateDebugSession(() => {
                this.petManager.addActivity('debug', 15, { type: 'end' });
            })
        );

        // === TERMINAL TRACKING ===
        this.disposables.push(
            vscode.window.onDidOpenTerminal(() => {
                this.petManager.addActivity('terminal', 5);
            })
        );

        // === EXTENSION USAGE TRACKING ===
        this.disposables.push(
            vscode.extensions.onDidChange(() => {
                this.petManager.addActivity('extension', 10);
            })
        );

        // === TIME TRACKING ===
        this.startTimeTracking();

        // === FOCUS TRACKING ===
        this.disposables.push(
            vscode.window.onDidChangeActiveTextEditor((editor) => {
                if (editor) {
                    this.petManager.addActivity('focus', 1, {
                        language: editor.document.languageId
                    });
                }
            })
        );

        // === WORKSPACE TRACKING ===
        this.disposables.push(
            vscode.workspace.onDidChangeWorkspaceFolders((event) => {
                if (event.added.length > 0) {
                    this.petManager.addActivity('workspace', 25, {
                        action: 'opened',
                        folders: event.added.length
                    });
                }
            })
        );

        console.log('✅ Enhanced tracking started!');
    }

    private startTimeTracking() {
        this.timeTrackingInterval = setInterval(() => {
            // Controlla se VSCode è attivo e l'utente sta scrivendo codice
            if (vscode.window.activeTextEditor) {
                const now = Date.now();
                const sessionTime = Math.floor((now - this.sessionStartTime) / (1000 * 60)); // minuti
                
                // Ogni 5 minuti di coding attivo
                if (sessionTime > 0 && sessionTime % 5 === 0) {
                    this.petManager.addActivity('timeActive', 3, {
                        sessionMinutes: sessionTime
                    });
                }
                
                // Bonus per sessioni lunghe
                if (sessionTime === 30) {
                    vscode.window.showInformationMessage('🏆 30 minutes of coding! +50 XP bonus!');
                    this.petManager.addActivity('milestone', 50, { type: '30min' });
                }
                if (sessionTime === 60) {
                    vscode.window.showInformationMessage('🔥 1 hour of coding! +100 XP bonus!');
                    this.petManager.addActivity('milestone', 100, { type: '1hour' });
                }
            }
        }, 60000); // Ogni minuto
    }

    // === METODI UTILI PER STATISTICHE AVANZATE ===
    public getSessionTime(): number {
        return Math.floor((Date.now() - this.sessionStartTime) / (1000 * 60));
    }

    public async getCurrentBranch(): Promise<string | undefined> {
        if (!this.gitExtension || this.gitExtension.repositories.length === 0) {
            return undefined;
        }
        
        const repo = this.gitExtension.repositories[0];
        return repo.state.HEAD?.name;
    }

    public async getCommitCount(): Promise<number> {
        if (!this.gitExtension || this.gitExtension.repositories.length === 0) {
            return 0;
        }
        
        try {
            const repo = this.gitExtension.repositories[0];
            const commits = await repo.log({ maxEntries: 100 });
            return commits.length;
        } catch {
            return 0;
        }
    }

    public dispose() {
        this.disposables.forEach(d => d.dispose());
        if (this.typingTimer) {
            clearTimeout(this.typingTimer);
        }
        if (this.timeTrackingInterval) {
            clearInterval(this.timeTrackingInterval);
        }
    }
}