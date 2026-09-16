# XAutomate Backend

Node/Express API for XAutomate. It also runs the Python automation script in `src/services/x_poster_undetected.py`.

## Local setup

```sh
npm install
python3 -m venv venv
./venv/bin/pip install -r requirements.txt
cp .env.example .env
npm run dev
```

## Render

Use this repository as a Render web service or Blueprint.

Build command:

```sh
npm ci && python3 -m venv venv && ./venv/bin/pip install -r requirements.txt
```

Start command:

```sh
npm start
```

Set these Render environment variables:

```sh
MONGODB_URI=
MONGODB_DB_NAME=xautomate
X_USERNAME=
X_PASSWORD=
ADMIN_EMAIL=
ADMIN_PASSWORD=
POST_HEADLESS=true
```
