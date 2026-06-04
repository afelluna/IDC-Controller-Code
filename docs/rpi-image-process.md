# Raspberry Pi Image Creation Process

To ensure consistency across deployments, the software is usually distributed as a pre-configured Raspberry Pi SD Card Image.

## 1. Base OS Setup
1. Install **Raspberry Pi OS Lite** (Debian-based).
2. Install system dependencies:
   - `sudo apt update && sudo apt install -y nodejs npm mysql-server apache2 omxplayer`.
3. Configure **MySQL**: Create the `config_db` database and run the `config_db.sql` script.
4. Configure **Apache**: Move the `monitor` folder to `/var/www/html/` and configure permissions.

## 2. Application Deployment
1. Clone the `lowrise_server_receiver` and `lowrise_server_uploader` repositories.
2. Run `npm install` and `npm run build` for both services.
3. Configure the `.env` files with the specific `TOKEN` and `MACHINE_ID`.

## 3. Autostart Configuration
1. Install PM2 globally: `sudo npm install -g pm2`.
2. Start the services: `pm2 start ecosystem.config.js`.
3. Save the PM2 list and configure it to run on boot: `pm2 save && pm2 startup`.

## 4. Final Imaging
1. Shrink the file system to the minimum size.
2. Use a tool like `dd` (Linux) or `Win32DiskImager` (Windows) to read the SD card into a `.img` file.
3. Compress the image for distribution.
