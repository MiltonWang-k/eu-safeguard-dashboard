# EU Safeguard Dashboard

A lightweight, static dashboard for tracking EU steel safeguard quota allocations by product category, quarter, country, and quota pool.

Designed for commercial analysis and strategic planning, this tool helps users review scheduled quotas and complex regulatory structures. **Note:** It does *not* provide real-time quota balances or customs-clearance confirmations.

## 🚀 Features

- **Dynamic Filtering:** Filter by Product Category, Quarter, and Country / Quota pool. Options dynamically update to show only valid entries for the selected parameters.
- **Allocation Overview:** Review current-quarter and next-quarter allocation totals, including Top 5 allocations by quarter.
- **Smart Sorting:** Sort detailed allocation records by product, quarter, country, allocation volume, YoY change, duty rate, or order number.
- **Detail Cards:** Open country-level drawer panels containing:
  - Country name and flag
  - Product category & Quarter
  - Allocated quota
  - Year-on-year (YoY) change (where comparable prior-year data exists)
  - Additional duty rate & Order number
  - Contextual notes (where applicable)
- **Seamless UX:** Retains selected countries when changing products or quarters, provided the country remains eligible.
- **Fully Responsive:** Optimized layout for both desktop and mobile browsing with built-in Light and Dark themes.

## 🎯 Scope & Limitations

This dashboard focuses strictly on **scheduled safeguard quota allocations** and regulatory reference information. 

**It does NOT show:**
- Live quota exhaustion or remaining port balances
- Customs declaration statuses
- Shipment-specific eligibility
- Legal advice or binding customs interpretations

*Important:* Country-specific quotas, additional access, residual access, and quota-pool entries should be interpreted separately. They are not interchangeable and should not be assumed as automatically cumulative.

## 📁 Project Structure

```text
.
├── index.html     # Dashboard page structure
├── styles.css     # Desktop and mobile styling (Light/Dark mode)
├── app.js         # Filtering, sorting, rendering, and drawer logic
└── data.json      # Dashboard dataset
