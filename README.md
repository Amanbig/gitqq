# GitQQ

A powerful CLI tool to manage multiple GitHub accounts with SSH keys and intelligent branch management.

## 🚀 Features

- **Switch between GitHub accounts** instantly
- **Smart branch management** with local & remote GitHub integration
- **Intelligent push detection** - automatically detects conflicts
- **First-time repository setup** - guides you through initial branch selection
- **Advanced branch operations** - create, delete, switch branches locally and remotely
- **Generate SSH keys** or use existing ones
- **User-specific configuration** - your accounts stay private
- **Detailed repository status** - see staged, unstaged, and untracked files

## 📦 Installation

```bash
npm install -g gitqq
```

Or run directly:
```bash
npx gitqq
```

## 🎯 Usage

Just run:
```bash
gitqq
```

You'll see:
```
🚀 GitQQ - GitHub Account Manager

? Choose account or manage accounts:
>    YourAccount1
     YourAccount2
  ──────────────
  ➕ Add Account
  🗑️  Remove Account
  ──────────────
  ❌ Exit
```

## ✨ What's New in v1.5.0

### 🧠 Intelligent Push Detection
- **Automatic conflict detection** - knows when remote has changes you don't have
- **Smart recommendations** - suggests the best push strategy
- **Branch comparison** - shows if you're ahead, behind, or diverged
- **Safe push options** - prevents accidental overwrites

### 🌿 Advanced Branch Management
- **First-time setup** - asks which branch to use when first entering a repo
- **Create branches locally & remotely** - one command creates on both GitHub and local
- **Delete branches safely** - removes from both local and remote GitHub
- **Branch status tracking** - remembers your preferred branch per repository

### 📊 Enhanced Status Display
Shows detailed information before every operation:
```
📊 Repository Status:
✅ Staged files (2): file1.js, file2.py
⚠️ Unstaged changes (1): config.json  
📄 Untracked files (3): temp.txt, notes.md...
```

## 🎯 Account Management

### Switching Accounts
1. **Choose Account**: Click any account → switches automatically
2. **Git operations**: All git commands use the selected account
3. **SSH authentication**: Automatically configured for GitHub

### Adding Accounts
When you click "➕ Add Account", you get three options:

#### 🆕 Generate New SSH Key
- Creates a new ED25519 SSH key automatically
- Shows public key to add to GitHub
- Guides you through the process

#### 📝 Paste SSH Key Content
- Paste your existing private SSH key
- Automatically saves and configures it

#### 📁 Use Existing SSH Key File
- Reference an existing SSH key file
- Perfect if you already have keys set up

## 🌿 Branch Management

### First-Time Repository Setup
When you first use GitQQ in a new repository:
```
🎯 First time using this tool in this repository!
📋 Please select which branch you'd like to work with:
? Select initial branch to work with:
> 🌿 main
  🌿 develop (remote)
  🌿 feature/new-auth
  ──────────────
  🆕 Create New Branch
  ──────────────
  🔙 Back to Homepage
  ❌ Exit
```

### Branch Operations Menu
```
? Select or create branch:
> 🌿 main (current)
  🌿 develop  
  🌿 feature/auth
  ──────────────
  🆕 Create New Branch
  🌿 Advanced Branch Creation
  🗑️  Delete Branch
  ──────────────
  🔙 Back to Homepage
  ❌ Exit
```

### Advanced Branch Creation
- **Choose base branch** - create from current, any local, or remote branch
- **Remote options** - create locally only, push to remote, or set upstream
- **Flexible workflow** - supports any branching strategy

### Smart Branch Deletion
- **Local detection** - only shows deletable branches (not current)
- **Remote checking** - detects if branch exists on GitHub
- **User choice** - delete local only or both local and remote
- **Safe operation** - confirms before deleting remote branches

## 🚀 Intelligent Push Operations

### Automatic Conflict Detection
GitQQ automatically detects your repository status:

#### When You're Ahead (Normal Case):
```
📤 Local is 2 commits ahead
✅ Your local branch is ahead - normal push should work
? Push to origin/main:
> 🚀 Normal Push (Recommended)
  💥 Force Push (with lease)
  ⚡ Force Push (override)
```

#### When Remote Has New Changes:
```
📥 Remote is 3 commits ahead
💡 Recommendation: Pull first or force push to override
? 📥 Remote is ahead - Choose action:
> 📥 Pull and then push
  💥 Force Push (with lease)
  ⚡ Force Push (override)
  ❌ Cancel
```

#### When Branches Have Diverged:
```
⚠️ Branches have diverged: 2 local, 1 remote commits
💡 Recommendation: Use force push or pull/merge first
? ⚠️ Conflicting changes detected - Choose push method:
> 🔄 Fetch and Force Push (Recommended)
  💥 Force Push (with lease)
  ⚡ Force Push (override)
  🚀 Try Normal Push (may fail)
  ❌ Cancel and handle manually
```

### Smart Push Options
- **🚀 Normal Push** - Standard git push
- **💥 Force Push (with lease)** - Safe force push that checks for remote changes
- **⚡ Force Push (override)** - Overrides all remote changes (use carefully!)
- **🔄 Fetch and Force Push** - Updates local tracking info, then force pushes
- **📥 Pull and then push** - Merges remote changes first, then pushes

## 💻 Git Operations

After selecting an account, choose from:
- **🚀 Push** - Intelligent push with conflict detection
- **📝 Commit** - Stage and commit changes
- **🌿 Change Branch** - Advanced branch management
- **💻 Custom Command** - Run any git command

## 🔒 Security & Privacy

- **Your accounts are private** - stored only in your home directory
- Configuration saved in `~/.gitqq-config.json` on your machine
- SSH keys stored in your `~/.ssh/` directory
- **No data sent anywhere** - everything stays local

## 🛠️ How It Works

1. **Account Storage**: Each user's accounts are stored in their home directory
2. **SSH Key Management**: Automatically configures SSH keys for GitHub authentication  
3. **Git Configuration**: Switches git user.name and user.email automatically
4. **Branch Tracking**: Remembers preferred branches per repository
5. **Remote Detection**: Fetches and compares local vs remote status
6. **Local Only**: Everything runs locally, no external services

## 📁 File Structure

```
~/.gitqq-config.json     # Your accounts and repository settings
~/.ssh/id_username       # SSH keys for each account
~/.ssh/config           # SSH configuration (auto-managed)
```

## 🎮 Example Workflow

1. **First time in repo**: Select initial branch to work with
2. **Make changes**: Edit your code
3. **Commit**: GitQQ detects changes and helps you commit
4. **Push**: Automatically detects conflicts and suggests best strategy
5. **Branch management**: Create, switch, delete branches locally and remotely

## 🤝 Contributing

1. Fork the repository: [https://github.com/Amanbig/gitqq](https://github.com/Amanbig/gitqq)
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 🐛 Issues & Support

- **Issues**: [GitHub Issues](https://github.com/Amanbig/gitqq/issues)
- **Repository**: [https://github.com/Amanbig/gitqq](https://github.com/Amanbig/gitqq)

## 📄 License

ISC License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Amanbig**
- Email: amanpreetsinghjhiwant@outlook.com
- GitHub: [@Amanbig](https://github.com/Amanbig)

---

**Made with ❤️ for developers managing multiple GitHub accounts**

### 🏆 Why GitQQ?

- **Saves time** - No more manual git config switching
- **Prevents errors** - Smart conflict detection prevents failed pushes
- **Professional workflow** - Advanced branch management for serious developers
- **Safe operations** - Intelligent recommendations prevent data loss
- **Local privacy** - Everything stays on your machine

**Ready to streamline your multi-account GitHub workflow? Install GitQQ today!** 🚀