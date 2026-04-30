'use client'
/**
 * Non-expert ownership setup wizard — 5-step guided flow.
 * Plain-English labels throughout. No jargon.
 * Progress is saved to localStorage so users can resume.
 */
import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Step1Identity from './steps/Step1Identity'
import Step2Businesses from './steps/Step2Businesses'
import Step3Properties from './steps/Step3Properties'
import Step4WhoOwnsWhat from './steps/Step4WhoOwnsWhat'
import Step5Review from './steps/Step5Review'
import { supabase } from '../../lib/supabase'

export interface WizardPerson {
  id: string
  name: string
  email: string
  usTaxpayer: boolean
  hasTrust: boolean
  trustName: string
  trustState: string
}

export interface WizardBusiness {
  id: string
  name: string
  businessType: string
  legalType: string
  state: string
  ein: string
  templateId?: string
}

export interface WizardProperty {
  id: string
  address: string
  type: string
  purchasePrice: string
  currentValue: string
  mortgageBalance: string
}

export interface OwnershipAssignment {
  assetId: string
  assetType: 'business' | 'property'
  ownerId: string
  ownerType: 'person' | 'trust' | 'business'
  pct: number
  role: string
}

export interface WizardState {
  step: number
  person: WizardPerson
  businesses: WizardBusiness[]
  properties: WizardProperty[]
  assignments: OwnershipAssignment[]
}

const STORAGE_KEY = 'mc_ownership_wizard_v1'

const DEFAULT_STATE: WizardState = {
  step: 1,
  person: {
    id: 'person-me',
    name: '',
    email: '',
    usTaxpayer: true,
    hasTrust: false,
    trustName: '',
    trustState: '',
  },
  businesses: [],
  properties: [],
  assignments: [],
}

function loadSaved(): WizardState {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
    if (raw) return { ...DEFAULT_STATE, ...JSON.parse(raw) }
  } catch {}
  return DEFAULT_STATE
}

function saveToStorage(s: WizardState) {
  try {
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
  } catch {}
}

const TOTAL_STEPS = 5
const STEP_LABELS = ['You', 'Businesses', 'Properties', 'Who Owns What', 'Review']

export default function OwnershipWizard() {
  const router = useRouter()
  const [state, setState] = useState<WizardState>(DEFAULT_STATE)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setState(loadSaved()); setMounted(true) }, [])

  const update = useCallback((patch: Partial<WizardState>) => {
    setState(prev => {
      const next = { ...prev, ...patch }
      saveToStorage(next)
      return next
    })
  }, [])

  function goNext() {
    update({ step: Math.min(state.step + 1, TOTAL_STEPS) })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  function goPrev() {
    update({ step: Math.max(state.step - 1, 1) })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  function skipForNow() {
    saveToStorage(state)
    router.push('/entities')
  }

  async function handleFinish() {
    setSaving(true)
    setSaveError('')
    try {
      // 1. Insert person entity
      const { data: personEntity, error: personErr } = await supabase
        .from('entity_ownership')
        .insert({
          entity_name: state.person.name || 'Me',
          entity_type: 'Person',
          purpose: 'individual',
          is_active: true,
          notes: state.person.email ? `email: ${state.person.email}` : null,
        })
        .select('id')
        .single()
      if (personErr) throw personErr
      const personEntityId = personEntity.id

      // 2. Insert trust if applicable
      let trustEntityId: string | null = null
      if (state.person.hasTrust && state.person.trustName) {
        const { data: trustEnt, error: trustErr } = await supabase
          .from('entity_ownership')
          .insert({
            entity_name: state.person.trustName,
            entity_type: 'Trust',
            state: state.person.trustState || null,
            purpose: 'trust',
            is_active: true,
          })
          .select('id')
          .single()
        if (trustErr) throw trustErr
        trustEntityId = trustEnt.id
      }

      // 3. Insert businesses
      const bizIdMap: Record<string, string> = {}
      for (const biz of state.businesses) {
        const legalType = biz.legalType === 'unknown' ? 'LLC' : biz.legalType
        const taxClass = legalType === 'S-Corp' ? 'S-Corp' : legalType === 'Corp' ? 'C-Corp' : 'disregarded'
        const entityTypeMapped = legalType === 'Corp' ? 'C-Corp' : legalType === 'SoleProp' ? 'Sole Prop' : legalType
        const { data: bizEnt, error: bizErr } = await supabase
          .from('entity_ownership')
          .insert({
            entity_name: biz.name,
            entity_type: entityTypeMapped,
            state: biz.state || null,
            ein: biz.ein || null,
            tax_classification: taxClass,
            purpose: 'operating',
            is_active: true,
          })
          .select('id')
          .single()
        if (bizErr) throw bizErr
        bizIdMap[biz.id] = bizEnt.id
      }

      // 4. Insert properties
      const propIdMap: Record<string, string> = {}
      for (const prop of state.properties) {
        const { data: propEnt, error: propErr } = await supabase
          .from('properties')
          .insert({
            address: prop.address,
            purpose: prop.type,
            purchase_price: prop.purchasePrice ? parseFloat(prop.purchasePrice) : null,
            current_value: prop.currentValue ? parseFloat(prop.currentValue) : null,
            mortgage_balance: prop.mortgageBalance ? parseFloat(prop.mortgageBalance) : null,
            is_rental: prop.type === 'rental',
          })
          .select('id')
          .single()
        if (propErr) throw propErr
        propIdMap[prop.id] = propEnt.id
      }

      // 5. Insert ownership edges
      for (const a of state.assignments) {
        let ownerEntityId: string | null = null
        if (a.ownerType === 'person') ownerEntityId = personEntityId
        else if (a.ownerType === 'trust') ownerEntityId = trustEntityId
        else if (a.ownerType === 'business') ownerEntityId = bizIdMap[a.ownerId] ?? null
        if (!ownerEntityId) continue

        if (a.assetType === 'business') {
          const childId = bizIdMap[a.assetId]
          if (!childId) continue
          await supabase.from('entity_ownership_edges').insert({
            parent_entity_id: ownerEntityId,
            parent_type: 'entity',
            child_entity_id: childId,
            child_type: 'entity',
            ownership_pct: a.pct,
            role: a.role || 'managing member',
          })
        } else {
          const childId = propIdMap[a.assetId]
          if (!childId) continue
          await supabase.from('entity_ownership_edges').insert({
            parent_entity_id: ownerEntityId,
            parent_type: 'entity',
            child_entity_id: childId,
            child_type: 'property',
            ownership_pct: a.pct,
            role: a.role || 'owner',
          })
        }
      }

      localStorage.removeItem(STORAGE_KEY)
      router.push('/entities?wizard=done')
    } catch (e: any) {
      setSaveError(e.message ?? 'Save failed. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (!mounted) return null

  const stepProps = { state, update, onNext: goNext, onPrev: goPrev }

  return (
    <div style={{ minHeight: '100vh', background: '#060610', color: '#f5f5f7', fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '40px 24px 100px' }}>

        {/* Back link */}
        <a
          href="/entities"
          style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 24, textDecoration: 'none' }}
        >
          ← Back to Entities
        </a>

        {/* Heading */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
              color: '#3b82f6', background: 'rgba(59,130,246,0.1)',
              border: '1px solid rgba(59,130,246,0.25)',
              borderRadius: 20, padding: '3px 10px',
              fontFamily: 'IBM Plex Mono, monospace',
            }}>
              SETUP WIZARD
            </span>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', fontFamily: 'IBM Plex Mono, monospace' }}>
              STEP {state.step} / {TOTAL_STEPS}
            </span>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, lineHeight: 1.2 }}>
            Let&apos;s map out your ownership structure
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginTop: 8, lineHeight: 1.6 }}>
            We&apos;ll ask a few plain-English questions to record who owns what. No legal jargon — takes about 5 minutes.
          </p>
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ display: 'flex', gap: 5, marginBottom: 8 }}>
            {Array.from({ length: TOTAL_STEPS }, (_, i) => {
              const n = i + 1
              return (
                <div key={n} style={{
                  flex: 1, height: 5, borderRadius: 99,
                  background: n < state.step ? '#3b82f6' : n === state.step ? 'rgba(59,130,246,0.55)' : 'rgba(255,255,255,0.08)',
                  transition: 'background 0.3s',
                }} />
              )
            })}
          </div>
          <div style={{ display: 'flex', gap: 5 }}>
            {STEP_LABELS.map((label, i) => {
              const n = i + 1
              return (
                <div key={label} style={{
                  flex: 1, fontSize: 10, textAlign: 'center',
                  color: n < state.step ? '#3b82f6' : n === state.step ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.22)',
                  fontWeight: n === state.step ? 700 : 400,
                  letterSpacing: '0.03em',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {label}
                </div>
              )
            })}
          </div>
        </div>

        {/* Step panels */}
        {state.step === 1 && <Step1Identity {...stepProps} />}
        {state.step === 2 && <Step2Businesses {...stepProps} />}
        {state.step === 3 && <Step3Properties {...stepProps} />}
        {state.step === 4 && <Step4WhoOwnsWhat {...stepProps} />}
        {state.step === 5 && (
          <Step5Review
            {...stepProps}
            onFinish={handleFinish}
            saving={saving}
            saveError={saveError}
          />
        )}

        {/* Skip */}
        {state.step < 5 && (
          <div style={{ textAlign: 'center', marginTop: 32 }}>
            <button
              onClick={skipForNow}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.28)', fontSize: 12, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
            >
              Skip for now — I&apos;ll finish this later
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
