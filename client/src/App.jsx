import { useMemo, useState } from 'react'
import './App.css'

const DEFAULT_OFFICE = {
  lat: 6.5244,
  lng: 3.3792,
}

const ALERT_RADIUS_METERS = Number(import.meta.env.VITE_ALERT_RADIUS ?? 200)

const toRadians = (value) => (value * Math.PI) / 180

const calculateDistanceMeters = (lat1, lng1, lat2, lng2) => {
  const earthRadiusMeters = 6371000
  const dLat = toRadians(lat2 - lat1)
  const dLng = toRadians(lng2 - lng1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return earthRadiusMeters * c
}

const getOfficeCoordinates = () => ({
  lat: Number(import.meta.env.VITE_OFFICE_LAT ?? DEFAULT_OFFICE.lat),
  lng: Number(import.meta.env.VITE_OFFICE_LNG ?? DEFAULT_OFFICE.lng),
})

const getSpreadsheetUrl = () => import.meta.env.VITE_SHEET_WEBAPP_URL ?? ''

async function submitToSpreadsheet(record) {
  const spreadsheetUrl = getSpreadsheetUrl()

  if (!spreadsheetUrl) {
    const savedRecords = JSON.parse(localStorage.getItem('attendance-demo') ?? '[]')
    savedRecords.push(record)
    localStorage.setItem('attendance-demo', JSON.stringify(savedRecords))

    return {
      demoMode: true,
      message:
        'No spreadsheet web app URL is configured. The attendance record was saved locally in demo mode.',
    }
  }

  // mode: 'no-cors' prevents browser CORS preflight errors with Google Apps Script
  await fetch(spreadsheetUrl, {
    method: 'POST',
    mode: 'no-cors',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify(record),
  })

  return { ok: true }
}

function App() {
  const officeCoordinates = useMemo(() => getOfficeCoordinates(), [])
  const [employeeName, setEmployeeName] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [distanceMeters, setDistanceMeters] = useState(null)
  const [message, setMessage] = useState('Ready to clock in or out.')
  const [messageType, setMessageType] = useState('info')

  const handleClockAction = (action) => {
    const trimmedName = employeeName.trim()
    const trimmedId = employeeId.trim()

    if (!trimmedName || !trimmedId) {
      setMessageType('error')
      setMessage('Please enter both the employee name and employee ID.')
      return
    }

    setIsSubmitting(true)
    setMessageType('info')
    setMessage('Requesting GPS access...')

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        const distance = calculateDistanceMeters(
          latitude,
          longitude,
          officeCoordinates.lat,
          officeCoordinates.lng,
        )

        setDistanceMeters(distance)

        if (distance > ALERT_RADIUS_METERS) {
          setMessageType('error')
          setMessage(
            `You must be within ${ALERT_RADIUS_METERS} metres of the office to clock ${action.replace('-', ' ')}.`,
          )
          setIsSubmitting(false)
          return
        }

        const now = new Date()
        const record = {
          employeeName: trimmedName,
          employeeId: trimmedId,
          action,
          timestamp: now.toISOString(),
          date: now.toLocaleDateString('en-CA'),
          time: now.toLocaleTimeString('en-GB', { hour12: false }),
          latitude: latitude.toFixed(6),
          longitude: longitude.toFixed(6),
          officeLatitude: officeCoordinates.lat,
          officeLongitude: officeCoordinates.lng,
          distanceMeters: Math.round(distance),
          verified: true,
          status: 'Verified',
        }

        try {
          const result = await submitToSpreadsheet(record)
          setMessageType('success')
          setMessage(
            result.demoMode
              ? result.message
              : `Clock ${action.replace('-', ' ')} recorded successfully. Attendance was saved to the spreadsheet.`,
          )
        } catch (error) {
          setMessageType('error')
          setMessage(error.message)
        } finally {
          setIsSubmitting(false)
        }
      },
      (error) => {
        setMessageType('error')
        setMessage(
          `GPS access was denied or failed: ${error.message}. Please allow location access and try again.`,
        )
        setIsSubmitting(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0,
      },
    )
  }

  return (
    <main className="app-shell">
      <section className="attendance-card">
        <div className="card-header">
          <p className="eyebrow">Office Attendance</p>
          <h1>GPS Employee Clock-In</h1>
        </div>

        <div className="meta-grid">
          <div>
            <span className="label">Office latitude</span>
            <strong>{officeCoordinates.lat}</strong>
          </div>
          <div>
            <span className="label">Office longitude</span>
            <strong>{officeCoordinates.lng}</strong>
          </div>
          <div>
            <span className="label">Allowed radius</span>
            <strong>{ALERT_RADIUS_METERS} m</strong>
          </div>
        </div>

        <div className="field-group">
          <label htmlFor="employee-name">Employee name</label>
          <input
            id="employee-name"
            value={employeeName}
            onChange={(event) => setEmployeeName(event.target.value)}
            placeholder="Jane Doe"
          />
        </div>

        <div className="field-group">
          <label htmlFor="employee-id">Employee ID</label>
          <input
            id="employee-id"
            value={employeeId}
            onChange={(event) => setEmployeeId(event.target.value)}
            placeholder="EMP-1024"
          />
        </div>

        <div className="button-row">
          <button
            type="button"
            className="primary-button success"
            onClick={() => handleClockAction('clock-in')}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Checking location...' : 'Clock In'}
          </button>
          <button
            type="button"
            className="primary-button danger"
            onClick={() => handleClockAction('clock-out')}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Checking location...' : 'Clock Out'}
          </button>
        </div>

        <div className={`status-panel ${messageType}`}>
          <p>{message}</p>
          <small>
            {distanceMeters === null
              ? 'Waiting for GPS signal.'
              : `Last location check: ${Math.round(distanceMeters)} metres from office.`}
          </small>
        </div>
      </section>
    </main>
  )
}

export default App