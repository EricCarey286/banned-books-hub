// Prints a bcrypt hash of the admin password for ADMIN_PASSWORD_HASH.
// Usage (interactive, input hidden):  npm run hash-password
// Usage (piped, avoids shell history): printf '%s' "$PASSWORD" | npm run hash-password
import bcrypt from 'bcryptjs';
import readline from 'readline';

const COST = 12;
const MIN_LENGTH = 12;

function promptHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const writer = rl as unknown as { _writeToOutput: (text: string) => void };
    const originalWrite = writer._writeToOutput.bind(rl);
    let muted = false;
    writer._writeToOutput = (text: string) => {
      if (!muted) originalWrite(text);
    };

    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write('\n');
      resolve(answer);
    });
    muted = true;
  });
}

async function readPassword(): Promise<string> {
  if (!process.stdin.isTTY) {
    let data = '';
    for await (const chunk of process.stdin) {
      data += chunk;
    }
    return data.replace(/\r?\n$/, '');
  }
  return promptHidden('Admin password: ');
}

async function main(): Promise<void> {
  const password = await readPassword();

  if (password.length < MIN_LENGTH) {
    console.error(`Password must be at least ${MIN_LENGTH} characters.`);
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, COST);
  process.stdout.write(`${hash}\n`);
}

main().catch((err) => {
  console.error('Could not hash the password:', err instanceof Error ? err.message : err);
  process.exit(1);
});
