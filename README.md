# SmartAttend

IoT-Based Smart Attendance Management System for Crestview University, School of Computing.

A card tap at an RC522 reader becomes an entry or an exit, a status, and a record both the registrar and the student can see. The web application is a Next.js App Router project. Route Handlers are the REST API. PostgreSQL, accessed through Drizzle ORM, is the system of record.

The original brief described Express and MongoDB. This environment runs Next.js and PostgreSQL, so the same module boundaries and the same NodeMCU contract are implemented here:

```text
RFID card -> RC522 -> NodeMCU ESP8266 -> Wi-Fi -> POST /api/rfid/scan -> PostgreSQL -> web dashboard
```

The physical reader and the IoT Control Center call the same scan service. There is no second attendance path and no browser database.

## Run the application

```bash
npm install
cp .env.example .env
npx drizzle-kit push
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Production:

```bash
npm run build
npm run start
```

The first request that needs campus data seeds the database. Sign-in, registration, and the catalog endpoints all do this. It is not stored in localStorage.

### Upgrading a database that predates the current schema

`drizzle-kit push` is enough for a fresh database. For an existing deployment that predates reader trust, the attendance integrity columns, the anomaly queue, or the RFID scan provenance columns, apply the hand-written alignment migration first:

```bash
npm run db:migrate   # defaults to the newest tag in drizzle/meta/_journal.json
npm run db:verify    # reports check constraints, new columns, indexes, trust states
```

Both wrap `npx tsx scripts/apply-migration.mts` and `npx tsx scripts/verify-migration.mts`.

The migration file is `drizzle/0000_align_schema.sql`. Every statement in it is guarded, so re-running is safe. Each statement is applied independently and a failure is reported with its index without discarding the rest, which means a single blocked statement (for example a unique index that duplicate rows prevent) does not leave the migration half-applied and unexplained. The script exits non-zero if anything failed, so it can gate a deploy.

Existing readers are grandfathered as `ACTIVE` when the `trust_state` column is first added, because they are already installed in the field. The column default is then flipped to `PENDING`, so every reader registered afterwards must be approved before it can mark attendance.

## Environment

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Signs session tokens. Server only. |
| `PORT` | HTTP port, usually 3000 |
| `CLIENT_URL` | Allowed browser origin for cross-origin API calls |
| `DEVICE_API_KEY` | Optional. When set, scan and heartbeat require header `x-device-key` |
| `SHOW_DEMO_CREDENTIALS` | Shows the demo login panel. Set `false` outside a demonstration |
| `MONGODB_URI` | Unused. Documented because the brief named MongoDB |

Do not put `JWT_SECRET` or database credentials in client code.

## Demo accounts

Shown on the login page when `SHOW_DEMO_CREDENTIALS=true` or when `NODE_ENV` is not production.

| Role | Email | Password |
| --- | --- | --- |
| Admin | admin@smartattend.com | Admin@123 |
| Student | student@smartattend.com | Student@123 |

Akash Singh, `CU12345`, is the demo student. His card is `A3 7F 21 9C`. Other seeded students use `Student@123`.

## RFID simulator

Admin → IoT Control Center → enter a UID → Test RFID Scan.

That button posts to `POST /api/rfid/scan`:

```json
{
  "rfidUID": "A3 7F 21 9C",
  "deviceId": "NODEMCU-01"
}
```

Rules, evaluated in Asia/Kolkata:

- First valid scan of the day is `ENTRY`. After 09:15 it is Late, otherwise Present.
- A second scan inside the cooldown is rejected. Default cooldown is 45 seconds and is editable in Settings.
- The next valid scan is `EXIT`. If the student has been on campus for less than the half-day threshold, status becomes Half Day.
- Unknown or unassigned cards return `{ "success": false, "message": "RFID card is not registered" }`.
- One card cannot be assigned to two students.
- Students cannot create, edit, or delete attendance.

## NodeMCU later

1. Install the ESP8266 board package and the MFRC522 library.
2. Open `nodemcu_rfid.ino`.
3. Set `WIFI_SSID`, `WIFI_PASSWORD`, `SERVER_HOST`, and `DEVICE_ID`.
4. Flash the sketch. Use the wiring below. RC522 power is 3.3V only.
5. Point `SERVER_HOST` at the computer running this app. The reader posts to `http://SERVER_HOST:3000/api/rfid/scan`.
6. If `DEVICE_API_KEY` is set in `.env`, put the same value in the sketch.

The supported hardware target is NodeMCU ESP8266 only. Power the NodeMCU through USB. Do not select or wire an ESP32.

### Status LEDs and buzzer

- Green LED: D1 → its own 220Ω resistor → long leg (+); short leg (−) → common GND. The firmware lights it briefly only when the attendance API accepts a registered card.
- White LED: D2 → its own 220Ω resistor → long leg (+); short leg (−) → common GND. It is on only while a validated reader is ready, and it drops if the RC522 fails its version check or if Wi-Fi drops, returning when both recover.
- Share the breadboard negative rail among NodeMCU GND, MFRC522 GND, both LED cathodes, and buzzer negative.
- The 5V buzzer is not software controlled with the current parts. For a simple continuous-power test only, connect VIN → buzzer + and GND → buzzer −. Do not connect the buzzer to a GPIO. Software beeping requires a suitable transistor/MOSFET driver and resistor.

The sketch also posts `POST /api/devices/heartbeat` once a minute.

### RC522 wiring

| RC522 | NodeMCU ESP8266 |
| --- | --- |
| 3.3V | 3V3 |
| GND | GND |
| SDA / SS | D4 / GPIO2 |
| SCK | D5 / GPIO14 |
| MOSI | D7 / GPIO13 |
| MISO | D6 / GPIO12 |
| RST | D3 / GPIO0 |
| IRQ | Not connected |

GPIO0 can block flashing if RST holds it low. Disconnect RST, upload, then reconnect. Do not blink the built-in LED; it shares GPIO2 with SDA.

### First test: reader communication

Before attendance, the sketch starts SPI with `SPI.begin(14, 12, 13, 2)` and checks the MFRC522 version register. Expected Serial Monitor output is `RC522 Version: 0x91` or `RC522 Version: 0x92`. Anything else, including the erratic `0x82`/`0x88` that clones sometimes return, is rejected. On a bad read the sketch prints `ERROR: RC522 NOT detected!`, keeps the white LED off, and serves no attendance: it still joins Wi-Fi and keeps sending heartbeats so the admin can see the reader is alive but its RFID is not usable. Check 3.3V power and SPI wiring. In Arduino IDE select Generic ESP8266 Module and use the GPIO pin definitions in the sketch. Never power the MFRC522 from VIN/5V.

### Approving a reader

A reader is only allowed to mark attendance once its trust state is `ACTIVE`, and the setting `requireTrustedDevices` defaults to on. The three seeded readers ship `ACTIVE`, so a fresh database works immediately. Any reader an admin adds afterwards starts `PENDING` and is refused with `Reader is not approved for attendance. Contact the administrator.` until an admin sets it to `ACTIVE` on the Devices page. An unknown `deviceId` is refused earlier still, with `Reader is not registered with the server.` Readers are never self-registered by a scan.

No Bluetooth.

## API

Authentication

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `PUT /api/auth/password`

Students, RFID, attendance, subjects, teachers, devices, reports and notifications follow the routes under `src/app/api`. Business failures return `{ "success": false, "message": "..." }` and do not include stack traces.

Useful extras:

- `POST /api/devices/heartbeat`
- `POST /api/attendance/mark-absent`
- `GET /api/analytics/admin`
- `GET /api/analytics/student`
- `GET /api/scans`
- `GET /api/reports/department`
- `GET /api/reports/subject`

## Attendance modification log

Admin edits, manual creates, deletes, scan entry and scan exit write to `attendance_logs` with the previous and next values. Open a row on the Attendance page to read the log.

## Seed contents

At least 20 students, 5 teachers, 5 subjects, 4 departments, 20 RFID cards, more than 100 attendance records, and 3 IoT devices. Two cards are left unassigned so assignment can be demonstrated. `NODEMCU-03` starts offline.

## Stack note for the viva

The service boundary is the same one an Express controller would own: validation, RFID resolution, cooldown, entry/exit, notification, and persistence. The handler functions live in `src/server`. Replacing the Route Handler with an Express router would not require a new attendance implementation. PostgreSQL replaces MongoDB because that is the database attached to this project; Drizzle models map to the entities in the brief.
