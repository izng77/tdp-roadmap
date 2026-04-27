# TDP Roadmap Design System (MASTER)

## 🎯 North Star
High-density, deterministic, and professional "Pro-Tool" aesthetic for the SAJC JC1 Talent Development Pilot.

## 🎨 Color Palette
- **Primary**: `#1A365D` (Deep Navy - Authority)
- **Secondary**: `#0151B1` (SAJC Blue - Action)
- **Success**: `#059669` (Emerald - Completion)
- **Warning**: `#D97706` (Amber - Pending)
- **Surface**: `#F8FAFC` (Slate 50 - Background)
- **Border**: `#E2E8F0` (Slate 200 - Neutral)

## 🔡 Typography
- **Display**: "Plus Jakarta Sans" (Bold/Extrabold for headers)
- **Body**: "Fira Sans" (Clean, high-readability for data)
- **Monospace**: "Fira Code" (Technical/Metadata feel)

## 📏 Layout Constants
- **Max Width**: `1200px` (Desktop Container)
- **Gutter**: `24px`
- **Border Radius**: `1rem` (Standard), `2rem` (Pills/Sections)
- **Navbar Height**: `80px`

## ✨ Micro-interactions
- **Transitions**: `200ms ease-out`
- **Hover**: Subtle lift (`translate-y-[-2px]`) + Shadow ring
- **Glass**: `backdrop-blur-xl` + `bg-white/80` (Light Mode)

## 💎 Component Polishing (The "Glass & Shadow" Layer)
- **Surface Elevation**: Implement a three-tier elevation system (Base, Panel, Modal) using consistent shadow-ring combinations.
- **Glassmorphism**: Add `backdrop-blur-xl` to floating headers and navbars for a modern, layered feel.
- **Surgical Hover States**: Add `cursor-pointer` to all interactive cards and implement a `200ms ease-out` lift effect that avoids layout shifts.

## 📐 Dashboard Density & Symmetry
- **Student Dashboard**: Re-align the Competency Radar and Mastery Progression blocks for perfect vertical and horizontal symmetry.
- **Teacher Console**: Standardize the "Catalog Management" list with high-density rows, improving scannability for large course lists.
- **Navigation**: Refine the Sidebar expansion logic to be smoother and ensure the "Floating Navbar" adheres to the `top-4` spacing rule.

## 💫 Phase 4: Micro-Interactions
- **Modal Dynamics**: Add a subtle `scale-95` to `scale-100` entry animation for enrollment modals.
- **Status Feedbacks**: Standardize toast notifications with a glass-blur background and Lucide icon pairings.

##  Anti-Patterns
- No emojis as UI icons (Use Lucide SVG)
- No decorative animations (Only feedback/loading)
- No horizontal scrolling on main content
