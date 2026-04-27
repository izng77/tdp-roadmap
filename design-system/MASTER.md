# TDP Roadmap Design System (MASTER)

## 🎨 Visual Identity
- **Primary**: `#1A365D` (Deep Navy - Trust & Authority)
- **Secondary**: `#0151B1` (Digital Blue - Interaction & Energy)
- **Success**: `#10B981` (Emerald - Completion)
- **Error**: `#EF4444` (Coral - Alerts)
- **Background**: `#F8FAFC` (Soft Grey)

## 🏗️ Core Components

### 1. The "Pro-Card"
Standardized container for all dashboard elements.
- **Background**: `bg-white`
- **Border**: `1px solid #E2E8F0`
- **Radius**: `1.5rem` (rounded-2xl)
- **Shadow**: `0 4px 20px rgba(0,0,0,0.02)`
- **Hover**: `border-secondary/20 shadow-xl shadow-slate-200/50`

### 2. Glassmorphism (Mobile/Overlays)
Used for floating navigation and high-priority toasts.
- **Background**: `rgba(26, 54, 93, 0.8)`
- **Blur**: `blur(20px)`
- **Border**: `1px solid rgba(255, 255, 255, 0.1)`

### 3. Typography Hierarchy
- **Display**: `font-black text-4xl tracking-tighter` (Outfit)
- **Subheaders**: `font-black text-[10px] uppercase tracking-[0.2em] text-outline`
- **Body**: `font-medium text-base leading-relaxed text-slate-600`

## ✨ Micro-interactions
- **Scale**: `active:scale-95` on all buttons.
- **Transitions**: `transition-all duration-300 cubic-bezier(0.4, 0, 0.2, 1)`
- **Entrance**: `animate-fadeInUp` for new modals and toasts.

## 📊 Chart Aesthetics
- **Radar Chart**: stroke: `var(--color-secondary)`, fill: `var(--color-secondary)`, fillOpacity: `0.2`.
- **Grid Lines**: `var(--color-outline-variant)`.