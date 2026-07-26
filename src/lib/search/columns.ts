/**
 * Human labels for optional column keys.
 * Lives apart from schema.ts so the client can render chips without pulling
 * the whole routing table into the bundle.
 */
export const OPTIONAL_COLUMN_LABELS: Record<string, string> = {
  deadline: "Deadline",
  duration: "Duration",
  batchSize: "Batch size",
  remote: "Remote policy",
  notableAlumni: "Notable alumni",
  founded: "Founded",
  founders: "Founders",
  employees: "Employees",
  pricing: "Pricing",
  investors: "Investors",
  frequency: "How often",
  version: "Version",
  workaround: "Workaround",
  status: "Status",
  education: "Education",
  notableWork: "Notable work",
  location: "Location",
  impact: "Impact",
  amount: "Amount",
  level: "Level",
  format: "Format",
  example: "Example",
  growth: "Growth",
  metric: "Metric",
};
