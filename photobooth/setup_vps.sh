#!/bin/bash

# Bat Trigger Photobooth - VPS Setup Script (Ubuntu 22.04)
# Run as root or with sudo

# 1. Update & Install Dependencies
apt update && apt upgrade -y
apt install -y python3-pip python3-venv nginx ufw

# 2. Setup Directory Structure
mkdir -p /var/www/bat-trigger-photobooth/backend
mkdir -p /var/www/bat-trigger-photobooth/frontend

# 3. Setup Backend Virtual Environment (run AFTER copying backend files to /var/www/bat-trigger-photobooth/backend/)
# cd /var/www/bat-trigger-photobooth/backend
# python3 -m venv venv
# venv/bin/pip install -r requirements.txt

# 4. Configure Firewall
ufw allow 'Nginx Full'   # HTTP (80) and HTTPS (443)
ufw allow 8000/tcp       # FastAPI (direct access for testing, can be removed later)
ufw --force enable

echo "=============================="
echo " VPS Setup Complete!"
echo "=============================="
echo "NEXT STEPS:"
echo "1. Upload 'photobooth/' folder contents to /var/www/bat-trigger-photobooth/backend/"
echo "2. Upload 'frontend/dist/' contents to /var/www/bat-trigger-photobooth/frontend/"
echo "3. Run: cd /var/www/bat-trigger-photobooth/backend && python3 -m venv venv && venv/bin/pip install -r requirements.txt"
echo "4. Copy photobooth.service to /etc/systemd/system/ and enable it"
echo "5. Copy vps_nginx.conf to /etc/nginx/sites-enabled/ and reload nginx"
