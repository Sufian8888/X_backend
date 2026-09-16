const { loadEnvironment } = require('./src/config/loadEnv');
const { app } = require('./src/app');
const { connectDatabase } = require('./src/config/db');

loadEnvironment();

const port = Number(process.env.PORT || 4000);

async function main() {
  await connectDatabase();

  app.listen(port, () => {
    console.log(`XAutomate backend listening on port ${port}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
