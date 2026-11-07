import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Landing from './pages/Landing'
import JoinQueue from './pages/JoinQueue'
import Dashboard from './pages/Dashboard'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/burnaby" replace />} />
        <Route path="/:slug" element={<Landing />} />
        <Route path="/:slug/join" element={<JoinQueue />} />
        <Route path="/:slug/dashboard" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  )
}
