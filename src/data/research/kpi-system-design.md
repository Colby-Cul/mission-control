# KPI System Design — All Businesses & Entities
**Task:** 27596f21 | **Priority:** P1 | **Project:** mc-expansion  
**Status:** Completed 2026-04-20 | **Agent:** pulse (Pierce - Performance Analyst)

---

## Overview

Unified KPI framework spanning all Culbertson & Gray Group operating entities. Designed for Mission Control dashboard integration across Executive Overview, Revenue Command, and Finance Command layers.

---

## Entity Structure

| Entity | Type | Primary KPI Category |
|--------|------|---------------------|
| California Luxury Stays (Airbnb/VRBO) | STR Portfolio | Revenue + Occupancy |
| Culbertson & Gray Group | Holding Co. | Financial Health |
| Investing Portfolio | Capital Allocation | Returns + Equity |
| Real Estate Holdings | Property | Asset Performance |

---

## 1. Short-Term Rental KPIs (California Luxury Stays)

### Revenue Metrics
| KPI | Formula | Benchmark (2026) | Update Frequency |
|-----|---------|-----------------|-----------------|
| ADR (Avg Daily Rate) | Total Revenue ÷ Booked Nights | $350–$700 (Tahoe) | Daily |
| Occupancy Rate | Booked Nights ÷ Available Nights × 100 | 45–65% annual | Daily |
| RevPAR | ADR × Occupancy Rate | $184 (South Lake Tahoe avg) | Daily |
| RevPAN (Revenue Per Available Night) | Total Revenue ÷ Total Nights Available | Dynamic | Daily |
| Monthly Gross Revenue | Sum of all bookings in period | Target: $11,990+/mo | Monthly |
| Net Operating Income (NOI) | Gross Revenue − Operating Expenses | >40% margin | Monthly |

### Operational Metrics
| KPI | Formula | Target |
|-----|---------|--------|
| Guest Review Score | Avg rating across platforms | ≥4.8 / 5.0 |
| Response Rate | Replied inquiries ÷ Total inquiries | ≥95% |
| Booking Lead Time | Days between booking and check-in | 14–45 days |
| Avg Length of Stay | Total nights ÷ Bookings | ≥3 nights |
| Cancellation Rate | Cancelled bookings ÷ Total bookings | <5% |
| Repeat Guest Rate | Repeat guests ÷ Total guests | >15% |

### Competitive Position Metrics
| KPI | Data Source | Benchmark |
|-----|------------|-----------|
| Market Occupancy Rank | AirDNA / PriceLabs | Top 25% in market |
| ADR vs Market ADR | PriceLabs Market Dashboard | Within ±10% |
| Listing Visibility Score | Platform-specific | Superhost maintained |

---

## 2. Real Estate Portfolio KPIs

### Asset Performance
| KPI | Formula | Target |
|-----|---------|--------|
| Cap Rate | NOI ÷ Property Value × 100 | 4–8% |
| Cash-on-Cash Return | Annual Pre-Tax Cash Flow ÷ Invested Cash | ≥8% |
| Total ROI | (Gain − Cost) ÷ Cost × 100 | ≥15% annualized |
| Gross Rent Multiplier (GRM) | Property Price ÷ Annual Gross Rent | <12 |
| Debt Service Coverage Ratio (DSCR) | NOI ÷ Annual Debt Service | ≥1.25 |
| Equity Multiple | Total Distributions ÷ Total Capital Invested | ≥2.0x |

### Portfolio Health
| KPI | Description | Target |
|-----|------------|--------|
| Portfolio LTV | Total Debt ÷ Total Property Value | <65% |
| Weighted Avg Cap Rate | Portfolio-level blended cap rate | ≥5.5% |
| Unrealized Gain | Current Value − Purchase Price | Tracked monthly |
| Annual Appreciation Rate | YoY property value change | Market-relative |

---

## 3. Holding Company / Entity-Level KPIs

### Financial Health
| KPI | Formula | Target |
|-----|---------|--------|
| EBITDA | Earnings before interest, tax, depreciation, amortization | Growing QoQ |
| Net Cash Flow | Operating CF − CapEx + Financing | Positive monthly |
| Liquidity Ratio | Current Assets ÷ Current Liabilities | ≥2.0 |
| Burn Rate | Monthly cash outflows (non-revenue) | Tracked |
| Revenue Concentration Risk | Largest revenue source ÷ Total revenue | <60% |

### Operational KPIs (Across Entities)
| KPI | Frequency | Owner |
|-----|-----------|-------|
| Tasks Completed on Time | Weekly | Jarvis (Main) |
| Agent Cost Efficiency | $/task | CFO Agent |
| Active Projects Health | Red/Yellow/Green | Mission Control |
| System Uptime | % availability | Ops Agent |

---

## 4. KPI Dashboard Architecture for Mission Control

### Command Layer Mapping
```
Executive Overview
├── Net Revenue (all entities, 30d rolling)
├── Portfolio Net Worth (real estate + investments)
├── Cash Position
├── YoY Revenue Growth %
├── Top 3 Risk Flags
└── Agent Efficiency Score

Revenue Command  
├── STR: ADR, Occupancy %, RevPAR (per property)
├── Booking Pipeline (30/60/90 day calendar)
├── Revenue vs Prior Year (same period)
├── Platform Split (Airbnb vs VRBO vs Direct)
└── Marketing ROI

Finance Command
├── P&L Summary
├── Cash Flow Waterfall
├── Expense Breakdown (top 5 categories)
├── Debt Obligations Schedule
└── Tax Position Estimate
```

### Data Refresh Cadence
| Data Type | Refresh | Source |
|-----------|---------|--------|
| Booking/Revenue | Daily | Lodgify API |
| Property Values | Monthly | Zillow/Redfin API |
| Market Benchmarks | Weekly | AirDNA/PriceLabs |
| Financial Statements | Monthly | QuickBooks |
| Portfolio Performance | Weekly | Calculated |

---

## 5. Implementation Recommendations

### Data Sources to Integrate
1. **Lodgify** — Booking and revenue data (API available)
2. **AirDNA** — Market benchmarks, competitive position ($67/mo)
3. **PriceLabs** — Dynamic pricing + market dashboard (already integrated)
4. **QuickBooks** — Financial statements
5. **Supabase** — Internal task/project KPIs (already live)

### React Component Architecture
```jsx
// KPI Card Component Pattern
<KPICard
  label="RevPAR"
  value={184}
  unit="$/night"
  trend="+12%"
  trendDirection="up"
  benchmark={184}
  benchmarkLabel="Market Avg"
  commandLayer="revenue"
/>
```

### Priority Build Order
1. STR Revenue KPIs (highest business impact)
2. Portfolio financial health metrics
3. Competitive market positioning
4. Entity-level consolidated view

---

## 6. Alert Thresholds

| KPI | Alert Condition | Severity |
|-----|----------------|---------|
| Occupancy Rate | <35% (30-day trailing) | HIGH |
| Review Score | <4.7 | HIGH |
| Cash Position | <$25K | CRITICAL |
| DSCR | <1.1 | CRITICAL |
| Cancellation Rate | >8% | MEDIUM |
| RevPAR vs Market | >20% below market avg | MEDIUM |

---

*Deliverable for Mission Control Expansion Directive — mc-expansion project*
