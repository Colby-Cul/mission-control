# Competitive Intelligence & Market Position Module
**Task:** 63a8045f | **Priority:** P1 | **Project:** mc-expansion  
**Status:** Completed 2026-04-20 | **Agent:** lens (Marlowe - Market Research Analyst)

---

## Overview

Design specification for the Competitive Intelligence module within the Executive Overview command layer. This module tracks Culbertson & Gray Group's market position relative to competing STR operators in Tahoe, Graeagle, and Northstar markets.

---

## Market Context (2026 Research Findings)

### Lake Tahoe / Truckee STR Market
- **South Lake Tahoe (AirROI 2026 dataset)**
  - Average Annual Revenue: $52,261/property
  - Average Nightly Rate: $496
  - Market Occupancy: 34.9%
  - Market RevPAR: $184
- **North Tahoe / Truckee corridor**
  - Median property prices: $900K–$1.3M (vacation-rental-suitable)
  - Heavy ski season concentration (Dec–Mar) + summer peak
  - Primary competition: Palisades Tahoe proximate listings
- **Global market context**
  - Vacation rentals market: $195.45B in 2026 (up from $174.84B in 2025)
  - 12% YoY sector growth — premium markets outperforming

### Key Competitors
| Category | Examples | Our Exposure |
|----------|---------|--------------|
| Professional PMCs | Vacasa, Evolve, AvantStay | Direct competition |
| Individual superhosts | 4.9+ rated local hosts | Rate compression |
| Hotels/Resorts | Hyatt Tahoe, Resort at Squaw Creek | Alternative lodging |
| VRBO-dominant operators | VRBO-exclusive hosts | Platform risk |

---

## Module Design: Competitive Intelligence Dashboard

### Section 1: Market Position Scorecard

```
┌─────────────────────────────────────────────────────┐
│  MARKET POSITION — TAHOE CORRIDOR                   │
│                                                     │
│  Our ADR: $___    Market ADR: $496    Delta: +/-_%  │
│  Our Occ: ___%    Market Occ: 34.9%   Rank: Top __% │
│  Our RevPAR: $__  Market RevPAR: $184  Index: ___   │
│                                                     │
│  [ABOVE MARKET] [AT MARKET] [BELOW MARKET]          │
└─────────────────────────────────────────────────────┘
```

### Section 2: Competitive Landscape Widgets

| Widget | Data Source | Refresh |
|--------|------------|---------|
| Market ADR Trend (90d) | AirDNA API / PriceLabs | Weekly |
| Top 10 Competitor Listings | AirDNA comp set | Weekly |
| Our Ranking vs Market | PriceLabs Market Dashboard | Daily |
| New Listings Entering Market | AirDNA supply tracker | Weekly |
| Platform Distribution (Airbnb vs VRBO) | AirDNA | Monthly |
| Booking Window vs Market | PriceLabs | Weekly |

### Section 3: SWOT Position Tracker

**Auto-generated from data, updated monthly:**

```
STRENGTHS                    WEAKNESSES
• RevPAR Index > 1.0        • [Auto-flag if below market]
• Review Score ≥ 4.8        • [Flag if review trend down]
• Superhost status          • [Flag if at risk]

OPPORTUNITIES               THREATS
• Seasonal gap pricing      • New supply entering market
• Direct booking capture    • Platform policy changes
• Upsell ancillary services • Regulatory (STR ordinances)
```

### Section 4: Regulatory Risk Monitor

| Market | STR Regulation Status | Permit Required | Risk Level |
|--------|----------------------|-----------------|------------|
| South Lake Tahoe | Active permit system | Yes | MEDIUM |
| Tahoe City | Restricted new permits | Yes | HIGH |
| Truckee | Permit required | Yes | MEDIUM |
| Graeagle | Minimal regulation | No | LOW |
| Northstar | HOA-dependent | Varies | MEDIUM |

---

## Data Integration Architecture

### Recommended APIs / Tools
1. **AirDNA** (Primary) — `airdna.co/api`
   - Endpoint: `/v1/rentalizer` for property-level benchmarks
   - Endpoint: `/v1/market` for market-level stats
   - Cost: ~$300/mo for API access; market reports at $40/report
   
2. **PriceLabs Market Dashboards** (Already integrated)
   - Provides occupancy data within configurable radius
   - Includes ADR, RevPAR, booking window, LOS

3. **KeyData Dashboard** (Optional)
   - PMC-focused competitive analysis
   - Better for multi-property operators

4. **Brave Search / Web Scraping** (Fallback)
   - Monthly competitive snapshots via agent
   - Airbnb market searches in target markets

### Data Schema (Supabase)
```sql
CREATE TABLE market_benchmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market VARCHAR(100),  -- 'south-lake-tahoe', 'tahoe-city', etc.
  period DATE,
  avg_adr DECIMAL(10,2),
  avg_occupancy DECIMAL(5,2),
  avg_revpar DECIMAL(10,2),
  avg_los DECIMAL(4,1),
  avg_booking_window INT,
  total_active_listings INT,
  source VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE competitive_position (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id VARCHAR(100),
  period DATE,
  our_adr DECIMAL(10,2),
  market_adr DECIMAL(10,2),
  adr_index DECIMAL(5,2),  -- our_adr / market_adr
  our_occupancy DECIMAL(5,2),
  market_occupancy DECIMAL(5,2),
  occ_index DECIMAL(5,2),
  our_revpar DECIMAL(10,2),
  market_revpar DECIMAL(10,2),
  revpar_index DECIMAL(5,2),
  market_rank_pct INT,  -- top X% in market
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## React Component Specs

### CompetitiveIntelligencePanel
```jsx
// Primary command layer component
<CompetitiveIntelligencePanel
  market="south-lake-tahoe"
  properties={propertyIds}
  refreshInterval={86400000}  // 24hr
>
  <MarketPositionScorecard />
  <CompetitorBenchmarkChart timeRange="90d" />
  <SWOTMatrix autoRefresh={true} />
  <RegulatoryRiskTable markets={activeMarkets} />
  <MarketSupplyTrend />
</CompetitiveIntelligencePanel>
```

### Visual Design
- **Market Position**: Color-coded badge (green = above, yellow = at, red = below market)
- **Trend Charts**: Line charts for ADR/Occupancy vs market over 90d
- **Supply Monitor**: Bar chart showing new listing count vs prior periods
- **Regulatory**: Traffic-light indicators per market

---

## Implementation Priority

1. **Phase 1 (Quick Win)** — Manual data entry from PriceLabs + AirDNA monthly reports into competitive_position table; display in dashboard
2. **Phase 2** — PriceLabs Market Dashboard API integration (automated weekly pulls)
3. **Phase 3** — AirDNA API for real-time competitor tracking
4. **Phase 4** — Regulatory alert monitoring via web agent

---

## Key Insights for Executive Overview

- **South Lake Tahoe**: $184 RevPAR market average provides our baseline; target RevPAR index > 1.15
- **Supply growth risk**: Tahoe City restricting new permits = favorable for existing operators
- **Global market tailwind**: $195B+ industry growing 12% YoY — pricing power intact
- **Dual season advantage**: Ski + summer reduces seasonal revenue volatility vs single-season markets

---

*Deliverable for Mission Control Expansion Directive — mc-expansion project*
