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

### Step 3: Clone the Repository

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

### Step 4: Set Up Environment Files

The project requires environment files. Check these files for setup instructions:
- `SETUP_ENV_FILES.md`
- `API_KEYS_SETUP_GUIDE.md`
- `QUICK_API_SETUP.md`

### Step 5: Install Dependencies

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

### Step 6: Verify Setup

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

