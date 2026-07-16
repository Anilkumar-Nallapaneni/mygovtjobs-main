/** Reveal React root and hide the LCP island shell (see index.html #lcp-shell). */
export function markAppReady(): void {
  if (typeof document === 'undefined') return
  if (document.body.classList.contains('app-ready')) return
  document.body.classList.add('app-ready')
  const shell = document.getElementById('lcp-shell')
  if (shell) {
    shell.setAttribute('aria-busy', 'false')
    shell.setAttribute('hidden', '')
  }
}
