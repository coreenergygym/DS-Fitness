import React from 'react'
import ReactDOM from 'react-dom/client'
import './styles.css'
import './styles/admin.css'

const root = document.getElementById('root')

function showError(error) {
  console.error(error)
  root.innerHTML = `
    <div style="min-height:100vh;background:#090909;color:#fff;padding:24px;font-family:monospace">
      <h2 style="color:#ff6500">DS FITNESS — Runtime Error</h2>
      <pre style="white-space:pre-wrap;color:#ffb4b4">${String(error?.stack || error?.message || error)}</pre>
    </div>
  `
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error) {
    console.error(error)
  }

  render() {
    if (this.state.error) {
      return React.createElement(
        'div',
        {
          style: {
            minHeight: '100vh',
            background: '#090909',
            color: '#fff',
            padding: '24px',
            fontFamily: 'monospace'
          }
        },
        React.createElement('h2', { style: { color: '#ff6500' } }, 'DS FITNESS — Runtime Error'),
        React.createElement(
          'pre',
          { style: { whiteSpace: 'pre-wrap', color: '#ffb4b4' } },
          String(this.state.error.stack || this.state.error.message || this.state.error)
        )
      )
    }

    return this.props.children
  }
}

import('./App')
  .then(({ default: App }) => {
    ReactDOM.createRoot(root).render(
      React.createElement(
        ErrorBoundary,
        null,
        React.createElement(App)
      )
    )
  })
  .catch(showError)
