import React from 'react'

export default function App() {
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: 24 }}>
      <h1>Calibrator Frontend</h1>
      <p>React + Vite dev server runs on port 5173.</p>
      <p>
        Backend API is expected at <code>http://localhost:8000</code> (proxied via <code>/api</code> in dev).
      </p>
      <p>
        Try fetching API root: <a href="/api/" target="_blank" rel="noreferrer">/api/</a>
      </p>
    </div>
  )
}

