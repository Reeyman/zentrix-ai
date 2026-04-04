# Zentrix AI

O platformă enterprise completă pentru managementul campaniilor de advertising cu recomandări AI, monitoring avansat, și securitate enterprise-grade.

## 🚀 **Caracteristici Principale**

### 🤖 **AI-Powered Campaign Management**
- Recomandări AI pentru optimizarea campaniilor
- Analiză predictivă a performanței
- Automated campaign optimization
- Multi-channel campaign management

### 📊 **Analytics & Monitoring**
- Dashboard real-time pentru KPI-uri
- Error tracking și performance monitoring
- Health checks automatizate
- Audit logging complet

### 🔒 **Enterprise Security**
- Rate limiting avansat
- Security headers complete
- Input validation și sanitizare
- Role-based access control

### 🧪 **Testing Framework**
- E2E tests cu Playwright
- Unit tests cu Jest
- Security testing suite
- Performance testing

### 🚀 **CI/CD Pipeline**
- GitHub Actions workflow
- Automated testing și deployment
- Database migrations
- Rollback automatizat

### 💾 **Backup & Recovery**
- Automated backups cu compresie
- Recovery points management
- Data integrity verification
- Granular restore options

### 🚩 **Feature Flags**
- Dynamic feature toggles
- User-based targeting
- Percentage rollouts
- React integration

## 🛠️ **Tech Stack**

- **Frontend**: Next.js 14, React 18, TypeScript
- **Backend**: Next.js API Routes, Supabase
- **Database**: PostgreSQL (via Supabase)
- **AI**: OpenAI API
- **Testing**: Jest, Playwright
- **Deployment**: GitHub Actions, Vercel

## 📦 **Instalare**

1. Clonează repository-ul:
```bash
git clone <repository-url>
cd advertising-ai-enterprise
```

2. Instalează dependențele:
```bash
npm install
```

3. Configurează environment variables:
```bash
cp .env.local.example .env.local
# Editează .env.local cu credențialele tale
```

4. Pornește development server:
```bash
npm run dev
```

5. Accesează aplicația la `http://localhost:3000`

## ⚙️ **Environment Variables**

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key

# Feature Flags
NEXT_PUBLIC_AI_RECOMMENDATIONS_ENABLED=true
NEXT_PUBLIC_BETA_FEATURES_ENABLED=false
```

## 🧪 **Testing**

### Unit Tests
```bash
npm run test:unit
```

### E2E Tests
```bash
npm run test:e2e
```

### Security Tests
```bash
npm run test:security
```

### Coverage Report
```bash
npm run test:coverage
```

## 🚀 **Deployment**

### Development
```bash
npm run build
npm run start
```

### Production
```bash
npm run deploy:prod
```

### CI/CD
Pipeline-ul GitHub Actions se va declanșa automat la push către `main` sau `develop`.

## 📊 **Monitoring**

### Health Check
```bash
curl http://localhost:3000/api/health
```

### Monitoring Dashboard
Accesează `/app/monitoring` pentru dashboard-ul de monitoring.

### Audit Logs
Accesează `/app/settings/audit` pentru audit trails.

## 🔧 **Development Scripts**

```bash
# Development
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Start production server

# Testing
npm run test             # Run all tests
npm run test:unit        # Run unit tests only
npm run test:e2e         # Run E2E tests only
npm run test:security    # Run security tests only

# Code Quality
npm run lint             # Run ESLint
npm run type-check       # TypeScript type checking
npm run format           # Format code with Prettier

# Deployment
npm run deploy:staging   # Deploy to staging
npm run deploy:prod      # Deploy to production
```

## 📁 **Structura Proiectului**

```
src/
├── app/                   # Next.js 13+ app directory
│   ├── api/              # API routes
│   ├── app/              # Authenticated app pages
│   ├── auth/             # Auth pages
│   └── (public)/         # Public pages
├── components/           # React components
│   ├── layout/          # Layout components
│   ├── workflows/       # Workflow components
│   └── ui/              # UI primitives
├── lib/                 # Utility libraries
│   ├── monitoring.ts    # Monitoring service
│   ├── audit-logging.ts # Audit logging
│   ├── backup-recovery.ts # Backup & recovery
│   ├── feature-flags.ts # Feature flags
│   └── rate-limiter.ts  # Rate limiting
├── types/               # TypeScript types
└── middleware.ts        # Next.js middleware

tests/
├── e2e/                 # E2E tests
├── unit/                # Unit tests
└── security/            # Security tests
```

## 🔐 **Security Features**

- **Rate Limiting**: Configurable rate limiting per endpoint
- **Security Headers**: HSTS, XSS protection, CSP
- **Input Validation**: Comprehensive input sanitization
- **Audit Logging**: Complete audit trail for all actions
- **Authentication**: Supabase Auth integration
- **Authorization**: Role-based access control

## 📈 **Performance**

- **Caching**: Intelligent caching for feature flags and monitoring
- **Optimization**: Next.js optimizations and lazy loading
- **Monitoring**: Real-time performance tracking
- **Health Checks**: Automated system health monitoring

## 🤝 **Contributing**

1. Fork repository-ul
2. Creează un feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push la branch (`git push origin feature/amazing-feature`)
5. Deschide un Pull Request

## 📄 **License**

Acest proiect este licențiat sub MIT License - vezi fișierul [LICENSE](LICENSE) pentru detalii.

## 🆘 **Support**

Pru întrebări și suport, te rugăm să:

1. Verifici [documentation](docs/API.md)
2. Căuti în [issues](../../issues)
3. Deschizi un nou [issue](../../issues/new)

## 🎯 **Roadmap**

- [ ] Advanced AI models integration
- [ ] Real-time collaboration
- [ ] Mobile app development
- [ ] Advanced analytics dashboard
- [ ] Multi-tenant architecture

---

**Built with ❤️ for enterprise advertising teams**
