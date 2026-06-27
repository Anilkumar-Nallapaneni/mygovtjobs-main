#!/usr/bin/env node
/**
 * Notify maintainers when a GitHub Actions workflow fails.
 * Used as the final step in ingest / enrich workflows.
 *
 * Secrets (any one channel is enough):
 *   NOTIFY_EMAIL + RESEND_API_KEY + ALERT_FROM_EMAIL  → email via Resend
 *   SLACK_WEBHOOK_URL                                 → Slack incoming webhook
 */
const workflow = process.env.GITHUB_WORKFLOW || "workflow";
const runId = process.env.GITHUB_RUN_ID || "";
const repo = process.env.GITHUB_REPOSITORY || "";
const serverUrl = (process.env.GITHUB_SERVER_URL || "https://github.com").replace(/\/$/, "");
const runUrl = runId && repo ? `${serverUrl}/${repo}/actions/runs/${runId}` : "";
const branch = process.env.GITHUB_REF_NAME || process.env.GITHUB_HEAD_REF || "";
const actor = process.env.GITHUB_ACTOR || "github-actions";

const title = `[My Govt Jobs] ${workflow} failed`;
const body = [
  `Workflow: ${workflow}`,
  repo ? `Repository: ${repo}` : null,
  branch ? `Branch: ${branch}` : null,
  actor ? `Triggered by: ${actor}` : null,
  runUrl ? `Run: ${runUrl}` : null,
].filter(Boolean).join("\n");

console.error(`::error::${title}${runUrl ? ` — ${runUrl}` : ""}`);

async function sendResend() {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.NOTIFY_EMAIL;
  const from = process.env.ALERT_FROM_EMAIL || "My Govt Jobs <onboarding@resend.dev>";
  if (!apiKey || !to) return false;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: title,
      text: body,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`Resend notify failed (${res.status}): ${err.slice(0, 200)}`);
    return false;
  }
  console.log(`Failure notification emailed to ${to}`);
  return true;
}

async function sendSlack() {
  const webhook = process.env.SLACK_WEBHOOK_URL;
  if (!webhook) return false;

  const res = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: title,
      blocks: [
        { type: "section", text: { type: "mrkdwn", text: `*${title}*\n${body.replace(/\n/g, "\n")}` } },
        ...(runUrl ? [{ type: "actions", elements: [{ type: "button", text: { type: "plain_text", text: "View run" }, url: runUrl }] }] : []),
      ],
    }),
  });

  if (!res.ok) {
    console.error(`Slack notify failed (${res.status})`);
    return false;
  }
  console.log("Failure notification sent to Slack");
  return true;
}

const emailed = await sendResend();
const slacked = await sendSlack();

if (!emailed && !slacked) {
  console.log("No NOTIFY_EMAIL/RESEND_API_KEY or SLACK_WEBHOOK_URL — GitHub will email repo watchers only.");
}
