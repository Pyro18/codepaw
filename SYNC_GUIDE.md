# 🔄 CodePaw Sync - Synchronization Guide

CodePaw's synchronization feature allows you to sync your virtual pet data across different devices using your GitHub account.

## 📋 Prerequisites

To use synchronization you need:

1. **GitHub Account** - An active GitHub account
2. **Personal Access Token** - A personal access token with Gist permissions

## 🚀 Initial Setup

### 1. Create a GitHub Personal Access Token

1. Go to [GitHub.com](https://github.com) and sign in to your account
2. Go to **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**
3. Click **"Generate new token (classic)"**
4. Give the token a name (e.g. "CodePaw Sync")
5. Select the **"gist"** scope (to create and modify Gists)
6. Click **"Generate token"**
7. **⚠️ IMPORTANT**: Copy the generated token immediately! You won't be able to see it again.

### 2. Configure Synchronization in VS Code

1. Open the **Command Palette** (`Ctrl+Shift+P` or `Cmd+Shift+P`)
2. Search and select **"CodePaw: Setup Sync with GitHub"**
3. Paste your Personal Access Token when prompted
4. Choose whether to:
   - **Use existing data**: Download data from cloud (if it exists)
   - **Overwrite cloud data**: Upload your local data to cloud

## 🔄 Synchronization Commands

### Main Commands

- **`CodePaw: Setup Sync with GitHub`** - Configure synchronization
- **`CodePaw: Upload Data to Cloud`** - Upload local data to cloud
- **`CodePaw: Download Data from Cloud`** - Download data from cloud
- **`CodePaw: Sync Status`** - Show synchronization status
- **`CodePaw: Reset Sync Configuration`** - Reset configuration

### Quick Access

You can also access sync commands from:

- The **CodePaw panel** in the sidebar (icons in the title bar)
- The **Command Palette** by searching "CodePaw"

## ⚙️ Settings

You can customize synchronization in VS Code settings:

```json
{
  "codePaw.autoSync": false,        // Automatic synchronization
  "codePaw.syncOnStartup": false    // Check sync on startup
}
```

### Auto-Sync

When enabled (`"codePaw.autoSync": true`), data is automatically synced:

- Every 5 levels reached
- When earning important achievements

### Sync on Startup

When enabled (`"codePaw.syncOnStartup": true`), on extension startup:

- Checks if there's newer data in the cloud
- Asks if you want to download it

## 🔒 Security and Privacy

- **Private GitHub Gist**: Your data is saved in a private Gist on GitHub
- **Secure Token**: Your Personal Access Token is saved securely in VS Code local settings
- **No External Servers**: Synchronization happens directly between VS Code and GitHub
- **Full Control**: You can delete the Gist from GitHub at any time

## 📊 What Gets Synchronized

Synchronization includes **all** your pet data:

- **Progress**: Level, XP, total XP earned
- **Statistics**: Files saved, commits, languages, lines of code
- **Achievements**: All unlocked achievements
- **History**: Evolution history, daily streaks
- **Pet State**: Happiness, energy, evolution stage

## 🆘 Troubleshooting

### Invalid Token

- Verify the token is copied correctly
- Make sure the token has "gist" scope
- The token might have expired - create a new one

### Connection Error

- Check internet connection
- GitHub might be temporarily unavailable

### Data Not Synced

- Use "Sync Status" command to check last sync
- Try manual sync with "Upload Data to Cloud"

### Complete Reset

If something goes wrong:

1. Use "Reset Sync Configuration" to clean settings
2. Reconfigure with "Setup Sync with GitHub"
3. If needed, manually delete the Gist from GitHub

## 💡 Tips

- **Regular Backup**: Even with auto-sync disabled, do regular manual syncs
- **Multi-Device**: On each new device, do "Download Data from Cloud" to recover your progress
- **Security**: Never share your Personal Access Token
- **Control**: You can always see your Gists on GitHub.com in your profile's Gist section

---

🎮 **Happy coding with your synced pet!** 🐾

For support or bug reports: [GitHub Issues](https://github.com/Pyro18/codepaw/issues)
