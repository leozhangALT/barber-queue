import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { LOCATIONS } from '../locations'
import './JoinQueue.css'

export default function JoinQueue() {
  const { slug } = useParams()
  const location = LOCATIONS[slug]
  const [services, setServices] = useState([])
  const [form, setForm] = useState({
    customer_name: '',
    phone: '',
    service_id: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    supabase.from('services').select('*').order('sort_order').then(({ data }) => {
      setServices(data || [])
    })
  }, [])

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data, error } = await supabase
      .from('waitlist')
      .insert({
        customer_name: form.customer_name,
        phone: form.phone,
        service_id: form.service_id || null,
        status: 'waiting',
      })
      .select('id')
      .single()

    if (error) {
      setLoading(false)
      setError('Something went wrong. Please try again.')
      return
    }

    await supabase.functions.invoke('send-sms', {
      body: {
        to: form.phone,
        message: `Hi ${form.customer_name}, you've been added to the waitlist at ${location.name}. We'll text you when we're ready for you!`,
      },
    })

    setLoading(false)
    localStorage.setItem('waitlist_id', data.id)
    navigate(`/${slug}`)
  }

  return (
    <div className="jq-container">
      <div className="jq-card">
        <div className="jq-header">
          <div className="jq-logo">✂</div>
          <h1>{location.name}</h1>
          <p>Join the waitlist below</p>
        </div>

        <form onSubmit={handleSubmit} className="jq-form">
          <div className="jq-field">
            <label htmlFor="customer_name">Name *</label>
            <input
              id="customer_name"
              name="customer_name"
              type="text"
              placeholder=""
              value={form.customer_name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="jq-field">
            <label htmlFor="phone">Phone Number *</label>
            <input
              id="phone"
              name="phone"
              type="tel"
              placeholder=""
              value={form.phone}
              onChange={handleChange}
              required
            />
          </div>

          <div className="jq-field">
            <label htmlFor="service_id">Service *</label>
            <select
              id="service_id"
              name="service_id"
              value={form.service_id}
              onChange={handleChange}
              required
            >
              <option value="">Select a service</option>
              {services.map(s => (
                <option key={s.id} value={s.id}>{s.name} — ${s.price}</option>
              ))}
            </select>
          </div>

          {error && <p className="jq-error">{error}</p>}

          <button type="submit" className="jq-btn" disabled={loading}>
            {loading ? 'Adding you...' : 'Join Waitlist'}
          </button>

          <button type="button" className="jq-btn-back" onClick={() => navigate(`/${slug}`)}>Back</button>
        </form>
      </div>
    </div>
  )
}
