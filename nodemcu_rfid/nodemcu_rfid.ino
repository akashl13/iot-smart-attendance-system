/*
  SmartAttend RFID Reader
  Board: NodeMCU ESP8266 (ESP-12E)

  RC522:
    SDA/SS -> D4 / GPIO2
    SCK    -> D5 / GPIO14
    MOSI   -> D7 / GPIO13
    MISO   -> D6 / GPIO12
    RST    -> D3 / GPIO0
    3.3V   -> 3V3 (never VIN/5V)
    GND    -> GND
    IRQ    -> not connected

  Green LED:
    Anode -> D1 / GPIO5 through 220-330 ohm resistor
    Cathode -> GND

  Optional legacy reader-ready LED:
    D2 / GPIO4. Leave disconnected if not used.

  Arduino libraries:
    - ESP8266 board package (ESP8266 Arduino Core)
    - MFRC522 by GithubCommunity
    - ArduinoJson by Benoit Blanchon
*/

#include <ArduinoJson.h>
#include <ESP8266HTTPClient.h>
#include <ESP8266WiFi.h>
#include <ESP8266WiFiMulti.h>
#include <MFRC522.h>
#include <SPI.h>
#include <time.h>

#if __has_include("secrets.h")
#include "secrets.h"
#endif

#ifndef SMARTATTEND_WIFI_SSID
#define SMARTATTEND_WIFI_SSID "YOUR_WIFI_SSID"
#endif
#ifndef SMARTATTEND_WIFI_PASSWORD
#define SMARTATTEND_WIFI_PASSWORD "YOUR_WIFI_PASSWORD"
#endif
#ifndef SMARTATTEND_DEVICE_API_KEY
#define SMARTATTEND_DEVICE_API_KEY ""
#endif

struct WifiNetwork {
  const char* ssid;
  const char* password;
};

// Add additional local networks here if the reader needs roaming support.
const WifiNetwork WIFI_NETWORKS[] = {
  {SMARTATTEND_WIFI_SSID, SMARTATTEND_WIFI_PASSWORD},
  {"", ""},
  {"", ""}
};
const size_t WIFI_NETWORK_COUNT = sizeof(WIFI_NETWORKS) / sizeof(WIFI_NETWORKS[0]);

// The current repository sketch used 192.168.31.173. The previously supplied
// 192.168.137.1 is different; verify the computer's current LAN IP before upload.
// This must be an address the NodeMCU can reach. Never use localhost here.
const char* SERVER_HOST = "192.168.31.173";
const uint16_t SERVER_PORT = 3000;
const char* SERVER_PROTOCOL = "http";

const char* DEVICE_ID = "NODEMCU-01";
const char* FIRMWARE_VERSION = "1.5.0";
// Leave empty unless the backend has DEVICE_API_KEY configured, then set the same
// value locally. Do not commit a real key.
const char* DEVICE_API_KEY = SMARTATTEND_DEVICE_API_KEY;

constexpr uint8_t RFID_SS_PIN = 2;       // D4 / GPIO2
constexpr uint8_t RFID_RST_PIN = 0;      // D3 / GPIO0
constexpr uint8_t GREEN_LED_PIN = 5;    // D1 / GPIO5
constexpr uint8_t READY_LED_PIN = 4;    // D2 / GPIO4 (optional)
constexpr unsigned long WIFI_RETRY_MS = 10000;
constexpr unsigned long HEARTBEAT_INTERVAL_MS = 60000;
constexpr unsigned long LOCAL_DUPLICATE_MS = 2500;
constexpr unsigned long SUCCESS_LED_MS = 1000;
constexpr uint16_t HTTP_TIMEOUT_MS = 5000;

ESP8266WiFiMulti wifiMulti;
MFRC522 reader(RFID_SS_PIN, RFID_RST_PIN);

bool rfidReady = false;
bool wifiWasConnected = false;
bool heartbeatSentForConnection = false;
bool greenLedIsOn = false;
unsigned long lastWifiAttemptAt = 0;
unsigned long lastHeartbeatAt = 0;
unsigned long lastCardReadAt = 0;
unsigned long greenLedOffAt = 0;
String lastCardUid;

String serverUrl(const char* path) {
  return String(SERVER_PROTOCOL) + "://" + SERVER_HOST + ":" + SERVER_PORT + path;
}

String uidToString(const MFRC522::Uid& uid) {
  String value;
  for (byte index = 0; index < uid.size; index++) {
    if (index > 0) value += ' ';
    if (uid.uidByte[index] < 0x10) value += '0';
    value += String(uid.uidByte[index], HEX);
  }
  value.toUpperCase();
  return value;
}

String utcTimestamp() {
  const time_t now = time(nullptr);
  if (now < 1704067200) return "";

  struct tm timeInfo;
  if (!gmtime_r(&now, &timeInfo)) return "";

  char buffer[25];
  if (strftime(buffer, sizeof(buffer), "%Y-%m-%dT%H:%M:%SZ", &timeInfo) == 0) return "";
  return String(buffer);
}

String buildJson(JsonDocument& document) {
  String body;
  serializeJson(document, body);
  return body;
}

void addDeviceHeaders(HTTPClient& http) {
  http.addHeader("Content-Type", "application/json");
  if (DEVICE_API_KEY[0] != '\0') http.addHeader("x-device-key", DEVICE_API_KEY);
}

int postJson(const char* path, const String& body, String& responseBody) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("HTTP skipped: Wi-Fi disconnected");
    return 0;
  }

  WiFiClient client;
  client.setTimeout(HTTP_TIMEOUT_MS);
  HTTPClient http;
  http.setTimeout(HTTP_TIMEOUT_MS);

  const String url = serverUrl(path);
  if (!http.begin(client, url)) {
    Serial.println("HTTP failed: could not initialize client");
    return -1;
  }

  addDeviceHeaders(http);
  const int statusCode = http.POST(body);
  if (statusCode > 0) {
    responseBody = http.getString();
  } else {
    Serial.print("HTTP transport error: ");
    Serial.println(http.errorToString(statusCode));
  }
  http.end();
  return statusCode;
}

void startSuccessLed() {
  digitalWrite(GREEN_LED_PIN, HIGH);
  greenLedIsOn = true;
  greenLedOffAt = millis() + SUCCESS_LED_MS;
  Serial.println("GREEN LED ON");
}

void updateSuccessLed() {
  if (greenLedIsOn && static_cast<long>(millis() - greenLedOffAt) >= 0) {
    digitalWrite(GREEN_LED_PIN, LOW);
    greenLedIsOn = false;
    Serial.println("GREEN LED OFF");
  }
}

void beginWifi() {
  WiFi.mode(WIFI_STA);
  WiFi.persistent(false);
  WiFi.setAutoReconnect(true);

  bool hasConfiguredNetwork = false;
  for (size_t index = 0; index < WIFI_NETWORK_COUNT; index++) {
    if (WIFI_NETWORKS[index].ssid[0] == '\0' || strcmp(WIFI_NETWORKS[index].ssid, "YOUR_WIFI_SSID") == 0) continue;
    wifiMulti.addAP(WIFI_NETWORKS[index].ssid, WIFI_NETWORKS[index].password);
    hasConfiguredNetwork = true;
  }
  if (!hasConfiguredNetwork) {
    Serial.println("CONFIG ERROR: copy secrets.example.h to secrets.h and set Wi-Fi credentials");
  }

  Serial.println("Connecting to configured Wi-Fi networks...");
  wifiMulti.run();
  lastWifiAttemptAt = millis() - WIFI_RETRY_MS;
}

void maintainWifi() {
  if (WiFi.status() == WL_CONNECTED) {
    if (!wifiWasConnected) {
      wifiWasConnected = true;
      heartbeatSentForConnection = false;
      configTime(0, 0, "pool.ntp.org", "time.nist.gov");
      digitalWrite(READY_LED_PIN, rfidReady ? HIGH : LOW);
      Serial.print("Wi-Fi connected; NodeMCU IP: ");
      Serial.println(WiFi.localIP());
      Serial.println("NTP time synchronization started");
    }
    return;
  }

  if (wifiWasConnected) {
    wifiWasConnected = false;
    digitalWrite(READY_LED_PIN, LOW);
    Serial.println("Wi-Fi disconnected");
  }

  if (millis() - lastWifiAttemptAt >= WIFI_RETRY_MS) {
    lastWifiAttemptAt = millis();
    Serial.println("Retrying configured Wi-Fi networks...");
    wifiMulti.run();
  }
}

void sendHeartbeat() {
  StaticJsonDocument<256> request;
  request["deviceId"] = DEVICE_ID;
  request["ipAddress"] = WiFi.localIP().toString();
  request["firmwareVersion"] = FIRMWARE_VERSION;

  String responseBody;
  const int statusCode = postJson("/api/devices/heartbeat", buildJson(request), responseBody);
  if (statusCode <= 0) {
    Serial.println("HEARTBEAT FAILED: no HTTP response");
    return;
  }

  StaticJsonDocument<768> response;
  const DeserializationError parseError = deserializeJson(response, responseBody);
  const bool success = response["success"] | false;
  const char* deviceStatus = response["device"]["status"] | "";

  if (statusCode >= 200 && statusCode < 300 && !parseError && success && strcmp(deviceStatus, "ONLINE") == 0) {
    Serial.println("HEARTBEAT OK: backend confirms reader ONLINE");
  } else {
    Serial.print("HEARTBEAT FAILED HTTP ");
    Serial.print(statusCode);
    Serial.print(": ");
    Serial.println(responseBody);
  }
}

bool isNewAttendanceRecord(JsonDocument& response) {
  const bool success = response["success"] | false;
  const bool accepted = response["accepted"] | false;
  const char* code = response["code"] | "";
  const char* scanType = response["scanType"] | "";

  // Cooldown acknowledgements have success=true but create no new record and
  // deliberately omit scanType. Only the backend's recorded ENTRY/EXIT flashes.
  const bool recordedDirection = strcmp(scanType, "ENTRY") == 0 || strcmp(scanType, "EXIT") == 0;
  return success && accepted && recordedDirection && strcmp(code, "COOLDOWN_IGNORED") != 0;
}

void reportScanFailure(int statusCode, JsonDocument& response, const String& rawBody) {
  const char* code = response["code"] | "";
  const char* message = response["message"] | "";

  if (strcmp(code, "CARD_NOT_REGISTERED") == 0) {
    Serial.println("UNKNOWN CARD");
  } else if (strcmp(code, "COOLDOWN_IGNORED") == 0) {
    Serial.println("DUPLICATE SCAN: attendance was already recorded; no new LED flash");
  } else {
    Serial.print("ATTENDANCE FAILED HTTP ");
    Serial.print(statusCode);
    if (message[0] != '\0') {
      Serial.print(": ");
      Serial.println(message);
    } else {
      Serial.println();
      Serial.println(rawBody);
    }
  }
}

void sendScan(const String& uid) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("ATTENDANCE FAILED: Wi-Fi disconnected; scan was not sent");
    return;
  }

  StaticJsonDocument<384> request;
  request["rfidUID"] = uid;
  request["deviceId"] = DEVICE_ID;
  request["scanDirection"] = "AUTO";
  request["firmwareVersion"] = FIRMWARE_VERSION;
  const String timestamp = utcTimestamp();
  if (timestamp.length() > 0) request["deviceTimestamp"] = timestamp;

  Serial.println("Sending RFID scan to SmartAttend backend...");
  String responseBody;
  const int statusCode = postJson("/api/rfid/scan", buildJson(request), responseBody);
  if (statusCode <= 0) {
    Serial.println("ATTENDANCE FAILED: server unavailable or request timed out");
    return;
  }

  StaticJsonDocument<1024> response;
  const DeserializationError parseError = deserializeJson(response, responseBody);
  if (parseError) {
    Serial.print("ATTENDANCE FAILED: invalid JSON response: ");
    Serial.println(parseError.c_str());
    return;
  }

  if (isNewAttendanceRecord(response)) {
    const char* studentName = response["studentName"] | "Student";
    const char* studentId = response["studentId"] | "";
    const char* attendanceStatus = response["status"] | "recorded";
    const char* scanType = response["scanType"] | "ENTRY";

    Serial.println("ATTENDANCE SUCCESS");
    Serial.print("Student: ");
    Serial.println(studentName);
    if (studentId[0] != '\0') {
      Serial.print("Roll number: ");
      Serial.println(studentId);
    }
    Serial.print("Result: ");
    Serial.print(attendanceStatus);
    Serial.print(" (");
    Serial.print(scanType);
    Serial.println(")");
    startSuccessLed();
    return;
  }

  reportScanFailure(statusCode, response, responseBody);
}

void handleCard() {
  if (!rfidReady || !reader.PICC_IsNewCardPresent() || !reader.PICC_ReadCardSerial()) return;

  const String uid = uidToString(reader.uid);
  Serial.print("RFID SCANNED: ");
  Serial.println(uid);

  reader.PICC_HaltA();
  reader.PCD_StopCrypto1();

  const unsigned long now = millis();
  if (uid == lastCardUid && now - lastCardReadAt < LOCAL_DUPLICATE_MS) {
    Serial.println("DUPLICATE SCAN: ignored by local debounce");
    return;
  }

  lastCardUid = uid;
  lastCardReadAt = now;
  sendScan(uid);
}

void setup() {
  Serial.begin(115200);
  Serial.println();
  Serial.println("SmartAttend RFID Reader starting");

  pinMode(GREEN_LED_PIN, OUTPUT);
  digitalWrite(GREEN_LED_PIN, LOW);
  pinMode(READY_LED_PIN, OUTPUT);
  digitalWrite(READY_LED_PIN, LOW);

  SPI.begin();
  reader.PCD_Init();
  delay(50);

  const byte version = reader.PCD_ReadRegister(MFRC522::VersionReg);
  Serial.print("RC522 version: 0x");
  Serial.println(version, HEX);
  rfidReady = version == 0x91 || version == 0x92;
  if (!rfidReady) {
    Serial.println("RC522 ERROR: check wiring and 3.3V power");
  } else {
    Serial.println("RC522 ready");
  }

  beginWifi();
  Serial.println("Setup complete; waiting for Wi-Fi and RFID cards");
}

void loop() {
  updateSuccessLed();
  maintainWifi();

  if (WiFi.status() == WL_CONNECTED) {
    if (!heartbeatSentForConnection || millis() - lastHeartbeatAt >= HEARTBEAT_INTERVAL_MS) {
      sendHeartbeat();
      lastHeartbeatAt = millis();
      heartbeatSentForConnection = true;
    }
  }

  if (WiFi.status() == WL_CONNECTED && rfidReady) {
    digitalWrite(READY_LED_PIN, HIGH);
    handleCard();
  } else {
    digitalWrite(READY_LED_PIN, LOW);
  }

  updateSuccessLed();
  yield();
}
