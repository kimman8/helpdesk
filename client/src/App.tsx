import { useEffect, useState } from 'react'
import { Routes, Route } from 'react-router-dom'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
    </Routes>
  )
}

function Home() {
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch('http://localhost:3000/health')
      .then((res) => res.json())
      .then((data) => setStatus(data.status))
      .catch(() => setError(true))
  }, [])

  return (
    <div className="p-4">
      {error && <p className="text-red-500">Could not reach server.</p>}
      {status && <p className="text-green-600">Server status: {status}</p>}
      {!status && !error && <p className="text-gray-400">Checking server...</p>}
    </div>
  )
}
