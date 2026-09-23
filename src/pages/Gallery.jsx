import React from "react"
import { useEffect, useState } from 'react'
import AdminLayout from '../components/AdminLayout'
import { supabase } from '../lib/supabaseClient'

export default function Gallery() {
  const [items,setItems]=useState([]), [file,setFile]=useState(null), [title,setTitle]=useState(''), [busy,setBusy]=useState(false), [error,setError]=useState('')
  async function load(){ const {data,error}=await supabase.from('gallery').select('*').order('sort_order').order('created_at',{ascending:false}); if(error)setError(error.message); else setItems(data||[]) }
  useEffect(()=>{load()},[])
  async function upload(e){e.preventDefault(); if(!file)return; setBusy(true);setError(''); try { const path=`${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`; const {error:up}=await supabase.storage.from('gallery').upload(path,file,{upsert:false}); if(up)throw up; const {data:pub}=supabase.storage.from('gallery').getPublicUrl(path); const {error:db}=await supabase.from('gallery').insert({title:title||file.name,image_url:pub.publicUrl,storage_path:path}); if(db)throw db; setFile(null);setTitle('');document.getElementById('gallery-file').value='';await load()}catch(e){setError(e.message||'Upload failed')}finally{setBusy(false)}}
  async function remove(item){if(!confirm('Delete this gallery image?'))return; if(item.storage_path)await supabase.storage.from('gallery').remove([item.storage_path]); const {error}=await supabase.from('gallery').delete().eq('id',item.id);if(error)setError(error.message);else load()}
  return <AdminLayout title="Gallery"><div className="admin-two-col"><form className="card admin-card" onSubmit={upload}><div className="form-section-title first">Upload Gallery Image</div>{error&&<div className="form-error-banner">{error}</div>}<div className="field"><label>Title</label><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Gym floor / Training area"/></div><div className="field"><label>Image</label><input id="gallery-file" type="file" accept="image/*" onChange={e=>setFile(e.target.files?.[0]||null)} required/></div><button className="btn btn-primary" disabled={busy}>{busy?'Uploading…':'Upload Image'}</button></form><div className="gallery-grid-admin">{items.map(i=><div className="gallery-admin-card" key={i.id}><img src={i.image_url} alt={i.title||''}/><div><strong>{i.title||'Untitled'}</strong><button className="btn btn-danger btn-small" onClick={()=>remove(i)}>Delete</button></div></div>)}{!items.length&&<div className="card">No gallery images yet.</div>}</div></div></AdminLayout>
}
