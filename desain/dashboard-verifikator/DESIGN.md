---
name: Institutional Trust System
colors:
  surface: '#f9f9ff'
  surface-dim: '#cfdaf1'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f3ff'
  surface-container: '#e7eeff'
  surface-container-high: '#dee8ff'
  surface-container-highest: '#d8e3fa'
  on-surface: '#111c2c'
  on-surface-variant: '#43474e'
  inverse-surface: '#263142'
  inverse-on-surface: '#ebf1ff'
  outline: '#74777f'
  outline-variant: '#c4c6cf'
  surface-tint: '#455f88'
  primary: '#002045'
  on-primary: '#ffffff'
  primary-container: '#1a365d'
  on-primary-container: '#86a0cd'
  inverse-primary: '#adc7f7'
  secondary: '#1960a3'
  on-secondary: '#ffffff'
  secondary-container: '#7db6ff'
  on-secondary-container: '#00477f'
  tertiary: '#1b2127'
  on-tertiary: '#ffffff'
  tertiary-container: '#30363c'
  on-tertiary-container: '#989fa6'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d6e3ff'
  primary-fixed-dim: '#adc7f7'
  on-primary-fixed: '#001b3c'
  on-primary-fixed-variant: '#2d476f'
  secondary-fixed: '#d3e4ff'
  secondary-fixed-dim: '#a2c9ff'
  on-secondary-fixed: '#001c38'
  on-secondary-fixed-variant: '#004881'
  tertiary-fixed: '#dde3eb'
  tertiary-fixed-dim: '#c1c7cf'
  on-tertiary-fixed: '#161c22'
  on-tertiary-fixed-variant: '#41474e'
  background: '#f9f9ff'
  on-background: '#111c2c'
  surface-variant: '#d8e3fa'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 16px
  md: 24px
  lg: 32px
  xl: 48px
  container-max: 1280px
  gutter: 24px
---

## Brand & Style
The design system is engineered to project absolute authority, security, and administrative efficiency. Targeted at government contractors, procurement officers, and legal auditors, the UI prioritizes clarity and structured information over aesthetic flair. 

The visual style is **Corporate / Modern**, leaning heavily into high-functioning utility. It utilizes a disciplined application of whitespace to reduce cognitive load during complex document reviews. The emotional response is one of reliability and "officialness," achieved through a rigid adherence to alignment, a restrained color palette, and high-contrast typography. Decorative elements are eliminated in favor of functional indicators and clear semantic signaling.

## Colors
This design system utilizes a high-contrast palette centered on "Institutional Blue" (#1a365d) to signify stability and government authority. 

- **Primary:** Used for the main navigation bar, primary action buttons, and active state indicators.
- **Secondary:** Used for interactive elements like links and secondary buttons to provide visual distinction without breaking the formal tone.
- **Neutral/Greys:** A scale of cool greys is used for borders, secondary text, and background sectioning to maintain a clean, organized appearance.
- **Semantic Palette:** Status colors (Green, Orange, Red, Blue) are slightly desaturated to maintain professionalism while ensuring high visibility for document statuses.

## Typography
Inter is the exclusive typeface for this design system, chosen for its exceptional legibility in data-heavy environments and its neutral, systematic character.

- **Headlines:** Use Bold (700) or SemiBold (600) weights with slight negative letter-spacing to create a sense of grounded authority.
- **Body Text:** Standardized at 16px for optimal readability. Use a line height of 1.5x for long-form document descriptions.
- **Labels:** Small caps or medium-weight labels are used for form headers and table headers to distinguish them from user-generated content.
- **Hierarchy:** Maintain a strict vertical rhythm. Large headlines should only be used for page titles and major section headers.

## Layout & Spacing
The layout follows a **Fixed Grid** model for administrative dashboards to ensure consistency across different user roles. 

- **Split-Screen Layout:** For document verification, use a 60/40 split. The left pane (60%) hosts the document viewer/PDF, and the right pane (40%) contains the verification checklist, data fields, and status controls.
- **Grid System:** A 12-column grid is used for standard pages.
- **Data Density:** Use "Medium" density spacing (16px gutters) for general navigation, but switch to "High" density (8px vertical padding) within data tables and form groups to maximize information visibility without scrolling.
- **Breakpoints:** 
  - Mobile (< 768px): Single column, full-width components.
  - Tablet (768px - 1024px): 8-column grid, stacked split-screen.
  - Desktop (> 1024px): Full 12-column grid, persistent sidebars.

## Elevation & Depth
Depth is used sparingly to maintain a flat, professional "paper-like" feel. This design system avoids heavy shadows, instead using **Tonal Layers** and **Low-contrast outlines**.

- **Level 0 (Background):** Light grey (#f7fafc) to separate the interface from the browser.
- **Level 1 (Surface):** Pure white (#ffffff) for the primary content cards and table containers. Defined by a 1px border in #e2e8f0.
- **Level 2 (Interaction):** Very soft, subtle shadows (0px 2px 4px rgba(0,0,0,0.05)) are used only for active dropdowns, modals, or floating action buttons to indicate temporary elevation above the workspace.
- **Separators:** Use 1px solid lines in #edf2f7 for internal divisions within cards and lists.

## Shapes
The shape language is "Soft" (0.25rem), prioritizing a sharp, disciplined look while slightly softening the corners to appear modern and accessible.

- **Standard Elements:** Buttons, input fields, and small cards use a 4px (0.25rem) radius.
- **Container Elements:** Large content areas or page sections use 8px (0.5rem) to provide a clear structural boundary.
- **Interactive States:** Focus rings should be sharp and high-contrast, using the primary blue color with a 2px offset.

## Components
- **Buttons:** Primary buttons are solid #1a365d with white text. Secondary buttons use a primary blue outline. Ghost buttons are reserved for "Cancel" or "Go Back" actions.
- **Status Badges:** Use a "Pill" shape with a light tinted background and dark text for readability:
  - *Approved:* Green background (10% opacity), Green text.
  - *Waiting:* Blue background (10% opacity), Blue text.
  - *Revision Needed:* Orange background (10% opacity), Orange text.
  - *Rejected:* Red background (10% opacity), Red text.
- **Data Tables:** Headers must be sticky with a subtle grey background. Row hovering should trigger a light blue highlight. Include a "Verification" column with a checkbox and status indicator.
- **Input Fields:** Use labeled, bordered boxes. Error states must include a 2px red left-border and a descriptive helper text below the field.
- **Verification Checklist:** A specialized list component with large checkboxes and a "Comment" trigger for each item, used exclusively in the split-screen sidebar.