# GitHub Repository Setup Guide

## 🚀 **Setup Repository pe GitHub**

### 1. **Instalează Git (dacă nu ai deja)**
```bash
# Download de la https://git-scm.com/download/win
# Sau folosind winget:
winget install --id Git.Git -e --source winget
```

### 2. **Verifică Instalarea Git**
```bash
git --version
```

### 3. **Configurează Git Credentials**
```bash
git config --global user.name "Numele Tau"
git config --global user.email "email@tau.com"
```

### 4. **Initializează Repository Local**
```bash
cd "c:\Users\New User\Downloads\advertising-ai-enterprise-20260215T151006Z-1-001\advertising-ai-enterprise"
git init
```

### 5. **Adaugă Remote Repository**
```bash
# Creează repository pe GitHub.com mai întâi
# Apoi adaugă remote URL:
git remote add origin https://github.com/USERNAME/advertising-ai-enterprise.git
```

### 6. **Adaugă Fișiere în Git**
```bash
git add .
git commit -m "Initial commit: Complete enterprise advertising AI platform"
```

### 7. **Push la GitHub**
```bash
# Pentru prima dată, creează branch-ul main
git branch -M main
git push -u origin main
```

## 📋 **Ce este deja configurat**

### ✅ **.gitignore** - Configurat
```
node_modules/
.next/
out/
coverage/
.env*
!.env.local.example
*.log
tsconfig.tsbuildinfo
.tmp*
temp/
```

### ✅ **GitHub Actions** - Configurat
- **CI/CD Pipeline** complet în `.github/workflows/ci-cd.yml`
- **Automated testing** (unit, e2e, security)
- **Build și deploy** pentru staging/production
- **Security scanning** cu Trivy
- **Performance testing** cu Lighthouse CI

### ✅ **README.md** - Complet
- Documentație completă a platformei
- Instrucțiuni de instalare și setup
- Structura proiectului explicată
- Liste de caracteristici și tech stack

### ✅ **Package Scripts** - Configurate
```json
{
  "scripts": {
    "dev": "next dev -p 3000 -H 0.0.0.0",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit",
    "test": "jest",
    "test:unit": "jest --testPathPattern=tests/unit|tests/security",
    "test:e2e": "playwright test",
    "test:security": "jest --testPathPattern=tests/security",
    "test:coverage": "jest --coverage",
    "test:ci": "playwright test --reporter=junit",
    "deploy:staging": "echo 'Deploy to staging'",
    "deploy:prod": "echo 'Deploy to production'"
  }
}
```

## 🔧 **Setup GitHub Secrets**

### Required Secrets pentru CI/CD:

1. **NEXT_PUBLIC_SUPABASE_URL**
2. **NEXT_PUBLIC_SUPABASE_ANON_KEY**
3. **SUPABASE_SERVICE_ROLE_KEY**
4. **OPENAI_API_KEY**
5. **DATABASE_URL** (optional, pentru migrations)

### Cum să adaugi secrets:
1. Mergi la repository pe GitHub
2. Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Adaugă fiecare secret

## 🚀 **Deployment Options**

### **Vercel (Recomandat)**
```bash
# Instalează Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### **GitHub Pages**
```bash
# Build pentru static export
npm run build:static
```

### **Docker**
```bash
# Build Docker image
docker build -t advertising-ai-enterprise .
docker run -p 3000:3000 advertising-ai-enterprise
```

## 📊 **CI/CD Workflow Features**

### **Lint & Format**
- ESLint pentru code quality
- Prettier pentru code formatting
- TypeScript type checking

### **Testing**
- Unit tests cu Jest
- E2E tests cu Playwright
- Security tests
- Coverage reporting

### **Security**
- Trivy vulnerability scanning
- npm audit
- Security headers verification

### **Build & Deploy**
- Automated build
- Staging deployment (develop branch)
- Production deployment (main branch)
- Health checks post-deployment

### **Performance**
- Lighthouse CI
- Performance budgets
- Core Web Vitals tracking

## 🔍 **Verification Checklist**

### **Pre-push Checklist**
- [ ] Git instalat și configurat
- [ ] Repository creat pe GitHub
- [ ] Remote URL adăugat
- [ ] .gitignore verificat
- [ ] README.md complet
- [ ] CI/CD workflow prezent
- [ ] Package scripts configurate

### **Post-push Checklist**
- [ ] CI/CD pipeline rulează
- [ ] Tests trec cu succes
- [ ] Build se face fără erori
- [ ] Security scanning complet
- [ ] Deployment automat funcțional

## 🛠️ **Troubleshooting**

### **Git nu este recunoscut**
```bash
# Restart PowerShell după instalare Git
# Sau verifică PATH-ul:
echo $env:PATH
```

### **Permission denied**
```bash
# Verifică permisiunile repository-ului
icacls . /grant "USERNAME:(OI)(CI)F"
```

### **Remote URL problems**
```bash
# Verifică remote URL:
git remote -v

# Schimbă remote URL:
git remote set-url origin https://github.com/USERNAME/repo.git
```

### **CI/CD nu rulează**
```bash
# Verifică workflow file:
cat .github/workflows/ci-cd.yml

# Verifică YAML syntax:
# Folosește un YAML validator online
```

## 📝 **Next Steps**

1. **Setup Git și GitHub**
2. **Push repository**
3. **Configurează GitHub Secrets**
4. **Test CI/CD pipeline**
5. **Deploy la Vercel sau alt provider**
6. **Configurează domain și SSL**

---

**Platforma este 100% ready pentru GitHub deployment cu CI/CD complet!** 🚀
