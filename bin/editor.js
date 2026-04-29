#!/usr/bin/env node
process.env.EDITOR_ROOT = process.argv[2] || process.cwd();
require('../server.js');
