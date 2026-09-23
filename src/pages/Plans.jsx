import React from "react"
import { useEffect, useState } from 'react'
import AdminLayout from '../components/AdminLayout'
import { supabase } from '../lib/supabaseClient'
import { formatRupees } from '../lib/format'

const EMPTY = { name: '', price: '', duration: '1 Month', category: 'Gym', is_active: true, sort_order: 0 }
export default function Plans() {
  const [plans, setPlans] = useState([])
  const [form, setForm] = useState(EMPTY)
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  async function load() { const { data, error } = await supabase.from('membership_plans').select('*').order('sort_order').order('created_at'); if (error) setError(error.message); else setPlans(data || []) }
  useEffect(() => { load() }, [])
  function startEdit(p) { setEditing(p.id); setForm({ name:p.name, price:p.price, duration:p.duration, category:p.category, is_active:p.is_active, sort_order:p.sort_order }) }
  function reset() { setEditing(null); setForm(EMPTY) }
  async function save(e) { e.preventDefault(); setSaving(true); setError(''); const payload={...form, price:Number(form.price), sort_order:Number(form.sort_order)||0}; const q=editing ? supabase.from('membership_plans').update(payload).eq('id',editing) : supabase.from('membership_plans').insert(payload); const {error}=await q; if(error) setError(error.message); else { reset(); await load() } setSaving(false) }
  async function remove(id) { if(!confirm('Delete this membership plan?')) return; const {error}=await supabase.from('membership_plans').delete().eq('id',id); if(error)setError(error.message); else load() }
  return <AdminLayout title="Membership Plans">
    <div className="admin-two-col">
      <form className="card admin-card" onSubmit={save}>
        <div className="form-section-title first">{editing ? 'Edit Plan' : 'Add Membership Plan'}</div>
        {error && <div className="form-error-banner">{error}</div>}
        <div className="field"><label>Plan Name</label><input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="1 Month" /></div>
        <div className="field-grid"><div className="field"><label>Price (₹)</label><input required type="number" min="0" value={form.price} onChange={e=>setForm({...form,price:e.target.value})}/></div><div className="field"><label>Duration</label><select value={form.duration} onChange={e=>setForm({...form,duration:e.target.value})}><option>1 Month</option><option>3 Months</option><option>6 Months</option><option>12 Months</option></select></div></div>
        <div className="field-grid"><div className="field"><label>Category</label><select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}><option>Gym</option><option>Personal Training</option></select></div><div className="field"><label>Order</label><input type="number" value={form.sort_order} onChange={e=>setForm({...form,sort_order:e.target.value})}/></div></div>
        <label className="check-row"><input type="checkbox" checked={form.is_active} onChange={e=>setForm({...form,is_active:e.target.checked})}/> Active plan</label>
        <div className="form-actions"><button className="btn btn-primary" disabled={saving}>{saving?'Saving…':editing?'Update Plan':'Add Plan'}</button>{editing&&<button type="button" className="btn btn-secondary" onClick={reset}>Cancel</button>}</div>
      </form>
      <div className="card admin-card"><div className="form-section-title first">All Plans</div><div className="plan-list">{plans.map(p=><div className="plan-row" key={p.id}><div><strong>{p.name}</strong><small>{p.category} · {p.duration} · {p.is_active?'Active':'Hidden'}</small></div><strong>{formatRupees(p.price)}</strong><div className="row-actions"><button className="btn btn-secondary btn-small" onClick={()=>startEdit(p)}>Edit</button><button className="btn btn-danger btn-small" onClick={()=>remove(p.id)}>Delete</button></div></div>)}{!plans.length&&<p>No plans yet.</p>}</div></div>
    </div>
  </AdminLayout>
}
