# Git Branch Strategy for Azure Dual Deployment

## 🌿 **Branch Structure**

```
main (production - Firebase only)
  │
  └── feature/azure-dual-deployment (Azure implementation)
       │
       └── (future) feature/azure-powerbi (Analytics)
       └── (future) feature/azure-hipaa-enhancements (Compliance)
```

---

## 📋 **Current Branches**

### **main** (Production)
- ✅ Stable Firebase deployment
- ✅ All existing features working
- ✅ Production-ready code
- ✅ **DO NOT** add Azure code here until fully tested

### **feature/azure-dual-deployment** (Current)
- 🆕 Azure Functions implementation
- 🆕 Provider abstraction layer
- 🆕 Azure setup scripts
- 🆕 Documentation
- ⚠️ **Testing phase** - Not production ready yet

---

## 🔄 **Workflow**

### **Development Flow**

1. **Work on Azure features** in `feature/azure-dual-deployment`
   ```bash
   git checkout feature/azure-dual-deployment
   # Make changes
   git add .
   git commit -m "Add Azure feature X"
   ```

2. **Test Azure deployment** thoroughly
   - Run `azure-setup.sh`
   - Deploy functions
   - Test with `REACT_APP_PROVIDER=azure`
   - Verify HIPAA compliance features

3. **Merge to main** when ready
   ```bash
   git checkout main
   git merge feature/azure-dual-deployment
   git push origin main
   ```

### **Keeping Branches in Sync**

```bash
# Update feature branch with main changes
git checkout feature/azure-dual-deployment
git merge main

# Or rebase (cleaner history)
git checkout feature/azure-dual-deployment
git rebase main
```

---

## ✅ **When to Merge to Main**

### **Ready to Merge When:**
- ✅ Azure Functions tested and working
- ✅ Provider abstraction tested (Firebase + Azure)
- ✅ HIPAA features verified
- ✅ Documentation complete
- ✅ No breaking changes to Firebase code
- ✅ All tests passing

### **Keep in Feature Branch If:**
- ⚠️ Still testing Azure deployment
- ⚠️ HIPAA BAA not signed yet
- ⚠️ Azure resources not created
- ⚠️ Functions not deployed

---

## 🚀 **Deployment Strategy**

### **Option 1: Gradual Rollout** (Recommended)
1. Keep Azure in feature branch
2. Deploy Firebase to production (main)
3. Test Azure in staging environment
4. Merge when Azure is production-ready

### **Option 2: Parallel Deployment**
1. Merge Azure code to main
2. Deploy both Firebase and Azure
3. Switch via environment variable
4. Monitor both systems

---

## 📝 **Commit Message Guidelines**

### **Azure-Specific Commits**
```
feat(azure): Add Azure Functions implementation
feat(azure): Add provider abstraction layer
feat(azure): Add HIPAA audit logging
docs(azure): Add Azure setup documentation
fix(azure): Fix Cosmos DB connection string
```

### **Firebase Commits** (Still use main)
```
feat(firebase): Add new feature
fix(firebase): Fix bug
docs: Update documentation
```

---

## 🔀 **Branch Naming Convention**

- `feature/azure-*` - Azure-specific features
- `feature/firebase-*` - Firebase-specific features
- `bugfix/azure-*` - Azure bug fixes
- `docs/azure-*` - Azure documentation

---

## 🎯 **Current Status**

### **feature/azure-dual-deployment**
- ✅ Azure Functions code complete
- ✅ Provider abstraction complete
- ✅ Setup scripts ready
- ⏳ Needs testing
- ⏳ Needs Azure resources created
- ⏳ Needs deployment verification

### **Next Steps**
1. Test Azure deployment in feature branch
2. Create Azure resources
3. Deploy and verify
4. Merge to main when ready

---

## 🆘 **Rollback Plan**

If Azure implementation has issues:

```bash
# Stay on main (Firebase only)
git checkout main

# Or remove Azure code from main if already merged
git revert <commit-hash>
```

**Firebase code remains untouched** - always safe to rollback!

---

## 📚 **Best Practices**

1. ✅ **Never break Firebase** - All changes must be backward compatible
2. ✅ **Test thoroughly** - Test both providers before merging
3. ✅ **Document changes** - Update docs with Azure changes
4. ✅ **Small commits** - Commit frequently with clear messages
5. ✅ **Review before merge** - Code review before merging to main

---

**Current Branch**: `feature/azure-dual-deployment`  
**Status**: Development/Testing  
**Ready for Production**: Not yet (needs testing)

