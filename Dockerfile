FROM node:22-bookworm-slim

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends unzip \
    && rm -rf /var/lib/apt/lists/*

COPY universo_magico_completo_0_3.zip /tmp/game.zip
RUN unzip -q /tmp/game.zip -d /app \
    && rm /tmp/game.zip \
    && npm install --omit=dev

RUN cat > /app/init-db.js <<'EOF'
const fs = require('fs');
const { Client } = require('pg');

(async () => {
  if (!process.env.DATABASE_URL) {
    console.error('Falta DATABASE_URL');
    process.exit(1);
  }
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  await client.query(fs.readFileSync('/app/server/schema.sql', 'utf8'));
  await client.end();
})().catch(err => { console.error(err); process.exit(1); });
EOF

ENV NODE_ENV=production
EXPOSE 3000

CMD ["sh", "-c", "node /app/init-db.js && npm run server"]
