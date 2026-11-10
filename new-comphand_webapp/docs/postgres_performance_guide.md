# PostgreSQL Performance Mastery: Tuning and Optimization Strategies

This guide is designed for the Antigravity development team to ensure lean performance, optimal resource utilization, and high-quality query execution on Huawei RDS PostgreSQL. It focuses on the critical role of database statistics and query optimization.

## 1. The Role of Optimizer Statistics
In relational databases like PostgreSQL, the planner (or optimizer) relies heavily on statistics to determine the most efficient execution plan for a query [cite: 10, 11]. The planner acts as the "brain" of the database, calculating the cost of different access paths based on data distribution [cite: 11, 12]. 

### How Statistics are Gathered
* **ANALYZE Command:** Running the `ANALYZE` command calculates statistics for the entire database or specific tables [cite: 14, 17].
* **VACUUM ANALYZE:** The autovacuum daemon often runs `VACUUM ANALYZE` in the background to read data pages and update statistics automatically [cite: 18].
* **DDL Operations:** Statistics are automatically calculated during certain DDL operations, such as `CREATE INDEX` or `REINDEX` [cite: 20].

## 2. Key System Catalogs for Performance Monitoring
To understand what the query planner sees, developers should inspect the following system catalogs:

* **`pg_class`**: Contains entries for tables (relations) and indexes [cite: 21, 22]. It provides the estimated number of tuples (rows) and the number of 8KB data pages [cite: 22, 23]. *Note: For exact row counts, you must query the table directly or use extensions like `pgstattuple` [cite: 24, 25].*
* **`pg_stats`**: Provides deep column-level statistics [cite: 25, 26]. Important metrics include:
    * `null_frac`: The percentage of null values in the column [cite: 28].
    * `n_distinct`: The number of distinct values; a value of `-1` indicates that all values in the column are unique (e.g., a primary key) [cite: 28].
    * `most_common_values` & `frequencies`: Lists the most frequent data points and their occurrence percentage (from 0 to 1) [cite: 32, 33].
    * `correlation`: A value from 0 to 1 indicating how closely the logical ordering of values matches the physical row ordering on disk [cite: 39]. A value of 1 means they perfectly match [cite: 39].
* **`pg_stat_all_tables`**: Shows when a table was last analyzed manually (`last_analyze`) or by the autovacuum daemon (`last_autoanalyze`) [cite: 29, 30]. This is critical to verify if statistics are fresh [cite: 63, 64].

## 3. Tuning Strategies for Lean Performance

### Adjusting the Statistics Target
If the planner is choosing suboptimal execution plans due to skewed data, you may need to increase the sampling accuracy [cite: 37, 38]. 
* The parameter `default_statistics_target` defines the number of buckets used for data distribution histograms [cite: 34, 35].
* The default value is 100, but it can be adjusted from 1 to 10,000 [cite: 34, 35].
* Increasing this value forces the engine to read more data pages and take more samples, yielding more accurate statistics [cite: 36, 37].
* **Best Practice:** Do not change this globally unless necessary, as it increases `ANALYZE` time and catalog storage [cite: 43]. Instead, tune it at the column level for specific columns that require high accuracy [cite: 44].

### Extended Statistics for Correlated Columns
By default, the query planner assumes that columns are independent [cite: 57]. If your queries filter on correlated columns (e.g., "Country" and "City"), the planner may drastically underestimate the cardinality (number of returned rows), leading to poor plans like sequential scans [cite: 55, 56, 57, 60].
* **Solution:** Use extended statistics to instruct the database that two or more columns are correlated [cite: 57, 58].
* **Syntax:** `CREATE STATISTICS stats_name (dependencies, ndistinct, mcv) ON column1, column2 FROM table_name;` [cite: 58, 59].
* Once defined, run `ANALYZE` to calculate the extended stats, which can be verified in the `pg_statistic_ext` catalog [cite: 59, 61, 63].

## 4. Query Troubleshooting and Optimization Workflow

When investigating a performance bottleneck or memory spike, follow a structured tuning methodology [cite: 48, 69]:

1.  **Identify Top Queries:** Use extensions like `pg_stat_statements` to find queries with high execution counts, long average execution times, or high row retrieval [cite: 65, 66]. Monitoring tools like CloudWatch Database Insights or standard RDS monitoring expose these metrics [cite: 67, 68].
2.  **Monitor Memory:** Check the buffer cache hit ratio. A value greater than 90% to 95% is ideal, indicating that your working dataset fits in memory [cite: 69, 70]. Consistent drops suggest memory pressure or unoptimized queries flooding the cache [cite: 70, 71].
3.  **Analyze Execution Plans:** Use the `EXPLAIN ANALYZE` command to execute the query and compare estimated costs/rows against actual runtime metrics [cite: 53, 54].
    * *Warning:* `EXPLAIN ANALYZE` actually executes the query. For DML statements (INSERT/UPDATE/DELETE), wrap the command in a `BEGIN; ... ROLLBACK;` block to avoid modifying production data [cite: 54, 55].
4.  **Check Indexes:** Ensure the correct index types are used. While B-Tree is the default, consider BRIN indexes for naturally ordered/time-series data, or GIN indexes for full-text search [cite: 79, 80, 81].

## 5. Maintenance Best Practices for Antigravity

* **Post-Bulk Load Operations:** Always manually run `ANALYZE` on specific tables immediately after performing massive data loads to ensure the planner has up-to-date information [cite: 74, 75].
* **Automate Custom Analysis:** For highly active tables, monitor the number of inserts, updates, and deletes since the last analyze operation [cite: 77]. Consider building a custom job to trigger a manual `ANALYZE` during a maintenance window if the data change rate exceeds 5% to 10% of the total table rows [cite: 77, 78].
