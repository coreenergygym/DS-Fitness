import React from "react"
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import PublicSite from './pages/PublicSite'
import AdminSetup from './pages/AdminSetup'
import AdminLogin from './pages/AdminLogin'
import Dashboard from './pages/Dashboard'
import MembersList from './pages/MembersList'
import AddMember from './pages/AddMember'
import MemberProfile from './pages/MemberProfile'
import Payments from './pages/Payments'
import Statistics from './pages/Statistics'
import Settings from './pages/Settings'
import Plans from './pages/Plans'
import Gallery from './pages/Gallery'
import ProtectedRoute from './components/ProtectedRoute'

const protectedRoute = (element) => <ProtectedRoute>{element}</ProtectedRoute>

export default function App() {
  return <BrowserRouter>
    <Routes>
      <Route path="/" element={<PublicSite />} />
      <Route path="/admin/setup" element={<AdminSetup />} />
      <Route path="/admin" element={<AdminLogin />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin/dashboard" element={protectedRoute(<Dashboard />)} />
      <Route path="/admin/members" element={protectedRoute(<MembersList />)} />
      <Route path="/admin/members/add" element={protectedRoute(<AddMember />)} />
      <Route path="/admin/members/:id" element={protectedRoute(<MemberProfile />)} />
      <Route path="/admin/payments" element={protectedRoute(<Payments />)} />
      <Route path="/admin/statistics" element={protectedRoute(<Statistics />)} />
      <Route path="/admin/plans" element={protectedRoute(<Plans />)} />
      <Route path="/admin/gallery" element={protectedRoute(<Gallery />)} />
      <Route path="/admin/settings" element={protectedRoute(<Settings />)} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </BrowserRouter>
}
