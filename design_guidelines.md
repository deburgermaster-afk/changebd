# Design Guidelines: Bangladesh Civic Engagement Platform

## Design Approach
**System-Based with Cultural Integration**: Using Material Design as the foundation for its clarity in data-heavy applications, enhanced with Bangladesh cultural elements (flag colors: green #006A4E and red #F42A41, subtle national motifs).

**Reference Inspiration**: Change.org's petition clarity + Reddit's community-driven interface + Linear's data presentation for leaderboards.

## Core Design Principles
1. **Trust Through Clarity**: Clean, transparent layouts that communicate credibility
2. **Speed-Optimized**: Minimal animations, efficient component loading
3. **Cultural Authenticity**: Bangladesh flag integration without kitsch
4. **Anonymity Assurance**: Visual cues reinforcing privacy protection

## Layout System
**Spacing Units**: Tailwind spacing of 3, 4, 6, 8, 12 for consistent rhythm.

**Grid Structure**: 
- Hero: Full-width with Bangladesh flag gradient overlay (subtle, 10% opacity green-to-red)
- Content: max-w-7xl container for main sections
- Leaderboard/Data: max-w-6xl for optimal readability
- Forms: max-w-2xl centered

## Typography
- **Primary Font**: Inter (Google Fonts) - excellent for data display and Bengali script support
- **Headings**: Font weights 600-700, sizes: text-4xl (hero), text-2xl (section), text-xl (cards)
- **Body**: Font weight 400, size text-base with text-slate-700
- **Data/Numbers**: Font weight 500-600, tabular-nums for leaderboard alignment

## Component Library

### Navigation
Top bar with logo (incorporating small Bangladesh flag element), main nav links (Cases, Vote, Parties, Leaderboard, Report Scammer), prominent "Raise a Case" CTA button, anonymous user indicator icon.

### Hero Section
Full-width background with subtle Bangladesh map silhouette watermark, centered headline "Voice of Bangladesh" with tagline, dual CTAs: "Raise Your Voice" (primary) and "Browse Cases" (secondary), trust indicator: "Fully Anonymous & Encrypted" with shield icon, quick stats bar below (Active Cases, Total Votes, Verified Reports).

### Political Party Voting Section
Grid layout (grid-cols-1 md:grid-cols-2 lg:grid-cols-3) of party cards, each card includes: party icon/logo (80x80), party name with member count, vote button with current vote percentage, visual vote bar indicator. "Others" option card with write-in field.

### Leaderboard Component
Classic table design with alternating row backgrounds, columns: Rank (with medal icons for top 3), Case Title, Category badge, Vote Count (with up/down arrows), Momentum indicator (trending icon), sticky header on scroll.

### Case Cards
Two-column grid on desktop, single on mobile, each card: category badge (color-coded: Political/Social/Scam Alert), case title (bold, 2 lines max), excerpt (3 lines), anonymous user tag, vote count, comment count, share button, "Support" action button.

### Scammer Listing
Searchable table with warning-style design, columns: Name/Entity, Type (individual/business), Description, Evidence count, Verification status badge, Report date, filterable by category.

### Voting Pools
Poll card with question title, multiple choice options with radio buttons, real-time percentage bars, total vote count, time remaining badge, "Vote Anonymously" button with encryption icon tooltip.

### Forms (Case Submission/Reporting)
Multi-step form with progress indicator, fields with clear labels and helper text, category selector with icons, rich text editor for description, evidence upload section (with file type restrictions), anonymity confirmation checkbox prominent, submit button with encryption confirmation message.

## Images
- **Hero**: Use a subtle, professional photograph of Bangladesh National Monument or Shaheed Minar with warm filter, not as full background but as side element (40% width on desktop)
- **Section Dividers**: Minimal line art illustrations of Bangladesh landmarks (very light, accent only)
- **Empty States**: Custom illustrations showing diversity of Bangladesh citizens in minimalist style

## Data Visualization
Leaderboard uses horizontal bars for vote counts, party voting displays pie chart for overall results, trend indicators use simple arrow icons (↑↗→), color coding: green for verified, amber for pending, red for alerts.

## Accessibility
High contrast text (WCAG AA minimum), focus states with 2px outline in Bangladesh green, keyboard navigation for all voting/form elements, screen reader labels for all data visualizations, "Encryption Active" indicator always visible.

## Performance Considerations
Lazy load leaderboard data beyond top 20, infinite scroll for case listings, optimistic UI updates for voting (instant feedback), lightweight icon library (Heroicons via CDN), no auto-playing media.

## Trust Elements
Encryption badge in footer, "Your data is never stored with personal identifiers" messaging, verification badges for confirmed reports, transparent vote counts (no hidden manipulation), clear community guidelines link.