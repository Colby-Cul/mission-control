# Mission Control Navigation Redesign

## Overview
The newly redesigned navigation system for the Mission Control dashboard incorporates a streamlined architecture to support the CMD-1 through CMD-10 structure effectively.

## Command Structure

- **CMD-1: Executive Overview**
  - Focus: High-level metrics, summaries
  - Always visible

- **CMD-2: Entity Map**
  - Focus: Visual representation of entities
  - Default collapsed

- **CMD-3: Revenue Command**
  - Focus: Revenue tracking and management
  - Default collapsed

- **CMD-4: Expense & Efficiency**
  - Focus: Expense analysis
  - Default collapsed

- **CMD-5: Cash Flow & Finance**
  - Focus: Cash flow management
  - Always visible

- **CMD-6: Investing & Capital Allocation**
  - Focus: Investment tracking
  - Default collapsed

- **CMD-7: Operations & Automation**
  - Focus: Operational efficiency
  - Default collapsed

- **CMD-8: Strategic Initiatives**
  - Focus: Strategic planning
  - Default collapsed

- **CMD-9: Risk & Exposure**
  - Focus: Risk management
  - Default collapsed

- **CMD-10: Memory & Decisions**
  - Focus: Decision logs
  - Always visible

## Information Hierarchy
The navigation emphasizes essential metrics and high-level views that require frequent monitoring, keeping most in-depth information collapsed by default.

## Navigation Component Structure
- **Component Names:** Sidebar.jsx, NavLink.jsx
- **Routing Paths:** `/cmd-1`, `/cmd-2`, ..., `/cmd-10`

## Design Aesthetics
- **Theme:** Dark theme with highlighted accents for active command
- **Interaction Patterns:** Click to expand/collapse command categories

## Next Steps
1. **Implementation**: Convert specs into active components.
2. **Testing**: Verify functionality across different screen sizes.

---
End of Design Spec.