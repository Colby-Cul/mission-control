# Dividend Payout Formula — Canonical Reference
**Path:** `vault/cfo/dividend-formula.md`
**Owner:** CFO Agent
**Effective Fiscal Quarter:** Q2 2026 (April 1 – June 30, 2026)
**Last Updated:** 2026-04-18
**Status:** Canonical — do not override without CFO sign-off

---

## 1. Inputs

| Variable | Symbol | Source Table.Column / Formula | Notes |
|---|---|---|---|
| Quarterly Net Income | `QNI` | `quickbooks.ProfitLossReport.net_income` WHERE `period = current_quarter` | Zero if no QB connection |
| Beginning Retained Earnings | `RE_open` | `quickbooks.BalanceSheet.retained_earnings` WHERE `as_of = quarter_start_date − 1d` | Opening balance |
| Intercompany Loans Due | `IC_Loans_Due` | `entity_ledger.intercompany_loans.amount_due` WHERE `due_date BETWEEN Q_start AND Q_end` | Current quarter tranche only |
| Current Net Working Capital | `NWC_current` | `quickbooks.BalanceSheet.current_assets − current_liabilities` | Snapshot at decision date |
| Working-Capital Reserve Floor | `WC_Floor` | `entity_config.wc_reserve_floor` | Default: 3 months OpEx |
| Effective Tax Rate | `tax_rate` | `entity_config.effective_tax_rate` | Default 25% |
| Tax Reserve Carve-Out | `Tax_Reserve` | `max(0, QNI × tax_rate)` | Never negative |
| Ownership Percentage | `own_pct` | `cap_table.ownership_records.ownership_pct` | Time-weighted if mid-quarter change |
| Shares — Class A | `shares_A` | `cap_table.share_classes.shares_outstanding WHERE class='A'` | As of record date |
| Shares — Class B | `shares_B` | `cap_table.share_classes.shares_outstanding WHERE class='B'` | As of record date |
| Class A Preferred Per-Share | `pref_A` | `entity_config.class_a_preferred_distribution_per_share` | 0 if not applicable |

---

## 2. Math — Step-by-Step

**Step 1 — Tax Reserve**
Tax_Reserve = max(0, QNI × tax_rate)

**Step 2 — After-Tax Earnings**
QNI_after_tax = QNI − Tax_Reserve

**Step 3 — WC Reserve Adequacy**
WC_Deficit = max(0, WC_Floor − NWC_current)

**Step 4 — IC Loan Priority**
Pool_after_IC = max(0, QNI_after_tax − IC_Loans_Due)

**Step 5 — Net Distributable Cash**
NDC = max(0, Pool_after_IC − WC_Deficit)

**Step 6 — Ownership Slice**
Owner_NDC = NDC × own_pct

**Step 7 — Class A Preferred**
ClassA_pool    = min(Owner_NDC, shares_A × pref_A)
Remainder_pool = Owner_NDC − ClassA_pool

**Step 8 — Class B Residual**
dividend_per_share_class_B = Remainder_pool / shares_B

**Step 9 — Class A Per-Share**
dividend_per_share_class_A = ClassA_pool / shares_A

### Master Formula Identity
dividend_per_share_class_A = min(Owner_NDC, shares_A × pref_A) / shares_A
dividend_per_share_class_B = max(0, Owner_NDC − (shares_A × pref_A)) / shares_B

where Owner_NDC = max(0, max(0, max(0, QNI−(QNI×tax_rate))−IC_Loans_Due) − max(0, WC_Floor−NWC_current)) × own_pct

---

## 3. Edge Cases

**3a. Negative QNI:** Set QNI_after_tax = 0. No dividend unless CFO sets entity_config.re_draw_approved.

**3b. Mid-Quarter Ownership Change:** own_pct_tw = Σ(own_pct_i × days_i) / total_quarter_days

**3c. Class A vs B Preferences:** Class A fully satisfied before Class B receives anything. If Owner_NDC < shares_A × pref_A, Class A is pro-rata haircut; Class B = $0.

**3d. IC Loans:** Deducted in Step 4 before any dividend pool. Receivable loans do not increase NDC until cash received.

**3e. Tax Reserve (C-Corp):** Reduce Tax_Reserve by estimated taxes already paid this quarter to avoid double-counting.

**3f. Minority Interest:** NDC computed at 100% entity level, then × own_pct. If own_pct < 0.50, majority owner approval required before distribution.

**3g. No QuickBooks Connection:** QNI = 0, NDC = 0. No distribution until CFO manual override via entity_config.qni_manual_source. Set entity_config.qb_connected = false.

---

## 4. Worked Example — Xome Home Loans, Q2 2026

> ⚠️ Illustrative values only — replace with live QB data before authorizing distribution.

| Variable | Value |
|---|---|
| QNI | $285,000 |
| tax_rate | 28% |
| IC_Loans_Due | $40,000 |
| NWC_current | $320,000 |
| WC_Floor | $250,000 |
| own_pct | 100% |
| shares_A | 10,000 |
| pref_A | $5.00/qtr |
| shares_B | 90,000 |

Step 1: Tax_Reserve = $79,800
Step 2: QNI_after_tax = $205,200
Step 3: WC_Deficit = $0 (NWC exceeds floor)
Step 4: Pool_after_IC = $165,200
Step 5: NDC = $165,200
Step 6: Owner_NDC = $165,200
Step 7: ClassA_pool = $50,000 | Remainder = $115,200
Step 8: dividend_per_share_class_B = $1.28
Step 9: dividend_per_share_class_A = $5.00

| Line | Amount |
|---|---|
| Net Distributable Cash | $165,200 |
| dividend_per_share_class_A | $5.00 |
| dividend_per_share_class_B | $1.28 |
