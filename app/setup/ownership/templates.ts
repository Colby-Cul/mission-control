/**
 * Smart templates for the "Add Business" step.
 * Each template pre-fills form fields so the user just confirms.
 */
export interface BusinessTemplate {
  id: string
  name: string
  tagline: string
  icon: string
  defaults: {
    legalType: string
    businessType: string
    ownerPct: number
    note: string
  }
}

export const BUSINESS_TEMPLATES: BusinessTemplate[] = [
  {
    id: 'single-member-llc',
    name: 'Single-member LLC',
    tagline: 'Most common for solo entrepreneurs. You own 100%, income flows to your personal taxes.',
    icon: '🏢',
    defaults: {
      legalType: 'LLC',
      businessType: 'other',
      ownerPct: 100,
      note: 'Disregarded entity — income/loss flows to your personal tax return.',
    },
  },
  {
    id: 'holding-co',
    name: 'Holding company + operating subs',
    tagline: 'A parent LLC that owns one or more operating businesses. Great for asset separation.',
    icon: '🏛️',
    defaults: {
      legalType: 'LLC',
      businessType: 'other',
      ownerPct: 100,
      note: 'Holding company with partnership tax treatment. Create child operating LLCs in Step 4.',
    },
  },
  {
    id: 'trust-llc',
    name: 'Trust + LLC structure',
    tagline: 'Your trust owns the LLC — strong asset protection + estate planning benefits.',
    icon: '🛡️',
    defaults: {
      legalType: 'LLC',
      businessType: 'other',
      ownerPct: 100,
      note: 'LLC owned by your trust. Set up trust ownership in Step 4.',
    },
  },
  {
    id: 'real-estate-llc',
    name: 'Real estate LLC',
    tagline: 'An LLC that holds rental or investment property. Common for liability protection.',
    icon: '🏠',
    defaults: {
      legalType: 'LLC',
      businessType: 'STR',
      ownerPct: 100,
      note: 'Operating LLC for real estate. Add properties in Step 3.',
    },
  },
  {
    id: 's-corp',
    name: 'S-Corp (pass-through)',
    tagline: 'Popular for business owners who want to reduce self-employment tax on profits.',
    icon: '📈',
    defaults: {
      legalType: 'S-Corp',
      businessType: 'consulting',
      ownerPct: 100,
      note: 'S-Corp election — pay yourself a salary, take remaining profits as distributions.',
    },
  },
]
