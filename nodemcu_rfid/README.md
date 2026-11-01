# SmartAttend NodeMCU RFID Reader

Firmware for the NodeMCU ESP8266 (ESP-12E) and RC522. This sketch uses the existing SmartAttend scan and heartbeat APIs; it does not invent or simulate attendance results.

## Wiring

| RC522 / LED | NodeMCU |
| --- | --- |
| RC522 SDA/SS | D4 / GPIO2 |
| RC522 SCK | D5 / GPIO14 |
| RC522 MOSI | D7 / GPIO13 |
| RC522 MISO | D6 / GPIO12 |
| RC522 RST | D3 / GPIO0 |
| RC522 3.3V | 3V3 |
| RC522 GND | GND |
| RC522 IRQ | Not connected |
| Green LED anode | D1 / GPIO5 through 220-330 ohm resistor |
| Green LED cathode | GND |

The RC522 is a 3.3V device. Never connect it to VIN/5V. Disconnect RC522 RST from D3 while flashing if the board will not enter bootloader mode. The sketch also retains the optional ready LED on D2/GPIO4 from the previous firmware; leave it disconnected if it is not installed.

## Install And Configure

Install Arduino IDE 2, then:

1. In Preferences, add the ESP8266 Boards Manager URL: `https://arduino.esp8266.com/stable/package_esp8266com_index.json`.
2. In Boards Manager, install **ESP8266 by ESP8266 Community**.
3. In Library Manager, install **MFRC522 by GithubCommunity** and **ArduinoJson by Benoit Blanchon**.
4. From the repository root, run `cp nodemcu_rfid/secrets.example.h nodemcu_rfid/secrets.h`, then set the Wi-Fi SSID/password in `secrets.h`. It is ignored by git; do not commit it.
5. In `nodemcu_rfid.ino`, set `SERVER_HOST` to the current IPv4 address of the computer running SmartAttend and keep `SERVER_PORT` at the backend port. The repository's previous sketch used `192.168.31.173`; the earlier reported `192.168.137.1` is different and was not verified from this Codespace. Use the address assigned on the network the NodeMCU actually shares with the backend.
6. If the backend environment sets `DEVICE_API_KEY`, put the same value in local `secrets.h` as `SMARTATTEND_DEVICE_API_KEY`. Otherwise leave it empty.

The server address must not be `localhost`: that would refer to the NodeMCU itself. The ESP8266 and a LAN-hosted backend must be routable to each other, and the computer firewall must allow inbound TCP on the backend port. A Codespaces container is cloud-hosted; a private `192.168.x.x` address on your local Wi-Fi will not route to it. For physical hardware, run the backend on an accessible LAN host or configure a reachable tunnel/deployment. This sketch currently uses plain HTTP for a trusted local network.

## Upload And Monitor

1. Open `nodemcu_rfid.ino` in Arduino IDE.
2. Select **Tools > Board > ESP8266 Boards > NodeMCU 1.0 (ESP-12E Module)**.
3. Select the serial port for the NodeMCU and upload. If upload fails, disconnect RC522 RST from D3 during flashing and reconnect it afterward.
4. Open Serial Monitor at **115200 baud**.
5. Wait for `RC522 ready`, `Wi-Fi connected`, and `HEARTBEAT OK`. Scan a registered card that is not inside the backend cooldown window. `ATTENDANCE SUCCESS` and `GREEN LED ON` should appear only after the backend confirms a newly recorded ENTRY or EXIT. The LED turns off automatically after about one second.

The computer's current LAN IP can be checked with `ipconfig` on Windows or `ip addr` on Linux. Do not assume the previous IP is still assigned. In this Codespace, that command reports container networking, not a local computer address reachable by a physical ESP8266.

## Existing API Contract

The backend accepts these requests; no backend changes were required.

### RFID scan

`POST http://<SERVER_HOST>:3000/api/rfid/scan`

Headers: `Content-Type: application/json`. If `DEVICE_API_KEY` is configured on the backend, also send `x-device-key` with that exact key.

```json
{
  "rfidUID": "<UID in uppercase byte pairs>",
  "deviceId": "NODEMCU-01",
  "scanDirection": "AUTO",
  "deviceTimestamp": "<UTC ISO-8601 timestamp when NTP is ready>",
  "firmwareVersion": "1.5.0"
}
```

The server normalizes UIDs to uppercase, space-separated byte pairs. Its clock is authoritative; `deviceTimestamp` is used only to measure clock drift. The firmware omits that field until NTP has synchronized.

A newly recorded entry/exit returns HTTP 200 with `success: true`, `accepted: true`, `scanType: "ENTRY"` or `"EXIT"`, `status`, `studentName`, and a message of `Entry recorded` or `Exit recorded`. Only those backend-confirmed recorded responses turn on the LED. The live page reads the saved scan log through `GET /api/scans`; the admin device views read heartbeat-derived status through `GET /api/devices`.

Example newly recorded entry response (student and time values are supplied by the backend):

```json
{
  "success": true,
  "accepted": true,
  "studentId": "<student-code>",
  "studentName": "<student-name>",
  "status": "Present",
  "scanType": "ENTRY",
  "entryTime": "<server-formatted-time>",
  "exitTime": null,
  "durationMinutes": null,
  "deviceId": "NODEMCU-01",
  "subject": null,
  "subjectReason": "department-fallback",
  "flags": [],
  "message": "Entry recorded"
}
```

The backend can also return HTTP 202 with `success: true`, `accepted: true`, and `code: "COOLDOWN_IGNORED"` for an already-recorded duplicate. This is not a new attendance record and does not flash the LED. Unknown cards return HTTP 404 with `code: "CARD_NOT_REGISTERED"`; rejected scans, network errors, invalid JSON, and server errors also leave the LED off.

Cooldown duplicate response (no new record and no LED):

```json
{
  "success": true,
  "accepted": true,
  "code": "COOLDOWN_IGNORED",
  "message": "Already recorded. No change was needed.",
  "studentId": "<student-code>",
  "studentName": "<student-name>"
}
```

Unknown-card response (HTTP 404; no LED):

```json
{
  "success": false,
  "code": "CARD_NOT_REGISTERED",
  "message": "RFID card is not registered"
}
```

### Device heartbeat

`POST http://<SERVER_HOST>:3000/api/devices/heartbeat`

```json
{
  "deviceId": "NODEMCU-01",
  "ipAddress": "<NodeMCU LAN IP>",
  "firmwareVersion": "1.5.0"
}
```

A successful response has `success: true` and `device.status: "ONLINE"`. The firmware sends a heartbeat on Wi-Fi connection and every 60 seconds thereafter. The dashboard reads device presence from these real heartbeat timestamps.

Example heartbeat response:

```json
{
  "success": true,
  "message": "Heartbeat received.",
  "device": {
    "deviceId": "NODEMCU-01",
    "status": "ONLINE",
    "lastSeen": "<server-timestamp>",
    "trustState": "ACTIVE",
    "scanDirection": "AUTO"
  }
}
```

## Troubleshooting

- **RC522 not detected:** Check SPI pin mapping and 3.3V/GND. Do not power the reader from 5V. Use short jumper wires.
- **Board will not flash or boot:** Disconnect RC522 RST from D3/GPIO0 while flashing. D3 and D4 are boot-strapping pins; keep the wiring as specified.
- **Wi-Fi keeps reconnecting:** ESP8266 supports 2.4GHz Wi-Fi only. Check local `secrets.h`, signal strength, and that the SSID is not a 5GHz-only network.
- **HTTP timeout or connection refused:** Confirm `SERVER_HOST` is the current reachable host IP, port 3000 is allowed by its firewall, and SmartAttend is running. Do not use `localhost` or a Codespaces container IP from a local device.
- **Device authentication failed:** If the backend has `DEVICE_API_KEY` set, configure the same key locally in ignored `secrets.h`; never commit it.
- **Reader is unknown or not trusted:** Provision `NODEMCU-01` in Admin > IoT Devices and set its trust state to Active.
- **Unknown card:** Register the card to an active student in RFID Cards. The firmware does not contain student UIDs or names.
- **No green LED:** The LED intentionally stays off for cooldown duplicates, unknown/blocked cards, untrusted readers, HTTP errors, malformed responses, and timeouts. Check Serial Monitor for the backend result. Verify LED polarity and the resistor on D1/GPIO5.

The firmware was compiled for NodeMCU ESP-12E in the repository toolchain. Physical Wi-Fi/RFID behavior still requires the actual board and reader; no hardware is attached to this Codespace.