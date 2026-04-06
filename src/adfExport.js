/**
 * Diagnostic adfExport handlers — Step 0 investigation.
 *
 * These dump the full payload as preformatted text in the ADF output so we can
 * inspect what is actually available (accountId, config fields, exportType, etc.)
 * when the adfExport function is invoked for a macro.
 *
 * Replace these with real implementations once Step 0 findings are confirmed.
 */

function diagnosticAdf(label, payload) {
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
        type: "codeBlock",
        attrs: { language: "json" },
        content: [
          {
            type: "text",
            text: JSON.stringify(payload, null, 2)
          }
        ]
      }
    ]
  };
}

export async function handleNonRepeating(payload) {
  return diagnosticAdf("Localised Date Macro", payload);
}

export async function handleRepeating(payload) {
  return diagnosticAdf("Repeating Localised Date Macro", payload);
}
