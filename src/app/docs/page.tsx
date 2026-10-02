import Link from "next/link";

const endpoints = [
  ["POST", "/api/auth/register", "Student registration with RFID"],
  ["POST", "/api/auth/login", "JWT cookie session"],
  ["POST", "/api/auth/logout", "Clear session"],
  ["GET", "/api/auth/me", "Current user"],
  ["GET/POST", "/api/students", "Roster"],
  ["GET/PUT/DELETE", "/api/students/:id", "Student record"],
  ["POST", "/api/rfid/scan", "NodeMCU and simulator scan"],
  ["POST", "/api/rfid/register", "Assign a card"],
  ["GET", "/api/rfid", "Card inventory"],
  ["PUT/DELETE", "/api/rfid/:uid", "Unassign or remove"],
  ["GET/POST", "/api/attendance", "Ledger"],
  ["PUT/DELETE", "/api/attendance/:id", "Correction, logged"],
  ["GET/POST", "/api/subjects", "Subjects"],
  ["GET/POST", "/api/teachers", "Teachers"],
  ["GET", "/api/devices", "Reader inventory"],
  ["POST", "/api/devices/heartbeat", "NodeMCU heartbeat"],
  ["GET", "/api/reports/daily", "Daily report"],
  ["GET", "/api/reports/monthly", "Monthly report"],
  ["GET", "/api/reports/student/:id", "Student report"],
  ["GET", "/api/notifications", "Alerts"],
];

export default function DocsPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <Link href="/" className="text-sm text-slate-500">Back to SmartAttend</Link>
      <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-tide">Integration notes</p>
      <h1 className="mt-2 font-display text-5xl text-navy">API, wiring and demonstration script</h1>
      <p className="mt-4 leading-7 text-slate-600">This deployment uses Next.js Route Handlers and PostgreSQL so the application can run in the provided environment. The RFID contract is the one a NodeMCU sketch should call. Persistence is the database, not browser storage.</p>
      <section className="panel mt-8 p-5">
        <h2 className="font-display text-3xl">RC522 to NodeMCU ESP8266</h2>
        <p className="mt-2 text-sm text-slate-600">Power the RC522 from 3.3V only. 5V will damage the module.</p>
        <div className="table-wrap mt-4">
          <table className="data min-w-full">
            <thead><tr><th>RC522</th><th>NodeMCU</th></tr></thead>
            <tbody>
              {[["3.3V", "3V3"], ["GND", "GND"], ["SDA / SS", "D4 / GPIO2"], ["SCK", "D5 / GPIO14"], ["MOSI", "D7 / GPIO13"], ["MISO", "D6 / GPIO12"], ["RST", "D3 / GPIO0"], ["IRQ", "Not connected"]].map((row) => <tr key={row[0]}><td>{row[0]}</td><td>{row[1]}</td></tr>)}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm text-slate-500">GPIO0 is a boot pin. If the board will not flash, disconnect RST, upload, then reconnect. Do not use the built-in LED on GPIO2; that pin is the RC522 chip select.</p>
      </section>
      <section className="panel mt-4 p-5">
        <h2 className="font-display text-3xl">LEDs, buzzer and power</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-600">
          <li>Green LED: D1 → separate 220Ω resistor → long leg (+); short leg (−) → common GND. It lights briefly only after the server accepts a registered card.</li>
          <li>White LED: D2 → separate 220Ω resistor → long leg (+); short leg (−) → common GND. It stays on while the validated RFID scanner is ready.</li>
          <li>Power the NodeMCU from its USB cable. Power the MFRC522 from 3V3 only; never connect it to VIN or 5V.</li>
          <li>All grounds share the breadboard negative rail: NodeMCU, reader, both LED cathodes, and buzzer negative.</li>
          <li>The 5V buzzer is not software-controlled by this firmware. For a simple continuous-power test only, connect VIN → buzzer + and GND → buzzer −. Do not connect it to a GPIO. Controlled beeping needs a suitable transistor/MOSFET driver and resistor.</li>
        </ul>
      </section>
      <section className="panel mt-4 p-5">
        <h2 className="font-display text-3xl">First test: RC522 SPI communication</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">The firmware explicitly starts SPI with <code>SPI.begin(14, 12, 13, 2)</code> and prints the MFRC522 version before connecting to Wi-Fi or processing attendance. Expected: <code>RC522 Version: 0x91</code> or <code>0x92</code>. If it prints <code>0xFF</code> (or any other value), the firmware stops and keeps both LEDs off. Check SPI wiring and 3.3V power; attendance scanning does not continue.</p>
        <p className="mt-2 text-sm leading-6 text-slate-600">In Arduino IDE, use the ESP8266 board package and Generic ESP8266 Module; the sketch uses GPIO numbers because that is the selected board target. Do not select ESP32.</p>
      </section>
      <section className="panel mt-4 p-5">
        <h2 className="font-display text-3xl">Scan payload</h2>
        <pre className="mt-3 overflow-auto rounded-2xl bg-navy p-4 text-sm text-teal-50">{`POST /api/rfid/scan
{
  "rfidUID": "A3 7F 21 9C",
  "deviceId": "NODEMCU-01"
}`}</pre>
        <p className="mt-3 text-sm text-slate-600">First scan of the Kolkata day is ENTRY. The next scan after the cooldown is EXIT. A short campus stay is marked Half Day. Unknown cards return success false and the message “RFID card is not registered”.</p>
      </section>
      <section className="panel mt-4 p-5">
        <h2 className="font-display text-3xl">Endpoints</h2>
        <div className="mt-3 space-y-2 text-sm">{endpoints.map((row) => <div key={row[1] + row[0]} className="grid gap-2 rounded-2xl bg-sand px-3 py-2 sm:grid-cols-[110px_1fr_1.2fr]"><span className="font-mono text-xs">{row[0]}</span><span className="font-mono">{row[1]}</span><span className="text-slate-600">{row[2]}</span></div>)}</div>
      </section>
      <section className="panel mt-4 p-5 text-sm leading-6 text-slate-600">
        <h2 className="font-display text-3xl text-navy">Demo script</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5">
          <li>Sign in as admin@smartattend.com / Admin@123.</li>
          <li>Open IoT Control Center and test UID A3 7F 21 9C on NODEMCU-01. Akash Singh should be marked present or late.</li>
          <li>Scan again immediately. The cooldown rejection is the duplicate-scan case.</li>
          <li>Scan DE AD BE EF. The API rejects the unknown card and notifies the administrator.</li>
          <li>Sign out and sign in as student@smartattend.com / Student@123 to see the new record.</li>
        </ol>
      </section>
    </main>
  );
}
