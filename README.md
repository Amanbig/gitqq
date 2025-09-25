# GitQQ

A simple and powerful CLI tool to manage multiple GitHub accounts with SSH keys seamlessly.

## 🚀 Features

- **Switch between GitHub accounts** instantly
- **Add/Remove accounts** easily  
- **Generate new SSH keys** or use existing ones
- **Run any git command** with the correct account automatically
- **User-specific configuration** - your accounts stay private

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

### How to Use:

1. **Choose Account**: Click any account → switches automatically
2. **Add Account**: Enter username, email, SSH key
3. **Enter Git Command**: Type any git command after selecting account

## ⚙️ Adding Accounts

When you click "➕ Add Account", you get three options:

### 🆕 Generate New SSH Key
- Creates a new ED25519 SSH key automatically
- Shows public key to add to GitHub
- Guides you through the process

### 📝 Paste SSH Key Content
- Paste your existing private SSH key
- Automatically saves and configures it

### 📁 Use Existing SSH Key File
- Reference an existing SSH key file
- Perfect if you already have keys set up

## 💻 Git Commands

After selecting an account, you can run any git command:
- `status`
- `push origin main`
- `commit -m "my changes"`
- `pull`
- `branch -a`
- `log --oneline`
- Any git command you want!

## 🔒 Security & Privacy

- **Your accounts are private** - stored only in your home directory
- Configuration saved in `~/.gitqq-config.json` on your machine
- SSH keys stored in your `~/.ssh/` directory
- **No data sent anywhere** - everything stays local

## 🛠️ How It Works

1. **Account Storage**: Each user's accounts are stored in their home directory
2. **SSH Key Management**: Automatically configures SSH keys for GitHub authentication  
3. **Git Configuration**: Switches git user.name and user.email automatically
4. **Local Only**: Everything runs locally, no external services

## 📁 File Structure

```
~/.gitqq-config.json     # Your accounts configuration
~/.ssh/id_username       # SSH keys for each account
~/.ssh/config           # SSH configuration (auto-managed)
```

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