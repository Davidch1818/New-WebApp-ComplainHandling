# BMAS Internal Web - Frontend Portal

This is the central Single Page Application (SPA) for the BMAS Internal Web. It serves as the unified dashboard for all internal services, allowing developers and operators to manage User Access, handle Customer Complaints, and run the Reconciliation Engines.

## 🏗️ Architecture

* **Framework:** React + Vite
* **Routing:** React Router (handling modular feature routes)
* **Styling:** Vanilla CSS (following custom design aesthetics without heavy CSS frameworks)
* **State & Fetching:** React standard practices (Hooks/Context)

## 📂 Project Structure

This frontend follows a feature-based architecture to maintain isolation between parallel development streams:

```text
src/
├── components/      # Shared, reusable UI elements (buttons, inputs, layout wrappers)
├── features/        # Isolated modules representing the different backend services
│   ├── uam/         # User Access Management UI
│   ├── comphand/    # Customer Complaints Handling UI
│   ├── reconcile/   # Reconciliation Engine UI (BiFast, PAC Jalin, PLN, Prima, QRIS, Telkom)
│   ├── lld/         # LLD Regulatory Reporting UI
│   └── payroll/     # Mass Payroll & M2M Clearing UI
├── assets/          # Static assets like images and fonts
└── App.jsx          # Main application entry point and router setup
```

## 🚀 Getting Started Locally

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Run the Development Server:**
   ```bash
   npm run dev
   ```

3. **Build for Production:**
   ```bash
   npm run build
   ```

## 🤝 Developer Rules

1. **No Cross-Feature Entanglement:** If you are building UI for the `reconcile` feature, do not import logic from `comphand` or `payroll`. Shared UI components must live in `src/components/`.
2. **Security & Data:** Be mindful of PII (Personally Identifiable Information) in the UI. Ensure any sensitive data from the backend is masked or handled according to the global security rules.

## 📚 Global Documentation

For full system architecture, database schemas, and backend service details, refer to the root documentation:
* [System Architecture](../docs/architecture.md)
* [Project Structure](../docs/project-structure.md)
* [Global README](../README.md)
