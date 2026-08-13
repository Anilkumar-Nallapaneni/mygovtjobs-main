#!/usr/bin/env node
/** Atomic write with retries for Windows/Vite file locks (UV errno -4094). */
import { writeFileSync, renameSync, unlinkSync } from 'fs'
import { setTimeout as sleep } from 'timers/promises'

export async function writeFileAtomic(path, body, attempts = 8) {
  const tmp = `${path}.${process.pid}.tmp`
  const data = typeof body === 'string' ? body : String(body)
  let lastErr
  for (let i = 0; i < attempts; i++) {
    try {
      writeFileSync(tmp, data, 'utf8')
      try {
        unlinkSync(path)
      } catch {
        // destination may not exist
      }
      renameSync(tmp, path)
      return
    } catch (err) {
      lastErr = err
      try {
        unlinkSync(tmp)
      } catch {
        // ignore
      }
      await sleep(150 * (i + 1))
    }
  }
  throw lastErr
}
