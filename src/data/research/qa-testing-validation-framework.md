# QA & Testing Validation Framework — Mission Control Command Layers
**Task:** 86b6b33c | **Priority:** P1 | **Project:** mc-expansion  
**Status:** Completed 2026-04-20 | **Agent:** sentinel (Quentin - QA Validator)

---

## Overview

Defines the testing and validation framework for all 10 Mission Control command layers. This framework ensures data accuracy, UI integrity, and agent output quality across the full system.

---

## The 10 Command Layers to Validate

| # | Command Layer | Primary Data Risk | Test Priority |
|---|--------------|-------------------|---------------|
| 1 | Executive Overview | Stale aggregated data | HIGH |
| 2 | Revenue Command | Booking sync failures | CRITICAL |
| 3 | Finance Command | Calculation errors | CRITICAL |
| 4 | Operations Command | Task state drift | HIGH |
| 5 | Investing Command (CMD-6) | Portfolio valuation lag | HIGH |
| 6 | Marketing Command | Attribution model drift | MEDIUM |
| 7 | Risk Command | Alert threshold drift | HIGH |
| 8 | Strategic Initiatives | Milestone tracking gaps | MEDIUM |
| 9 | People & Org Command | Roster sync | LOW |
| 10 | Agent Ops Command | Agent performance metrics | MEDIUM |

---

## 1. Testing Framework Architecture

### Stack Recommendation
```
Unit Tests:          Vitest + React Testing Library
Integration Tests:   Vitest + MSW (Mock Service Worker) for API mocking
E2E Tests:           Playwright (browser automation)
Data Validation:     Custom Supabase validators + Great Expectations pattern
CI/CD:               GitHub Actions
Monitoring:          Monte Carlo Data (data observability) pattern
```

### Test Pyramid
```
        ╔══════╗
        ║  E2E ║  5%  — Critical user flows only
       ╔══════════╗
       ║Integration║  25% — API contracts, data transforms
      ╔════════════════╗
      ║   Unit Tests    ║  70% — KPI calculations, formatters, validators
      ╚════════════════╝
```

---

## 2. Data Quality Validation Rules (All Command Layers)

### Universal Rules (Apply to Every KPI)
```typescript
interface DataQualityCheck {
  completeness: boolean;    // No null values for required fields
  freshness: boolean;       // Last updated within defined SLA
  validity: boolean;        // Value within expected range
  consistency: boolean;     // Matches source-of-truth
  uniqueness: boolean;      // No duplicate records in period
}

// Staleness SLAs by command layer
const FRESHNESS_SLAS = {
  'executive-overview': 24 * 60,    // 24 hours (minutes)
  'revenue-command': 60,            // 1 hour
  'finance-command': 24 * 60,       // 24 hours
  'operations-command': 15,         // 15 minutes
  'investing-command': 4 * 60,      // 4 hours
  'marketing-command': 24 * 60,     // 24 hours
  'risk-command': 30,               // 30 minutes
};
```

### Revenue Command Validation
```typescript
// Critical financial validations
const validateRevenueData = (data: RevenueRecord) => {
  const checks = [];
  
  // ADR must be > $0 and < $10,000 (sanity bounds)
  checks.push({ name: 'adr_range', pass: data.adr > 0 && data.adr < 10000 });
  
  // Occupancy must be 0-100%
  checks.push({ name: 'occupancy_range', pass: data.occupancy >= 0 && data.occupancy <= 100 });
  
  // RevPAR = ADR × Occupancy (calculated consistency check)
  const expectedRevPAR = data.adr * (data.occupancy / 100);
  checks.push({ 
    name: 'revpar_consistency', 
    pass: Math.abs(data.revpar - expectedRevPAR) < 0.01 
  });
  
  // Revenue must match sum of bookings
  checks.push({ name: 'revenue_bookings_match', pass: validateBookingSum(data) });
  
  return checks;
};
```

### Finance Command Validation
```typescript
// Accounting identity checks
const validateFinancialData = (data: FinancialRecord) => {
  // Assets = Liabilities + Equity (balance sheet check)
  const balanceSheetBalances = Math.abs(
    data.totalAssets - (data.totalLiabilities + data.totalEquity)
  ) < 0.01;
  
  // Net Income = Revenue - Expenses
  const incomeStatementBalances = Math.abs(
    data.netIncome - (data.totalRevenue - data.totalExpenses)
  ) < 0.01;
  
  return { balanceSheetBalances, incomeStatementBalances };
};
```

---

## 3. Test Suite by Command Layer

### Executive Overview Tests
```typescript
describe('Executive Overview - KPI Aggregation', () => {
  it('should aggregate revenue from all entities', async () => {
    const overview = await fetchExecutiveOverview();
    const individualRevenues = await fetchAllEntityRevenues();
    const sum = individualRevenues.reduce((a, b) => a + b.revenue, 0);
    expect(Math.abs(overview.totalRevenue - sum)).toBeLessThan(0.01);
  });
  
  it('should flag stale data after 24 hours', async () => {
    const overview = await fetchExecutiveOverview();
    const staleness = Date.now() - new Date(overview.lastUpdated).getTime();
    expect(staleness).toBeLessThan(24 * 60 * 60 * 1000);
  });
  
  it('should show correct YoY growth calculation', async () => {
    const current = await fetchRevenue({ period: 'current-year' });
    const prior = await fetchRevenue({ period: 'prior-year' });
    const expectedGrowth = ((current - prior) / prior) * 100;
    const displayed = await getDisplayedGrowthPct();
    expect(Math.abs(displayed - expectedGrowth)).toBeLessThan(0.1);
  });
});
```

### Revenue Command E2E Tests (Playwright)
```typescript
// playwright/revenue-command.spec.ts
test('Revenue Command loads and displays current metrics', async ({ page }) => {
  await page.goto('/mission-control/revenue');
  
  // Verify KPI cards render
  await expect(page.getByTestId('kpi-adr')).toBeVisible();
  await expect(page.getByTestId('kpi-occupancy')).toBeVisible();
  await expect(page.getByTestId('kpi-revpar')).toBeVisible();
  
  // Verify no NaN or null values displayed
  const adrValue = await page.getByTestId('kpi-adr-value').textContent();
  expect(adrValue).toMatch(/^\$[\d,]+(\.\d{2})?$/);
  
  // Verify data freshness indicator
  const freshness = await page.getByTestId('data-freshness').textContent();
  expect(freshness).not.toContain('Stale');
});

test('Revenue Command booking calendar loads', async ({ page }) => {
  await page.goto('/mission-control/revenue');
  await page.getByRole('tab', { name: 'Booking Calendar' }).click();
  await expect(page.getByTestId('booking-calendar')).toBeVisible();
  // Verify next 30 days have data loaded
  const bookings = await page.getByTestId('booking-slot').count();
  expect(bookings).toBeGreaterThan(0);
});
```

---

## 4. Automated Monitoring Rules

### Supabase Data Monitor (runs every 15 min via edge function)
```sql
-- Detect anomalous metric values
CREATE OR REPLACE FUNCTION check_data_quality()
RETURNS TABLE(check_name TEXT, status TEXT, details TEXT) AS $$
BEGIN
  -- Check: No revenue data older than 25 hours
  RETURN QUERY
  SELECT 
    'revenue_freshness'::TEXT,
    CASE WHEN MAX(updated_at) < NOW() - INTERVAL '25 hours' 
         THEN 'FAIL' ELSE 'PASS' END,
    'Last updated: ' || MAX(updated_at)::TEXT
  FROM bookings;
  
  -- Check: Occupancy values in valid range
  RETURN QUERY
  SELECT 
    'occupancy_validity'::TEXT,
    CASE WHEN COUNT(*) > 0 THEN 'FAIL' ELSE 'PASS' END,
    'Invalid records: ' || COUNT(*)::TEXT
  FROM daily_metrics
  WHERE occupancy_rate < 0 OR occupancy_rate > 100;
  
  -- Check: RevPAR consistency with ADR × Occupancy
  RETURN QUERY
  SELECT
    'revpar_consistency'::TEXT,
    CASE WHEN COUNT(*) > 0 THEN 'FAIL' ELSE 'PASS' END,
    'Inconsistent records: ' || COUNT(*)::TEXT
  FROM daily_metrics
  WHERE ABS(revpar - (adr * occupancy_rate / 100)) > 0.50;
END;
$$ LANGUAGE plpgsql;
```

### Alert Rules
| Rule | Condition | Action | Severity |
|------|-----------|--------|---------|
| Data Staleness | Any KPI > SLA threshold | Notify main agent | HIGH |
| Calculation Error | Math validation fails | Auto-alert + pause display | CRITICAL |
| Missing Data | Required field null | Show "No Data" badge | MEDIUM |
| Anomaly Detection | Value > 3σ from mean | Flag for human review | MEDIUM |
| API Source Failure | 3+ consecutive failures | Switch to cached data | HIGH |

---

## 5. CI/CD Pipeline Integration

### GitHub Actions Workflow
```yaml
# .github/workflows/mission-control-qa.yml
name: Mission Control QA

on:
  push:
    branches: [master, main]
  schedule:
    - cron: '0 6 * * *'  # Daily 6am data quality check

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run test:unit
      
  integration-tests:
    runs-on: ubuntu-latest
    needs: unit-tests
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run test:integration
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
          
  e2e-tests:
    runs-on: ubuntu-latest
    needs: integration-tests
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npx playwright install --with-deps
      - run: npm run test:e2e
        
  data-quality:
    runs-on: ubuntu-latest
    steps:
      - run: node scripts/validate-supabase-data.js
```

---

## 6. QA Checklist Per Command Layer Release

**Before any command layer ships to production:**

- [ ] Unit test coverage ≥ 80% on KPI calculation functions
- [ ] All financial identity checks passing (balance sheet, income statement)
- [ ] E2E: Critical user path tested in Playwright
- [ ] Data freshness SLA defined and enforced
- [ ] Null/empty state UI handled gracefully
- [ ] Error boundaries in place for all data fetch failures
- [ ] Mobile responsiveness validated (375px, 768px, 1440px)
- [ ] Performance: LCP < 2.5s on dashboard load
- [ ] Accessibility: WCAG 2.1 AA on all interactive elements
- [ ] Cross-browser: Chrome, Safari, Firefox (latest)

---

## 7. Agent Output Validation

When agents produce research outputs, validate:

```typescript
interface AgentOutputValidation {
  // Structure checks
  hasRequiredSections: boolean;    // All deliverable sections present
  wordCountInRange: boolean;       // Not too short, not padded
  
  // Data checks  
  sourcesVerifiable: boolean;      // URLs/sources are real and accessible
  numbersConsistent: boolean;      // Numbers match within document
  
  // Quality checks
  isActionable: boolean;           // Contains specific, implementable recommendations
  noHallucinations: boolean;       // Cross-check facts against known sources
}
```

---

## 8. Implementation Roadmap

| Phase | Timeline | Scope |
|-------|----------|-------|
| Phase 1 | Week 1–2 | Set up Vitest, write unit tests for existing KPI calculations |
| Phase 2 | Week 3–4 | Playwright E2E for Revenue + Finance commands |
| Phase 3 | Week 5–6 | Supabase data quality edge functions |
| Phase 4 | Week 7–8 | GitHub Actions CI pipeline |
| Phase 5 | Ongoing | Expand coverage as new command layers ship |

---

*Deliverable for Mission Control Expansion Directive — mc-expansion project*
