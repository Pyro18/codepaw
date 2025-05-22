import * as vscode from 'vscode';
import { PetManager, PetData } from './petManager';

export class PetWebviewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'codePaw.petView'; // Changed from codingPet.petView
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
                body { 
                    font-family: var(--vscode-font-family);
                    color: var(--vscode-foreground);
                    background-color: var(--vscode-editor-background);
                    margin: 0;
                    padding: 16px;
                }
                .pet-container {
                    text-align: center;
                    padding: 20px;
                    border-radius: 8px;
                    background: var(--vscode-editor-widget-background);
                    border: 1px solid var(--vscode-widget-border);
                }
                .pet-emoji {
                    font-size: 64px;
                    margin: 16px 0;
                    animation: bounce 2s infinite;
                }
                @keyframes bounce {
                    0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
                    40% { transform: translateY(-10px); }
                    60% { transform: translateY(-5px); }
                }
                .progress-bar {
                    width: 100%;
                    height: 8px;
                    background: var(--vscode-progressBar-background);
                    border-radius: 4px;
                    margin: 8px 0;
                }
                .progress-fill {
                    height: 100%;
                    border-radius: 4px;
                    transition: width 0.3s ease;
                }
                .xp-bar { background: var(--vscode-progressBar-background); }
                .happiness-bar { background: #ff6b6b; }
                .stats-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 12px;
                    margin-top: 16px;
                }
                .stat-item {
                    text-align: center;
                    padding: 8px;
                    background: var(--vscode-input-background);
                    border-radius: 4px;
                }
                .stat-number {
                    font-size: 20px;
                    font-weight: bold;
                    color: var(--vscode-charts-blue);
                }
                button {
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    margin: 4px;
                }
                button:hover {
                    background: var(--vscode-button-hoverBackground);
                }
            </style>
        </head>
        <body>
            <div class="pet-container">
                <div id="pet-emoji" class="pet-emoji">🐣</div>
                <h2 id="pet-name">Pypy</h2>
                <p id="pet-level">Baby • Level 1</p>
                
                <div>
                    <div>XP: <span id="xp-text">0/100</span></div>
                    <div class="progress-bar">
                        <div id="xp-bar" class="progress-fill xp-bar" style="width: 0%"></div>
                    </div>
                </div>
                
                <div>
                    <div>Happiness: <span id="happiness-text">80%</span></div>
                    <div class="progress-bar">
                        <div id="happiness-bar" class="progress-fill happiness-bar" style="width: 80%"></div>
                    </div>
                </div>

                <div class="stats-grid">
                    <div class="stat-item">
                        <div id="saves-count" class="stat-number">0</div>
                        <div>Saves</div>
                    </div>
                    <div class="stat-item">
                        <div id="files-count" class="stat-number">0</div>
                        <div>Files Created</div>
                    </div>
                    <div class="stat-item">
                        <div id="lines-count" class="stat-number">0</div>
                        <div>Lines Written</div>
                    </div>
                    <div class="stat-item">
                        <div id="languages-count" class="stat-number">0</div>
                        <div>Languages</div>
                    </div>
                </div>

                <div style="margin-top: 16px;">
                    <button onclick="feedPet(25)">🍎 Snack (+25 XP)</button>
                    <button onclick="feedPet(50)">🥇 Prize (+50 XP)</button>
                </div>
            </div>

            <script>
                const vscode = acquireVsCodeApi();
                
                function feedPet(xp) {
                    vscode.postMessage({ type: 'feedPet', xp: xp });
                }

                function getPetEmoji(stage, happiness) {
                    const emojis = {
                        baby: happiness > 60 ? '🐣' : '😴',
                        teen: happiness > 60 ? '🐱' : '😾',  
                        adult: happiness > 60 ? '🦄' : '🐴',
                        master: happiness > 60 ? '🐉' : '🦎'
                    };
                    return emojis[stage] || '🐣';
                }

                window.addEventListener('message', event => {
                    const message = event.data;
                    if (message.type === 'updatePet') {
                        const pet = message.data;
                        
                        document.getElementById('pet-emoji').textContent = getPetEmoji(pet.stage, pet.happiness);
                        document.getElementById('pet-name').textContent = pet.name;
                        document.getElementById('pet-level').textContent = \`\${pet.stage} • Level \${pet.level}\`;
                        
                        document.getElementById('xp-text').textContent = \`\${pet.xp}/\${pet.maxXp}\`;
                        document.getElementById('xp-bar').style.width = \`\${(pet.xp / pet.maxXp) * 100}%\`;
                        
                        document.getElementById('happiness-text').textContent = \`\${pet.happiness}%\`;
                        document.getElementById('happiness-bar').style.width = \`\${pet.happiness}%\`;
                        
                        document.getElementById('saves-count').textContent = pet.stats.totalSaves;
                        document.getElementById('files-count').textContent = pet.stats.filesCreated;
                        document.getElementById('lines-count').textContent = pet.stats.totalLines;
                        document.getElementById('languages-count').textContent = Array.isArray(pet.stats.languagesUsed) 
                            ? pet.stats.languagesUsed.length 
                            : pet.stats.languagesUsed.size || 0;
                    }
                });
            </script>
        </body>
        </html>`;
  }
}

export class PetWebviewPanel {
  public static currentPanel: PetWebviewPanel | undefined;
  public static readonly viewType = 'codePaw'; // Changed from codingPet

  public static createOrShow(extensionUri: vscode.Uri, petManager: PetManager) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (PetWebviewPanel.currentPanel) {
      PetWebviewPanel.currentPanel._panel.reveal(column);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      PetWebviewPanel.viewType,
      'Code Paw', // Changed from Coding Pet
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [extensionUri]
      }
    );

    PetWebviewPanel.currentPanel = new PetWebviewPanel(panel, extensionUri, petManager);
  }

  private constructor(
    private readonly _panel: vscode.WebviewPanel,
    private readonly _extensionUri: vscode.Uri,
    private readonly petManager: PetManager
  ) {
    this._panel.webview.html = this.getHtmlForWebview();
    this._panel.onDidDispose(() => this.dispose(), null);
  }

  private dispose() {
    PetWebviewPanel.currentPanel = undefined;
    this._panel.dispose();
  }

  private getHtmlForWebview(): string {
    // Same HTML as the sidebar but in a larger version
    return `<!DOCTYPE html><html><!-- Similar HTML but optimized for panel --></html>`;
  }
}