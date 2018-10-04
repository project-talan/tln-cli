#!/usr/bin/env node

const [,, ... args] = process.argv

console.log(String.raw` _____           _           _     _______    _             `)
console.log(String.raw`|  __ \         (_)         | |   |__   __|  | |            `)
console.log(String.raw`| |__) | __ ___  _  ___  ___| |_     | | __ _| | __ _ _ __  `)
console.log(String.raw`|  ___/ '__/ _ \| |/ _ \/ __| __|    | |/ _' | |/ _' | '_ \ `)
console.log(String.raw`| |   | | | (_) | |  __/ (__| |_     | | (_| | | (_| | | | |`)
console.log(String.raw`|_|   |_|  \___/| |\___|\___|\__|    |_|\__,_|_|\__,_|_| |_|`)
console.log(String.raw`               _/ |                                         `)
console.log(String.raw`              |__/                                          `)

console.log(`Hi ${args}`)