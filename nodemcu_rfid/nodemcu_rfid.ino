/*
  ============================================================
       IoT-BASED SMART ATTENDANCE MANAGEMENT SYSTEM
       NodeMCU ESP8266 + RC522 RFID
  ============================================================

  RFID WIRING:

        RC522 3.3V  -> NodeMCU 3V3
        RC522 GND   -> NodeMCU GND
        RC522 SDA/SS-> NodeMCU D4 / GPIO2
        RC522 SCK   -> NodeMCU D5 / GPIO14
        RC522 MOSI  -> NodeMCU D7 / GPIO13
        RC522 MISO  -> NodeMCU D6 / GPIO12
        RC522 RST   -> NodeMCU D3 / GPIO0
        RC522 IRQ   -> NOT CONNECTED
      LED:
        Green LED -> D1 / GPIO5
        White LED -> D2 / GPIO4
      IMPORTANT:
        RC522 MUST use 3.3V (never VIN/5V).
        RST sits on GPIO0, so disconnect RST before flashing.
        Do not use the built-in LED: it shares GPIO2 with SDA.
    */

#include <ESP8266WiFi.h>
#include <ESP8266WiFiMulti.h>
#include <ESP8266HTTPClient.h>
#include <SPI.h>
#include <MFRC522.h>


// ============================================================
// MULTIPLE WIFI NETWORKS
// ============================================================

struct WiFiNetwork {
  const char* ssid;
  const char* password;
};


const WiFiNetwork wifiNetworks[] = {

  // Wi-Fi 1
  { "Net+ Broadband", "sherryladher" },

  // Wi-Fi 2
  { "Akash's iPhone", "YOUR_WIFI_PASSWORD_2" },

  // Wi-Fi 3
  { "AirFiber-gn6AyR", "na85pfSQaXKk3uk9" },

  // Wi-Fi 4
  { "YOUR_WIFI_4", "YOUR_PASSWORD_4" },

  // Wi-Fi 5
  { "YOUR_WIFI_5", "YOUR_PASSWORD_5" }

};


const int WIFI_COUNT =
  sizeof(wifiNetworks) / sizeof(wifiNetworks[0]);


ESP8266WiFiMulti wifiMulti;


// ============================================================
// SERVER SETTINGS
// ============================================================

// Your Mac/server IP address
const char* SERVER_HOST = "192.168.31.173";

// Website backend port
const uint16_t SERVER_PORT = 3000;

// Device ID
const char* DEVICE_ID = "NODEMCU-01";

// If your backend does not require an API key,
// leave this empty.
const char* DEVICE_API_KEY = "";

// Reported to the server on every scan and heartbeat.
const char* FIRMWARE_VERSION = "1.4.2";


// ============================================================
// RFID PINS
// ============================================================

// RC522 SDA -> D4
// D4 = GPIO2
const uint8_t SS_PIN = 2;
// RC522 RST -> D3
// D3 = GPIO0
const uint8_t RST_PIN = 0;


// ============================================================
// LED PINS
// ============================================================

// Green LED -> D1
// D1 = GPIO5
const uint8_t GREEN_LED_PIN = 5;
// White LED -> D2
// D2 = GPIO4
const uint8_t WHITE_LED_PIN = 4;


// ============================================================
// RFID OBJECT
// ============================================================

MFRC522 reader(SS_PIN, RST_PIN);


// RFID status
bool rfidOk = false;

// Last scanned card
String lastUid = "";

// Time of last scan
unsigned long lastReadAt = 0;


// ============================================================
// UTC TIMESTAMP (ISO 8601, e.g. 2026-03-27T10:04:11Z)
// ============================================================
// The server clock stays authoritative. This value is only used
// by the server to measure reader clock drift.
String isoTimestamp() {
  time_t nowSec = time(nullptr);
  struct tm timeInfo;
  gmtime_r(&nowSec, &timeInfo);
  char buffer[32];
  strftime(buffer, sizeof(buffer), "%Y-%m-%dT%H:%M:%SZ", &timeInfo);
  return String(buffer);
}

// ============================================================
// GREEN LED SUCCESS FLASH
// ============================================================

void flashAttendanceSuccess() {

  for (int blink = 0; blink < 3; blink++) {

    digitalWrite(
      GREEN_LED_PIN,
      HIGH
    );

    delay(250);

    digitalWrite(
      GREEN_LED_PIN,
      LOW
    );

    delay(150);
  }
}


// ============================================================
// CONNECT TO WIFI
// ============================================================

void connectWifi() {

  WiFi.mode(WIFI_STA);

  Serial.println();
  Serial.println(
    "Adding Wi-Fi networks..."
  );


  // Add all networks

  for (int i = 0; i < WIFI_COUNT; i++) {

    wifiMulti.addAP(
      wifiNetworks[i].ssid,
      wifiNetworks[i].password
    );

    Serial.print(
      "Added Wi-Fi: "
    );

    Serial.println(
      wifiNetworks[i].ssid
    );
  }


  Serial.println();
  Serial.println(
    "Searching for available Wi-Fi..."
  );


  // Wait until connected

  while (
    wifiMulti.run() != WL_CONNECTED
  ) {

    delay(500);

    Serial.print(".");
  }


  Serial.println();
  Serial.println();

  Serial.println(
    "=============================="
  );

  Serial.println(
    "       WIFI CONNECTED"
  );

  Serial.println(
    "=============================="
  );


  Serial.print(
    "Network: "
  );

  Serial.println(
    WiFi.SSID()
  );


  Serial.print(
    "ESP8266 IP: "
  );

  Serial.println(
    WiFi.localIP()
  );


  Serial.print(
    "Signal: "
  );

  Serial.print(
    WiFi.RSSI()
  );

  Serial.println(
    " dBm"
  );


  Serial.println(
    "=============================="
  );
}


// ============================================================
// RFID UID TO STRING
// ============================================================

String uidToString(MFRC522::Uid uid) {

  String value = "";


  for (
    byte i = 0;
    i < uid.size;
    i++
  ) {

    if (i) {
      value += " ";
    }


    if (
      uid.uidByte[i] < 0x10
    ) {

      value += "0";
    }


    value += String(
      uid.uidByte[i],
      HEX
    );
  }


  value.toUpperCase();


  return value;
}


// ============================================================
// SEND HEARTBEAT TO WEBSITE
// ============================================================

void sendHeartbeat() {

  if (
    WiFi.status() != WL_CONNECTED
  ) {

    return;
  }


  WiFiClient client;

  HTTPClient http;


  String url =
    String("http://") +
    SERVER_HOST +
    ":" +
    SERVER_PORT +
    "/api/devices/heartbeat";


  Serial.println();

  Serial.println(
    "Sending heartbeat..."
  );


  if (
    !http.begin(client, url)
  ) {

    Serial.println(
      "Heartbeat connection failed"
    );

    return;
  }


  http.addHeader(
    "Content-Type",
    "application/json"
  );


  if (
    strlen(DEVICE_API_KEY)
  ) {

    http.addHeader(
      "x-device-key",
      DEVICE_API_KEY
    );
  }


  String body =
    String("{\"deviceId\":\"") +
    DEVICE_ID +
    "\",\"ipAddress\":\"" +
    WiFi.localIP().toString() +
    "\",\"firmwareVersion\":\"" + FIRMWARE_VERSION + "\"}";


  int code =
    http.POST(body);


  Serial.print(
    "Heartbeat HTTP: "
  );

  Serial.println(
    code
  );


  http.end();
}


// ============================================================
// SEND RFID SCAN TO WEBSITE
// ============================================================

void sendScan(
  const String& uid
) {


  digitalWrite(
    GREEN_LED_PIN,
    LOW
  );


  // ----------------------------------------------------------
  // CHECK WIFI
  // ----------------------------------------------------------

  if (
    WiFi.status() != WL_CONNECTED
  ) {

    Serial.println(
      "Wi-Fi disconnected."
    );

    Serial.println(
      "Trying another saved network..."
    );


    connectWifi();


    if (
      WiFi.status() != WL_CONNECTED
    ) {

      Serial.println(
        "Network error: Wi-Fi unavailable"
      );

      return;
    }
  }


  // ----------------------------------------------------------
  // HTTP CLIENT
  // ----------------------------------------------------------

  WiFiClient client;

  HTTPClient http;


  String url =
    String("http://") +
    SERVER_HOST +
    ":" +
    SERVER_PORT +
    "/api/rfid/scan";


  Serial.println();

  Serial.println(
    "Sending RFID to server..."
  );


  Serial.print(
    "URL: "
  );

  Serial.println(
    url
  );


  if (
    !http.begin(client, url)
  ) {

    Serial.println(
      "Network error: could not open HTTP client"
    );

    return;
  }


  http.addHeader(
    "Content-Type",
    "application/json"
  );


  if (
    strlen(DEVICE_API_KEY)
  ) {

    http.addHeader(
      "x-device-key",
      DEVICE_API_KEY
    );
  }


  http.setTimeout(8000);


  // JSON body
  String body =
    String("{\"rfidUID\":\"") +
    uid +
    "\",\"deviceId\":\"" +
    DEVICE_ID +
    "\",\"scanDirection\":\"AUTO\"" +
    ",\"deviceTimestamp\":\"" +
    isoTimestamp() +
    "\",\"firmwareVersion\":\"" +
    FIRMWARE_VERSION +
    "\"}";


  Serial.println(
    "POST /api/rfid/scan"
  );


  Serial.print(
    "Body: "
  );

  Serial.println(
    body
  );


  // Send request

  int code =
    http.POST(body);


  // Get response

  String payload =
    http.getString();


  String errorText =
    code <= 0
      ? http.errorToString(code)
      : "";


  http.end();


  // ----------------------------------------------------------
  // NETWORK ERROR
  // ----------------------------------------------------------

  if (
    code <= 0
  ) {

    Serial.print(
      "Network error: "
    );

    Serial.println(
      errorText
    );

    return;
  }


  // ----------------------------------------------------------
  // SERVER ERROR
  // ----------------------------------------------------------

  if (
    code >= 500
  ) {

    Serial.print(
      "Server error "
    );

    Serial.print(
      code
    );

    Serial.print(
      ": "
    );

    Serial.println(
      payload
    );

    return;
  }


  // ----------------------------------------------------------
  // SUCCESS
  // ----------------------------------------------------------

  if (
    payload.indexOf(
      "\"success\":true"
    ) >= 0
    ||
    payload.indexOf(
      "\"success\": true"
    ) >= 0
  ) {

    Serial.println();

    Serial.println(
      "******************************"
    );

    Serial.println(
      " ATTENDANCE MARKED SUCCESSFULLY"
    );

    Serial.println(
      "******************************"
    );

    Serial.println(
      payload
    );


    flashAttendanceSuccess();


    return;
  }


  // ----------------------------------------------------------
  // UNKNOWN RFID
  // ----------------------------------------------------------

  if (
    payload.indexOf(
      "not registered"
    ) >= 0
  ) {

    Serial.println();

    Serial.println(
      "RFID NOT REGISTERED"
    );

    Serial.println(
      payload
    );


    return;
  }


  // ----------------------------------------------------------
  // OTHER RESPONSE
  // ----------------------------------------------------------

  Serial.print(
    "Server response HTTP "
  );

  Serial.println(
    code
  );

  Serial.println(
    payload
  );
}


// ============================================================
// SETUP
// ============================================================

void setup() {

  Serial.begin(
    115200
  );


  delay(
    1000
  );


  // ----------------------------------------------------------
  // START MESSAGE
  // ----------------------------------------------------------

  Serial.println();

  Serial.println(
    "=============================="
  );

  Serial.println(
    " IoT SMART ATTENDANCE SYSTEM"
  );

  Serial.println(
    "=============================="
  );


  // ----------------------------------------------------------
  // LED SETUP
  // ----------------------------------------------------------

  pinMode(
    GREEN_LED_PIN,
    OUTPUT
  );


  pinMode(
    WHITE_LED_PIN,
    OUTPUT
  );


  digitalWrite(
    GREEN_LED_PIN,
    LOW
  );


  // White LED = reader ready. Starts dark; it is only lit once the
  // RC522 has answered a valid version read in setup().
  digitalWrite(
    WHITE_LED_PIN,
    LOW
  );


  // ----------------------------------------------------------
  // START SPI
  // ----------------------------------------------------------

  Serial.println();

  Serial.println(
    "Starting SPI..."
  );
  // SCK=D5/GPIO14, MISO=D6/GPIO12, MOSI=D7/GPIO13, SS=D4/GPIO2
  SPI.begin();


  // ----------------------------------------------------------
  // START RC522
  // ----------------------------------------------------------

  Serial.println(
    "Starting RC522..."
  );


  reader.PCD_Init();


  delay(
    100
  );


  // ----------------------------------------------------------
  // CHECK RC522
  // ----------------------------------------------------------

  byte version =
    reader.PCD_ReadRegister(
      MFRC522::VersionReg
    );


  Serial.print(
    "RC522 Version: 0x"
  );


  Serial.println(
    version,
    HEX
  );


  /*
    Only 0x91 and 0x92 are genuine MFRC522 part numbers. 0x82/0x88 are
    clone/erratic reads and are rejected on purpose.
  */

  if (
    version == 0x91 ||
    version == 0x92
  ) {

    rfidOk = true;


    Serial.println(
      "RC522 detected successfully!"
    );

  }

  else {

    rfidOk = false;


    Serial.println(
      "ERROR: RC522 NOT detected!"
    );


    Serial.println(
      "Check RFID wiring and 3.3V power."
    );

  }

  // White LED means "reader validated and ready".
  digitalWrite(
    WHITE_LED_PIN,
    rfidOk ? HIGH : LOW
  );


  // ----------------------------------------------------------
  // CONNECT WIFI
  // ----------------------------------------------------------

  connectWifi();


  // ----------------------------------------------------------
  // SEND HEARTBEAT
  // ----------------------------------------------------------

  sendHeartbeat();


  // ----------------------------------------------------------
  // READY
  // ----------------------------------------------------------

  Serial.println();


  if (rfidOk) {

    Serial.println(
      "=============================="
    );

    Serial.println(
      " RFID SCANNER READY"
    );

    Serial.println(
      "=============================="
    );

    Serial.println(
      "Place RFID card on RC522..."
    );

  }

  else {

    Serial.println(
      "RFID Scanner Disabled"
    );
  }
}


// ============================================================
// MAIN LOOP
// ============================================================

void loop() {


  // ----------------------------------------------------------
  // WIFI CHECK
  // ----------------------------------------------------------

  if (
    wifiMulti.run() != WL_CONNECTED
  ) {

    Serial.println();

    Serial.println(
      "Wi-Fi lost!"
    );


    Serial.println(
      "Searching saved networks..."
    );


    // White LED = reader ready, and the reader is not ready
    // while it cannot reach the attendance server.
    digitalWrite(
      WHITE_LED_PIN,
      LOW
    );


    delay(
      1000
    );


    return;
  }


  // ----------------------------------------------------------
  // HEARTBEAT EVERY 60 SECONDS
  // ----------------------------------------------------------

  static unsigned long lastBeat = 0;


  if (
    millis() - lastBeat > 60000
  ) {

    sendHeartbeat();


    lastBeat =
      millis();
  }


  // ----------------------------------------------------------
  // RFID NOT AVAILABLE
  // ----------------------------------------------------------

  if (!rfidOk) {

    digitalWrite(
      GREEN_LED_PIN,
      LOW
    );

    digitalWrite(
      WHITE_LED_PIN,
      LOW
    );


    delay(
      1000
    );


    return;
  }


  // ----------------------------------------------------------
  // CHECK RFID CARD
  // ----------------------------------------------------------

  // Wi-Fi is back and the RC522 answered a valid version read,
  // so the reader is ready again.
  digitalWrite(
    WHITE_LED_PIN,
    HIGH
  );


  if (
    !reader.PICC_IsNewCardPresent()
  ) {

    return;
  }


  // ----------------------------------------------------------
  // READ RFID CARD
  // ----------------------------------------------------------

  if (
    !reader.PICC_ReadCardSerial()
  ) {

    return;
  }


  // ----------------------------------------------------------
  // GET CARD UID
  // ----------------------------------------------------------

  String uid =
    uidToString(
      reader.uid
    );


  Serial.println();

  Serial.println(
    "=============================="
  );

  Serial.println(
    " RFID CARD DETECTED"
  );


  Serial.print(
    "UID: "
  );


  Serial.println(
    uid
  );


  Serial.println(
    "=============================="
  );


  // ----------------------------------------------------------
  // NO LED HERE ON PURPOSE.
  // The green LED is driven only by flashAttendanceSuccess() after
  // the server accepts a registered card. Blinking it on detection
  // would light up for unknown or blocked cards too.
  // ----------------------------------------------------------


  // ----------------------------------------------------------
  // STOP RFID COMMUNICATION
  // ----------------------------------------------------------

  reader.PICC_HaltA();

  reader.PCD_StopCrypto1();


  // ----------------------------------------------------------
  // PREVENT DUPLICATE SCANS
  // ----------------------------------------------------------

  if (
    uid == lastUid &&
    millis() - lastReadAt < 2500
  ) {

    return;
  }


  lastUid =
    uid;


  lastReadAt =
    millis();


  // ----------------------------------------------------------
  // SEND TO WEBSITE
  // ----------------------------------------------------------

  sendScan(
    uid
  );


  delay(
    400
  );
}