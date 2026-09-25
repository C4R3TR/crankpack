/*
  CrankPack ESP32 firmware (V1)

  Libraries (Arduino Library Manager):
    - NimBLE-Arduino
    - Adafruit BME280 Library
    - Adafruit Unified Sensor
    - ArduinoJson

  BLE service (must match the app):
    Service    a1b2c3d4-0001-4000-8000-123456789abc
    Telemetry  a1b2c3d4-0002-4000-8000-123456789abc  (notify JSON)
    Command    a1b2c3d4-0003-4000-8000-123456789abc  (write JSON)

  Telemetry example:
    {"pct":72,"v":3.91,"chg":1,"crankA":1.64,"crankW":6.4,"usbW":2.1,"usbA":0.42,"mah":2800,"cap":4000,"t":14.8,"p":1008.2,"h":68,"alt":428,"health":96,"fw":"1.0.0","name":"CrankPack"}

  Commands:
    {"cmd":"cal_batt","emptyV":3.0,"fullV":4.2,"cap":4000}
    {"cmd":"cal_bme","sea":1013.25}
    {"cmd":"set_name","name":"CrankPack"}
    {"cmd":"diag"}
*/

#include <NimBLEDevice.h>
#include <Wire.h>
#include <Adafruit_BME280.h>
#include <ArduinoJson.h>

static const char* FW = "1.0.0";
static const char* SERVICE_UUID = "a1b2c3d4-0001-4000-8000-123456789abc";
static const char* TELEMETRY_UUID = "a1b2c3d4-0002-4000-8000-123456789abc";
static const char* COMMAND_UUID = "a1b2c3d4-0003-4000-8000-123456789abc";

static const int BAT_ADC = 34;
static const int CRANK_ADC = 35;
static const int USB_ADC = 32;
static const float ADC_REF = 3.3f;
static const float BAT_DIVIDER = 2.0f;      // 100k / 100k
static const float CRANK_A_PER_V = 2.5f;    // calibrate to your shunt / INA
static const float USB_A_PER_V = 1.0f;

Adafruit_BME280 bme;
NimBLEServer* server = nullptr;
NimBLECharacteristic* telemetryChar = nullptr;
bool deviceConnected = false;
bool bmeOk = false;

String deviceName = "CrankPack";
float emptyV = 3.00f;
float fullV = 4.20f;
float capacityMah = 4000;
float seaLevelHpa = 1013.25f;
float batteryHealth = 96;

class ServerCallbacks : public NimBLEServerCallbacks {
  void onConnect(NimBLEServer* pServer, NimBLEConnInfo& connInfo) override {
    deviceConnected = true;
  }
  void onDisconnect(NimBLEServer* pServer, NimBLEConnInfo& connInfo, int reason) override {
    deviceConnected = false;
    NimBLEDevice::startAdvertising();
  }
};

float readVoltage(int pin, float divider) {
  uint32_t sum = 0;
  for (int i = 0; i < 16; i++) sum += analogRead(pin);
  float v = (sum / 16.0f) * (ADC_REF / 4095.0f) * divider;
  return v;
}

float voltageToPct(float v) {
  if (fullV <= emptyV) return 0;
  float pct = (v - emptyV) / (fullV - emptyV) * 100.0f;
  return constrain(pct, 0, 100);
}

class CommandCallbacks : public NimBLECharacteristicCallbacks {
  void onWrite(NimBLECharacteristic* c, NimBLEConnInfo& connInfo) override {
    std::string value = c->getValue();
    JsonDocument doc;
    if (deserializeJson(doc, value)) return;
    const char* cmd = doc["cmd"] | "";
    if (strcmp(cmd, "cal_batt") == 0) {
      emptyV = doc["emptyV"] | emptyV;
      fullV = doc["fullV"] | fullV;
      capacityMah = doc["cap"] | capacityMah;
    } else if (strcmp(cmd, "cal_bme") == 0) {
      seaLevelHpa = doc["sea"] | seaLevelHpa;
    } else if (strcmp(cmd, "set_name") == 0) {
      deviceName = String((const char*)(doc["name"] | "CrankPack"));
    }
  }
};

void setup() {
  analogReadResolution(12);
  bmeOk = bme.begin(0x76) || bme.begin(0x77);

  NimBLEDevice::init(deviceName.c_str());
  NimBLEDevice::setMTU(185);
  server = NimBLEDevice::createServer();
  server->setCallbacks(new ServerCallbacks());

  NimBLEService* service = server->createService(SERVICE_UUID);
  telemetryChar = service->createCharacteristic(TELEMETRY_UUID, NIMBLE_PROPERTY::NOTIFY);
  NimBLECharacteristic* commandChar =
      service->createCharacteristic(COMMAND_UUID, NIMBLE_PROPERTY::WRITE | NIMBLE_PROPERTY::WRITE_NR);
  commandChar->setCallbacks(new CommandCallbacks());
  service->start();

  NimBLEAdvertising* advertising = NimBLEDevice::getAdvertising();
  advertising->setName(deviceName.c_str());
  advertising->addServiceUUID(SERVICE_UUID);
  advertising->enableScanResponse(true);
  NimBLEDevice::startAdvertising();
}

void loop() {
  float batteryV = readVoltage(BAT_ADC, BAT_DIVIDER);
  float pct = voltageToPct(batteryV);
  float crankA = max(0.0f, (readVoltage(CRANK_ADC, 1.0f) - 1.65f) * CRANK_A_PER_V);
  float crankW = crankA * batteryV;
  float usbA = max(0.0f, readVoltage(USB_ADC, 1.0f) * USB_A_PER_V);
  float usbW = usbA * 5.0f;
  bool charging = crankW > 0.4f;

  float t = bmeOk ? bme.readTemperature() : 0;
  float p = bmeOk ? bme.readPressure() / 100.0f : 0;
  float h = bmeOk ? bme.readHumidity() : 0;
  float alt = bmeOk ? bme.readAltitude(seaLevelHpa) : 0;

  JsonDocument doc;
  doc["pct"] = int(pct + 0.5f);
  doc["v"] = batteryV;
  doc["chg"] = charging ? 1 : 0;
  doc["crankA"] = crankA;
  doc["crankW"] = crankW;
  doc["usbW"] = usbW;
  doc["usbA"] = usbA;
  doc["mah"] = int(pct / 100.0f * capacityMah);
  doc["cap"] = int(capacityMah);
  doc["t"] = t;
  doc["p"] = p;
  doc["h"] = h;
  doc["alt"] = int(alt);
  doc["health"] = int(batteryHealth);
  doc["fw"] = FW;
  doc["name"] = deviceName.c_str();

  String payload;
  serializeJson(doc, payload);

  if (deviceConnected && telemetryChar) {
    telemetryChar->setValue(payload.c_str());
    telemetryChar->notify();
  }

  delay(500);
}
