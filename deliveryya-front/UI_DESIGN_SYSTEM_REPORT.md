# DeliveryYa UI Design System Report

## Color Palette

### Primary Brand Colors
- **Primary Tomato**: `#FF6347` - Main brand color from logo, primary CTAs and key UI elements
- **OrangeRed**: `#FF4500` - Secondary brand color, strong accents and hover states
- **Coral**: `#FF7F50` - Tertiary accent for softer highlights
- **Dark Orange**: `#FF8C00` - Supporting accent for depth
- **Orange**: `#FFA500` - Light accents and highlights
- **Amber**: `#F59B0F` - Primary action color (used extensively)
- **Amber Dark**: `#AC6C2A` - Secondary action color

### Neutral Colors
- **White**: `#FFFFFF` - Clean backgrounds
- **Slate Grays**: Standard slate-50 to slate-900 for UI hierarchy
- **Orange-tinted Neutrals**
  - Light backgrounds: `orange-50` to `orange-100`
  - Borders: `orange-200` to `orange-300`
- **Primary Text**: `#1A1F3A` (Rich Navy) - Main content
- **Secondary Text**: `#2C3E50` (Charcoal) - Subtext

### Background Tones
- **Orange Tint**: `from-orange-50 via-white to-red-50` - Light gradient backgrounds
- **White Base**: `#FFFFFF` with opacity variations - Main content areas
- **Warm Blur**: Orange/red tints at 20% opacity - Decorative blur effects

### Status Colors
- **Success**: Green tones (`bg-green-50`, `text-green-700`)
- **Error**: Red tones (`bg-red-50`, `text-red-600`, `#F87171`)
- **Warning**: Orange/amber tones (`#F59B0F`)
- **Info**: Blue tones (`bg-blue-50`, `text-blue-600`)

---

## Typography

### Font Family
- System fonts via Tailwind CSS default stack
- No custom font imports - uses native system fonts for performance

### Type Scale
- **Hero Titles**: `text-4xl sm:text-5xl lg:text-6xl` with `font-black`
- **Section Headers**: `text-2xl sm:text-3xl` with `font-bold`
- **Card Titles**: `text-base` to `text-xl` with `font-bold`
- **Body Text**: `text-sm` to `text-base` with `font-medium`
- **Captions/Labels**: `text-xs` with `font-semibold` or `font-bold`

### Typography Patterns
- **Gradient Text**: `bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] bg-clip-text text-transparent` for brand emphasis
- **Uppercase Tracking**: `uppercase tracking-[0.18em]` to `tracking-[0.22em]` for badges and labels
- **Line Heights**: `leading-tight`, `leading-7` for improved readability
- **Text Truncation**: `line-clamp-1`, `line-clamp-2` for card content

---

## Cards

### Card Structure
- **Base Card**: `bg-white rounded-2xl shadow-md hover:shadow-2xl overflow-hidden transition-all duration-500`
- **Product Card**: `rounded-2xl shadow-md hover:shadow-2xl` with image hover zoom effect
- **Dashboard Card**: `bg-white rounded-2xl p-6 shadow-lg border border-gray-100`
- **Info Card**: `bg-blue-50 rounded-lg p-4 border border-blue-200`

### Card Patterns
- **Hover Lift**: `hover:-translate-y-0.5` for interactive cards
- **Image Zoom**: `group-hover:scale-110 transition-transform duration-700` for product images
- **Overlay Actions**: Absolute positioned action buttons that appear on hover
- **Slot-based Design**: Top-left, top-right, media footer, and details slots for flexibility

### Card Variants
- **Product Card**: Image + rating + price + action button
- **Status Card**: Icon + value + subtitle + click handler
- **Stat Card**: Gradient background + icon + metric
- **Info Card**: Icon + title + description

---

## Tables

### Table Structure
- **Container**: `bg-white rounded-2xl shadow-sm border border-gray-100`
- **Header**: Bold text with sorting indicators
- **Row**: Hover states with `hover:bg-orange-50/30`
- **Cell**: Padding with text truncation for long content

### Table Patterns
- **Responsive Tables**: Horizontal scroll on mobile
- **Expandable Rows**: Chevron icons for row expansion
- **Action Menus**: Ellipsis vertical menu for row actions
- **Status Indicators**: Color-coded badges in table cells
- **Pagination**: Bottom of table with page controls

---

## Forms

### Input Components
- **Text Inputs**: `border-2 border-gray-200 rounded-xl focus:border-[#FF6347] focus:ring-[#FF6347]/20`
- **Select Dropdowns**: Custom styled react-select with brand colors
- **Async Select**: For searchable dropdowns with loading states
- **Textarea**: Rich text editor using TipTap
- **Date/Time Pickers**: Custom styled datetime components

### Form Patterns
- **Field Groups**: `space-y-4` for vertical spacing
- **Grid Layouts**: `grid-cols-1 md:grid-cols-2 gap-4` for multi-column forms
- **Error States**: Red text with shake animation
- **Success States**: Green checkmarks
- **Loading States**: Spinner icons during async operations

### Form Validation
- **Real-time Validation**: Debounced input validation
- **Error Messages**: Below field with red text
- **Field Highlighting**: Red borders for invalid fields
- **Clear Indicators**: X icons for clearing search input

---

## Buttons

### Button Hierarchy
- **Primary Buttons**: `bg-linear-to-r from-[#FF6347] to-[#FF4500] text-white font-semibold shadow-lg hover:shadow-xl`
- **Secondary Buttons**: `border border-gray-300 text-gray-700 hover:bg-gray-50`
- **Ghost Buttons**: `hover:bg-orange-50 text-gray-700 hover:text-[#F59B0F]`
- **Icon Buttons**: `p-2 rounded-lg hover:bg-orange-50`

### Button Patterns
- **Rounded Corners**: `rounded-xl` or `rounded-full` depending on context
- **Hover Effects**: Scale transform (`hover:scale-105`) and shadow enhancement
- **Disabled States**: `disabled:opacity-50 disabled:cursor-not-allowed`
- **Loading States**: Spinner icon replacement during async operations
- **Icon + Text**: Flex layout with gap for icon-text buttons

### Button Sizes
- **Large**: `px-5 py-2.5` for primary actions
- **Medium**: `px-4 py-2` for secondary actions
- **Small**: `px-3 py-1.5` for compact actions
- **Icon Only**: `p-2` for icon-only buttons

---

## Sidebar

### Sidebar Structure
- **Fixed Position**: `fixed left-0 top-0 h-screen` with z-index
- **Width States**: Collapsed (`w-20`) and expanded (`w-64`)
- **Hover Expansion**: `lg:hover:w-64` on collapsed state
- **Background**: `bg-white border-r border-gray-200 shadow-xl`

### Sidebar Patterns
- **Logo Section**: Gradient background with brand logo
- **Menu Groups**: Section headers with uppercase tracking
- **Active States**: Gradient background with white text
- **Hover States**: Orange tint background
- **Sub-menus**: Expandable with chevron rotation
- **Tooltips**: Absolute positioned tooltips on collapsed state
- **Logout Section**: Gradient button at bottom

### Responsive Behavior
- **Mobile**: Full-width overlay with backdrop
- **Desktop**: Collapsed to icons, expands on hover
- **Transition**: Smooth width transition (`duration-300`)

---

## Header

### Header Structure
- **Fixed Position**: `fixed top-0 right-0 z-40` with dynamic left margin
- **Background**: `bg-white border-b border-gray-200 shadow-sm`
- **Height**: Responsive padding (`py-4`)

### Header Patterns
- **Menu Toggle**: Hamburger icon with X state toggle
- **Page Title**: Gradient text for current page name
- **Search Bar**: Centered on desktop, hidden on mobile
- **Action Icons**: Right-aligned notification and profile icons
- **Profile Menu**: Dropdown with avatar and menu items

### Responsive Behavior
- **Mobile**: Stacked layout with hidden search
- **Desktop**: Horizontal layout with search bar
- **Dynamic Width**: Adjusts based on sidebar state

---

## Dashboard

### Dashboard Structure
- **Layout**: Grid-based with responsive columns
- **Cards**: White rounded cards with shadows
- **Spacing**: `gap-6` between cards
- **Background**: `bg-gray-50` for page background

### Dashboard Patterns
- **Stat Cards**: 4-5 column grid for key metrics
- **Charts**: Responsive containers with Recharts
- **Recent Activity**: List views with status indicators
- **Filter Controls**: Select dropdowns for date ranges
- **Action Buttons**: Primary actions in card headers

### Dashboard Components
- **Order Status Overview**: Stat cards with click handlers
- **Financial Overview**: Revenue metrics with filters
- **Performance Charts**: Pie and bar charts
- **Recent Orders**: Table with expandable rows

---

## Search

### Search Patterns
- **Inline Search**: Text input with magnifying glass icon
- **Focus States**: Orange border with shadow on focus
- **Debounced Input**: Delayed search for performance
- **Clear Button**: X icon to clear search input
- **Dropdown Results**: Absolute positioned results panel

### Search Components
- **Navbar Search**: Compact search in top bar
- **Advanced Search**: Full-width search with filters
- **Async Search**: react-select/async-select for API search
- **Mobile Search**: Expandable search panel

---

## Filters

### Filter Patterns
- **Select Dropdowns**: react-select for single/multi-select
- **Date Range**: Date picker with from/to inputs
- **Status Filters**: Checkbox or radio button groups
- **Clear Filters**: Reset button to clear all filters
- **Active Indicators**: Visual indication of active filters

### Filter Components
- **Filter Bar**: Horizontal filter controls
- **Filter Panel**: Collapsible filter section
- **Filter Tags**: Removable filter chips
- **Filter Presets**: Quick filter options

---

## Pagination

### Pagination Structure
- **Info Display**: "Page X of Y" text
- **Navigation Buttons**: Chevron left/right icons
- **Page Size Selector**: Dropdown for items per page
- **Disabled States**: Visual feedback for disabled buttons

### Pagination Patterns
- **Button Style**: `border-2 border-gray-200 bg-white hover:bg-orange-50 hover:border-[#F59B0F]`
- **Current Page**: Highlighted page indicator
- **Responsive**: Stacked on mobile, horizontal on desktop
- **Loading States**: Disabled during data fetch

---

## Status Badges

### Badge Patterns
- **Rounded**: `rounded-full` for pill-shaped badges
- **Gradient**: `bg-linear-to-r from-[#F59B0F] to-[#AC6C2A]` for brand badges
- **Solid Colors**: Status-specific colors (green, red, yellow)
- **Outline**: `border` variants for subtle badges
- **Count Badges**: Small circles with numbers

### Badge Variants
- **New Badge**: Orange gradient with "NEW" text
- **Status Badge**: Color-coded by status
- **Count Badge**: Notification count with background
- **Category Badge**: Product category labels

---

## Charts

### Chart Components
- **Library**: Recharts for data visualization
- **Responsive Containers**: `ResponsiveContainer` for adaptive sizing
- **Chart Types**: Pie charts, bar charts, line charts
- **Custom Tooltips**: Styled tooltip components
- **Color Palette**: Brand-consistent chart colors

### Chart Patterns
- **Card Container**: White rounded card with shadow
- **Header**: Icon + title layout
- **Legend**: Custom legend with color indicators
- **Animations**: Smooth transitions on data updates
- **Empty States**: Placeholder when no data

---

## Dialogs

### Dialog Structure
- **Overlay**: `fixed inset-0 bg-black/40` backdrop
- **Container**: `rounded-2xl bg-white shadow-2xl`
- **Header**: Gradient background with title and close button
- **Body**: Scrollable content area
- **Footer**: Action buttons at bottom

### Dialog Patterns
- **SweetAlert2**: Custom themed alert dialogs
- **Modal Dialogs**: Headless UI Dialog components
- **Confirm Dialogs**: Yes/Cancel confirmation
- **Form Dialogs**: Modal forms for data entry
- **Detail Dialogs**: Expanded information views

---

## Notifications

### Notification Panel
- **Trigger**: Bell icon with count badge
- **Dropdown**: Absolute positioned panel
- **Header**: Gradient background with title
- **List**: Scrollable notification items
- **Empty State**: "No notifications yet" message

### Notification Patterns
- **Unread Indicator**: Orange dot for unread items
- **Read State**: Gray background for read items
- **Loading State**: Spinner during fetch
- **Error State**: Retry button on failure
- **Detail View**: Modal for full notification content

---

## Loading States

### Loading Patterns
- **Spinners**: `animate-spin` with border colors
- **Skeleton Loading**: Gray placeholder blocks
- **Button Loading**: Icon replacement during async
- **Table Loading**: Overlay with spinner
- **Page Loading**: Full-page loading indicator

### Loading Components
- **Spinner**: `h-4 w-4 animate-spin rounded-full border-2 border-[#F59B0F] border-t-transparent`
- **Loading Text**: "Loading..." with spinner
- **Progress Indicators**: Bar or circular progress
- **Skeleton Screens**: Gray blocks for content placeholders

---

## Empty States

### Empty State Patterns
- **Icon**: Large icon or illustration
- **Message**: Descriptive text
- **Action**: Primary action button
- **Variants**: Different states for different contexts

### Empty State Components
- **No Data**: "No results found" message
- **No Items**: "No items yet" with add button
- **No Filters**: "No results match your filters"
- **Error State**: Error message with retry button

---

## Icons

### Icon Libraries
- **Heroicons**: Primary icon set (@heroicons/react)
- **React Icons**: Additional icons (react-icons)
- **Custom Icons**: Brand-specific icons

### Icon Patterns
- **Size Consistency**: `w-5 h-5` for standard icons
- **Color**: Brand colors or gray for neutral icons
- **Stroke Width**: Consistent stroke widths
- **Hover Effects**: Color change on hover
- **Accessibility**: Aria labels for icon-only buttons

---

## Component Hierarchy

### Layout Level
1. **Page Layout**: DeliveryPanel, AdvancePanel
2. **Navigation**: Sidebar, TopBar, NavBar
3. **Main Content**: Outlet wrapper with padding

### Component Level
1. **Sections**: Dashboard sections, form sections
2. **Cards**: Product cards, stat cards, info cards
3. **Lists**: Table rows, notification items
4. **Elements**: Buttons, inputs, badges

### Atomic Level
1. **Icons**: Individual icon components
2. **Typography**: Text components
3. **Decorative**: Dividers, spacers, backgrounds

---

## Responsive Behavior

### Breakpoints
- **Mobile**: Default (< 640px)
- **Tablet**: `sm:` (640px+)
- **Desktop**: `md:` (768px+)
- **Large Desktop**: `lg:` (1024px+)
- **Extra Large**: `xl:` (1280px+)

### Responsive Patterns
- **Mobile-First**: Base styles for mobile, enhanced for larger screens
- **Stacked Layouts**: Flex column on mobile, row on desktop
- **Hidden Elements**: `hidden lg:block` for desktop-only content
- **Grid Adjustments**: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`
- **Typography Scaling**: `text-sm sm:text-base lg:text-lg`
- **Spacing Adjustments**: `p-4 sm:p-6 lg:p-8`

### Touch Optimizations
- **Larger Touch Targets**: Minimum 44px for buttons
- **Swipe Gestures**: For carousel navigation
- **Scroll Behavior**: Smooth scrolling for anchor links
- **Viewport Meta**: Proper viewport configuration

---

# Why This Design Feels Modern

## 1. Gradient-Rich Color System
- Extensive use of gradients instead of flat colors
- Smooth color transitions create depth and visual interest
- Brand-consistent gradient palette across all components

## 2. Generous Whitespace
- Large padding and margins create breathing room
- Spacious card layouts prevent visual clutter
- Proper line heights for improved readability

## 3. Subtle Animations
- Smooth transitions on hover states
- Scale transforms for interactive elements
- Fade-in animations for content loading
- Micro-interactions provide visual feedback

## 4. Rounded Corners
- Consistent use of `rounded-xl` and `rounded-2xl`
- Softer, friendlier aesthetic compared to sharp corners
- Modern card-based UI patterns

## 5. Shadow Depth
- Layered shadows for visual hierarchy
- Hover states enhance shadow for depth perception
- Subtle shadows for elegance, not harsh contrasts

## 6. Glassmorphism Effects
- Backdrop blur for overlays (`backdrop-blur-xl`)
- Semi-transparent backgrounds for modern feel
- Layered visual design

## 7. Custom Form Controls
- Styled form inputs with brand colors
- Custom select dropdowns (react-select)
- Focus states with ring effects

## 8. Responsive Design
- Mobile-first approach
- Adaptive layouts for all screen sizes
- Touch-optimized interactions

## 9. Icon-Driven UI
- Consistent icon usage throughout
- Icon + text combinations for clarity
- Visual hierarchy through icon size and color

## 10. Brand Consistency
- Logo-inspired color palette
- Consistent use of brand orange-red gradient
- Unified visual language across components

---

# Reusable Design Patterns

## Layout Patterns
1. **Card Grid**: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6`
2. **Flex Row**: `flex items-center justify-between gap-4`
3. **Flex Column**: `flex flex-col gap-4`
4. **Stacked Layout**: `space-y-4` for vertical spacing
5. **Container**: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`

## Component Patterns
1. **Gradient Button**: `bg-linear-to-r from-[#F59B0F] to-[#AC6C2A]`
2. **Hover Card**: `hover:shadow-2xl hover:-translate-y-0.5`
3. **Icon Button**: `p-2 rounded-lg hover:bg-orange-50`
4. **Badge**: `rounded-full bg-[#F59B0F] text-white px-2 py-0.5`
5. **Status Indicator**: Color-coded dot or badge

## Form Patterns
1. **Input Group**: Label + Input + Error Message
2. **Field Grid**: `grid grid-cols-1 md:grid-cols-2 gap-4`
3. **Select Field**: Custom react-select styling
4. **Checkbox Group**: Flex layout with checkboxes
5. **Form Actions**: Right-aligned button group

## Navigation Patterns
1. **Sidebar Item**: Icon + Label + Badge + Chevron
2. **Navbar Link**: Hover state with underline
3. **Breadcrumb**: Separator-based navigation
4. **Tab Navigation**: Active state indicator
5. **Pagination**: Previous/Next with page info

## Feedback Patterns
1. **Loading Spinner**: `animate-spin rounded-full border-2`
2. **Error Message**: Red text with shake animation
3. **Success Toast**: Green background with checkmark
4. **Warning Alert**: Yellow background with icon
5. **Info Alert**: Blue background with icon

## Data Display Patterns
1. **Table Row**: Hover state with action menu
2. **Card List**: Grid of cards with consistent spacing
3. **Stat Card**: Icon + Value + Label
4. **Timeline**: Vertical line with milestone markers
5. **Chart Card**: Chart with header and legend

## Modal Patterns
1. **Dialog Modal**: Overlay + Container + Header + Body + Footer
2. **Side Panel**: Slide-in panel from right
3. **Bottom Sheet**: Mobile-friendly bottom sheet
4. **Fullscreen Modal**: Full-screen overlay
5. **Confirm Dialog**: Yes/Cancel buttons

## Responsive Patterns
1. **Mobile Stack**: Column layout on mobile, row on desktop
2. **Hidden Elements**: `hidden lg:block` for desktop-only
3. **Typography Scale**: `text-sm sm:text-base lg:text-lg`
4. **Grid Adaptation**: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`
5. **Touch Targets**: Minimum 44px for mobile buttons

---

# What Makes This UI Visually Better Than Traditional Bootstrap Dashboard

## 1. Custom Color System vs. Bootstrap Defaults
- **DeliveryYa**: Logo-inspired orange-red gradient palette
- **Bootstrap**: Generic blue/primary color system
- **Advantage**: Stronger brand identity and visual distinction

## 2. Modern Spacing vs. Bootstrap Spacing
- **DeliveryYa**: Generous padding, large gaps, breathing room
- **Bootstrap**: Tight spacing, compact layouts
- **Advantage**: More luxurious, less cluttered appearance

## 3. Custom Shadows vs. Bootstrap Shadows
- **DeliveryYa**: Layered shadows with hover enhancement
- **Bootstrap**: Flat, uniform shadows
- **Advantage**: Greater depth perception and visual hierarchy

## 4. Gradient Usage vs. Flat Colors
- **DeliveryYa**: Extensive gradient use for depth
- **Bootstrap**: Primarily flat colors
- **Advantage**: More dynamic, modern visual appeal

## 5. Rounded Corners vs. Bootstrap Corners
- **DeliveryYa**: `rounded-xl` and `rounded-2xl` throughout
- **Bootstrap**: `rounded` or `rounded-lg` (less rounded)
- **Advantage**: Softer, friendlier aesthetic

## 6. Custom Animations vs. Bootstrap Animations
- **DeliveryYa**: Custom animations (slideDown, fadeIn, shake)
- **Bootstrap**: Basic fade/slide animations
- **Advantage**: More polished, delightful interactions

## 7. Glassmorphism vs. Solid Backgrounds
- **DeliveryYa**: Backdrop blur, semi-transparent overlays
- **Bootstrap**: Solid backgrounds only
- **Advantage**: More sophisticated, layered design

## 8. Custom Form Controls vs. Bootstrap Forms
- **DeliveryYa**: Styled inputs with brand colors, custom selects
- **Bootstrap**: Generic form controls
- **Advantage**: Better integration with overall design system

## 9. Icon System vs. Bootstrap Icons
- **DeliveryYa**: Heroicons + React Icons for variety
- **Bootstrap**: Bootstrap Icons (limited set)
- **Advantage**: More icon options, consistent style

## 10. Responsive Strategy vs. Bootstrap Grid
- **DeliveryYa**: Mobile-first with custom breakpoints
- **Bootstrap**: 12-column grid system
- **Advantage**: More flexible, adaptive layouts

## 11. Card Design vs. Bootstrap Cards
- **DeliveryYa**: Rounded corners, hover effects, image zoom
- **Bootstrap**: Basic card component
- **Advantage**: More engaging, interactive cards

## 12. Typography Scale vs. Bootstrap Typography
- **DeliveryYa**: Custom type scale with gradient text
- **Bootstrap**: Standard heading/body hierarchy
- **Advantage**: More expressive, brand-aligned typography

## 13. Loading States vs. Bootstrap Spinners
- **DeliveryYa**: Custom spinners, skeleton screens
- **Bootstrap**: Basic spinner component
- **Advantage**: Better perceived performance

## 14. Empty States vs. Bootstrap Defaults
- **DeliveryYa**: Designed empty states with actions
- **Bootstrap**: No built-in empty states
- **Advantage**: Better user guidance

## 15. Component Consistency vs. Bootstrap Modularity
- **DeliveryYa**: Unified design language across all components
- **Bootstrap**: Mix of component styles
- **Advantage**: Cohesive, professional appearance

---

# Design Language Document

## Design Principles

### 1. Brand-First Design
- All design decisions rooted in brand identity
- Logo-inspired color palette as foundation
- Consistent brand gradient usage throughout

### 2. User-Centric Approach
- Generous whitespace for readability
- Clear visual hierarchy
- Intuitive navigation patterns

### 3. Modern Aesthetic
- Gradient-rich color system
- Rounded corners for friendliness
- Subtle animations for polish

### 4. Performance-Focused
- System fonts for fast loading
- Optimized animations
- Efficient component rendering

### 5. Accessibility-First
- WCAG AA contrast ratios
- Keyboard navigation support
- Screen reader friendly

## Design Tokens

### Colors
```css
--primary-gradient: linear-gradient(90deg, #F59B0F, #AC6C2A);
--primary-color: #FF6347;
--secondary-color: #FF4500;
--accent-color: #FF7F50;
--text-primary: #1A1F3A;
--text-secondary: #2C3E50;
--border-color: #E5E7EB;
--background-primary: #FFFFFF;
--background-secondary: #F9FAFB;
```

### Spacing
```css
--spacing-xs: 0.5rem;
--spacing-sm: 0.75rem;
--spacing-md: 1rem;
--spacing-lg: 1.5rem;
--spacing-xl: 2rem;
--spacing-2xl: 3rem;
```

### Border Radius
```css
--radius-sm: 0.5rem;
--radius-md: 0.75rem;
--radius-lg: 1rem;
--radius-xl: 1.25rem;
--radius-2xl: 1.5rem;
--radius-full: 9999px;
```

### Shadows
```css
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
--shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
--shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.1);
--shadow-2xl: 0 25px 50px rgba(0, 0, 0, 0.25);
```

### Transitions
```css
--transition-fast: 150ms ease-in-out;
--transition-base: 300ms ease-in-out;
--transition-slow: 500ms ease-in-out;
```

## Component Guidelines

### Buttons
- Use gradient buttons for primary actions
- Use outline buttons for secondary actions
- Use ghost buttons for tertiary actions
- Include icons for visual clarity
- Add hover states with scale transform

### Cards
- Use `rounded-2xl` for modern appearance
- Add shadow depth with hover enhancement
- Include image zoom for product cards
- Use consistent padding (p-4 to p-6)
- Add subtle borders for definition

### Forms
- Use brand colors for focus states
- Add ring effects for focus indication
- Include clear error messages
- Use consistent label styling
- Add loading states for async operations

### Navigation
- Use gradient backgrounds for active states
- Include icons for visual recognition
- Add hover states with color change
- Use chevron icons for expandable items
- Include tooltips for collapsed states

### Typography
- Use gradient text for brand emphasis
- Include uppercase tracking for labels
- Use consistent line heights
- Add text truncation for long content
- Scale appropriately for breakpoints

## Animation Guidelines

### Micro-interactions
- Button hover: Scale transform (1.05)
- Card hover: Lift effect (-0.5px)
- Input focus: Ring expansion
- Icon hover: Color change

### Page Transitions
- Fade in: 300ms ease-in-out
- Slide up: 400ms ease-out
- Slide down: 400ms ease-out
- Scale in: 200ms ease-out

### Loading States
- Spinner: Continuous rotation
- Skeleton: Pulse animation
- Progress bar: Smooth fill
- Shimmer: Gradient movement

## Responsive Guidelines

### Breakpoints
- Mobile: < 640px (base)
- Tablet: 640px - 1023px (sm, md)
- Desktop: 1024px - 1279px (lg)
- Large: 1280px+ (xl, 2xl)

### Mobile Strategy
- Stack layouts vertically
- Hide non-essential elements
- Larger touch targets (44px minimum)
- Simplified navigation
- Optimized images

### Desktop Strategy
- Horizontal layouts
- Multi-column grids
- Enhanced hover states
- Richer interactions
- Full feature set

## Accessibility Guidelines

### Color Contrast
- WCAG AA compliance (4.5:1 ratio)
- Sufficient contrast for text
- Color not sole indicator
- Focus visible states

### Keyboard Navigation
- Tab order logical
- Focus indicators visible
- Skip links available
- Keyboard shortcuts documented

### Screen Readers
- Aria labels present
- Alt text for images
- Semantic HTML
- Error announcements

## Performance Guidelines

### Optimization
- System fonts (no web fonts)
- Optimized images
- Lazy loading components
- Debounced inputs
- Efficient re-renders

### Loading Strategy
- Progressive enhancement
- Skeleton screens
- Loading states
- Error boundaries
- Graceful degradation

---

**Report Generated**: July 31, 2026  
**System**: DeliveryYa React + Tailwind Delivery Management System  
**Analysis Scope**: Complete UI Design System  
