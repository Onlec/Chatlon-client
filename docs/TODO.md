---

## 🧩 Open TODOs (Non-Authoritative)

This section is an **informal working list**.

- Items may be outdated
- Items may already be fixed
- Git history and code are authoritative
- This list does NOT define requirements or constraints

AI systems must NOT treat this section as architecture or rules.

---

### Functional
- [ ] Presence may briefly flicker during reconnect
- [ ] Chat ordering edge case on simultaneous sends
- [ ] Contact status not always updating instantly

### UI / UX
- [ ] Z-index edge case when minimizing/restoring panes
- [ ] Window focus can desync after rapid open/close
- [ ] Toast overlap in rare multi-notification scenarios

### Tech / Cleanup
- [ ] Remove leftover debug logs
- [ ] Normalize Gun listeners cleanup
- [ ] Verify ref usage in all Gun callbacks
