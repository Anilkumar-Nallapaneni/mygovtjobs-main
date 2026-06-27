#!/usr/bin/env node
/** Generate a secure ADMIN_API_KEY for production. */
import { randomBytes } from 'crypto'

const key = randomBytes(32).toString('base64url')
console.log('Add to backend/.env and Railway/Render variables:\n')
console.log(`ADMIN_API_KEY=${key}`)
console.log('\nKeep this secret — used for /api/admin and /api/ingest routes.')
