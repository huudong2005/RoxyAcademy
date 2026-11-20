import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

requestAnimationFrame(() => {
  const splash = document.getElementById('app-splash')
  if (!splash) return

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    splash.remove()
  } else {
    splash.style.opacity = '0'
    splash.style.pointerEvents = 'none'
    setTimeout(() => {
      splash.remove()
    }, 300)
  }
})
