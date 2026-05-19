import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

function run(command, args = []) {
  console.log(`\n> ${command} ${args.join(' ')}`);

  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: true,
  });

  if (result.status !== 0) {
    console.error(`\n❌ Command failed: ${command} ${args.join(' ')}`);
    process.exit(result.status ?? 1);
  }
}

if (!existsSync('.env')) {
  console.error(`
❌ Missing .env file.

Create it first:

  cp .env.example .env

Then edit DATABASE_URL/JWT values if needed.
`);
  process.exit(1);
}

console.log('✅ .env found');

run('docker', ['compose', 'up', '-d']);
run('pnpm', ['install']);
run('pnpm', ['prisma:generate']);
run('pnpm', ['prisma:migrate']);
run('pnpm', ['build']);
run('pnpm', ['seed']);

console.log(`
✅ Local setup complete.

Next:

  pnpm start:dev
`);
