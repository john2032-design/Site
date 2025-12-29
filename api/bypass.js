import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'

const API_PROXY =
  'https://vortix-world.lopexbrad.workers.dev/?key=h135355N-9FQeZKpL2A8YwXrD&url='
const HCAPTCHA_SITEKEY = process.env.NEXT_PUBLIC_HCAPTCHA_SITEKEY

export default function UserscriptPage() {
  const router = useRouter()
  const [status, setStatus] = useState('init')
  const [message, setMessage] = useState('Preparing bypass…')
  const [error, setError] = useState('')
  const [needsCaptcha, setNeedsCaptcha] = useState(false)

  useEffect(() => {
    if (!router.isReady) return
    const params = new URLSearchParams(window.location.search)
    const target = params.get('url')
    if (!target) {
      setStatus('error')
      setError('Missing url parameter')
      return
    }
    attemptResolve(target, '')
  }, [router.isReady])

  function loadHCaptcha() {
    if (window.hcaptcha) return
    const s = document.createElement('script')
    s.src = 'https://js.hcaptcha.com/1/api.js?render=explicit'
    s.async = true
    s.defer = true
    document.head.appendChild(s)
  }

  function renderHCaptcha(target) {
    if (!window.hcaptcha) return
    window.hcaptcha.render('hcaptcha-box', {
      sitekey: HCAPTCHA_SITEKEY,
      callback: (token) => attemptResolve(target, token)
    })
  }

  function attemptResolve(target, token) {
    setStatus('loading')
    setMessage('Resolving link…')
    setError('')
    const headers = { Accept: 'application/json' }
    if (token) headers['x-hcaptcha-token'] = token
    fetch(API_PROXY + encodeURIComponent(target), {
      method: 'GET',
      headers,
      credentials: 'include'
    })
      .then(r => r.json().catch(() => null))
