import * as vscode from 'vscode';
import { PetData } from './petManager';

export interface SyncData {
  petData: PetData;
  syncVersion: number;
  lastSync: number;
  deviceId: string;
}

export class SyncManager {
  private context: vscode.ExtensionContext;
  private gistId: string | null = null;
  private accessToken: string | null = null;
  private readonly SYNC_VERSION = 1;
  private readonly GIST_FILENAME = 'codepaw-pet-data.json';
  private readonly GIST_DESCRIPTION = 'CodePaw Pet Data Sync';

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.loadSyncSettings();
  }

  private loadSyncSettings() {
    this.gistId = this.context.globalState.get<string>('codePaw.gistId') || null;
    this.accessToken = this.context.globalState.get<string>('codePaw.accessToken') || null;
  }

  private async saveSyncSettings() {
    await this.context.globalState.update('codePaw.gistId', this.gistId);
    await this.context.globalState.update('codePaw.accessToken', this.accessToken);
  }

  private generateDeviceId(): string {
    let deviceId = this.context.globalState.get<string>('codePaw.deviceId');
    if (!deviceId) {
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      this.context.globalState.update('codePaw.deviceId', deviceId);
    }
    return deviceId;
  }
  public async setupSync(): Promise<boolean> {
    try {
      // Request GitHub Personal Access Token
      const token = await vscode.window.showInputBox({
        prompt: 'Enter your GitHub Personal Access Token',
        password: true,
        placeHolder: 'ghp_xxxxxxxxxx...',
        ignoreFocusOut: true,
        validateInput: (value) => {
          if (!value || value.length < 10) {
            return 'Invalid token. Must be a valid GitHub Personal Access Token.';
          }
          return null;
        }
      });

      if (!token) {
        return false;
      }

      this.accessToken = token;
      await this.saveSyncSettings();      // Check if Gist already exists or create a new one
      const existingGist = await this.findExistingGist();
      if (existingGist) {
        const choice = await vscode.window.showQuickPick([
          { label: 'Use existing data', description: 'Download data from cloud', value: 'download' },
          { label: 'Overwrite cloud data', description: 'Upload local data to cloud', value: 'upload' }
        ], {
          placeHolder: 'Found existing data in cloud. What would you like to do?'
        });

        if (!choice) {
          return false;
        }

        this.gistId = existingGist.id;
        await this.saveSyncSettings();

        if (choice.value === 'download') {
          vscode.window.showInformationMessage('Setup complete! Data will be downloaded on next sync.');
        } else {
          vscode.window.showInformationMessage('Setup complete! Local data will be uploaded to cloud.');
        }
      } else {
        vscode.window.showInformationMessage('Setup complete! A new Gist will be created for your data.');
      }

      return true;
    } catch (error) {
      vscode.window.showErrorMessage(`Error during sync setup: ${error}`);
      return false;
    }
  } private async findExistingGist(): Promise<any | null> {
    if (!this.accessToken) {
      return null;
    }

    try {
      const response = await fetch('https://api.github.com/gists', {
        headers: {
          'Authorization': `token ${this.accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'CodePaw-VSCode-Extension'
        }
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const gists = await response.json() as any[];
      return gists.find((gist: any) =>
        gist.description === this.GIST_DESCRIPTION &&
        gist.files[this.GIST_FILENAME]);
    } catch (error) {
      console.error('Error searching for existing Gist:', error);
      return null;
    }
  }

  public async uploadData(petData: PetData): Promise<boolean> {
    if (!this.accessToken) {
      vscode.window.showErrorMessage('Sync not configured. Use "Setup Sync" command first.');
      return false;
    }

    try {
      const syncData: SyncData = {
        petData,
        syncVersion: this.SYNC_VERSION,
        lastSync: Date.now(),
        deviceId: this.generateDeviceId()
      };

      const gistData = {
        description: this.GIST_DESCRIPTION,
        public: false,
        files: {
          [this.GIST_FILENAME]: {
            content: JSON.stringify(syncData, null, 2)
          }
        }
      };

      let response;
      if (this.gistId) {
        // Aggiorna Gist esistente
        response = await fetch(`https://api.github.com/gists/${this.gistId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `token ${this.accessToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
            'User-Agent': 'CodePaw-VSCode-Extension'
          },
          body: JSON.stringify(gistData)
        });
      } else {
        // Create new Gist
        response = await fetch('https://api.github.com/gists', {
          method: 'POST',
          headers: {
            'Authorization': `token ${this.accessToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
            'User-Agent': 'CodePaw-VSCode-Extension'
          },
          body: JSON.stringify(gistData)
        });
      }

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json() as any;
      if (!this.gistId) {
        this.gistId = result.id;
        await this.saveSyncSettings();
      }

      vscode.window.showInformationMessage('✅ Data successfully synced to cloud!');
      return true;
    } catch (error) {
      vscode.window.showErrorMessage(`Error during upload: ${error}`);
      return false;
    }
  }
  public async downloadData(): Promise<PetData | null> {
    if (!this.accessToken || !this.gistId) {
      vscode.window.showErrorMessage('Sync not configured. Use "Setup Sync" command first.');
      return null;
    }

    try {
      const response = await fetch(`https://api.github.com/gists/${this.gistId}`, {
        headers: {
          'Authorization': `token ${this.accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'CodePaw-VSCode-Extension'
        }
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const gist = await response.json() as any;
      const fileContent = gist.files[this.GIST_FILENAME]?.content; if (!fileContent) {
        throw new Error('Data file not found in Gist');
      }

      const syncData: SyncData = JSON.parse(fileContent);

      // Check version compatibility
      if (syncData.syncVersion > this.SYNC_VERSION) {
        vscode.window.showWarningMessage(
          'Cloud data is newer than this extension version. Please update CodePaw.'
        );
        return null;
      }

      vscode.window.showInformationMessage('✅ Data successfully downloaded from cloud!');
      return syncData.petData;
    } catch (error) {
      vscode.window.showErrorMessage(`Error during download: ${error}`);
      return null;
    }
  }

  public async getSyncStatus(): Promise<{ configured: boolean; lastSync?: Date; deviceId?: string }> {
    const configured = !!(this.accessToken && this.gistId);

    if (!configured) {
      return { configured: false };
    }

    try {
      const response = await fetch(`https://api.github.com/gists/${this.gistId}`, {
        headers: {
          'Authorization': `token ${this.accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'CodePaw-VSCode-Extension'
        }
      }); if (response.ok) {
        const gist = await response.json() as any;
        const fileContent = gist.files[this.GIST_FILENAME]?.content;

        if (fileContent) {
          const syncData: SyncData = JSON.parse(fileContent);
          return {
            configured: true,
            lastSync: new Date(syncData.lastSync),
            deviceId: syncData.deviceId
          };
        }
      }
    } catch (error) {
      console.error('Error retrieving sync status:', error);
    }

    return {
      configured: true,
      deviceId: this.generateDeviceId()
    };
  }

  public async resetSync(): Promise<void> {
    this.gistId = null;
    this.accessToken = null;
    await this.context.globalState.update('codePaw.gistId', undefined);
    await this.context.globalState.update('codePaw.accessToken', undefined);
    vscode.window.showInformationMessage('Sync configuration reset.');
  }
}
