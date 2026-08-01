#!/usr/bin/env node

function main(argv: readonly string[]): void {
  console.log('Hello from your new TypeScript CLI!');
  console.log('!!!!!!!!!!!!!');

  if (argv.length > 0) {
    console.log(`Arguments received: ${argv.join(', ')}`);
  }
}

main(process.argv.slice(2));