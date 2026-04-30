# Xome Monday.com Inventory

**Account:** Xome Mortgage Team (`xome-mortgage-team`)
**User:** Colby Culbertson <colby@culbertsonandgray.com> (uid `76429189`)
**Env var:** `MONDAY_XOME_API_KEY` (set in Vercel across prod/preview/dev)

Generated from direct GraphQL crawl of `api.monday.com/v2`. PII in samples is
redacted: names shown as "J. Smith" (first initial + last), dollar amounts are
bucketed into ranges (`<$10K`, `$10K-$100K`, `$100K-$500K`, `$500K-$1M`, `$1M-$5M`,
`>$5M`), and emails/phones are `<redacted>`.

## Workspaces

| ID | Name | Kind |
|---|---|---|
| 12772579 | Nate | open |
| 4219956 | Main workspace | open |

## Boards

| Board ID | Workspace | Name | Items | Cols | Groups |
|---|---|---|---|---|---|
| 18140547302 | Nate | Subitems of Warehouse Reconciliation *(subitem)* | 0 | 4 | 1 |
| 18140546824 | Nate | Warehouse Reconciliation | 0 | 42 | 2 |
| 18140546461 | Nate | Compliance Tracker | 0 | 50 | 2 |
| 8609790073 | Main workspace | Subitems of Loan Pipeline *(subitem)* | 0 | 4 | 1 |
| 6386432266 | Main workspace | Subitems of Xome Power *(subitem)* | 0 | 4 | 1 |
| 6386432034 | Main workspace | Xome Power | 3 | 18 | 6 |
| 5867119067 | Main workspace | Xome Agent Board 📇 | 1437 | 14 | 1 |
| 5867118796 | Main workspace | Xome Title & Escrow Contacts 📇 | 531 | 6 | 1 |
| 5842083935 | Main workspace | Subitems of New Pipeline Xome *(subitem)* | 3 | 5 | 1 |
| 5842083369 | Main workspace | New Pipeline Xome | 928 | 113 | 7 |
| 5771295042 | Main workspace | Loan Pipeline | 7 | 29 | 5 |

### Warehouse Reconciliation  (`18140546824`)

- Workspace: **Nate** (`12772579`)
- Items: **0**

**Columns:**

| Column ID | Type | Title |
|---|---|---|
| name | name | Name |
| subitems | subtasks | Subitems |
| mirror | mirror | Property Address |
| mirror4 | mirror | Warehouse |
| lookup | mirror | Lender |
| mirror0 | mirror | LO |
| dup__of_funded_date | mirror | Settlement Date |
| mirror6 | mirror | Funded Date |
| mirror7 | mirror | Date Purchased |
| mirror3 | mirror | Loan Amount |
| numbers20 | numbers | Note Rate |
| numbers7 | numbers | Origination Fee |
| dup__of_origination_fee1 | numbers | Processing Fee |
| dup__of_origination_fee6 | numbers | Underwriting Fee |
| numbers3 | numbers | Wire Fee |
| numbers06 | numbers | Appraisal Fee |
| numbers9 | numbers | Credit Report Fee |
| numbers70 | numbers | Other - doc prep/MERS/VOE/Buydown |
| numbers97 | numbers | Flood Cert Fee |
| numbers6 | numbers | Tax Service Fee |
| numbers0 | numbers | Funding FHA/VA Fee |
| numbers4 | numbers | PPD Interest in Days |
| formula2 | formula | PPD Interest |
| numbers5 | numbers | Escrow |
| numbers2 | numbers | Lender Credit |
| formula1 | formula | To Be Funded |
| formula21 | formula | Bank Funded Amount |
| formula6 | formula | Haircut |
| numbers | numbers | Net SRP |
| numbers96 | numbers | Amount Due Investor |
| numbers15 | numbers | Escrow Balance Due |
| numbers51 | numbers | Interest Paid or Deducted |
| numbers98 | numbers | Tax Service Fee |
| numbers72 | numbers | Flood Cert |
| numbers980 | numbers | Total Wire |
| numbers8 | numbers | Tolerance Cure |
| mirror8 | mirror | Deposit Amount |
| connect_boards | board_relation | NuVision Pipeline |
| formula_mkr55ea0 | formula | Over Limit |
| formula_mkr5ct12 | formula | Funded amount of loan |
| formula_mkr5hzzs | formula | Funded amount of loan |
| formula_mkr5nga3 | formula | Formula |

**Groups:**

| Group ID | Title |
|---|---|
| topics | Not Reconciled Yet |
| group_title | Reconciled |

### Compliance Tracker  (`18140546461`)

- Workspace: **Nate** (`12772579`)
- Items: **0**
- Description: 'Reminder: Only work on the ones with a "DATE RECEIVED" date'

**Columns:**

| Column ID | Type | Title |
|---|---|---|
| name | name | Name |
| status4__1 | status | Invoice: |
| mirror3 | mirror | Property Address |
| lookup_mkqq5jha | mirror | Property Address (Street) |
| lookup_mks9xw5c | mirror | Lender |
| lookup_mknk8yg5 | mirror | Loan Type |
| lookup_mkp08wsp | mirror | Marketing |
| mirror5 | mirror | LO |
| mirror7 | mirror | Processor |
| mirror1 | mirror | Pending |
| mirror6__1 | mirror | Broker/Warehouse/HELOC |
| status__1 | status | Warehouse |
| status_1__1 | status | In House Processing |
| status_2__1 | status | Heloc |
| color_mknqq91z | status | VA Loan? |
| status_16 | status | Processor Compliance Pass/Fail |
| compliance_pass_fail_reasons | dropdown | Compliance Pass/Fail Reasons |
| date4 | date | Date Received |
| mirror | mirror | Loan Amount |
| mirror9 | mirror | Check/Deposit |
| formula_1__1 | formula | Projected Comp |
| dup__of_projected_comp__1 | numbers | YSP |
| dup__of_ysp__1 | numbers | LO Charges |
| dup__of_charges__1 | numbers | Company Charges |
| numbers_1 | numbers | Broker Fee (LO) |
| numbers78 | numbers | Processing Fee (LO) |
| numeric4 | numbers | Warehouse Fee (LO) |
| dup__of_broker_fee03 | numbers | Appraisal |
| dup__of_appraisal | numbers | Credit Report |
| numbers | numbers | MERS (COMP) |
| dup__of_early_pay | numbers | Refund |
| dup__of_refund | numbers | Tolerance Cure |
| dup__of_broker_fee0 | numbers | Lender Credits |
| dup__of_misc_fees | numbers | Fees back to LO |
| dup__of_fees_back_to_lo_mkkgyp3b | numbers | Holdback |
| formula_1_mkmv2ned | formula | Total Credits |
| formula9 | formula | Total Fees |
| dup__of_formula7 | formula | LO Commission |
| dup__of_lo_commission__1 | formula | LO Commission (New) |
| mirror__1 | mirror | Deal Type |
| status0 | status | Cleared |
| subitems | subtasks | Subitem Status |
| connect_boards | board_relation | NuVision Pipeline |
| monday_doc_v2__1 | direct_doc | monday Doc v2 |
| formula__1 | formula | Formula |
| mirror_Mjj5pLQP | mirror | LO Commission (Final) |
| numeric_mknc8fv8 | numbers | Processing (Tracking) |
| formula_mknch5dx | formula | Formula 1 |
| color_mks9nyh9 | status | Triad? |
| lookup_mkt5gknz | mirror | COE |

**Groups:**

| Group ID | Title |
|---|---|
| new_group85895 | Pending Compliance |
| new_group | Compliance Completed |

### Xome Power  (`6386432034`)

- Workspace: **Main workspace** (`4219956`)
- Items: **3**
- Description: 'Lead Form:\nhttps://form.jotform.com/240936450954058'

**Columns:**

| Column ID | Type | Title |
|---|---|---|
| name | name | Name |
| subitems | subtasks | Subitems |
| phone | phone | Phone |
| email | email | Email |
| status9 | status | Contacted |
| status0 | status | Stage |
| progress | progress | Project Progress |
| text | text | Street Address |
| text_1 | text | City |
| text_2 | text | ZIP Code |
| text_3 | text | Utility Provider |
| text1 | text | Usage |
| text9 | text | System Size |
| status68 | status | Financier |
| status72 | status | Installer |
| dup__of_usage | text | Referred By: |
| people0 | people | Referred By: |
| date4 | date | Date |

**Groups:**

| Group ID | Title |
|---|---|
| topics | Incoming Leads |
| new_group52585 | Proposal |
| new_group22586 | Project |
| new_group22822 | Completed |
| new_group | Nurture |
| new_group45402 | Dead |

**Samples (first 2, redacted):**

- `[Incoming Leads]` **R. Rosemary**
    - `phone` (`phone`) → '<redacted>'
    - `status9` (`status`) → 'Yes'
    - `status0` (`status`) → 'Proposal Booked'
    - `text` (`text`) → '12414 Oak Mist Ln'
    - `text_1` (`text`) → 'Auburn'
    - `text_3` (`text`) → 'PGE'
- `[Incoming Leads]` **C. Ashley**
    - `phone` (`phone`) → '<redacted>'
    - `date4` (`date`) → '2024-04-15'

### Xome Agent Board 📇  (`5867119067`)

- Workspace: **Main workspace** (`4219956`)
- Items: **1437**
- Description: 'Agent Intake Form:  https://forms.monday.com/forms/1c1d92d1de8ff8c7240ff08b6340778c?r=use1'

**Columns:**

| Column ID | Type | Title |
|---|---|---|
| name | name | Name |
| people1 | people | LO |
| company | text | Company Name |
| dup__of_company_dropdown9 | dropdown | Dup. of Company Dropdown |
| team | text | Team Name |
| phone | phone | Phone |
| email | email | Email |
| creation_log | creation_log | Creation Log |
| last_updated | last_updated | Last Updated |
| date1 | date | Birthday |
| text8 | text | Hobbies & Interests |
| formula22 | formula | Count |
| board_relation | board_relation | link to New Pipeline Xome |
| board_relation7 | board_relation | link to New Pipeline Xome |

**Groups:**

| Group ID | Title |
|---|---|
| 1651170973_re_list | Agents |

### Xome Title & Escrow Contacts 📇  (`5867118796`)

- Workspace: **Main workspace** (`4219956`)
- Items: **531**

**Columns:**

| Column ID | Type | Title |
|---|---|---|
| name | name | Name |
| dropdown | dropdown | Title Company |
| phone | phone | Phone |
| email | email | Email |
| creation_log | creation_log | Creation Log |
| board_relation | board_relation | link to New Pipeline Xome |

**Groups:**

| Group ID | Title |
|---|---|
| new_group9844 | Title & Escrow Contacts |

### New Pipeline Xome  (`5842083369`)

- Workspace: **Main workspace** (`4219956`)
- Items: **928**
- Description: 'INTAKE FORMS -->\n\nLoan Intake Form - https://form.jotform.com/240106744564050 \n\nDolen Jot Form - https://form.jotform.com/240036707422044\n\nHardeep Jot Form - https://form.jotform.com/240186404968160'

**Columns:**

| Column ID | Type | Title |
|---|---|---|
| name | name | Name |
| text_1 | text | Borrower First Name |
| phone | phone | Borrower Phone |
| email | email | Borrower Email |
| text4 | text | Co-Borrower Last Name |
| dup__of_co_borrower_last_name | text | Co-Borrower Last Name #2 |
| dup__of_co_borrower_last_name__2_ | text | Co-Borrower Last Name #3 |
| text_11 | text | Co-Borrower First Name |
| dup__of_co_borrower_first_name | text | Co-Borrower First Name #2 |
| dup__of_co_borrower_first_name__2_ | text | Co-Borrower First Name #3 |
| phone0 | phone | Co-Borrower Phone |
| dup__of_co_borrower_phone | phone | Co-Borrower Phone #2 |
| dup__of_co_borrower_phone__2_ | phone | Co-Borrower Phone #3 |
| email0 | email | Co-Borrower Email |
| dup__of_co_borrower_email | email | Co-Borrower Email #2 |
| dup__of_co_borrower_email__2_ | email | Co-Borrower Email #3 |
| people9 | people | Lead Agent |
| label__1 | status | Lender |
| dup__of_lead_agent | people | Team Lead Agent |
| status_18 | status | Lead Source |
| numeric_mkrj9eya | numbers | Xome Split |
| numeric_mks118rk | numbers | LO Split |
| formula_mksps3aj | formula | $ BPS Given Away |
| connect_boards | board_relation | Buyers Agent |
| mirror_1 | mirror | Buyer's Agent Phone |
| mirror_2 | mirror | Buyer's Agent Email |
| connect_boards2 | board_relation | Sellers Agent |
| mirror2 | mirror | Seller's Agent Phone |
| mirror_15 | mirror | Seller's Agent Email |
| connect_boards7 | board_relation | Title Agent |
| mirror5 | mirror | Title Phone |
| mirror9 | mirror | Title Email |
| connect_boards59 | board_relation | Escrow Agent |
| mirror_153 | mirror | Escrow Phone |
| mirror604 | mirror | Escrow Email |
| people | people | LO |
| people_2 | people | Processor |
| people0 | people | LOA |
| location | location | Subject Property Address |
| dup__of_loan_purpose | status | Loan Purpose |
| status106 | status | Subject Property State |
| status_14 | status | Loan Type/Program |
| status_148 | status | Property Type |
| status7 | status | Lock Status |
| status1 | status | Appraisal Payer |
| dup__of_appraisal_order | status | Appraisal Timing |
| status10 | status | Impounds |
| dup__of_branch | status | Submission Status |
| status78 | status | LO to Review LE before disclosing? |
| dup__of_send_auto_loan_notifications_ | status | Processor to Send LE Video? |

**Groups:**

| Group ID | Title |
|---|---|
| topics | Leads 🚨 |
| new_group23653 | Pre-Approved |
| new_group41491 | In Process🔍 |
| group_mks3286t | New Group |
| new_group62657 | Funded 💵 |
| new_group13782 | Nurture 💌 |
| new_group9764 | Dead/DNC ☠️ |

**Samples (first 6, redacted):**

- `[Leads 🚨]` **S.**
    - `text_1` (`text`) → 'Megan'
    - `status_18` (`status`) → 'Select One'
    - `people` (`people`) → '<1 people>'
    - `people0` (`people`) → '<1 people>'
    - `dup__of_loan_purpose` (`status`) → 'Purchase'
    - `status106` (`status`) → 'Select One'
- `[Leads 🚨]` **S.**
    - `text_1` (`text`) → 'Robert'
    - `phone` (`phone`) → '<redacted>'
    - `email` (`email`) → '<redacted>'
    - `status_18` (`status`) → 'Select One'
    - `people` (`people`) → '<1 people>'
    - `people0` (`people`) → '<1 people>'
- `[Pre-Approved]` **W.**
    - `text_1` (`text`) → 'Taylor'
    - `label__1` (`status`) → 'TLS'
    - `status_18` (`status`) → 'C&G'
    - `people` (`people`) → '<1 people>'
    - `people_2` (`people`) → '<1 people>'
    - `people0` (`people`) → '<1 people>'
- `[Pre-Approved]` **L.**
    - `text_1` (`text`) → 'Chase'
    - `phone` (`phone`) → '<redacted>'
    - `email` (`email`) → '<redacted>'
    - `status_18` (`status`) → 'C&G'
    - `people` (`people`) → '<1 people>'
    - `people_2` (`people`) → '<1 people>'
- `[In Process🔍]` **A. Pear**
    - `text_1` (`text`) → 'Amelia'
    - `label__1` (`status`) → 'TLS'
    - `status_18` (`status`) → 'C&G'
    - `people` (`people`) → '<1 people>'
    - `location` (`location`) → '4112 57th Street, Sacramento, CA, USA'
    - `dup__of_loan_purpose` (`status`) → 'Purchase'
- `[In Process🔍]` **C. King**
    - `text_1` (`text`) → 'Crystal'
    - `label__1` (`status`) → 'UWM'
    - `status_18` (`status`) → 'Personal'
    - `people` (`people`) → '<1 people>'
    - `location` (`location`) → '3501 Ardmore Road, Sacramento, CA, USA'
    - `dup__of_loan_purpose` (`status`) → 'Rate and Term Refinance'

### Loan Pipeline  (`5771295042`)

- Workspace: **Main workspace** (`4219956`)
- Items: **7**
- Description: 'Lead Form - https://form.jotform.com/240036707422044 (Dolen)'

**Columns:**

| Column ID | Type | Title |
|---|---|---|
| name | name | Name |
| subtasks_mknpknh6 | subtasks | Subitems |
| text | text | Borrower First Name |
| phone | phone | Borrower Phone |
| email | email | Borrower Email |
| text3 | text | Co-Borrower Last Name |
| text0 | text | Co-Borrower First Name |
| phone4 | phone | Co-Borrower Phone |
| email1 | email | Co-Borrower Email |
| text4 | text | Buyers Agent Last Name |
| text2 | text | Buyers Agent First Name |
| phone8 | phone | Buyers Agent Phone |
| email8 | email | Buyers Agent Email |
| text24 | text | Sellers Agent Last Name |
| text9 | text | Sellers Agent First Name |
| phone45 | phone | Sellers Agent Phone |
| email4 | email | Sellers Agent Email |
| dup__of_lo | people | Lead Agent |
| project_owner | people | LO |
| dup__of_lo8 | people | Processor |
| text7 | text | Subject Property |
| project_status | status | Stage |
| dup__of_stage | status | Loan Purpose |
| dup__of_funded_date | date | Pre-Approved Date |
| date5 | date | Funded Date |
| date_1 | date | Nurture Date |
| date | date | DNC Date |
| status | status | Dolen JotForm |
| long_text | long_text | LO Notes |

**Groups:**

| Group ID | Title |
|---|---|
| new_group29179 | Leads |
| new_group | In Process |
| new_group43041 | Funded |
| new_group94282 | Nurture |
| new_group64967 | Dead/DNC |

**Samples (first 2, redacted):**

- `[Leads]` **T.**
    - `project_owner` (`people`) → '<1 people>'
    - `project_status` (`status`) → 'Contact Attempted'
    - `dup__of_stage` (`status`) → 'Cash Out Refi'
- `[Leads]` **T. 2**
    - `project_status` (`status`) → 'Incoming Lead'
    - `dup__of_stage` (`status`) → 'Cash Out Refi'

## Proposed Widget Mappings

The adapter at `app/lib/monday-adapter.ts` uses these mappings to power widgets on
`/companies/xome-home`. Each mapping is a board-scoped friendly-name → column-id map
plus group/status label translation.

### `xome.loan_pipeline` → New Pipeline Xome (`5842083369`)

Primary loan pipeline board. 928 items across 7 groups (Leads → Pre-Approved → In Process → Funded → Nurture → Dead/DNC).

**Columns:**

| Friendly | Monday column ID |
|---|---|
| last_name | name |
| first_name | text_1 |
| borrower_phone | phone |
| borrower_email | email |
| lo | people |
| loa | people0 |
| processor | people_2 |
| lead_agent | people9 |
| team_lead_agent | dup__of_lead_agent |
| stage | status |
| lender | label__1 |
| lead_source | status_18 |
| loan_purpose | dup__of_loan_purpose |
| loan_type | status_14 |
| property_state | status106 |
| property_type | status_148 |
| property_address | location |
| reason_nurture | status2 |
| reason_dnc | dup__of_reason_nurture |
| estimated_value | numbers_1 |
| est_loan_amount | numbers89 |
| le_loan_amount | numbers4 |
| est_down_payment | dup__of_est__loan_amount__sales_ |
| appraised_value | numbers5 |
| fico | numbers59 |
| dti | dup__of_numbers |
| rate | numbers0 |
| created_at | creation_log |
| updated_at | last_updated |
| pre_qualified | date |
| pre_approved | date_1 |
| ready_to_register | date44 |
| appraisal_due | date_5 |
| ctc_goal | date_mkp1wdzr |
| submission | date_2 |
| ctc | date6 |
| coe | date_9 |
| wire_disbursement | dup__of_close_of_escrow |
| lock_expiration | date_8 |
| no_sale | date7 |

**Groups:**

| Group ID | Name |
|---|---|
| topics | Leads |
| new_group23653 | Pre-Approved |
| new_group41491 | In Process |
| group_mks3286t | New Group |
| new_group62657 | Funded |
| new_group13782 | Nurture |
| new_group9764 | Dead/DNC |

**Status labels (`status` column):**

| Label ID | Label |
|---|---|
| 0 | Registered |
| 1 | Funded |
| 2 | Incoming Registration |
| 3 | Incoming Lead |
| 4 | Contact Attempted Lead |
| 5 | Select One |
| 6 | Contacted Lead |
| 9 | CTC |
| 10 | Appraisal Completed |
| 12 | Loan Approved |
| 13 | Loan Submitted |
| 18 | Pre-Approved |
| 19 | Appraisal Ordered |
| 105 | Nurture |
| 106 | Dead/Do Not Contact |

### `xome.loan_pipeline_alt` → Loan Pipeline (`5771295042`)

Secondary/alternate loan board. 7 items. Uses project_* columns. Not production.

**Columns:**

| Friendly | Monday column ID |
|---|---|
| stage | project_status |
| loan_purpose | dup__of_stage |
| lo | project_owner |
| processor | dup__of_lo8 |
| lead_agent | dup__of_lo |
| funded_date | date5 |
| pre_approved_date | dup__of_funded_date |
| subject_property | text7 |
| lo_notes | long_text |

**Groups:**

| Group ID | Name |
|---|---|
| new_group29179 | Leads |
| new_group | In Process |
| new_group43041 | Funded |
| new_group94282 | Nurture |
| new_group64967 | Dead/DNC |

### `xome.compliance` → Compliance Tracker (`18140546461`)

Compliance tracker with 2 groups (Pending, Completed) and a rich set of mirror/lookup columns from the loan pipeline. 0 items at discovery time; column schema preserved for future.

**Columns:**

| Friendly | Monday column ID |
|---|---|
| invoice_status | status4__1 |
| property_address_mirror | mirror3 |
| lender_lookup | lookup_mks9xw5c |
| loan_type_lookup | lookup_mknk8yg5 |
| lo_mirror | mirror5 |
| processor_mirror | mirror7 |
| processor_compliance | status_16 |
| compliance_pass_fail_reason | compliance_pass_fail_reasons |
| date_received | date4 |
| loan_amount_mirror | mirror |
| projected_comp_formula | formula_1__1 |
| cleared | status0 |

**Groups:**

| Group ID | Name |
|---|---|
| new_group85895 | Pending Compliance |
| new_group | Compliance Completed |

### `xome.warehouse_reconciliation` → Warehouse Reconciliation (`18140546824`)

Warehouse reconciliation — 42 fee/amount columns mirrored from the loan pipeline. Not Reconciled Yet / Reconciled groups. 0 items at discovery time.

**Columns:**

| Friendly | Monday column ID |
|---|---|
| property_address_mirror | mirror |
| warehouse_mirror | mirror4 |
| lender_lookup | lookup |
| lo_mirror | mirror0 |
| settlement_date_mirror | dup__of_funded_date |
| funded_date_mirror | mirror6 |
| loan_amount_mirror | mirror3 |
| note_rate | numbers20 |
| origination_fee | numbers7 |
| processing_fee | dup__of_origination_fee1 |
| total_wire | numbers980 |
| to_be_funded_formula | formula1 |
| haircut_formula | formula6 |
| amount_due_investor | numbers96 |

**Groups:**

| Group ID | Name |
|---|---|
| topics | Not Reconciled Yet |
| group_title | Reconciled |

### `xome.power` → Xome Power (`6386432034`)

Solar-adjacent lead board (Incoming Leads → Proposal → Project → Completed → Nurture → Dead). 3 items.

**Columns:**

| Friendly | Monday column ID |
|---|---|
| phone | phone |
| email | email |
| contacted | status9 |
| stage | status0 |
| progress | progress |
| street_address | text |
| city | text_1 |
| zip_code | text_2 |
| utility_provider | text_3 |
| usage | text1 |
| system_size | text9 |
| financier | status68 |
| installer | status72 |
| referred_by_name | dup__of_usage |
| referred_by_person | people0 |
| date | date4 |

**Groups:**

| Group ID | Name |
|---|---|
| topics | Incoming Leads |
| new_group52585 | Proposal |
| new_group22586 | Project |
| new_group22822 | Completed |
| new_group | Nurture |
| new_group45402 | Dead |

### `xome.agent_roster` → Xome Agent Board (`5867119067`)

Buyer/seller agent roster. 1,437 items. Linked back to New Pipeline Xome via board_relation columns.

**Columns:**

| Friendly | Monday column ID |
|---|---|
| last_name | name |
| company | company |
| team | team |
| phone | phone |
| email | email |
| lo | people1 |
| birthday | date1 |
| hobbies | text8 |
| link_to_pipeline | board_relation |
| link_to_pipeline_alt | board_relation7 |
| count | formula22 |

**Groups:**

| Group ID | Name |
|---|---|
| 1651170973_re_list | Agents |

### `xome.title_escrow_contacts` → Xome Title & Escrow Contacts (`5867118796`)

Title / escrow contact rolodex. 531 items.

**Columns:**

| Friendly | Monday column ID |
|---|---|
| last_name | name |
| title_company | dropdown |
| phone | phone |
| email | email |
| link_to_pipeline | board_relation |

**Groups:**

| Group ID | Name |
|---|---|
| new_group9844 | Title & Escrow Contacts |

## Widget Plan (`/companies/xome-home`)

| Widget | Board | Compute |
|---|---|---|
| Loan Pipeline | `5842083369` | Group by `groupMap`, count items + sum `est_loan_amount`. |
| Loan Officer Roster | `5842083369` | Aggregate by `lo` people column: count, MTD/YTD funded volume. |
| Loan Volume KPIs | `5842083369` | Sum funded (`status=1` or `groupMap=Funded`) with MTD/YTD; avg loan, avg days-to-close, pull-through, pipeline value. |
| Compliance Tracker | `18140546461` | List `Pending Compliance` items; red flag if `date4` (Date Received) > 14d ago. |
| Warehouse Reconciliation | `18140546824` | KPIs: open items (`topics` group), total value pending, oldest open. |
| Xome Power | `6386432034` | Group by status0; 3 items → simple card. |
| Recent Closed Loans | `5842083369` | Filter `status=1` OR group=`new_group62657`, sort by `coe` desc, take 10. |

