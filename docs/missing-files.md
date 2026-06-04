# Probable Missing Files

Based on the analysis of the current codebase, the following files or components appear to be missing or were not included in this repository:

## 1. Source Code for the Frontend
- The `/monitor` folder only contains the **compiled** Angular bundles. The original TypeScript source code, components, and assets used to build the dashboard are missing.

## 2. Production Environment Secrets
- While `.env.example` files exist, the actual `.env` files containing production database passwords, portal tokens (`TOKEN`), and specific API keys are (rightfully) omitted.

## 3. Systemd Service Units
- While the project uses PM2, some RPi setups use `systemd` for lower-level service management (e.g., ensuring MySQL starts before Node.js). These `.service` files are not present.

## 4. Hardware Wiring Diagrams
- There are no schematics or wiring diagrams showing how the LEDs, Buzzers, and Relays should be physically connected to the RPi's 40-pin header.

## 5. Deployment Scripts
- Scripts for automating the installation of dependencies (Node, MySQL, Apache) on a fresh RPi OS install are not included.

## 6. SSL Certificates
- If the system is intended to be accessed over HTTPS locally, the `.crt` and `.key` files for Apache are missing.
