import React from "react"
import { useEffect, useMemo, useState } from 'react'
import { addDays, todayISO, formatDateDisplay } from '../lib/dateUtils'
import { formatRupees } from '../lib/format'
import { computeDue } from '../lib/status'
import { supabase } from '../lib/supabaseClient'

export default function MembershipFields({ value, onChange, feeLabel = 'Membership Fee' }) {
  const [plans, setPlans] = useState([])
  const [plansLoading, setPlansLoading] = useState(true)

  useEffect(() => {
    let alive = true
    supabase
      .from('membership_plans')
      .select('id,name,price,duration,category,is_active,sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .then(({ data }) => {
        if (alive) {
          setPlans(data || [])
          setPlansLoading(false)
        }
      })
    return () => { alive = false }
  }, [])

  const selectedPlan = useMemo(
    () => plans.find((p) => p.name === value.plan) || null,
    [plans, value.plan]
  )

  function set(patch) {
    onChange({ ...value, ...patch })
  }

  function selectPlan(name) {
    const plan = plans.find((p) => p.name === name)
    if (!plan) {
      set({ plan: name })
      return
    }
    const durationDays = durationToDays(plan.duration)
    const expiryDate = durationDays ? addDays(value.startDate, durationDays) : value.expiryDate
    set({
      plan: plan.name,
      fee: String(plan.price),
      durationLabel: plan.duration,
      durationDays: durationDays || value.durationDays,
      expiryDate,
      amountPaid: value.amountPaid || '',
    })
  }

  function handleStartDateChange(startDate) {
    const days = Number(value.durationDays) || durationToDays(value.durationLabel)
    set({ startDate, expiryDate: days ? addDays(startDate, days) : value.expiryDate })
  }

  function handleDurationChange(label) {
    const days = durationToDays(label)
    set({ durationLabel: label, durationDays: days || value.durationDays, expiryDate: days ? addDays(value.startDate, days) : value.expiryDate })
  }

  const fee = Number(value.fee) || 0
  const paid = Number(value.amountPaid) || 0
  const discount = Math.max(0, Number(value.discount) || 0)
  const effectivePaid = paid + discount
  const due = Math.max(0, fee - effectivePaid)
  const overpaid = Math.max(0, effectivePaid - fee)
  const status = due <= 0 && fee > 0 ? 'PAID' : 'DUE'

  return (
    <div className="membership-section">
      <div className="field-grid">
        <div className="field field-wide">
          <label htmlFor="plan">Membership Plan</label>
          <select id="plan" required value={value.plan} onChange={(e) => selectPlan(e.target.value)} disabled={plansLoading}>
            <option value="">{plansLoading ? 'Loading plans…' : 'Select membership plan'}</option>
            {['Gym', 'Personal Training'].map((category) => {
              const group = plans.filter((p) => p.category === category)
              if (!group.length) return null
              return <optgroup key={category} label={category}>{group.map((p) => <option key={p.id} value={p.name}>{p.name} — {formatRupees(p.price)}</option>)}</optgroup>
            })}
          </select>
          <small className="field-help">Plan select karte hi fee aur expiry automatically fill hogi.</small>
        </div>

        <div className="field">
          <label htmlFor="duration">Duration</label>
          <input id="duration" value={selectedPlan?.duration || value.durationLabel || ''} readOnly />
        </div>

        <div className="field">
          <label htmlFor="startDate">Start Date</label>
          <input id="startDate" type="date" required value={value.startDate} onChange={(e) => handleStartDateChange(e.target.value)} />
        </div>

        <div className="field">
          <label htmlFor="expiryDate">Expiry Date</label>
          <input id="expiryDate" type="date" required value={value.expiryDate} readOnly />
        </div>

        <div className="field">
          <label htmlFor="fee">{feeLabel} (₹)</label>
          <input id="fee" type="number" min="0" step="1" required value={value.fee} onChange={(e) => set({ fee: e.target.value })} />
        </div>
      </div>

      <div className="form-section-title compact">Payment Details</div>
      <div className="field-grid">
        <div className="field">
          <label htmlFor="amountPaid">Amount Paid (₹)</label>
          <input id="amountPaid" type="number" min="0" step="1" value={value.amountPaid} onChange={(e) => set({ amountPaid: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="discount">Discount (₹)</label>
          <input id="discount" type="number" min="0" step="1" value={value.discount || ''} onChange={(e) => set({ discount: e.target.value })} />
          <small className="field-help">Discount reduces the member's due amount; it is not counted as cash received.</small>
        </div>
        <div className="field">
          <label htmlFor="paymentDate">Payment Date</label>
          <input id="paymentDate" type="date" value={value.paymentDate} onChange={(e) => set({ paymentDate: e.target.value })} disabled={!paid} />
        </div>
        <div className="field">
          <label htmlFor="method">Payment Method</label>
          <select id="method" value={value.method} onChange={(e) => set({ method: e.target.value })} disabled={!paid}>
            <option value="">Select method</option><option value="Cash">Cash</option><option value="UPI">UPI</option><option value="Bank Transfer">Bank Transfer</option><option value="Other">Other</option>
          </select>
        </div>
      </div>

      <div className="payment-summary">
        <div><span>Plan Fee</span><strong>{formatRupees(fee)}</strong></div>
        <div><span>Paid Now</span><strong>{formatRupees(paid)}</strong></div>
        <div><span>Discount</span><strong>{formatRupees(discount)}</strong></div>
        <div><span>Effective Credit</span><strong>{formatRupees(effectivePaid)}</strong></div>
        <div className={due > 0 ? 'due' : 'paid'}><span>{status === 'PAID' ? 'Payment Status' : 'Remaining Due'}</span><strong>{status === 'PAID' ? 'PAID' : formatRupees(due)}</strong></div>
        {overpaid > 0 && <div className="warning"><span>Overpayment</span><strong>{formatRupees(overpaid)}</strong></div>}
      </div>

      <div className="field">
        <label htmlFor="membershipNotes">Membership Notes</label>
        <textarea id="membershipNotes" value={value.notes} onChange={(e) => set({ notes: e.target.value })} />
      </div>
    </div>
  )
}

function durationToDays(duration = '') {
  const s = String(duration).toLowerCase()
  if (s.includes('12') || s.includes('year')) return 365
  if (s.includes('6')) return 180
  if (s.includes('3')) return 90
  if (s.includes('1')) return 30
  const n = Number.parseInt(s, 10)
  return Number.isFinite(n) ? n : null
}

export function defaultMembershipValue(startDate = todayISO()) {
  return { plan: '', durationLabel: '1 Month', durationDays: 30, startDate, expiryDate: addDays(startDate, 30), fee: '', amountPaid: '', discount: '', paymentDate: todayISO(), method: '', notes: '' }
}
