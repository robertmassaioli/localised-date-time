/**
 * Diagnostic adfExport handlers — Step 0 investigation.
 *
 * These dump the full payload as preformatted text in the ADF output so we can
 * inspect what is actually available (accountId, config fields, exportType, etc.)
 * when the adfExport function is invoked for a macro.
 *
 * Replace these with real implementations once Step 0 findings are confirmed.
 */

function diagnosticAdf(label, payload, context) {
  return {
    version: 1,
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: `[${label} — adfExport diagnostic]`,
            marks: [{ type: "strong" }]
          }
        ]
      },
      {
        type: "paragraph",
        content: [{ type: "text", text: "payload:", marks: [{ type: "strong" }] }]
      },
      {
        type: "codeBlock",
        attrs: { language: "json" },
        content: [{ type: "text", text: JSON.stringify(payload, null, 2) }]
      },
      {
        type: "paragraph",
        content: [{ type: "text", text: "context (2nd arg):", marks: [{ type: "strong" }] }]
      },
      {
        type: "codeBlock",
        attrs: { language: "json" },
        content: [{ type: "text", text: JSON.stringify(context, null, 2) }]
      }
    ]
  };
}

export async function handleNonRepeating(payload, context) {
  return diagnosticAdf("Localised Date Macro", payload, context);
}

export async function handleRepeating(payload, context) {
  return diagnosticAdf("Repeating Localised Date Macro", payload, context);
}
