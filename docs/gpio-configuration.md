# GPIO Configuration & RPi Connection

The system interacts directly with the Raspberry Pi's hardware pins to provide physical feedback and receive user input.

## 1. Pin Mapping (BCM Numbering)

| Component | Pin (BCM) | Mode | Function |
| :--- | :--- | :--- | :--- |
| **Green LED** | 22 | Output | Indicates "Normal" status. |
| **Yellow LED** | 27 | Output | Indicates "Warning" (Minor shaking). |
| **Red LED** | 17 | Output | Indicates "Alert" (Major shaking). |
| **Buzzer** | 18 | Output | Auditory alarm during events. |
| **Relay 1** | 26 | Output | Triggers external safety equipment (e.g. Elevators). |
| **Button 1** | 19 | Input | Reserved. |
| **Button 2** | 16 | Input | **Calibration**: Long press (5s) triggers sensor calibration. |
| **Button 3** | 20 | Input | **Reboot**: Long press (5s) triggers a system reboot. |

## 2. Hardware Logic
- **LEDs**: Controlled based on the intensity level calculated from the sensor data.
- **Relay**: Configurable trigger (High/Low) via the `RELAI_TRIGGER` environment variable. Used to physically "cut" or "connect" a circuit during an earthquake.
- **Audio**: Played through the RPi 3.5mm jack or HDMI via `omxplayer`.

## 3. Connection to Raspberry Pi
- Sensors connect to the Pi via the local network (Ethernet/WiFi).
- Indicators (LEDs/Buzzer) are typically connected via a custom PCB or breadboard to the GPIO header.
- The software checks for the `win32` platform; if not Windows, it assumes it's on a Linux system (RPi) and attempts to initialize the `onoff` library.
