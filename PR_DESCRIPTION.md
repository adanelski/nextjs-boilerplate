POC: Analyst Decision Engine — Single Page UI

Summary
- Drag-and-drop rules list with priority ordering
- Rule editor with conditions (AND groups) and a single action
- Two action modes:
  - Specific: choose channel (SMS, EMAIL, MAIL, PORTAL) + content id (e.g., emails_123)
  - ML Optimization: communication type (nurture, proactive, reactive) + allowed channels subset
- Natural language preview of conditions
- Testing panel to run against 100 synthetic users and show per-row outcomes
- Save as Draft / Deploy buttons (local state only for POC)

How to Test
1. npm install
2. npm run dev and open http://localhost:3000
3. Add rules, reorder via drag, edit conditions and actions
4. Switch between Specific and ML action modes
5. Run testing and verify results table

Notes
- Client-only POC; no backend or persistence
