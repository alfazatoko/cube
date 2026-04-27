// Web Bluetooth API type declarations (not included in TS default lib)
declare global {
  interface BluetoothCharacteristicProperties {
    write: boolean;
    read: boolean;
    notify: boolean;
  }

  interface BluetoothRemoteGATTCharacteristic {
    properties: BluetoothCharacteristicProperties;
    writeValue(value: BufferSource): Promise<void>;
  }

  interface BluetoothRemoteGATTService {
    getCharacteristics(uuid?: string): Promise<BluetoothRemoteGATTCharacteristic[]>;
    getPrimaryService(uuid: string): Promise<BluetoothRemoteGATTService>;
  }

  interface BluetoothRemoteGATTServer {
    connect(): Promise<BluetoothRemoteGATTServer>;
    getPrimaryService(uuid: string): Promise<BluetoothRemoteGATTService>;
  }

  interface BluetoothDevice {
    gatt?: BluetoothRemoteGATTServer;
  }

  interface RequestDeviceOptions {
    filters?: Array<{ services?: string[]; namePrefix?: string; name?: string }>;
    optionalServices?: string[];
    acceptAllDevices?: boolean;
  }

  interface Bluetooth {
    requestDevice(options: RequestDeviceOptions): Promise<BluetoothDevice>;
  }

  interface Navigator {
    bluetooth: Bluetooth;
  }
}

/**
 * Utility for Bluetooth Thermal Printers (ESC/POS)
 */

export interface ReceiptItem {
  nama: string;
  harga: number;
  jumlah: number;
}

export interface ReceiptData {
  shopName: string;
  items: ReceiptItem[];
  total: number;
  tertanda: string;
  thanksMessage: string;
}

export class BluetoothPrinter {
  private device: BluetoothDevice | null = null;
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null;

  async connect() {
    try {
      this.device = await navigator.bluetooth.requestDevice({
        filters: [
          { services: ["000018f0-0000-1000-8000-00805f9b34fb"] },
          { namePrefix: "Printer" },
          { namePrefix: "RPP" },
          { namePrefix: "MTP" },
        ],
        optionalServices: ["000018f0-0000-1000-8000-00805f9b34fb"]
      });

      const server = await this.device.gatt?.connect();
      const service = await server?.getPrimaryService("000018f0-0000-1000-8000-00805f9b34fb");
      const characteristics = await service?.getCharacteristics();
      
      // Usually the first characteristic that supports "write"
      this.characteristic = characteristics?.find((c: BluetoothRemoteGATTCharacteristic) => c.properties.write) || null;

      if (!this.characteristic) {
        throw new Error("Karakteristik printer tidak ditemukan.");
      }

      return true;
    } catch (error) {
      console.error("Bluetooth Connection Error:", error);
      return false;
    }
  }

  async printReceipt(data: ReceiptData) {
    if (!this.characteristic) {
      const connected = await this.connect();
      if (!connected) return false;
    }

    const encoder = new TextEncoder();
    const esc = {
      init: [0x1b, 0x40],
      center: [0x1b, 0x61, 0x01],
      left: [0x1b, 0x61, 0x00],
      boldOn: [0x1b, 0x45, 0x01],
      boldOff: [0x1b, 0x45, 0x00],
      newLine: [0x0a],
    };

    let commands: number[] = [];

    // Initialize
    commands.push(...esc.init);

    // Shop Name (Bold, Centered)
    commands.push(...esc.center);
    commands.push(...esc.boldOn);
    commands.push(...Array.from(encoder.encode(data.shopName.toUpperCase() + "\n")));
    commands.push(...esc.boldOff);
    commands.push(...Array.from(encoder.encode("--------------------------------\n")));

    // Items
    commands.push(...esc.left);
    data.items.forEach((item, index) => {
      const line1 = `${index + 1}. ${item.nama}\n`;
      const line2 = `   ${item.jumlah} x ${item.harga.toLocaleString("id-ID")} = ${ (item.jumlah * item.harga).toLocaleString("id-ID") }\n`;
      commands.push(...Array.from(encoder.encode(line1)));
      commands.push(...Array.from(encoder.encode(line2)));
    });

    commands.push(...Array.from(encoder.encode("--------------------------------\n")));

    // Total
    commands.push(...esc.boldOn);
    const totalLine = `TOTAL: Rp ${data.total.toLocaleString("id-ID")}\n`;
    commands.push(...Array.from(encoder.encode(totalLine)));
    commands.push(...esc.boldOff);
    commands.push(...esc.newLine);

    // Tertanda
    commands.push(...esc.center);
    commands.push(...Array.from(encoder.encode("Tertanda:\n\n")));
    commands.push(...Array.from(encoder.encode(data.tertanda + "\n")));
    commands.push(...esc.newLine);

    // Thanks Message
    commands.push(...Array.from(encoder.encode(data.thanksMessage + "\n")));
    commands.push(...esc.newLine);
    commands.push(...esc.newLine);
    commands.push(...esc.newLine); // Extra space for tearing

    // Send in chunks (some printers have small buffers)
    const chunkSize = 20;
    for (let i = 0; i < commands.length; i += chunkSize) {
      const chunk = new Uint8Array(commands.slice(i, i + chunkSize));
      await this.characteristic?.writeValue(chunk);
    }

    return true;
  }
}

export const printer = new BluetoothPrinter();
