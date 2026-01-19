# Dell Laptop Setup Guide

## ✅ Git Status - Everything Backed Up

**Current Status:**
- ✅ All changes committed
- ✅ Working tree clean
- ✅ Branch `feature/azure-dual-deployment` pushed to GitHub
- ✅ Remote repository: `https://github.com/Liberatex/The-Mon-Valley-Pollution-Tracking-System.git`

**Recent Commits:**
- `75392df` - Add comprehensive application report: costs, dependencies, architecture, and code analysis
- `9f70117` - Add Firestore access test, enhanced cache logging, and comprehensive cache system documentation
- `471a416` - Add more detailed logging before cache write to diagnose issue
- `2ba43c7` - Add Firestore cache verification guide
- `671c613` - Add detailed cache write logging and verification

## 🔑 SSH Key Generated

**SSH Public Key (for GitHub):**
```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIL9LfvJPgXEzvfgJPAv+CORw+h1zgOVYIPQ9ySpdxeqI mon-valley-pollution-tracker
```

**Key Location:**
- Private key: `~/.ssh/id_ed25519_mon_valley`
- Public key: `~/.ssh/id_ed25519_mon_valley.pub`

## 📋 Steps to Set Up on Dell Laptop

### Step 1: Add SSH Key to GitHub

1. Copy the SSH public key above (the entire line starting with `ssh-ed25519`)
2. Go to GitHub: https://github.com/settings/keys
3. Click "New SSH key"
4. Give it a title: "Dell Laptop - Mon Valley Project"
5. Paste the public key
6. Click "Add SSH key"

### Step 2: Generate SSH Key on Dell Laptop (if needed)

If you prefer to use a different SSH key on your Dell laptop:

```bash
# Generate a new SSH key
ssh-keygen -t ed25519 -C "your-email@example.com" -f ~/.ssh/id_ed25519_dell_laptop

# Display the public key
cat ~/.ssh/id_ed25519_dell_laptop.pub

# Add to SSH agent
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519_dell_laptop
```

Then add this new key to GitHub following Step 1 above.

**Note:** You can store SSH keys for multiple projects in the same `~/.ssh/` folder. SSH supports multiple keys - just make sure each public key is added to GitHub.

#### Important: Config File vs Key Files

**SSH Config File:**
- **MUST** be named exactly `config` (no extension, no other name)
- Location: `~/.ssh/config` (or `C:\Users\YourName\.ssh\config` on Windows)
- This is a special file that SSH automatically reads
- Contains configuration directives (Host, HostName, IdentityFile, etc.)

**SSH Key Files:**
- **CAN** be named anything you want
- Examples: `mon-valley-pollution-tracker_ssh_key`, `id_ed25519_mon_valley`, `my_key`, etc.
- Usually come in pairs: `filename` (private key) and `filename.pub` (public key)
- Location: `~/.ssh/` folder

**Example:**
```
~/.ssh/
  ├── config                                    ← MUST be named "config"
  ├── mon-valley-pollution-tracker_ssh_key      ← Can be named anything
  ├── mon-valley-pollution-tracker_ssh_key.pub  ← Can be named anything
  ├── id_ed25519_other_project                 ← Can be named anything
  └── id_ed25519_other_project.pub              ← Can be named anything
```

#### Optional: Using SSH Config for Multiple Projects

If you want to use different SSH keys for different GitHub projects, create/edit `~/.ssh/config`:

```bash
# Edit SSH config
nano ~/.ssh/config
# or
code ~/.ssh/config
```

Add entries like this:

```
# Other project
Host github.com-other-project
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_ed25519_other_project

# Mon Valley Project
Host github.com-mon-valley
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_ed25519_mon_valley
```

Then clone using the specific host:
```bash
git clone git@github.com-mon-valley:Liberatex/The-Mon-Valley-Pollution-Tracking-System.git
```

**OR** (simpler) - just use the same key for all projects or let SSH automatically try all keys. Most people just add all their keys to the SSH agent and it works automatically.

### Step 3: Fix SSH Config (If You Get Errors)

**If you get an error like "Bad configuration option: eval" or "Bad configuration option: ssh-add":**

Your `~/.ssh/config` file has shell commands in it. SSH config files should only contain SSH configuration directives, not shell commands.

**QUICKEST FIX - On Windows (PowerShell):**

**Option A: Delete the bad config file (if you don't need it):**
```powershell
# Backup and remove the bad config
Copy-Item $env:USERPROFILE\.ssh\config $env:USERPROFILE\.ssh\config.backup
Remove-Item $env:USERPROFILE\.ssh\config

# Now try cloning - SSH will work without a config file
git clone git@github.com:Liberatex/The-Mon-Valley-Pollution-Tracking-System.git
```

**Option B: Create a clean config file from scratch:**
```powershell
# 1. Backup the bad config
Copy-Item $env:USERPROFILE\.ssh\config $env:USERPROFILE\.ssh\config.backup

# 2. Delete the bad config
Remove-Item $env:USERPROFILE\.ssh\config

# 3. Create a new clean config file (replace 'mon-valley-pollution-tracker_ssh_key' with your actual key name)
@"
Host github.com
    HostName github.com
    User git
    IdentityFile ~/.ssh/mon-valley-pollution-tracker_ssh_key
"@ | Out-File -FilePath $env:USERPROFILE\.ssh\config -Encoding utf8

# 4. Now try cloning
git clone git@github.com:Liberatex/The-Mon-Valley-Pollution-Tracking-System.git
```

**Option C: Manually edit the config file:**
```powershell
# Open the config file
notepad $env:USERPROFILE\.ssh\config
```

Then:
1. **Delete ALL lines** that contain:
   - `eval ...`
   - `ssh-add ...`
   - Any other shell commands

2. **Replace with** (replace `mon-valley-pollution-tracker_ssh_key` with your actual key filename):
   ```
   Host github.com
       HostName github.com
       User git
       IdentityFile ~/.ssh/mon-valley-pollution-tracker_ssh_key
   ```

3. Save and close

**After fixing, make sure your SSH key is added to the SSH agent:**
```powershell
# Start SSH agent (if not running)
Start-Service ssh-agent

# Add your key (replace with your actual key name)
ssh-add $env:USERPROFILE\.ssh\mon-valley-pollution-tracker_ssh_key
```

### Step 4: Clone the Repository

On your Dell laptop, run:

```bash
# Clone using SSH (recommended)
git clone git@github.com:Liberatex/The-Mon-Valley-Pollution-Tracking-System.git

# Or clone using HTTPS (if SSH isn't set up yet)
git clone https://github.com/Liberatex/The-Mon-Valley-Pollution-Tracking-System.git

# Navigate into the project
cd The-Mon-Valley-Pollution-Tracking-System

# Checkout the current working branch
git checkout feature/azure-dual-deployment

# Verify you're on the right branch
git branch
```

### Step 5: Set Up Environment Files

The project requires environment files. Check these files for setup instructions:
- `SETUP_ENV_FILES.md`
- `API_KEYS_SETUP_GUIDE.md`
- `QUICK_API_SETUP.md`

### Step 6: Install Dependencies

```bash
# Install root dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..

# Install backend/functions dependencies
cd functions
npm install
cd ..
```

### Step 7: Verify Setup

```bash
# Check git status
git status

# Verify remote is set correctly
git remote -v

# Should show:
# origin  git@github.com:Liberatex/The-Mon-Valley-Pollution-Tracking-System.git (fetch)
# origin  git@github.com:Liberatex/The-Mon-Valley-Pollution-Tracking-System.git (push)
```

## 🔄 Switching Between Machines

When working on different machines:

1. **Before switching machines:**
   ```bash
   git add .
   git commit -m "Your commit message"
   git push
   ```

2. **On the other machine:**
   ```bash
   git pull
   ```

3. **Always check your branch:**
   ```bash
   git branch
   git status
   ```

## 📝 Current Branch Information

**Active Branch:** `feature/azure-dual-deployment`

**Available Branches:**
- `main` - Main production branch
- `feature/azure-dual-deployment` - Current working branch
- `feature/mobile-map-optimization` - Mobile optimization branch

## 🚨 Important Notes

1. **Always pull before starting work:**
   ```bash
   git pull origin feature/azure-dual-deployment
   ```

2. **Commit frequently:**
   ```bash
   git add .
   git commit -m "Descriptive commit message"
   git push
   ```

3. **Check for uncommitted changes before switching:**
   ```bash
   git status
   ```

4. **If you have uncommitted changes when switching:**
   - Option 1: Commit and push them
   - Option 2: Stash them: `git stash` (then `git stash pop` on the other machine)

## 🔗 Useful Resources

- GitHub Repository: https://github.com/Liberatex/The-Mon-Valley-Pollution-Tracking-System
- GitHub SSH Keys: https://github.com/settings/keys
- Git Documentation: https://git-scm.com/doc

## ✅ Verification Checklist

Before starting work on Dell laptop:
- [ ] SSH key added to GitHub
- [ ] Repository cloned successfully
- [ ] On correct branch (`feature/azure-dual-deployment`)
- [ ] Environment files set up
- [ ] Dependencies installed
- [ ] `git pull` executed to get latest changes
- [ ] Can push/pull without errors

