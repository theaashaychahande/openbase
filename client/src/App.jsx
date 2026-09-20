import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Home from './pages/Home'
import Login from './pages/Login'
import Settings from './pages/Settings'
import Signup from './pages/Signup'
import Workspace from './pages/Workspace'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/app" element={<Workspace />} />
          <Route path="/app/:baseId" element={<Workspace />} />
          <Route path="/app/:baseId/:tableId" element={<Workspace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App