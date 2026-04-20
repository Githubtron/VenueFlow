import mqtt, { MqttClient } from 'mqtt';

const MQTT_TOPICS = ['sensors/pressure/#', 'sensors/ir/#', 'sensors/ble/#'];

export type MessageHandler = (topic: string, payload: Buffer) => void;

export function createMqttClient(brokerUrl: string, onMessage?: MessageHandler): MqttClient {
  const client = mqtt.connect(brokerUrl, {
    reconnectPeriod: 1000,
    connectTimeout: 10_000,
    clientId: `iot-gateway-${process.pid}`,
  });

  client.on('connect', () => {
    console.log(`[iot-gateway] Connected to MQTT broker: ${brokerUrl}`);
    client.subscribe(MQTT_TOPICS, { qos: 1 }, (err) => {
      if (err) {
        console.error('[iot-gateway] MQTT subscribe error:', err);
      } else {
        console.log('[iot-gateway] Subscribed to topics:', MQTT_TOPICS);
      }
    });
  });

  if (onMessage) {
    client.on('message', onMessage);
  }

  client.on('error', (err) => {
    console.error('[iot-gateway] MQTT error:', err);
  });

  client.on('reconnect', () => {
    console.log('[iot-gateway] MQTT reconnecting...');
  });

  client.on('offline', () => {
    console.warn('[iot-gateway] MQTT client offline');
  });

  return client;
}
