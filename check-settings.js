const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.appSetting.findMany()
  .then(s => console.log(JSON.stringify(s, null, 2)))
  .finally(() => p.$disconnect());
