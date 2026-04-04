// Design System Enterprise v1
// Advertising AI Platform

export const colors = {
  background: '#0F172A',     // slate-950
  surface: '#1E293B',       // slate-800  
  surfaceHover: '#334155',  // slate-700
  border: '#334155',        // slate-700
  textPrimary: '#FFFFFF',   // white
  textSecondary: '#94A3B8', // slate-400
  textMuted: '#64748B',     // slate-500
  accent: '#2563EB',        // blue-600
  accentHover: '#1D4ED8',   // blue-700
  success: '#22C55E',       // green-500
  warning: '#F59E0B',       // amber-500
  error: '#EF4444',         // red-500
  info: '#3B82F6'          // blue-500
} as const

export const typography = {
  fontStack: 'Inter, system-ui, -apple-system, sans-serif',
  sizes: {
    h1: '32px', h2: '24px', h3: '20px', h4: '18px', 
    h5: '16px', h6: '14px', body: '14px', caption: '12px'
  },
  lineHeight: {
    tight: '1.2', normal: '1.4', relaxed: '1.5'
  },
  weights: {
    normal: '400', medium: '500', semibold: '600', bold: '700'
  }
} as const

export const spacing = {
  xs: '4px', sm: '8px', md: '16px', lg: '24px', 
  xl: '32px', '2xl': '48px', '3xl': '64px'
} as const

export const borderRadius = {
  sm: '4px', md: '8px', lg: '12px', xl: '16px'
} as const

export const breakpoints = {
  mobile: '768px', tablet: '1024px', desktop: '1280px'
} as const

// Component Styles
export const buttonStyles = {
  primary: {
    height: '40px',
    padding: '12px 24px',
    background: colors.accent,
    color: colors.textPrimary,
    border: 'none',
    borderRadius: borderRadius.md,
    fontFamily: typography.fontStack,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.medium,
    cursor: 'pointer',
    transition: 'none',
    '&:hover': {
      background: colors.accentHover
    },
    '&:focus': {
      outline: `2px solid #93C5FD`,
      outlineOffset: '2px'
    },
    '&:disabled': {
      background: colors.surfaceHover,
      color: colors.textMuted,
      cursor: 'not-allowed'
    }
  },
  secondary: {
    height: '40px',
    padding: '12px 24px',
    background: 'transparent',
    color: colors.textPrimary,
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.md,
    fontFamily: typography.fontStack,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.medium,
    cursor: 'pointer',
    transition: 'none',
    '&:hover': {
      background: colors.surfaceHover
    },
    '&:focus': {
      outline: `2px solid #93C5FD`,
      outlineOffset: '2px'
    }
  }
} as const

export const inputStyles = {
  default: {
    width: '100%',
    padding: '12px 16px',
    background: colors.surfaceHover,
    color: colors.textPrimary,
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.md,
    fontFamily: typography.fontStack,
    fontSize: typography.sizes.body,
    transition: 'none',
    '&::placeholder': {
      color: colors.textMuted
    },
    '&:focus': {
      outline: `2px solid #93C5FD`,
      outlineOffset: '2px',
      borderColor: colors.accent
    },
    '&:disabled': {
      background: colors.surface,
      color: colors.textMuted,
      cursor: 'not-allowed'
    }
  }
} as const

export const cardStyles = {
  default: {
    background: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
  }
} as const

export const tableStyles = {
  header: {
    color: colors.textMuted,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.medium,
    textTransform: 'uppercase' as const,
    borderBottom: `1px solid ${colors.border}`
  },
  row: {
    borderBottom: `1px solid ${colors.border}`,
    '&:hover': {
      background: colors.surfaceHover
    }
  }
} as const

// Status Colors
export const statusColors = {
  active: {
    background: 'rgba(34, 197, 94, 0.1)',
    color: colors.success
  },
  scheduled: {
    background: 'rgba(251, 146, 60, 0.1)',
    color: colors.warning
  },
  completed: {
    background: 'rgba(148, 163, 184, 0.1)',
    color: colors.textSecondary
  },
  draft: {
    background: 'rgba(107, 114, 128, 0.1)',
    color: colors.textMuted
  },
  error: {
    background: 'rgba(239, 68, 68, 0.1)',
    color: colors.error
  }
} as const

// Layout Constants
export const layout = {
  headerHeight: '72px',
  sidebarWidth: '240px',
  sidebarCollapsedWidth: '64px',
  footerHeight: '56px',
  maxWidth: '1440px',
  gutter: spacing.lg
} as const

// Copy Deck - Texte în Română
export const copy = {
  navigation: {
    logo: 'Zentrix AI',
    searchPlaceholder: 'Căutați campanii, analize...',
    notifications: 'Notificări',
    profile: 'Profil',
    help: 'Ajutor'
  },
  actions: {
    createCampaign: 'Creează Campanie',
    generateReport: 'Generează Raport',
    save: 'Salvează',
    cancel: 'Anulează',
    close: 'Închide',
    edit: 'Editează',
    duplicate: 'Duplică',
    export: 'Exportă',
    download: 'Descarcă',
    delete: 'Șterge',
    archive: 'Arhivază'
  },
  status: {
    active: 'Activ',
    scheduled: 'Programat',
    completed: 'Finalizat',
    draft: 'Ciornă',
    paused: 'Pauzat',
    archived: 'Arhivat'
  },
  messages: {
    success: 'Modificări salvate cu succes',
    error: 'A apărut o eroare. Încercați din nou.',
    empty: 'Nu există date de afișat.',
    loading: 'Se încarcă...'
  },
  dashboard: {
    title: 'Panou General',
    description: 'Monitorizați performanța campaniilor și gestionați eficient resursele',
    kpiLabels: {
      campaigns: 'Campanii Active',
      budget: 'Buget Total',
      impressions: 'Impresii',
      ctr: 'CTR'
    },
    quickActions: {
      createCampaign: 'Creează Campanie',
      viewReports: 'Vezi Rapoarte',
      manageBudget: 'Management Buget'
    }
  },
  campaigns: {
    title: 'Campanii',
    searchPlaceholder: 'Căutați campanii...',
    filterStatus: 'Toate Statusurile',
    tableHeaders: {
      campaign: 'Campanie',
      status: 'Status',
      budget: 'Buget',
      duration: 'Durată',
      performance: 'Performanță',
      actions: 'Acțiuni'
    }
  },
  analytics: {
    title: 'Analize și Rapoarte',
    kpiLabels: {
      conversionRate: 'Rata Conversie',
      costPerConversion: 'Cost/Conversie',
      totalReach: 'Reach Total',
      avgSessionTime: 'Timp Mediu Sesiune'
    }
  },
  reports: {
    title: 'Rapoarte',
    generateNew: 'Generează Raport Nou',
    tableHeaders: {
      name: 'Nume Raport',
      type: 'Tip',
      generated: 'Generat',
      size: 'Mărime',
      actions: 'Acțiuni'
    }
  },
  settings: {
    title: 'Setări',
    tabs: {
      profile: 'Profil',
      notifications: 'Notificări',
      api: 'API',
      security: 'Securitate'
    },
    formLabels: {
      fullName: 'Nume Complet',
      email: 'Email',
      phone: 'Telefon',
      position: 'Funcție'
    }
  }
} as const

const designSystem = {
  colors,
  typography,
  spacing,
  borderRadius,
  breakpoints,
  buttonStyles,
  inputStyles,
  cardStyles,
  tableStyles,
  statusColors,
  layout,
  copy
}

export default designSystem
