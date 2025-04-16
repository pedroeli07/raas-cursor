import { spawn } from 'child_process';

const dev = spawn('npx', ['next', 'dev', '--turbo']);

dev.stdout.on('data', (data) => {
  const output = data.toString();
  // Filtra logs que você não quer (como Fast Refresh)
  if (!output.includes('[Fast Refresh]')) {
    process.stdout.write(output);
  }
});

dev.stderr.on('data', (data) => {
  process.stderr.write(data);
});

dev.on('close', (code) => {
  console.log(`Processo encerrado com código ${code}`);
});
