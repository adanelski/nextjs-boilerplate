POC: Analyst Decision Engine — Single Page UI

Summary
- Drag-and-drop rules list with priority ordering
- Rule editor with conditions (AND groups) and single action
- Action modes: Specific (channel + content id) or ML Optimization (communication type + allowed channels)
- NL preview for conditions
- Testing: run against 100 synthetic customers and see per-row outcomes
- Save as Draft / Deploy buttons update in-memory status

How to Test
1. npm install
2. npm run dev and open http://localhost:3000
3. Create/edit/reorder rules, switch action modes
4. Run testing and verify table output

Notes
- Client-only POC; no backend or persistence
