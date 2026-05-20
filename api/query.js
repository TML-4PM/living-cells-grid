const https = require('https');
const url = require('url');

const BRIDGE_URL = 'https://m5oqj21chd.execute-api.ap-southeast-2.amazonaws.com/lambda/invoke';

function callBridge(sql) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ functionName: 'troy-sql-executor', payload: { sql } });
    const parsed = url.parse(BRIDGE_URL);
    const opts = {
      hostname: parsed.hostname,
      path: parsed.path,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    };
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const result = json.result || {};
          const bodyData = JSON.parse(result.body || '{}');
          resolve(bodyData);
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

const QUERIES = {
  grid: 'SELECT * FROM v_living_cells_grid',
  risk: 'SELECT cell_id, function_name, domain_name, cell_title, risk_classification, owner_role, escalation_path, threshold_definition, automation_flag, maturity_level FROM v_living_cells_risk',
  automation: 'SELECT * FROM v_living_cells_automation',
  domain_health: 'SELECT * FROM v_living_cells_domain_health',
  research_coverage: 'SELECT * FROM v_living_cells_research_coverage',
  maturity: 'SELECT * FROM v_living_cells_maturity',
  stats: "SELECT count(*) as total_cells, count(*) FILTER (WHERE risk_classification = 'Critical') as critical, count(*) FILTER (WHERE risk_classification = 'High') as high, count(*) FILTER (WHERE risk_classification = 'Moderate') as moderate, count(*) FILTER (WHERE automation_flag = true) as automated, round(100.0 * count(*) FILTER (WHERE automation_flag = true) / nullif(count(*),0), 0) as auto_pct, count(*) FILTER (WHERE alert_active = true) as active_alerts, count(*) FILTER (WHERE status = 'escalated') as escalated FROM living_cells",
  all_cells: 'SELECT cell_id, function_id, function_name, domain_id, domain_name, cell_title, cell_description, linked_research_domains, primary_signal_type, data_source_type, measurement_frequency, aggregation_layer, threshold_definition, owner_role, escalation_path, evidence_required, compliance_alignment, maturity_level, automation_flag, dashboard_widget_key, risk_classification, notes, status, alert_active, last_activity_at, last_activity_type, last_activity_detail, review_due_at FROM living_cells ORDER BY cell_id',
  alerts: 'SELECT * FROM v_living_cells_alerts LIMIT 50',
  stale: "SELECT * FROM v_living_cells_stale WHERE review_status != 'OK'",
  feed: 'SELECT * FROM v_living_cells_feed LIMIT 50',
  operational: 'SELECT * FROM v_living_cells_operational',
  study_links: 'SELECT * FROM v_living_cells_study_links',
};

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { q } = req.query || {};
  const sql = QUERIES[q];
  if (!sql) return res.status(400).json({ error: 'Unknown query key', available: Object.keys(QUERIES) });

  try {
    const data = await callBridge(sql);
    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=120');
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
