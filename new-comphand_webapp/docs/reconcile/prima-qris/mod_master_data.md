> **CHANGELOG**
> - Abstracted legacy framework and language specifics to focus on system behaviour.
> - Verified data contracts and documented hidden logic/edge cases found during Clean Room audit (e.g., regex cleansing, decimal normalisation).

# Module: Prima QRIS Master Data Management
> **Sub-program**: Rekon Prima QRIS  
> **Module ID**: `prima-qris-master-data`  
> **Owner Component**: `Reconciliation UI Controller` (CRUD UI), `Reconciliation Backend Service` (CRUD service)  
> **Entities**: `MstMCode`, `MstMCodeQRIS`, `MstBiayaPrima`, `MstBiayaBillerPrima`, `MstPrima`, `MstDD/DD2/DDMJT`, `KodeTransaksi`, `Rekening`

---

## 1. Module Overview

This module manages all reference/master data tables required by the reconciliation engine for fee calculation, merchant identification, and transaction classification. It provides full **CRUD** (Create, Read, Update, Delete) operations for 9 distinct master entities across multiple screens.

This is the only module that modifies reference data; all other modules consume it read-only.

### Master Data Categories

| Category | Entity | Purpose |
|---|---|---|
| **Prima Merchant Codes** | `MstMCode` | Map Prima merchant codes → fee schedules |
| **Prima Biller Merchant Codes** | `MstMCode` (Biller variant) | Biller-specific merchant mapping |
| **QRIS Merchant Codes** | `MstMCodeQRIS` | QRIS merchant → 3 fee types (base, issuer, acquirer) |
| **Prima Fee Schedule** | `MstBiayaPrima` | Fee configuration per Prima category |
| **Biller Fee Schedule** | `MstBiayaBillerPrima` | Fee + PPN + Prima share per biller |
| **Prima Merchants** | `MstPrima` | Merchant master (name, code, status) |
| **DD Merchants** | `MstDD`, `MstDD2`, `MstDDMJT` | Direct Debit merchant masters (3 variants) |
| **Transaction Codes** | `KodeTransaksi` | Transaction type classification |
| **Accounts** | `Rekening` | Account number master |

### Scope Boundaries
- **IN scope**: CRUD UI screens, search/filter, service CRUD calls, fee lookup queries.
- **OUT of scope**: File ingestion, matching logic, reporting, outstanding management, journals.

---

## 2. Local Functional Flows & Scenarios

### 2.1 Merchant Code CRUD (Generic Pattern)

All merchant code entities follow the same flow:

1. Admin opens master data screen.
2. Optionally filters by `merchantid` and/or `merchantname`.
3. Views list in grid.
4. **Add**: Fills form → `addMstMCode*()` → INSERT.
5. **Edit**: Selects row → modifies → `editMstMCode*()` → UPDATE.
6. **Delete**: Selects row → confirms → `deleteMstMCode*()` → DELETE.

### 2.2 QRIS Merchant Code (Special: 3 Fee Types)

QRIS merchant codes carry three fee fields:
- `fee` (base fee) → retrieved by `getFeeQRIS(merchantname)`
- `feeIssuer` → retrieved by `getFeeQRISIssuer(merchantname)`
- `feeAcquirer` → retrieved by `getFeeQRISAcquirer(merchantname)`

### 2.3 Biller Fee Master (Special: 3 Fee Components)

Biller fees have three components:
- `getFeeBiller(billercode)` → base fee
- `getPpnBiller(billercode)` → PPN tax
- `getFeePrmBiller(billercode)` → Prima's fee share

### 2.4 Fee Existence Check

`getCountMcode(mcode)` returns count of matching fee records. Used to validate fee master exists before reconciliation.
`getCountBiayaBiller(mcode)` — same for biller fee table.

### 2.5 Scenarios

#### Scenario A — Add QRIS Merchant Code
1. Admin opens QRIS MCode screen.
2. Fills: merchant code, name, base fee, issuer fee, acquirer fee.
3. Clicks Add → `addMstMCodeQRIS()`.
4. Fee later used by `getFeeQRISIssuer()` during QRIS matching.

#### Scenario B — Edit Prima Fee Schedule
1. Admin selects existing `MstBiayaPrima` record.
2. Updates fee amount.
3. `editMstBiayaPrima()` persists change.
4. Next reconciliation run uses updated fee.

#### Scenario C — Delete DD Merchant
1. Admin selects `MstDD` record.
2. Confirms delete → `deleteMstDD()`.
3. Record removed from DB.

---

## 3. Local Technical Flows & Data Life Cycle

### 3.1 All CRUD Methods

**Prima MCode:**
- `getListMstCodePrima2(merchantid, merchantname)` — search
- `addMstMCodePrima(item)`, `editMstMCodePrima(item)`, `deleteMstMCodePrima(item)`
- `getFeeCorePrima(mcode)` — fee lookup

**Biller MCode:**
- `getListMstCodePrimaBiller(merchantid, merchantname)` — search
- `addMstMCodePrimaBiller(item)`, `editMstMCodePrimaBiller(item)`, `deleteMstMCodePrimaBiller(item)`
- `getFeeCorePrimaBiller(mcode)` — fee lookup

**QRIS MCode:**
- `getListMstCodePrimaQRIS(merchantid, merchantname)` — search
- `addMstMCodePrimaQRIS(item)`, `editMstMCodePrimaQRIS(item)`, `deleteMstMCodePrimaQRIS(item)`
- `getFeeCorePrimaQRIS(mcode)`, `getFeeQRIS()`, `getFeeQRISIssuer()`, `getFeeQRISAcquirer()`

**QRIS Merchant Master:**
- `getListMstMCodeQRIS(merchantcode, merchantname)` — search
- `addMstMCodeQRIS(item)`, `editMstMCodeQRIS(item)`, `deleteMstMCodeQRIS(item)`

**Prima Fee:**
- `getListMstBiaya()`, `getBiayaPrima(kode)` — list/search
- `editMstBiayaPrima(item)` — update

**Biller Fee:**
- `getListMstBiayaBiller(billercode, billername)` — search
- `addMstBiayaBillerPrima(item)`, `editMstBiayaBillerPrima(item)`, `deleteMstBiayaBillerPrima(item)`

**Prima Merchant:**
- `getListMstPrima(kode)`, `getListMstPrimaAll()` — search/list
- `addMstPrima(item)`, `editMstPrima(item)`, `deleteMstPrima(item)`

**DD Merchant (3 variants):**
- `MstDD`: `getListMstDD()`, `addMstDD()`, `editMstDD()`, `deleteMstDD()`
- `MstDD2`: `getListMstDD2()`, `getListMstDD3(kode)`, `addMstDD2()`, `editMstDD2()`, `deleteMstDD2()`
- `MstDDMJT`: `getListMstDD4(kodetransaksi)`, `getListMstDD4QRIS(kodetransaksi)`, `addMstDD3()`, `addMstDD3QRIS()`, `editMstDD3()`, `editMstDD3QRIS()`, `deleteMstDD3()`, `deleteMstDD3QRIS()`

**Transaction Codes:**
- `getListKodeTransaksi(kodetransaksi)` — search
- `addMstKodeTransaksi(item)`, `editMstKodeTransaksi(item)`, `deleteMstKodeTransaksi(item)`

**Accounts:**
- `getListRekening(rekening)` — search
- `addMstRekening(item)`, `editMstRekening(item)`, `deleteMstRekening(item)`

---

## 4. Interface & Dependencies

### 4.1 Inbound Dependencies

| Source | Data / Trigger | Description |
|---|---|---|
| **Admin User** | CRUD operations via UI | Create, edit, delete master records |
| **Portal System** | `sessionId`, `username` | Auth for access control |

### 4.2 Outbound Dependencies

| Target | Data / Trigger | Description |
|---|---|---|
| **Reconciliation Engine Module** | Fee lookup: `getFeeCoreP*()`, `getFeeBiller()`, `getFeeQRIS*()`, `getRoundFee()` | Engine queries master data during matching for fee computation |
| **Reporting & Export Module** | Merchant name/code enrichment | Reports may display merchant names from master tables |
| **Database** | All CRUD operations | Direct INSERT/UPDATE/DELETE on master tables |
