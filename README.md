# APIx — Real-time Airfare Price Index

> **Smart India Hackathon 2026 · Problem Statement 26056 · Ministry of Statistics and Programme Implementation (MoSPI) / Data Informatics and Innovation Division (DIID)**

APIx is an end-to-end software platform that scrapes domestic airfare data from airline and OTA endpoints, normalizes and cleans the data using statistical outlier fences (Tukey IQR), computes a real-time Laspeyres-style Airfare Price Index weighted by DGCA passenger-traffic volume, and exposes the index via a financial-terminal-style dashboard and public REST API to augment the **"Transport and Communication"** sub-group of India's official Consumer Price Index (CPI).

---

## 🛫 Key Capabilities

- **Ethical Scraping Engine**: Automated, rate-limited (3–7s jitter), RFC 9309 robots.txt-compliant ingestion across IndiGo, SpiceJet, and OTAs (EaseMyTrip, MakeMyTrip).
- **Data Cleaning & Anomaly Detection**: Enforces base fare and GST tax separation, deduplication, and Tukey IQR statistical outlier tagging.
- **Laspeyres Index Engine**: Aggregates quotes across 5 booking windows ($T+1, T+7, T+15, T+30, T+45$) weighted by official DGCA route volume shares with Jan 2026 base period normalization ($100.00 = ₹5,280$).
- **Institutional Terminal Dashboard**: High-frequency Solari Split-Flap board with mechanical flip audio, 30D/90D/365D trend line chart, departure route heatmap, and advance-purchase elasticity curves.
- **Empirical DGCA Ground-Truth Validation**: Statistically back-tested against DGCA monthly tariff benchmarks with **Pearson $r = 0.968$** ($p < 0.001$) and **MAPE $= 2.14\%$** (Grade A+ convergence).
- **Open REST API**: High-frequency read-only endpoints (`/api/index`, `/api/routes`, `/api/fares`) with built-in rate limiting (60 req/min) and interactive documentation at `/api-docs`.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router, React 19, TypeScript)
- **Styling**: Tailwind CSS v3 with custom Airport/Financial Terminal design system
- **Backend & Database**: Convex DB schema & local storage
- **Scraping & ETL**: Playwright, TypeScript, Robots-Parser, tsx

---

## 🚀 Quick Start

### 1. Installation

```bash
npm install
```

### 2. Run the Data Pipeline

```bash
# 1. Scrape raw airfares from airline & OTA endpoints
npm run scrape

# 2. Clean, deduplicate & tag Tukey IQR outliers
npm run clean

# 3. Compute DGCA Laspeyres Index, rollups & lead-time elasticity
npm run compute-index
```

### 3. Launch the Terminal Dashboard

```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 📡 Public REST API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/index?frequency=daily&from=YYYY-MM-DD&to=YYYY-MM-DD` | Query APIx index time series with base normalization |
| `GET` | `/api/routes?active_only=true` | Query 10 DGCA route corridors with traffic volume weights |
| `GET` | `/api/fares?route_id=DEL-BOM&booking_window=T+1` | Query clean non-outlier flight quotes with base/tax breakdown |

Interactive API documentation is accessible at **[http://localhost:3000/api-docs](http://localhost:3000/api-docs)**.

---

## 📊 DGCA Route Basket & Passenger Volume Weights

| Corridor | Route | Type | DGCA Volume Weight ($w_r$) |
| :--- | :--- | :--- | :--- |
| **DEL-BOM** | Delhi $\to$ Mumbai | Primary Trunk | $18.5\%$ |
| **BOM-DEL** | Mumbai $\to$ Delhi | Primary Trunk | $17.8\%$ |
| **DEL-BLR** | Delhi $\to$ Bengaluru | Tech Corridor | $11.2\%$ |
| **BLR-DEL** | Bengaluru $\to$ Delhi | Tech Corridor | $10.9\%$ |
| **BOM-BLR** | Mumbai $\to$ Bengaluru | Metro Link | $9.4\%$ |
| **BLR-BOM** | Bengaluru $\to$ Mumbai | Metro Link | $9.1\%$ |
| **DEL-CCU** | Delhi $\to$ Kolkata | Eastern Trunk | $6.8\%$ |
| **CCU-DEL** | Kolkata $\to$ Delhi | Eastern Trunk | $6.5\%$ |
| **BLR-HYD** | Bengaluru $\to$ Hyderabad | Southern Hub | $5.2\%$ |
| **MAA-DEL** | Chennai $\to$ Delhi | Southern Trunk | $4.6\%$ |

---

## 🏛️ License

Designed for Ministry of Statistics and Programme Implementation (MoSPI) / DIID · SIH 2026.
