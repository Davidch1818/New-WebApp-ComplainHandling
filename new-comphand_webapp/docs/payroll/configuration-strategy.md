# Configuration Externalization Strategy

To decouple the business data from the compiled code and avoid needing to recompile and deploy for every new partner code or GL change, all hardcoded mappings and static strings should be moved to an external configuration file. 

Below is the proposed YAML structure (also saved as `payroll-config.yml`) that should be loaded on application startup or dynamically injected via a configuration server (like Spring Cloud Config or a Kubernetes ConfigMap).

```yaml
application:
  file-processing:
    allowed-content-types:
      - "application/vnd.ms-excel"
      - "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  
  payroll:
    # Mode 0 (Payroll) Configuration
    group-mode:
      header-prefix: "0PAYGROUP"
      transaction-narrative: "Pembayaran gaji bulanan"
      currency-code: "IDR"
      column-widths:
        noref: 20
        nama: 40
        norekening: 19
        nominal: 21
    
    # Mode 1 (M2M) Configuration
    m2m-mode:
      header-prefix: "0UPLM2MPAYMINUS"
      header-description: "MANY TO MANY"
      gl-mappings:
        AXA: "2130070000000005000"
        614: "2130070000000009000"
        1002: "2130070000000004000"
        QRIS: "5020190200000001000"
        K4P: "4021990200101003000"
        5009: "2130070000000005000"
        PRIM: "5020190200000001000"
        JALI: "4021990200201003000"
        2001: "9991011053"
        MDR1: "4020070109900014000"
        MDR2: "5020190200000001000"
        SIRQ: "5020190200000002000"
        WITH: "5030999900000999000"
        WAIV: "4021990100000001000"
        LLG1: "5020190200000001000"
        RTGS: "5020190200000001000"
        EQUI: "2130070000000005000"
        LOSS: "5020130000000004000"
        2RDM: "5020190200000001000"
        BPCR: "5011990400000001000"
```

### Benefits of this strategy:
1. **Zero-Downtime Updates:** Business Owners (BO) request new GL account mappings frequently (as noted in the comments e.g., `davidch 03-02-26 add request dr BO`). By using a configuration file, these mappings can be added without a new code release cycle.
2. **Standardization:** Padding logic and file structure schemas can be driven by a generic text-generation utility that reads the `column-widths` properties, eliminating "spaghetti string concatenation".
