FROM node:20-bookworm-slim

WORKDIR /app

ENV NODE_ENV=production
ENV POST_HEADLESS=true
ENV PUPPETEER_CACHE_DIR=/app/.cache/puppeteer

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    libxshmfence1 \
    python3 \
    python3-pip \
    python3-venv \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY requirements.txt ./
RUN python3 -m venv venv \
  && ./venv/bin/pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 4000

CMD ["npm", "start"]
