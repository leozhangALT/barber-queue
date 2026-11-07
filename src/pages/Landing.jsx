import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { LOCATIONS } from '../locations'
import './Landing.css'

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

export default function Landing() {
  const { slug } = useParams()
  const location = LOCATIONS[slug]
  const [queueCount, setQueueCount] = useState(null)
  const [myEntry, setMyEntry] = useState(null)
  const [myPosition, setMyPosition] = useState(null)
  const [leaving, setLeaving] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const savedId = localStorage.getItem('waitlist_id')
    fetchQueue(savedId)

    const channel = supabase
      .channel('waitlist-landing')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'waitlist' }, () => {
        fetchQueue(localStorage.getItem('waitlist_id'))
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  async function fetchQueue(savedId) {
    const { data } = await supabase
      .from('waitlist')
      .select('id, customer_name, status, created_at')
      .eq('status', 'waiting')
      .order('created_at', { ascending: true })

    if (!data) return

    setQueueCount(data.length)

    if (savedId) {
      const entry = data.find(e => String(e.id) === String(savedId))
      if (entry) {
        setMyEntry(entry)
        setMyPosition(data.indexOf(entry) + 1)
      } else {
        // entry no longer in waiting (done/removed)
        localStorage.removeItem('waitlist_id')
        setMyEntry(null)
        setMyPosition(null)
      }
    }
  }

  async function handleLeave() {
    setLeaving(true)
    const savedId = localStorage.getItem('waitlist_id')
    await supabase.from('waitlist').update({ status: 'removed' }).eq('id', savedId)
    localStorage.removeItem('waitlist_id')
    setMyEntry(null)
    setMyPosition(null)
    setLeaving(false)
    fetchQueue(null)
  }

  return (
    <div className="land-container">
      <div className="land-card">
        <div className="land-header">
          <div className="land-logo">✂</div>
          <h1>{location.name}</h1>
          <p>{location.tagline}</p>
        </div>

        <div className="land-queue-status">
          <div className="land-count">
            <span className="land-count-number">
              {myEntry ? ordinal(myPosition) : (queueCount ?? '—')}
            </span>
            <span className="land-count-label">
              {myEntry ? "you're in line" : 'people in queue'}
            </span>
          </div>

          {myEntry ? (
            <div className="land-my-status">
              <button className="land-btn land-btn-leave" onClick={handleLeave} disabled={leaving}>
                {leaving ? 'Removing you...' : 'Leave Waitlist'}
              </button>
            </div>
          ) : (
            <button className="land-btn land-btn-join" onClick={() => navigate(`/${slug}/join`)}>
              Join Waitlist
            </button>
          )}
        </div>

        <div className="land-info">
          <div className="land-info-row">
            <span className="land-info-icon">📍</span>
            <span>{location.address}</span>
          </div>
          <div className="land-info-row">
            <span className="land-info-icon">🕐</span>
            <span>{location.hours.map((h, i) => <span key={i} className="land-hours-line">{h}</span>)}</span>
          </div>
          <div className="land-info-row">
            <span className="land-info-icon">📞</span>
            <span>{location.phone}</span>
          </div>
        </div>

        <a className="land-booking-link" href={location.bookingUrl} target="_blank" rel="noopener noreferrer">
          Book an appointment →
        </a>
      </div>
    </div>
  )
}
