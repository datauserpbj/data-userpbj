import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import bungoFavicon from './img/bungo-favicon.png'

const favicon = document.createElement('link')
favicon.rel = 'icon'
favicon.href = bungoFavicon
document.head.appendChild(favicon)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)