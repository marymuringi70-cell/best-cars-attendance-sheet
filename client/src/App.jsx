import { useMemo, useState } from 'react'
import './App.css'

// 1. Define your small team list here
const EMPLOYEES = [
  { name: 'Harrison Irura', id: 'EMP-1001' },
  { name: 'Gladys Mwangi', id: 'EMP-1002' },
  { name: 'David Muchina', id: 'EMP-1003' },
  { name: 'Simon Wagura', id: 'EMP-1004' },
  { name: 'Mary Muringi', id: 'EMP-1005' },
  { name: 'Stephanie Njeri', id: 'EMP-1006' },
  { name: 'Stephen Muchiri', id: 'EMP-1007' },
  { name: 'Alice Nyamakie', id: 'EMP-1008' },
  { name: 'Sarah Karanja', id: 'EMP-1009' },
  { name: 'Paulie Gitahi', id: 'EMP-1010' },
  { name: 'Yvonne Njoroge', id: 'EMP-1011' },
  { name: 'Stalla Kimani', id: 'EMP-1012' },
  { name: 'Jedida ', id: 'EMP-1013' },
  { name: 'Joel Ndiritu', id: 'EMP-1014' },
  { name: 'Diana Gesare', id: 'EMP-1015' },
  { name: 'Patrick Kinyua', id: 'EMP-1016' }
]

const DEFAULT_OFFICE = {
  lat: 6.5244,
  lng: 3.3792,
}

const ALERT_RADIUS_METERS = Number(import.meta.env.VITE_ALERT_RADIUS ?? 100)

const getDeviceId = () => {
  let deviceId = localStorage.getItem('company_device_id')
  if (!deviceId) {
    const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase()
    deviceId = `DEV-${randomHex}`
    localStorage.setItem('company_device_id', deviceId)
  }
  return deviceId
}

const calculateShiftPenalty = (selectedShift, now) => {
  let targetHour = 8
  if (selectedShift === 'afternoon') {
    targetHour = 12
  }

  const targetTime = new Date(now)
  targetTime.setHours(targetHour, 0, 0, 0)

  let minutesLate = 0
  let penaltyAmount = 0

  if (now > targetTime) {
    const diffMs = now - targetTime
    minutesLate = Math.floor(diffMs / (1000 * 60))
    penaltyAmount = minutesLate * 10
  }

  return { minutesLate, penaltyAmount }
}

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
  const deviceId = useMemo(() => getDeviceId(), [])
  
  // Default selection to the first employee in the list
  const [selectedEmployeeIndex, setSelectedEmployeeIndex] = useState(0)
  const [selectedShift, setSelectedShift] = useState('morning')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [distanceMeters, setDistanceMeters] = useState(null)
  const [message, setMessage] = useState('Ready to clock in or out.')
  const [messageType, setMessageType] = useState('info')

  const activeEmployee = EMPLOYEES[selectedEmployeeIndex]

  const handleClockAction = (action) => {
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
        
        let penaltyData = { minutesLate: 0, penaltyAmount: 0 }
        if (action === 'clock-in') {
          penaltyData = calculateShiftPenalty(selectedShift, now)
        }

        const record = {
          employeeName: activeEmployee.name,
          employeeId: activeEmployee.id,
          deviceId: deviceId,
          shift: selectedShift === 'morning' ? 'Morning Shift (8:00 AM)' : 'Afternoon Shift (12:00 PM)',
          minutesLate: penaltyData.minutesLate,
          penaltyKes: penaltyData.penaltyAmount,
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
          status: penaltyData.minutesLate > 0 ? `Late (${penaltyData.minutesLate} mins)` : 'On Time',
        }

        try {
          const result = await submitToSpreadsheet(record)
          setMessageType('success')
          
          let successText = `Clock ${action.replace('-', ' ')} recorded for ${activeEmployee.name}.`
          if (penaltyData.penaltyAmount > 0) {
            successText += ` Late Penalty: KES ${penaltyData.penaltyAmount}.`
          }

          setMessage(result.demoMode ? result.message : successText)
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
            <span className="label">Allowed radius</span>
            <strong>{ALERT_RADIUS_METERS} m</strong>
          </div>
          <div>
            <span className="label">Device ID</span>
            <strong>{deviceId}</strong>
          </div>
        </div>

        {/* Dropdown for Employees */}
        <div className="field-group">
          <label htmlFor="employee-select">Select Employee</label>
          <select
            id="employee-select"
            value={selectedEmployeeIndex}
            onChange={(e) => setSelectedEmployeeIndex(Number(e.target.value))}
            className="shift-select"
          >
            {EMPLOYEES.map((emp, index) => (
              <option key={emp.id} value={index}>
                {emp.name} ({emp.id})
              </option>
            ))}
          </select>
        </div>

        {/* Dropdown for Shift */}
        <div className="field-group">
          <label htmlFor="shift-select">Select Shift</label>
          <select
            id="shift-select"
            value={selectedShift}
            onChange={(e) => setSelectedShift(e.target.value)}
            className="shift-select"
          >
            <option value="morning">Morning Shift (8:00 AM)</option>
            <option value="afternoon">Afternoon Shift (12:00 PM)</option>
          </select>
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