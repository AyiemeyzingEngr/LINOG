# felix housekeeping, round 1 (25 September 2026)

LInOG project (NIGS, UP Diliman; DOST-PCIEERD). Server felix, filesystem `/eggraid`, account `arieln`.

Round 1 deleted regenerable bulk files from Ariel's 20 old, failed and test InSAR runs. Each run keeps its MintPy and Igrams folders, logs, `run_files`, `configs`, metadata, multilooked geometry, DEM folder and raw links, so every run stays documented. The 12 delivered frames and the v1.2 delivery package were not touched.

## The rule

Deleted: regular files of 8 MiB or more inside `SLC/`, `raw_fbs_unpacked/`, `unzipped/`, `coregSLC/`, `offsets/`, `merged/` and `_prepad/` directly under each run folder, including the full-resolution `merged/geom_reference*/`.

Never deleted: anything under `mintpy*`, `Igrams*`, `interferogram*`, deliverable folders, other `geom_reference`/`geom_master`, `logs`, `run_files`, `configs`; HDF5 files; record files (`.log`, `.xml`, `.vrt`, `.txt`, `.cfg`, `.json` and similar); links; files under 8 MiB.

## What was deleted

`$P` = `/eggraid/home/arieln/projects/linog/insar`. GiB = 2^30 B.

| # | run folder | what it was | deleted GiB | files | kept GiB |
|--:|:--|:--|--:|--:|--:|
| 1 | `$P/old_runs/448/0290_AllStack/archive_previous_run` | first stack, all 24 dates (Dec 2025 to Jan 2026) | 85.064 | 123 | 18.127 |
| 2 | `$P/old_runs/448/0290_FBD` | FBD-only stack (Jan 2026) | 39.905 | 64 | 16.533 |
| 3 | `$P/old_runs/448/0290_FBS` | FBS-only stack (Jan to Apr 2026) | 73.945 | 59 | 9.223 |
| 4 | `$P/old_runs/P448/f0290` | copy of 0290_FBS with more MintPy work | 73.945 | 59 | 11.700 |
| 5 | `$P/old_runs/448/0290_FBD_v2` | copy of 0290_FBD (Feb 2026) | 39.905 | 64 | 17.039 |
| 6 | `$P/old_runs/P448/f0280` | single-mode p448 f0280 (Mar to Jun 2026) | 88.480 | 81 | 2.092 |
| 7 | `$P/old_runs/P448/f0320` | single-mode p448 f0320 (Mar 2026) | 94.550 | 87 | 1.583 |
| 8 | `$P/old_runs/P448/f0310` | single-mode p448 f0310 (Mar 2026) | 94.550 | 87 | 1.599 |
| 9 | `$P/old_runs/P448/f0290_combined_v1_FAILED_20260414` | first combined FBS+FBD try, failed, no MintPy (Apr 2026) | 139.920 | 123 | 86.651 |
| 10 | `$P/old_runs/P448/f0290_combined` | second combined try, stopped before MintPy (Apr 2026) | 77.888 | 123 | 37.379 |
| 11 | `$P/p448/_f0290_frozen_20260828T080244Z` | combined run through MintPy, frozen 28 Aug 2026 when f0290 was rebuilt | 96.102 | 89 | 87.132 |
| 12 | `$P/old_runs/p447/archive_f0300_old_runs/f0300_old_products_20260610_091917` | June 2026 batch, archived p447 f0300 products | 95.984 | 88 | 1.358 |
| 13 | `$P/old_runs/p447/f0310` | June 2026 batch | 99.834 | 91 | 1.387 |
| 14 | `$P/old_runs/p448/f0280` | June 2026 batch, stopped before MintPy | 74.315 | 60 | 1.162 |
| 15 | `$P/old_runs/p448/f0290` | June 2026 batch, stopped before MintPy | 88.266 | 81 | 1.193 |
| 16 | `$P/old_runs/p447/f0300` | June 2026 batch with QC reruns | 95.984 | 88 | 35.974 |
| 17 | `$P/p449/f0320/_n53_contaminated_20260829T151808Z` | coregistration outputs hit by the N53 range shift; frame rebuilt | 88.541 | 69 | 0.268 |
| 18 | `$P/p449/f0300/_n53_contaminated_20260830T092741Z` | same, p449 f0300 | 3.850 | 3 | 0.002 |
| 19 | `$P/p449/f0310/_n53_contaminated_20260830T0500Z` | same, p449 f0310 | 7.699 | 6 | 0.002 |
| 20 | `$P/p449/f0280/_n53_contaminated_20260831T030339Z` | same, p449 f0280 | 19.248 | 15 | 0.003 |
| | all 20 runs | | 1,477.975 | 1,460 | 330.407 |

By folder (GiB): `offsets` 497.858; `coregSLC` 278.443; `merged/SLC` 247.637; `SLC` 231.195; `unzipped` 106.394; `merged/geom_reference` 101.238; `raw_fbs_unpacked` 15.210.

By file type (GiB, files): `.slc` 772.484 (727); `.off` 497.858 (456); CEOS `IMG-` 105.438 (82); `.rdr` 101.238 (113); CEOS `LED-` 0.956 (82).

## How it was done

1. **HK2b, dry run** (25 Sept, 13:53:51Z to 13:53:53Z): walked the 20 run folders as `arieln` and wrote the list (`delete.tsv`), the stat of every kept entry (`keep_stat.tsv`) and `md5sums.txt`. Nothing deleted.
2. **HK3** (14:52:01Z to 14:52:12Z): wrote the executor `hk_delete.sh` (mode 600), ran 23 tests of it on a throwaway tree (23 passed), and checked the real list with `CONFIRM=NO`. Nothing deleted in the runs.
3. **HK4** (15:09:16Z to 15:10:26Z): a pre-flight check (the 164 CEOS files on the list name 70 granules; all 70 have their zip, same product level, in the raw archive `/eggraid/data/alos`), then the executor with `CONFIRM=YES`. Before deleting it re-checked the list's md5, every row against the rule, and every listed and kept entry against the dry run. It deleted one file at a time, each re-checked just before (type, size, inode, links, mtime, owner, folder), and checked everything again after.

## Result

| check | value |
|:--|:--|
| files deleted | 1,460 of 1,460, in 64 s |
| bytes freed (allocated) | 1,586,963,648,512 B (1,477.975 GiB) |
| `df` used, change | fell by 1,586,963,648,512 B, the listed bytes exactly |
| kept entries after | 74,366 of 75,419 unchanged; the other 1,053 are the folders that held deleted files (modification time only) |
| delivery package v1.2 | 241 files; md5 list identical before and after |
| `/eggraid` free | 464.7 GiB before, 1,942.6 GiB after |
| `/eggraid` used | 93.1 % before, 71.2 % after |

## Files in this folder

- `dry_run/`: HK2b's lists. `roots.txt` (the 20 run folders), `starts.txt`, `delete.tsv` (the list), `excluded.tsv` (empty), `keep_stat.tsv.gz` (gzip of `keep_stat.tsv`: every kept entry with type, size, inode, mtime, path and link target), `round2.tsv` (candidates for round 2, not deleted in round 1), `md5sums.txt` (md5 of the uncompressed files), `summary.txt` (HK2b's console output).
- `deletion/`: HK4's records. `STATUS`, `done.tsv` (one row per deleted file, with its time), `check_rows.txt`, `check_pre.txt`, `check_post.txt`, `watch_before.md5` and `watch_after.md5` (the delivery package), `HK4_20260925T150916Z.log` (the console log).
- `hk_delete.sh`: the executor, md5 `be572dcddf7b82b6abbbd600b0c027a8`.
- `MANIFEST.md5`: md5 of every file in this folder.

Row format of `delete.tsv` (`done.tsv` adds the time in front): group (`seven` or `geometry`), run number (line of `roots.txt`), size (B), allocated (B), device:inode, links, mtime (s since 1970), owner, path.

The full record, with every block and output, is the LInOG Project document `LINOG_FELIX_HK_RECORD_v1.0_20260925_draft`. It stays out of this repository because it also covers other accounts on felix.
