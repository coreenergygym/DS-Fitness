import React from "react"
import { NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import '../styles/admin.css'

const NAV_ITEMS = [
  { to:'/admin/dashboard', label:'Dashboard', icon:'▦' },
  { to:'/admin/members', label:'Members', icon:'♙' },
  { to:'/admin/members/add', label:'Add Member', icon:'＋' },
  { to:'/admin/payments', label:'Payments', icon:'₹' },
  { to:'/admin/plans', label:'Membership Plans', icon:'◇' },
  { to:'/admin/gallery', label:'Gallery', icon:'▧' },
  { to:'/admin/statistics', label:'Statistics', icon:'◒' },
  { to:'/admin/settings', label:'Settings', icon:'⚙' },
]
export default function AdminLayout({title,children}){
 const navigate=useNavigate()
 async function logout(){await supabase.auth.signOut();navigate('/admin/login',{replace:true})}
 return <div className="admin-shell"><aside className="admin-sidebar"><div className="admin-brand"><span className="admin-brand-mark">DS</span><div><strong>DS FITNESS</strong><small>ADMIN CONTROL CENTER</small></div></div><nav>{NAV_ITEMS.map(i=><NavLink key={i.to} to={i.to} className={({isActive})=>'admin-nav-link '+(isActive?'active':'')}><span className="nav-icon">{i.icon}</span>{i.label}</NavLink>)}</nav><button className="admin-logout" onClick={logout}><span>↪</span> Log out</button></aside><main className="admin-main"><header className="admin-topbar"><div><div className="admin-kicker">DS FITNESS / ADMIN</div><h1>{title}</h1></div><a className="view-site" href="/" target="_blank" rel="noreferrer">View Website ↗</a></header>{children}</main></div>
}
