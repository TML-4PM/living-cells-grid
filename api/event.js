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

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'POST') {
      const b = req.body || {};
      const sql = `INSERT INTO living_cell_events (cell_id, event_type, severity, title, detail, source, actor, resolved, created_at) VALUES ('${b.cell_id || ''}', '${b.event_type || 'manual'}', '${b.severity || 'info'}', '${(b.title || '').replace(/'/g,"''")}', '${(b.detail || '').replace(/'/g,"''")}', '${b.source || 'dashboard'}', '${b.actor || 'unknown'}', false, now()) RETURNING *`;
      const result = await callBridge(sql);
      return res.status(200).json(result);
    }

    if (req.method === 'GET' && req.query.resolve) {
      const id = req.query.resolve;
      const actor = req.query.actor || 'system';
      const sql = `UPDATE living_cell_events SET resolved = true, resolved_at = now(), resolved_by = '${actor}' WHERE id = '${id}' RETURNING *`;
      const result = await callBridge(sql);
      return res.status(200).json(result);
    }

    return res.status(200).json({ ok: true, service: 'living-cells-events' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
