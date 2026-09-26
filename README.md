# GPS Employee Attendance System

This project is a web-based attendance system that uses the employee's browser GPS location to verify whether they are within 200 metres of the office before they can clock in or out.

## Features

- GPS permission request through the browser
- Haversine distance calculation between employee and office
- 200-metre office radius enforcement
- Clock-in and clock-out workflows
- Spreadsheet-ready POST payload for Google Sheets / Apps Script integration
- Local demo fallback if no spreadsheet URL is configured

## Project structure

- `client/` — React + Vite frontend
- `spreadsheet/attendance.gs` — Google Apps Script for writing rows into a Google Sheet
- `client/.env.example` — environment variables for the office location and spreadsheet URL

## How to run locally

1. Open a terminal in the project root.
2. Install frontend dependencies:

   ```bash
   cd client
   npm install
   ```

3. Copy the example environment file and update it:

   ```bash
   cp .env.example .env
   ```

4. Set your office coordinates and spreadsheet web app URL in `.env`.
5. Start the app:

   ```bash
   npm run dev
   ```

## Spreadsheet integration

1. Open Google Sheets and create a new spreadsheet.
2. Open the Apps Script editor from the spreadsheet.
3. Create a new script and paste the contents of `spreadsheet/attendance.gs`.
4. Deploy the script as a web app with "Anyone" access enabled.
5. Copy the generated web app URL into `VITE_SHEET_WEBAPP_URL` inside `.env`.
6. Ensure the spreadsheet contains a sheet named `Attendance`; the Apps Script will create it automatically if missing.

## Notes

- The app uses the browser's `Geolocation` API, so the employee must allow location access.
- If the browser is outside the allowed range, the app rejects the action with the message: "You must be within 200 metres of the office to clock in/out."
- The default office coordinates in `.env.example` can be changed to match your real office.
