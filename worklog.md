---
Task ID: 1
Agent: Main Agent
Task: Make header sticky across all sections of the app

Work Log:
- Analyzed the entire app architecture: SPA with tab routing, global header + per-page sub-headers
- Identified root cause: `min-h-screen` on `<main>` allowed page to grow beyond viewport, and Framer Motion `AnimatePresence`/`motion.div` wrapper applied CSS transforms that broke `position: sticky`
- Fixed `<main>` layout: changed `min-h-screen` to `h-screen overflow-hidden` to constrain to viewport
- Changed global header from `sticky top-0 z-40` to `z-40 shrink-0` (doesn't need sticky since main doesn't scroll)
- Removed `AnimatePresence` + `motion.div` wrapper from page rendering (CSS transforms break sticky)
- Kept per-page sub-headers as `sticky top-0 z-30` which now work correctly within the `overflow-y-auto` content scroll area
- Verified all sections work correctly via Agent Browser: Balances, Accounts, Exchange, Transactions, Debts, Vehicles, Reports, Settings
- Confirmed add buttons remain visible and clickable during scrolling in all sections
- Lint passes with no errors
- No console errors

Stage Summary:
- All headers (global + per-page) now stay visible during scrolling
- Add buttons inside per-page sub-headers remain accessible at all times
- UI Freeze maintained - no design, color, or size changes
- Key changes: `min-h-screen` → `h-screen overflow-hidden`, removed AnimatePresence wrapper, simplified global header class
