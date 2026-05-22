#!/usr/bin/env node

const path = require('path');
const { build } = require('./bundler');

const projectRoot = process.argv[2] || process.cwd();
const outputDir = process.argv[3] || path.join(projectRoot, 'dist');

build(projectRoot, outputDir)
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Error en la compilación:', err.message);
    process.exit(1);
  });