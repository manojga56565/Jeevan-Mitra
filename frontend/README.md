# Jeevan Mitra — Frontend

Single-file vanilla HTML/CSS/JS frontend (no build step). Covers Donor,
Hospital, and Admin portals in one app, with bilingual (English/Telugu)
labels on donor and hospital screens.

## Running it

Just open `index.html` in a browser, or serve the folder with any static
file server:

```bash
npx serve .
```

It talks to the backend via the `API` constant near the top of the
`<script>` block — point that at wherever the backend from the paired
`jeevan-mitra-backend.zip` is running (e.g. `http://localhost:5000/api`).
