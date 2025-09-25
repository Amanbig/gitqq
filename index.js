#!/usr/bin/env node

const inquirer = require("inquirer");
const chalk = require("chalk");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { execSync, exec } = require("child_process");

const CONFIG_FILE = path.join(os.homedir(), ".gitqq-config.json");

// Configuration Management
class ConfigManager {
  constructor() {
    this.configFile = CONFIG_FILE;
    this.config = this.loadConfig();
  }

  loadConfig() {
    try {
      if (fs.existsSync(this.configFile)) {
        return JSON.parse(fs.readFileSync(this.configFile, "utf8"));
      }
    } catch (error) {
      console.log(chalk.yellow("⚠️ Config file corrupted, creating new one"));
    }

    return { accounts: {}, currentAccount: null };
  }

  saveConfig() {
    try {
      fs.writeFileSync(this.configFile, JSON.stringify(this.config, null, 2));
    } catch (error) {
      console.log(chalk.red(`❌ Failed to save config: ${error.message}`));
    }
  }

  addAccount(username, data) {
    this.config.accounts[username] = data;
    this.saveConfig();
  }

  removeAccount(username) {
    delete this.config.accounts[username];
    if (this.config.currentAccount === username) {
      this.config.currentAccount = null;
    }
    this.saveConfig();
  }

  setCurrentAccount(username) {
    this.config.currentAccount = username;
    this.saveConfig();
  }

  getCurrentAccount() {
    if (!this.config.currentAccount) return null;

    if (this.config.accounts[this.config.currentAccount]) {
      return {
        username: this.config.currentAccount,
        ...this.config.accounts[this.config.currentAccount],
      };
    }

    return null;
  }

  getAccounts() {
    return this.config.accounts || {};
  }
}

// SSH Key Management
class SSHManager {
  static validateSSHKey(keyName) {
    const keyPath = this.getSSHKeyPath(keyName);
    return fs.existsSync(keyPath);
  }

  static getSSHKeyPath(keyName) {
    return path.join(os.homedir(), ".ssh", keyName);
  }
}

// Git Operations
class GitManager {
  static async switchAccount(account) {
    try {
      execSync(
        `git config --global user.name "${account.name || account.username}"`,
      );
      execSync(`git config --global user.email "${account.email}"`);

      if (account.sshKey) {
        const sshConfigPath = path.join(os.homedir(), ".ssh", "config");
        let sshConfig = "";

        if (fs.existsSync(sshConfigPath)) {
          sshConfig = fs.readFileSync(sshConfigPath, "utf8");
        }

        // Remove existing github.com config
        sshConfig = sshConfig.replace(
          /Host github\.com[\s\S]*?(?=Host|\Z)/g,
          "",
        );

        // Add new config
        const newConfig = `
Host github.com
  HostName github.com
  User git
  IdentityFile ${SSHManager.getSSHKeyPath(account.sshKey)}
  IdentitiesOnly yes

`;

        sshConfig = newConfig + sshConfig;
        fs.writeFileSync(sshConfigPath, sshConfig);

        try {
          execSync(`ssh-add "${SSHManager.getSSHKeyPath(account.sshKey)}"`, {
            stdio: "ignore",
          });
        } catch (error) {
          // SSH agent might not be running
        }
      }

      console.log(chalk.green(`✅ Switched to account: ${account.username}`));
      return true;
    } catch (error) {
      console.log(chalk.red(`❌ Failed to switch account: ${error.message}`));
      return false;
    }
  }

  static async executeGitCommand(command, account) {
    return new Promise((resolve, reject) => {
      const env = { ...process.env };
      if (account && account.sshKey) {
        env.GIT_SSH_COMMAND = `ssh -i "${SSHManager.getSSHKeyPath(account.sshKey)}" -o IdentitiesOnly=yes`;
      }

      exec(command, { env }, (error, stdout, stderr) => {
        if (error) {
          reject(error);
        } else {
          resolve({ stdout, stderr });
        }
      });
    });
  }
}

// Main CLI
class CLI {
  constructor() {
    this.config = new ConfigManager();
  }

  async start() {
    console.clear();
    console.log(chalk.blue.bold("\n🚀 GitQQ - GitHub Account Manager\n"));

    while (true) {
      await this.showMainMenu();
    }
  }

  async showMainMenu() {
    const accounts = this.config.getAccounts();
    const accountNames = Object.keys(accounts);
    let choices = [];
    if (accountNames.length > 0) {
      accountNames.forEach((username) => {
        choices.push({
          name: `   ${username}`,
          value: `select-${username}`,
        });
      });
      choices.push(new inquirer.Separator());
    }

    // Account management only
    choices.push(
      { name: "➕ Add Account", value: "add-account" },
      { name: "🗑️  Remove Account", value: "remove-account" },
      new inquirer.Separator(),
      { name: "❌ Exit", value: "exit" },
    );

    const { action } = await inquirer.prompt([
      {
        type: "list",
        name: "action",
        message: "Choose account or manage accounts:",
        choices,
        pageSize: 10,
      },
    ]);

    await this.handleAction(action);
  }

  async handleAction(action) {
    if (action === "exit") {
      console.log(chalk.blue("👋 Goodbye!"));
      process.exit(0);
    }

    // Handle account selection
    if (action.startsWith("select-")) {
      const username = action.replace("select-", "");
      const accounts = this.config.getAccounts();
      const account = { username, ...accounts[username] };

      this.config.setCurrentAccount(username);
      await GitManager.switchAccount(account);

      // After selecting account, show git command input
      console.log("");
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await this.showGitCommandMenu();
      return;
    }

    switch (action) {
      case "add-account":
        await this.addAccount();
        break;

      case "remove-account":
        await this.removeAccount();
        break;
    }

    console.log("");
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  async showGitCommandMenu() {
    const currentAccount = this.config.getCurrentAccount();

    while (true) {
      // Check repository status first
      const repoStatus = await this.checkRepositoryStatus(currentAccount);

      if (!repoStatus.isGitRepo) {
        const { shouldInit } = await inquirer.prompt([
          {
            type: "list",
            name: "shouldInit",
            message: "No git repository found. Initialize git in this folder?",
            choices: [
              { name: "✅ Yes, initialize git", value: true },
              { name: "❌ No, go back", value: false },
            ],
          },
        ]);

        if (shouldInit) {
          await this.initializeRepository(currentAccount);
          await this.setupRemoteOrigin(currentAccount);
        } else {
          return;
        }
      }

      if (repoStatus.isGitRepo && !repoStatus.hasRemote) {
        console.log(chalk.yellow("⚠️ No remote origin found."));
        await this.setupRemoteOrigin(currentAccount);
      }

      if (repoStatus.hasHttpsRemote) {
        console.log(
          chalk.yellow(
            "⚠️ HTTPS remote detected. For multiple accounts, SSH is recommended.",
          ),
        );
        const { shouldConvert } = await inquirer.prompt([
          {
            type: "list",
            name: "shouldConvert",
            message: "Convert to SSH remote?",
            choices: [
              { name: "✅ Yes, convert to SSH", value: true },
              { name: "❌ No, keep HTTPS", value: false },
            ],
          },
        ]);

        if (shouldConvert) {
          await this.convertToSSHRemote(currentAccount);
        }
      }

      const currentBranch = await this.getCurrentBranch(currentAccount);
      const defaultBranch = this.getDefaultBranch();

      console.log(
        chalk.blue(`🌿 Current branch: ${currentBranch || defaultBranch}`),
      );

      const { action } = await inquirer.prompt([
        {
          type: "list",
          name: "action",
          message: `Using: ${currentAccount.username} - What would you like to do?`,
          choices: [
            { name: "🚀 Push", value: "push" },
            { name: "📝 Commit", value: "commit" },
            { name: "🌿 Change Branch", value: "change-branch" },
            { name: "💻 Custom Command", value: "custom-command" },
            { name: "🔙 Back to Accounts", value: "back" },
            { name: "❌ Exit", value: "exit" },
          ],
        },
      ]);

      if (action === "exit") {
        console.log(chalk.blue("👋 Goodbye!"));
        process.exit(0);
      }

      if (action === "back") {
        return;
      }

      switch (action) {
        case "push":
          await this.handlePush(currentAccount);
          break;
        case "commit":
          await this.handleCommit(currentAccount);
          break;
        case "change-branch":
          await this.handleChangeBranch(currentAccount);
          break;
        case "custom-command":
          await this.executeCustomCommand(currentAccount);
          break;
      }

      console.log("");
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  async addAccount() {
    const accountInfo = await inquirer.prompt([
      {
        type: "input",
        name: "username",
        message: "GitHub username:",
        validate: (input) => input.trim().length > 0 || "Username is required",
      },
      {
        type: "input",
        name: "email",
        message: "GitHub email:",
        validate: (input) => input.includes("@") || "Valid email is required",
      },
      {
        type: "input",
        name: "name",
        message: "Full name (optional):",
        default: (answers) => answers.username,
      },
      {
        type: "list",
        name: "keyMethod",
        message: "How would you like to add SSH key?",
        choices: [
          { name: "🆕 Generate new SSH key", value: "generate" },
          { name: "📝 Enter SSH key content directly", value: "paste" },
          { name: "📁 Use existing SSH key file", value: "file" },
        ],
      },
    ]);

    let sshKeyName;
    let customKey = false;

    if (accountInfo.keyMethod === "generate") {
      // Generate new SSH key
      sshKeyName = `id_${accountInfo.username}`;
      const keyPath = SSHManager.getSSHKeyPath(sshKeyName);

      try {
        console.log(chalk.blue("🔑 Generating new SSH key..."));
        execSync(
          `ssh-keygen -t ed25519 -f "${keyPath}" -C "${accountInfo.email}" -N ""`,
          { stdio: "pipe" },
        );

        customKey = true;
        console.log(chalk.green(`✅ SSH key generated: ${keyPath}`));

        // Show public key for user to add to GitHub
        const publicKey = fs.readFileSync(`${keyPath}.pub`, "utf8");
        console.log(
          chalk.yellow("\n🔑 Add this public key to your GitHub account:"),
        );
        console.log(chalk.cyan("https://github.com/settings/ssh/new"));
        console.log(chalk.white(publicKey));

        const { keyAdded } = await inquirer.prompt([
          {
            type: "confirm",
            name: "keyAdded",
            message: "Have you added the public key to GitHub?",
            default: false,
          },
        ]);

        if (!keyAdded) {
          console.log(
            chalk.yellow("⚠️ Please add the key to GitHub and try again."),
          );
          return;
        }
      } catch (error) {
        console.log(
          chalk.red(`❌ Failed to generate SSH key: ${error.message}`),
        );
        return;
      }
    } else if (accountInfo.keyMethod === "paste") {
      const { sshKeyContent } = await inquirer.prompt([
        {
          type: "input",
          name: "sshKeyContent",
          message: "Paste your SSH private key content:",
          validate: (input) =>
            input.trim().length > 0 && input.includes("BEGIN")
              ? true
              : "Please enter valid SSH key content",
        },
      ]);

      // Create custom key file
      sshKeyName = `id_${accountInfo.username}`;
      const keyPath = SSHManager.getSSHKeyPath(sshKeyName);

      try {
        fs.writeFileSync(keyPath, sshKeyContent.trim());
        execSync(`chmod 600 "${keyPath}"`, { stdio: "ignore" });
        customKey = true;
        console.log(chalk.green(`✅ SSH key saved to: ${keyPath}`));
      } catch (error) {
        console.log(chalk.red(`❌ Failed to save SSH key: ${error.message}`));
        return;
      }
    } else {
      const { existingKeyName } = await inquirer.prompt([
        {
          type: "input",
          name: "existingKeyName",
          message: "SSH key name (without .pub):",
          default: "id_rsa",
          validate: (input) =>
            input.trim().length > 0 || "SSH key name is required",
        },
      ]);

      sshKeyName = existingKeyName;

      // Validate SSH key exists
      const sshKeyPath = SSHManager.getSSHKeyPath(sshKeyName);
      if (!SSHManager.validateSSHKey(sshKeyName)) {
        console.log(chalk.red(`❌ SSH key not found: ${sshKeyPath}`));
        console.log(
          chalk.cyan(
            `💡 Generate key with: ssh-keygen -t ed25519 -f ~/.ssh/${sshKeyName} -C "${accountInfo.email}"`,
          ),
        );
        return;
      }
    }

    this.config.addAccount(accountInfo.username, {
      name: accountInfo.name,
      email: accountInfo.email,
      sshKey: sshKeyName,
      customKey: customKey,
    });

    this.config.setCurrentAccount(accountInfo.username);
    await GitManager.switchAccount({
      username: accountInfo.username,
      name: accountInfo.name,
      email: accountInfo.email,
      sshKey: sshKeyName,
    });

    console.log(
      chalk.green(`✅ Added and activated account: ${accountInfo.username}`),
    );
  }

  async removeAccount() {
    const accounts = this.config.getAccounts();
    const accountNames = Object.keys(accounts);

    if (accountNames.length === 0) {
      console.log(chalk.yellow("📝 No accounts to remove."));
      return;
    }

    const { accountToRemove } = await inquirer.prompt([
      {
        type: "list",
        name: "accountToRemove",
        message: "Select account to remove:",
        choices: accountNames,
      },
    ]);

    const { confirmRemove } = await inquirer.prompt([
      {
        type: "confirm",
        name: "confirmRemove",
        message: `Are you sure you want to remove account "${accountToRemove}"?`,
        default: false,
      },
    ]);

    if (confirmRemove) {
      this.config.removeAccount(accountToRemove);
      console.log(chalk.green(`✅ Removed account: ${accountToRemove}`));
    }
  }

  async getCurrentBranch(account) {
    try {
      const result = await GitManager.executeGitCommand(
        "git branch --show-current",
        account,
      );
      return result.stdout.trim();
    } catch {
      return null;
    }
  }

  getDefaultBranch() {
    return this.config.config.defaultBranch || "main";
  }

  setDefaultBranch(branch) {
    this.config.config.defaultBranch = branch;
    this.config.saveConfig();
  }

  async ensureBranchExists(account, branchName) {
    try {
      const result = await GitManager.executeGitCommand(
        "git branch --list",
        account,
      );
      const branches = result.stdout
        .split("\n")
        .map((b) => b.replace(/^\*?\s+/, "").trim())
        .filter(Boolean);

      if (!branches.includes(branchName)) {
        console.log(chalk.blue(`🔄 Creating branch: ${branchName}`));
        await GitManager.executeGitCommand(
          `git checkout -b ${branchName}`,
          account,
        );
      } else {
        await GitManager.executeGitCommand(
          `git checkout ${branchName}`,
          account,
        );
      }
    } catch (error) {
      console.log(chalk.yellow(`⚠️ Creating new branch: ${branchName}`));
      try {
        await GitManager.executeGitCommand(
          `git checkout -b ${branchName}`,
          account,
        );
      } catch (createError) {
        console.log(
          chalk.red(`❌ Failed to create branch: ${createError.message}`),
        );
      }
    }
  }

  async handlePush(account) {
    // Check if there are uncommitted changes
    const hasUncommitted = await this.hasUncommittedChanges(account);

    if (hasUncommitted) {
      console.log(chalk.yellow("⚠️ You have uncommitted changes."));
      const { shouldCommit } = await inquirer.prompt([
        {
          type: "list",
          name: "shouldCommit",
          message: "Commit changes before pushing?",
          choices: [
            { name: "✅ Yes, commit first", value: true },
            { name: "❌ No, push without committing", value: false },
          ],
        },
      ]);

      if (shouldCommit) {
        const { commitMessage, addAll } = await inquirer.prompt([
          {
            type: "list",
            name: "addAll",
            message: "Stage all modified files?",
            choices: [
              { name: "✅ Yes, stage all files", value: true },
              { name: "❌ No, only commit staged files", value: false },
            ],
          },
          {
            type: "input",
            name: "commitMessage",
            message: "Commit message:",
            validate: (input) =>
              input.trim().length > 0 || "Message is required",
          },
        ]);

        try {
          if (addAll) {
            await GitManager.executeGitCommand("git add .", account);
          }
          await GitManager.executeGitCommand(
            `git commit -m "${commitMessage}"`,
            account,
          );
          console.log(chalk.green("✅ Changes committed"));
        } catch (error) {
          console.log(chalk.red(`❌ Commit failed: ${error.message}`));
          return;
        }
      }
    }

    const currentBranch =
      (await this.getCurrentBranch(account)) || this.getDefaultBranch();

    await this.ensureBranchExists(account, currentBranch);

    const { pushType } = await inquirer.prompt([
      {
        type: "list",
        name: "pushType",
        message: `Push to origin/${currentBranch}:`,
        choices: [
          { name: "🚀 Normal Push", value: "normal" },
          { name: "💥 Force Push", value: "force" },
        ],
      },
    ]);

    try {
      let command;
      if (pushType === "force") {
        command = `git push --force-with-lease origin ${currentBranch}`;
        console.log(
          chalk.yellow(`🔄 Force pushing to origin/${currentBranch}`),
        );
      } else {
        command = `git push origin ${currentBranch}`;
        console.log(chalk.blue(`🔄 Pushing to origin/${currentBranch}`));
      }

      const result = await GitManager.executeGitCommand(command, account);
      if (result.stdout) console.log(result.stdout);
      if (result.stderr) console.log(chalk.yellow(result.stderr));
      console.log(chalk.green("✅ Push completed"));

      this.setDefaultBranch(currentBranch);
    } catch (error) {
      if (error.message.includes("no upstream branch")) {
        try {
          console.log(chalk.yellow("⚠️ Setting upstream branch..."));
          const upstreamCommand = `git push --set-upstream origin ${currentBranch}`;
          console.log(chalk.blue(`🔄 Running: ${upstreamCommand}`));

          const result = await GitManager.executeGitCommand(
            upstreamCommand,
            account,
          );
          if (result.stdout) console.log(result.stdout);
          if (result.stderr) console.log(chalk.yellow(result.stderr));
          console.log(chalk.green("✅ Upstream set and pushed successfully"));
        } catch (upstreamError) {
          console.log(
            chalk.red(`❌ Failed to set upstream: ${upstreamError.message}`),
          );
        }
      } else {
        console.log(chalk.red(`❌ Push failed: ${error.message}`));
      }
    }
  }

  async handleCommit(account) {
    const { commitMessage, addAll } = await inquirer.prompt([
      {
        type: "list",
        name: "addAll",
        message: "Stage all modified files?",
        choices: [
          { name: "✅ Yes, stage all files", value: true },
          { name: "❌ No, only commit staged files", value: false },
        ],
      },
      {
        type: "input",
        name: "commitMessage",
        message: "Commit message:",
        validate: (input) => input.trim().length > 0 || "Message is required",
      },
    ]);

    try {
      if (addAll) {
        console.log(chalk.blue("🔄 Staging all files..."));
        await GitManager.executeGitCommand("git add .", account);
      }

      console.log(chalk.blue("🔄 Creating commit..."));
      const result = await GitManager.executeGitCommand(
        `git commit -m "${commitMessage}"`,
        account,
      );
      if (result.stdout) console.log(result.stdout);
      if (result.stderr) console.log(chalk.yellow(result.stderr));
      console.log(chalk.green("✅ Commit created"));

      const { shouldPush } = await inquirer.prompt([
        {
          type: "list",
          name: "shouldPush",
          message: "Push to remote?",
          choices: [
            { name: "✅ Yes, push to remote", value: true },
            { name: "❌ No, just commit locally", value: false },
          ],
        },
      ]);

      if (shouldPush) {
        await this.handlePush(account);
      }
    } catch (error) {
      console.log(chalk.red(`❌ Commit failed: ${error.message}`));
    }
  }

  async handleChangeBranch(account) {
    try {
      const result = await GitManager.executeGitCommand("git branch", account);
      const branches = result.stdout
        .split("\n")
        .map((b) => b.replace(/^\*?\s+/, "").trim())
        .filter(Boolean);

      const choices = [
        ...branches.map((branch) => ({ name: `🌿 ${branch}`, value: branch })),
        new inquirer.Separator(),
        { name: "🆕 Create New Branch", value: "create-new" },
      ];

      const { selectedBranch } = await inquirer.prompt([
        {
          type: "list",
          name: "selectedBranch",
          message: "Select or create branch:",
          choices,
        },
      ]);

      if (selectedBranch === "create-new") {
        const { newBranchName } = await inquirer.prompt([
          {
            type: "input",
            name: "newBranchName",
            message: "New branch name:",
            validate: (input) =>
              input.trim().length > 0 || "Branch name is required",
          },
        ]);

        console.log(
          chalk.blue(`🔄 Creating and switching to branch: ${newBranchName}`),
        );
        await GitManager.executeGitCommand(
          `git checkout -b ${newBranchName}`,
          account,
        );
        this.setDefaultBranch(newBranchName);
      } else {
        console.log(chalk.blue(`🔄 Switching to branch: ${selectedBranch}`));
        await GitManager.executeGitCommand(
          `git checkout ${selectedBranch}`,
          account,
        );
        this.setDefaultBranch(selectedBranch);
      }

      console.log(chalk.green("✅ Branch changed successfully"));
    } catch (error) {
      console.log(chalk.red(`❌ Branch operation failed: ${error.message}`));
    }
  }

  async executeCustomCommand(account) {
    const { command } = await inquirer.prompt([
      {
        type: "input",
        name: "command",
        message: 'Enter custom git command (e.g., "status", "log --oneline"):',
        validate: (input) => input.trim().length > 0 || "Command is required",
      },
    ]);

    const fullCommand = command.startsWith("git ") ? command : `git ${command}`;

    try {
      console.log(chalk.blue(`🔄 Running: ${fullCommand}`));
      const result = await GitManager.executeGitCommand(fullCommand, account);

      if (result.stdout) console.log(result.stdout);
      if (result.stderr) console.log(chalk.yellow(result.stderr));
      console.log(chalk.green("✅ Command completed"));
    } catch (error) {
      console.log(chalk.red(`❌ Command failed: ${error.message}`));
    }
  }

  async checkRepositoryStatus(account) {
    const status = {
      isGitRepo: false,
      hasRemote: false,
      hasHttpsRemote: false,
      remoteUrl: null,
    };

    try {
      await GitManager.executeGitCommand("git status", account);
      status.isGitRepo = true;
    } catch {
      return status;
    }

    try {
      const result = await GitManager.executeGitCommand(
        "git remote get-url origin",
        account,
      );
      status.remoteUrl = result.stdout.trim();
      status.hasRemote = true;
      status.hasHttpsRemote = status.remoteUrl.startsWith("https://");
    } catch {
      // No remote origin
    }

    return status;
  }

  async hasUncommittedChanges(account) {
    try {
      const result = await GitManager.executeGitCommand(
        "git status --porcelain",
        account,
      );
      return result.stdout.trim().length > 0;
    } catch {
      return false;
    }
  }

  async initializeRepository(account) {
    try {
      console.log(chalk.blue("🔄 Initializing git repository..."));
      await GitManager.executeGitCommand("git init", account);
      console.log(chalk.green("✅ Git repository initialized"));

      // Set default branch to main
      try {
        await GitManager.executeGitCommand("git branch -M main", account);
        this.setDefaultBranch("main");
      } catch {
        // Ignore if no commits yet
      }
    } catch (error) {
      console.log(chalk.red(`❌ Failed to initialize: ${error.message}`));
    }
  }

  async setupRemoteOrigin(account) {
    console.log(
      chalk.blue("🔗 Setting up remote origin for multiple account support..."),
    );
    console.log(chalk.cyan("📋 SSH format: git@github.com:username/repo.git"));

    const { remoteUrl } = await inquirer.prompt([
      {
        type: "input",
        name: "remoteUrl",
        message: "Enter SSH URL:",
        validate: (input) => {
          if (!input.trim()) return "URL is required";
          if (!input.startsWith("git@github.com:")) {
            return "Please use SSH format: git@github.com:username/repo.git";
          }
          if (!input.endsWith(".git")) {
            return "URL should end with .git";
          }
          return true;
        },
      },
    ]);

    try {
      console.log(chalk.blue("🔄 Adding remote origin..."));
      await GitManager.executeGitCommand(
        `git remote add origin ${remoteUrl}`,
        account,
      );
      console.log(chalk.green(`✅ Remote origin added: ${remoteUrl}`));
    } catch (error) {
      if (error.message.includes("already exists")) {
        console.log(chalk.blue("🔄 Updating existing remote..."));
        await GitManager.executeGitCommand(
          `git remote set-url origin ${remoteUrl}`,
          account,
        );
        console.log(chalk.green(`✅ Remote origin updated: ${remoteUrl}`));
      } else {
        console.log(chalk.red(`❌ Failed to add remote: ${error.message}`));
      }
    }
  }

  async convertToSSHRemote(account) {
    try {
      const result = await GitManager.executeGitCommand(
        "git remote get-url origin",
        account,
      );
      const httpsUrl = result.stdout.trim();

      // Convert https://github.com/user/repo.git to git@github.com:user/repo.git
      const match = httpsUrl.match(/https:\/\/github\.com\/(.+)\/(.+)\.git/);
      if (match) {
        const sshUrl = `git@github.com:${match[1]}/${match[2]}.git`;

        console.log(chalk.blue("🔄 Converting to SSH remote..."));
        await GitManager.executeGitCommand(
          `git remote set-url origin ${sshUrl}`,
          account,
        );
        console.log(chalk.green(`✅ Converted to SSH: ${sshUrl}`));
      }
    } catch (error) {
      console.log(chalk.red(`❌ Failed to convert remote: ${error.message}`));
    }
  }
}

// Start the CLI
const cli = new CLI();
cli.start().catch((error) => {
  console.error(chalk.red(`❌ Fatal error: ${error.message}`));
  process.exit(1);
});

module.exports = { ConfigManager, SSHManager, GitManager, CLI };
