import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'

const VOLTAR_PROXY = '/api/proxy?url='
const ABYSM_PROXY = '/api/abysm?url='
const HCAPTCHA_SITEKEY = process.env.NEXT_PUBLIC_HCAPTCHA_SITEKEY
const VOLTAR_API_KEY = process.env.NEXT_PUBLIC_VOLTAR_API_KEY
const ABYSM_API_KEY = process.env.NEXT_PUBLIC_ABYSM_API_KEY

export default function UserscriptPage() {
  const router = useRouter()
  const [status, setStatus] = useState('init')
  const [message, setMessage] = useState('Preparing bypass…')
  const [error, setError] = useState('')
  const [needsCaptcha, setNeedsCaptcha] = useState(false)
  const [currentProvider, setCurrentProvider] = useState('voltar')

  useEffect(() => {
    if (!router.isReady) return
    const params = new URLSearchParams(window.location.search)
    const target = params.get('url')
    if (!target) {
      setStatus('error')
      setError('Missing url parameter')
      return
    }
    attemptResolve(target, '', 'voltar')
  }, [router.isReady])

  function loadHCaptcha() {
    if (window.hcaptcha) return
    const s = document.createElement('script')
    s.src = 'https://js.hcaptcha.com/1/api.js?render=explicit'
    s.async = true
    s.defer = true
    document.head.appendChild(s)
  }

  function renderHCaptcha(target, provider) {
    if (!window.hcaptcha) return
    window.hcaptcha.render('hcaptcha-box', {
      sitekey: HCAPTCHA_SITEKEY,
      callback: (token) => attemptResolve(target, token, provider)
    })
  }

  function getProxyUrl(provider) {
    return provider === 'abysm' ? ABYSM_PROXY : VOLTAR_PROXY
  }

  function getApiKey(provider) {
    return provider === 'abysm' ? ABYSM_API_KEY : VOLTAR_API_KEY
  }

  function attemptResolve(target, token, provider) {
    setCurrentProvider(provider)
    setStatus('loading')
    setMessage(provider === 'abysm' ? 'Resolving via Abysm…' : 'Resolving via Voltar…')
    setError('')
    setNeedsCaptcha(false)

    const headers = {
      Accept: 'application/json',
      'x-api-key': getApiKey(provider)
    }
    if (token) headers['x-hcaptcha-token'] = token

    const proxyUrl = getProxyUrl(provider) + encodeURIComponent(target)

    fetch(proxyUrl, {
      method: 'GET',
      headers,
      credentials: 'include'
    })
      .then(r => r.json().catch(() => null))
      .then(json => {
        if (!json) {
          handleProviderError(provider, target, token)
          return
        }

        let resultUrl = null

        if (json.status === 'success') {
          if (provider === 'abysm') {
            if (json.data && json.data.result) {
              resultUrl = json.data.result
            }
          } else {
            if (json.result) {
              resultUrl = json.result
            }
          }
        }

        if (resultUrl) {
          setMessage('Redirecting…')
          setTimeout(() => {
            window.location.href = resultUrl
          }, 400)
          return
        }

        if (provider === 'abysm' && json.result && String(json.result).toLowerCase().includes('hcaptcha')) {
          setNeedsCaptcha(true)
          setStatus('captcha')
          setMessage('Complete captcha to continue')
          loadHCaptcha()
          setTimeout(() => renderHCaptcha(target, provider), 300)
          return
        }

        if (provider === 'voltar' && json.result && String(json.result).toLowerCase().includes('hcaptcha')) {
          setNeedsCaptcha(true)
          setStatus('captcha')
          setMessage('Complete captcha to continue')
          loadHCaptcha()
          setTimeout(() => renderHCaptcha(target, provider), 300)
          return
        }

        handleProviderError(provider, target, token, json)
      })
      .catch(() => {
        handleProviderError(provider, target, token)
      })
  }

  function handleProviderError(provider, target, token, json = null) {
    const isVoltar = provider === 'voltar'
    const isLinkvertise = target.includes('linkvertise.com')

    const voltarFailed = isVoltar
    const shouldFallbackToAbysm = voltarFailed && isLinkvertise

    if (shouldFallbackToAbysm) {
      attemptResolve(target, token, 'abysm')
      return
    }

    setStatus('error')
    if (json && json.result) {
      setError(String(json.result))
    } else {
      setError('Unable to resolve link')
    }
  }

  return (
    <main className="us-root">
      <div className="us-center">
        <div className="us-logo">★</div>
        <h1 className="us-title">VortixWorld</h1>
        <p className="us-msg">{message}</p>

        {status === 'loading' && <div className="us-spinner" />}

        {status === 'captcha' && (
          <div className="us-captcha">
            <div id="hcaptcha-box" />
          </div>
        )}

        {status === 'error' && <div className="us-error">{error}</div>}
      </div>

      <style>{`
        html,body,#__next{
          height:100%;
          margin:0;
        }
        .us-root{
          min-height:100vh;
          display:flex;
          align-items:center;
          justify-content:center;
          padding:24px;
          background:linear-gradient(135deg,#060414,#1b1f5a,#4b52ff);
          font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial;
          color:#fff;
          text-align:center;
        }
        .us-center{
          max-width:420px;
          width:100%;
        }
        .us-logo{
          width:80px;
          height:80px;
          margin:0 auto 16px;
          border-radius:22px;
          display:flex;
          align-items:center;
          justify-content:center;
          font-size:36px;
          background:linear-gradient(135deg,#5b5cff,#8b8fff);
          box-shadow:0 10px 40px rgba(91,92,255,.55);
        }
        .us-title{
          margin:0;
          font-size:24px;
          font-weight:800;
          letter-spacing:.4px;
        }
        .us-msg{
          margin:12px 0 26px;
          font-size:15px;
          opacity:.9;
        }
        .us-spinner{
          width:54px;
          height:54px;
          margin:24px auto 0;
          border-radius:50%;
          border:5px solid rgba(255,255,255,.2);
          border-top-color:#fff;
          animation:spin .9s linear infinite;
        }
        .us-captcha{
          display:flex;
          justify-content:center;
          margin-top:10px;
        }
        .us-error{
          margin-top:18px;
          color:#ff6b7f;
          font-weight:700;
          font-size:14px;
        }
        @keyframes spin{
          to{transform:rotate(360deg)}
        }
        @media (max-width:420px){
          .us-title{font-size:22px}
        }
      `}</style>
    </main>
  )
}
