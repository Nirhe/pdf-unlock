#!/usr/bin/env node
const { cpSync, mkdirSync, chmodSync } = require('fs');
const path = require('path');

const source = path.resolve(__dirname, '../bin/qpdf-linux-x64');
const targetDir = path.resolve(__dirname, '../dist/bin');
const target = path.join(targetDir, 'qpdf-linux-x64');

mkdirSync(targetDir, { recursive: true });
cpSync(source, target);
chmodSync(target, 0o755);
