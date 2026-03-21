# --- Stage 1: Build Frontend ---
FROM node:20-alpine AS frontend-build
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
# Patch MediaPipe package.json bug
RUN chmod +x mediapipe-fix.sh && ./mediapipe-fix.sh
RUN npm run build

# --- Stage 2: Production Image ---
FROM python:3.12-slim

# System deps for MediaPipe + OpenCV + Nginx + supervisord
RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx supervisor \
    libgl1 libglib2.0-0 libgles2 libegl1 \
    && rm -rf /var/lib/apt/lists/*

# Frontend build output
COPY --from=frontend-build /app/dist /var/www/html

# Python backend
WORKDIR /app/backend
COPY photobooth/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY photobooth/ .

# Nginx config
COPY ./deploy/nginx.conf /etc/nginx/sites-available/default
RUN ln -sf /etc/nginx/sites-available/default /etc/nginx/sites-enabled/default

# Supervisord config
COPY ./deploy/supervisord.conf /etc/supervisor/conf.d/photobooth.conf

EXPOSE 80 443 9999

# Ensure Nginx doesn't run as a daemon (supervisord handles it)
RUN echo "daemon off;" >> /etc/nginx/nginx.conf

CMD ["supervisord", "-n"]
