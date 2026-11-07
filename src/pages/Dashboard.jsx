import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { LOCATIONS } from '../locations'
import './Dashboard.css'

function useNow() {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(id)
  }, [])
  return now
}

function waitingTime(createdAt, now) {
  const mins = Math.floor((now - new Date(createdAt)) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export default function Dashboard() {
  const { slug } = useParams()
  const location = LOCATIONS[slug]
  const [queue, setQueue] = useState([])
  const [services, setServices] = useState({})
  const [barbers, setBarbers] = useState([])
  const [dialog, setDialog] = useState(null) // { type: 'chair'|'remove'|'notify', entryId, phone? }
  const [toast, setToast] = useState(null)
  const now = useNow()

  useEffect(() => {
    fetchQueue()

    supabase.from('services').select('id, name, price').then(({ data }) => {
      if (data) {
        const map = {}
        data.forEach(s => { map[s.id] = { name: s.name, price: s.price } })
        setServices(map)
      }
    })

    supabase.from('barbers').select('id, name').eq('is_active', true).order('name').then(({ data }) => {
      setBarbers(data || [])
    })

    const channel = supabase
      .channel('dashboard-waitlist')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'waitlist' }, fetchQueue)
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  async function fetchQueue() {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const { data } = await supabase
      .from('waitlist')
      .select('*')
      .or(`status.in.(waiting,in_chair),and(status.eq.done,created_at.gte.${todayStart.toISOString()})`)
      .order('created_at', { ascending: true })
    setQueue(data || [])
  }

  async function assignToChair(entryId, barberId) {
    await supabase.from('waitlist').update({ status: 'in_chair', barber_id: barberId }).eq('id', entryId)
    setDialog(null)
  }

  async function updateStatus(id, status) {
    await supabase.from('waitlist').update({ status }).eq('id', id)
  }

  async function removeEntry(id) {
    await supabase.from('waitlist').update({ status: 'removed' }).eq('id', id)
    setDialog(null)
  }

  const today = new Date().toDateString()
  const waiting = queue.filter(e => e.status === 'waiting')
  const inChair = queue.filter(e => e.status === 'in_chair')
  const done = queue.filter(e => e.status === 'done' && new Date(e.created_at).toDateString() === today)

  const barberMap = {}
  barbers.forEach(b => { barberMap[b.id] = b.name })

  return (
    <div className="db-container">
      {toast && <div className="db-toast">{toast}</div>}
      {dialog && (
        <div className="db-overlay" onClick={() => setDialog(null)}>
          <div className="db-dialog" onClick={e => e.stopPropagation()}>
            {dialog.type === 'chair' && (
              <>
                <h3>Select Barber</h3>
                <p>Who is taking this client?</p>
                <div className="db-barber-list">
                  {barbers.length === 0 ? (
                    <p className="db-dialog-empty">No active barbers found. Add barbers in Supabase.</p>
                  ) : (
                    barbers.map(b => (
                      <button key={b.id} className="db-barber-btn" onClick={() => assignToChair(dialog.entryId, b.id)}>
                        {b.name}
                      </button>
                    ))
                  )}
                </div>
              </>
            )}
            {dialog.type === 'remove' && (
              <>
                <h3>Remove Client</h3>
                <p>Are you sure you want to remove this client?</p>
                <div className="db-dialog-actions">
                  <button className="db-dialog-cancel" onClick={() => setDialog(null)}>Cancel</button>
                  <button className="db-barber-btn db-btn-remove" onClick={() => removeEntry(dialog.entryId)}>Remove</button>
                </div>
              </>
            )}
            {dialog.type === 'notify' && (
              <>
                <h3>Notify Client</h3>
                <p>Send a notification to this client?</p>
                <div className="db-dialog-actions">
                  <button className="db-dialog-cancel" onClick={() => setDialog(null)}>Cancel</button>
                  <button className="db-barber-btn" onClick={async () => {
                    await supabase.functions.invoke('send-sms', {
                      body: {
                        to: dialog.phone,
                        message: `Hi ${dialog.name}, your barber is ready for you! Please arrive within 5 minutes to keep your place in line.`,
                      },
                    })
                    setDialog(null)
                    setToast('Notification sent!')
                    setTimeout(() => setToast(null), 3000)
                  }}>Send</button>
                </div>
              </>
            )}
            {dialog.type === 'chair' && (
              <button className="db-dialog-cancel" onClick={() => setDialog(null)}>Cancel</button>
            )}
          </div>
        </div>
      )}

      <div className="db-header">
        <p className="db-location">{location.dashboardLabel}</p>
        <div className="db-stats">
          <div className="db-stat">
            <span className="db-stat-number">{waiting.length}</span>
            <span className="db-stat-label">Waiting</span>
          </div>
          <div className="db-stat">
            <span className="db-stat-number">{inChair.length}</span>
            <span className="db-stat-label">In Chair</span>
          </div>
        </div>
      </div>

      <div className="db-sections">
        <section className="db-section">
          <h2 className="db-section-title">
            <span className="db-section-dot db-dot-waiting" />
            Waiting ({waiting.length})
          </h2>
          {waiting.length === 0 ? (
            <p className="db-empty">No one waiting</p>
          ) : (
            <div className="db-list">
              {waiting.map((entry, i) => (
                <div key={entry.id} className="db-card">
                  <div className="db-card-top">
                    <div className="db-card-info">
                      <div className="db-name">{entry.customer_name} <span className="db-meta">— {services[entry.service_id] ? `${services[entry.service_id].name} ($${services[entry.service_id].price})` : '—'}</span></div>
                    </div>
                    <span className="db-wait-time">{waitingTime(entry.created_at, now)}</span>
                  </div>
                  <div className="db-actions">
                    <button
                      className="db-btn db-btn-chair"
                      onClick={() => setDialog({ type: 'chair', entryId: entry.id })}
                    >
                      Chair
                    </button>
                    <button className="db-btn db-btn-notify" onClick={() => setDialog({ type: 'notify', entryId: entry.id, phone: entry.phone, name: entry.customer_name })}>
                      🔔
                    </button>
                    <button
                      className="db-btn db-btn-remove"
                      onClick={() => setDialog({ type: 'remove', entryId: entry.id })}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="db-section">
          <h2 className="db-section-title">
            <span className="db-section-dot db-dot-chair" />
            In Chair ({inChair.length})
          </h2>
          {inChair.length === 0 ? (
            <p className="db-empty">No one in chair</p>
          ) : (
            <div className="db-list">
              {inChair.map(entry => (
                <div key={entry.id} className="db-card db-card-chair">
                  <div className="db-card-top">
                    <div className="db-card-info">
                      <div className="db-name">{entry.customer_name} <span className="db-meta">— {services[entry.service_id] ? `${services[entry.service_id].name} ($${services[entry.service_id].price})` : '—'}{entry.barber_id && barberMap[entry.barber_id] && <span className="db-barber-tag"> · {barberMap[entry.barber_id]}</span>}</span></div>
                    </div>
                  </div>
                  <div className="db-actions">
                    <button
                      className="db-btn db-btn-done"
                      onClick={() => updateStatus(entry.id, 'done')}
                    >
                      Done
                    </button>
                    <button className="db-btn db-btn-notify" onClick={() => setDialog({ type: 'notify', entryId: entry.id, phone: entry.phone, name: entry.customer_name })}>
                      🔔
                    </button>
                    <button
                      className="db-btn db-btn-remove"
                      onClick={() => setDialog({ type: 'remove', entryId: entry.id })}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="db-section">
          <h2 className="db-section-title">
            <span className="db-section-dot db-dot-done" />
            Done ({done.length})
          </h2>
          {done.length === 0 ? (
            <p className="db-empty">No completed clients</p>
          ) : (
            <div className="db-list">
              {done.map(entry => (
                <div key={entry.id} className="db-card db-card-done">
                  <div className="db-card-top">
                    <div className="db-card-info">
                      <div className="db-name">{entry.customer_name} <span className="db-meta">— {services[entry.service_id] ? `${services[entry.service_id].name} ($${services[entry.service_id].price})` : '—'}{entry.barber_id && barberMap[entry.barber_id] && <span className="db-barber-tag"> · {barberMap[entry.barber_id]}</span>}</span></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
