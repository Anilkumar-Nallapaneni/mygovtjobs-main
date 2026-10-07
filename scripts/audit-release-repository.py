"""Read tracked repository files without printing credential values."""
import ast
import base64
from collections import defaultdict
import json
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]
files = subprocess.check_output(['git', 'ls-files'], cwd=ROOT, text=True).splitlines()
env = defaultdict(set)
findings = []
markers = []
placeholder = re.compile(r'your|example|placeholder|password|test|dummy|changeme|postgres|\*{4}|\$|[<>{}]', re.I)
secret_patterns = {
    'private key': r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----',
    'provider credential': r'\b(?:ghp_[A-Za-z0-9]{30,}|sk_live_[A-Za-z0-9]{16,}|sk-proj-[A-Za-z0-9_-]{30,}|AKIA[A-Z0-9]{16})\b',
}
for name in files:
    path = ROOT / name
    try:
        content = path.read_text(encoding='utf-8')
    except (UnicodeError, OSError):
        continue
    if re.search(r'^(?:<{7}|>{7})(?: |$)|^={7}$', content, re.M):
        markers.append(name)
    if Path(name).name in ('.env', '.env.local', '.env.production'):
        findings.append({'file': name, 'secret_type': 'tracked environment file', 'severity': 'high', 'action': 'Remove from tracking and rotate any credentials after review.'})
    for kind, pattern in secret_patterns.items():
        if re.search(pattern, content):
            findings.append({'file': name, 'secret_type': kind, 'severity': 'high', 'action': 'Inspect privately and rotate/revoke if real; remove from tracking.'})
    for token in re.findall(r'eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+', content):
        try:
            payload = token.split('.')[1]
            claims = json.loads(base64.urlsafe_b64decode(payload + '=' * (-len(payload) % 4)))
            role = claims.get('role')
        except Exception:
            role = None
        if role != 'anon':
            findings.append({'file': name, 'secret_type': 'service-role JWT' if role == 'service_role' else 'JWT requiring private review', 'severity': 'high', 'action': 'Validate privately; rotate any real non-public token.'})
    for match in re.finditer(r'postgres(?:ql)?(?:\+asyncpg)?://([^\s\"\x27]+)', content):
        if '@' not in match.group(1):
            continue
        authority = match.group(1).split('@')[0]
        password = authority.partition(':')[2]
        if password and not placeholder.search(password):
            fixture = name.startswith('backend/tests/')
            findings.append({'file': name, 'secret_type': 'database URI test fixture' if fixture else 'database URI password candidate', 'severity': 'informational' if fixture else 'high', 'action': 'Synthetic localhost/parser fixture; no rotation required.' if fixture else 'Inspect privately; rotate if real and remove from tracking.'})
    if name.endswith(('.py', '.ts', '.tsx', '.mjs', '.js', '.yaml', '.yml', '.ps1', '.toml')) or Path(name).name == 'Dockerfile':
        if '/tests/' in name or '/e2e/' in name:
            continue
        for key in re.findall(r'(?:process\.env\.|import\.meta\.env\.)([A-Z][A-Z0-9_]+)|(?:os\.getenv|os\.environ\.get|os\.environ\[)\(?[\"\x27]([A-Z][A-Z0-9_]+)', content):
            env[next(part for part in key if part)].add(name)
        for key in re.findall(r'\$env:([A-Z][A-Z0-9_]+)|secrets\.([A-Z][A-Z0-9_]+)', content):
            env[next(part for part in key if part)].add(name)
        if Path(name).name == 'Dockerfile':
            for key in re.findall(r'\$\{([A-Z][A-Z0-9_]+)(?::[^}]*)?\}', content):
                env[key].add(name)
    if name.endswith('.env.example'):
        for key in re.findall(r'^([A-Z][A-Z0-9_]+)=', content, re.M):
            env[key].add(name)
# Pydantic settings are environment variables even without a literal os.getenv call.
tree = ast.parse((ROOT / 'backend/app/config.py').read_text())
for node in ast.walk(tree):
    if isinstance(node, ast.ClassDef) and node.name == 'Settings':
        for field in node.body:
            if isinstance(field, ast.AnnAssign) and isinstance(field.target, ast.Name):
                env[field.target.id.upper()].add('backend/app/config.py')
catalog_report = {}
for name in ['live-jobs.json', 'live-jobs-list.json', 'live-jobs-bootstrap.json']:
    path = 'frontend/public/data/' + name
    previous = subprocess.check_output(['git', 'show', f'5efa86c^:{path}'], cwd=ROOT, text=True, encoding='utf-8')
    branches = []
    for choose in (1, 2):
        resolved = re.sub(r'^<<<<<<<[^\n]*\n(.*?)^=======\n(.*?)^>>>>>>>[^\n]*\n', lambda m: m.group(choose), previous, flags=re.M | re.S)
        try:
            old = json.loads(resolved)
            branches.append({str(row.get('slug') or row.get('id')) for row in old['items']})
        except (ValueError, KeyError):
            branches.append(set())
    current = json.loads((ROOT / path).read_text(encoding='utf-8'))
    ids = [str(row.get('slug') or row.get('id')) for row in current['items']]
    catalog_report[name] = {'original_conflict_blocks': len(re.findall(r'^<<<<<<<', previous, re.M)), 'current_rows': len(ids),
        'duplicates': len(ids) - len(set(ids)), 'missing_from_original_branch_union': sorted(set.union(*branches) - set(ids))}
report = {'secret_findings': findings, 'unresolved_merge_marker_files': markers, 'catalog_reconciliation': catalog_report,
    'environment_references': {key: sorted(value) for key, value in sorted(env.items())},
    'limitations': 'Pattern scan, not proof no secrets exist. No secret values are recorded. Binary files excluded; Git history not exhaustively scanned.'}
dest = ROOT / 'docs/audits/release-repository-2026-10-07.json'
dest.write_text(json.dumps(report, indent=2), encoding='utf-8')
print(json.dumps({key: value for key, value in report.items() if key != 'environment_references'}, indent=2))
print('Environment variables referenced:', len(env))
