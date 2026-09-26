# felix housekeeping, round 2 (26 September 2026)

LInOG project (NIGS, UP Diliman; DOST-PCIEERD). Server felix, account `arieln`, filesystems `/eggraid` and `/home`. Round 1 is in `../2026-09-25_round1/`.

Round 2 deleted regenerable bulk files from 40 folders that round 1 had left for review: raw data unpacked from zips, SLCs and other derived stacks in old, failed, frozen and backup runs, and the folder `/home/arieln/448`, which held copies of 24 zips from the raw archive. The DEM files in these folders were kept, and the raw archive `/eggraid/data` was not touched: its full listing was the same before and after.

## The rule

A file was deleted only if it was a regular file of 8 MiB or more, owned by `arieln`, inside one of the 40 folders, with no protected folder in its path (`mintpy*`, `Igrams*`, `interferogram*`, `LInOG_Upload_*`, `*deliver*`, `_xfer`, `geom_reference*`, `geom_master*`, `logs`, `run_files`, `configs`, `DEM`), not named as a DEM (`dem` as a word, `demLat*`, `*.hgt*`), not HDF5 and not a record file (`.log`, `.xml`, `.vrt`, `.txt`, `.cfg`, `.json` and similar); and

- a zip only if the raw archive held a byte-identical copy (both read in full in the dry run; the archive copy read again just before the deletion);
- a CEOS file named after an ALOS granule only if the raw archive held that granule's zip at the same product level;
- anything else (SLCs, downsampled raw and the like) because it can be made again from the archive.

Every link of a listed file had to be on the list, and the run would have stopped if any symbolic link outside the 40 folders pointed at a listed file (35,597 links searched in `/eggraid` and `/home`; none did).

## What was deleted

`$P` = `/eggraid/home/arieln/projects/linog/insar`. GiB = 2^30 B, allocated, each file counted once. The DEM columns are the files kept.

| # | folder | deleted GiB | files | DEM files kept | DEM GiB |
|--:|:--|--:|--:|--:|--:|
| 1 | `$P/old_runs/448/0290_AllStack/DEM` | 0.000 | 0 | 1 | 0.290 |
| 2 | `$P/old_runs/448/0290_AllStack/unzipped` | 31.037 | 60 | 0 | 0.000 |
| 3 | `$P/old_runs/448/0290_FBD/DEM` | 0.000 | 0 | 2 | 0.435 |
| 4 | `$P/old_runs/448/0290_FBD/removed_FBS_data` | 15.210 | 12 | 0 | 0.000 |
| 5 | `$P/old_runs/448/0290_FBD_v2/DEM` | 0.000 | 0 | 2 | 0.435 |
| 6 | `$P/old_runs/448/0290_FBD_v2/removed_FBS_data` | 15.210 | 12 | 0 | 0.000 |
| 7 | `$P/old_runs/448/0290_FBS/DEM` | 0.000 | 0 | 2 | 0.435 |
| 8 | `$P/old_runs/448/0290_FBS/removed_FBD_data` | 7.647 | 12 | 0 | 0.000 |
| 9 | `$P/old_runs/P448/f0280/DEM` | 0.000 | 0 | 2 | 0.435 |
| 10 | `$P/old_runs/P448/f0290/DEM` | 0.000 | 0 | 2 | 0.435 |
| 11 | `$P/old_runs/P448/f0290/removed_FBD_data` | 7.647 | 12 | 0 | 0.000 |
| 12 | `$P/old_runs/P448/f0290_combined/DEM` | 0.000 | 0 | 1 | 0.145 |
| 13 | `$P/old_runs/P448/f0290_combined/SLC_fbd` | 7.647 | 12 | 0 | 0.000 |
| 14 | `$P/old_runs/P448/f0290_combined/SLC_fbs` | 15.210 | 12 | 0 | 0.000 |
| 15 | `$P/old_runs/P448/f0290_combined/SLC_fbs_ds` | 7.605 | 12 | 0 | 0.000 |
| 16 | `$P/old_runs/P448/f0290_combined_v1_FAILED_20260414/DEM` | 0.000 | 0 | 3 | 0.543 |
| 17 | `$P/old_runs/P448/f0290_combined_v1_FAILED_20260414/SLC_temp` | 15.210 | 12 | 0 | 0.000 |
| 18 | `$P/old_runs/P448/f0290_combined_v1_FAILED_20260414/raw` | 31.037 | 60 | 0 | 0.000 |
| 19 | `$P/old_runs/P448/f0290_combined_v1_FAILED_20260414/raw_fbd` | 7.871 | 24 | 0 | 0.000 |
| 20 | `$P/old_runs/P448/f0290_combined_v1_FAILED_20260414/raw_fbs` | 15.434 | 24 | 0 | 0.000 |
| 21 | `$P/old_runs/P448/f0290_combined_v1_FAILED_20260414/raw_fbs_downsampled` | 7.605 | 12 | 0 | 0.000 |
| 22 | `$P/old_runs/P448/f0310/DEM` | 0.000 | 0 | 2 | 0.435 |
| 23 | `$P/old_runs/P448/f0320/DEM` | 0.000 | 0 | 2 | 0.435 |
| 24 | `$P/old_runs/p447/archive_f0300_old_runs/f0300_old_products_20260610_091917/DEM` | 0.000 | 0 | 1 | 0.145 |
| 25 | `$P/old_runs/p447/f0300/DEM` | 0.000 | 0 | 2 | 0.435 |
| 26 | `$P/old_runs/p447/f0300/qc` | 30.529 | 24 | 0 | 0.000 |
| 27 | `$P/old_runs/p447/f0310/DEM` | 0.000 | 0 | 1 | 0.145 |
| 28 | `$P/old_runs/p448/f0280/DEM` | 0.000 | 0 | 2 | 0.435 |
| 29 | `$P/old_runs/p448/f0290/DEM` | 0.000 | 0 | 2 | 0.435 |
| 30 | `$P/old_runs/p449/f0280/DEM` | 0.000 | 0 | 1 | 0.145 |
| 31 | `$P/old_runs/p449/f0290/DEM` | 0.000 | 0 | 1 | 0.145 |
| 32 | `$P/old_runs/p449/f0300/DEM` | 0.000 | 0 | 1 | 0.145 |
| 33 | `$P/old_runs/p449/f0310/DEM` | 0.000 | 0 | 1 | 0.145 |
| 34 | `$P/old_runs/p449/f0320/DEM` | 0.000 | 0 | 1 | 0.145 |
| 35 | `$P/p448/_f0290_frozen_20260828T080244Z/DEM` | 0.000 | 0 | 2 | 0.435 |
| 36 | `$P/p448/_f0290_frozen_20260828T080244Z/raw_fbd` | 15.603 | 36 | 0 | 0.000 |
| 37 | `$P/p448/_f0290_frozen_20260828T080244Z/raw_fbs` | 15.434 | 24 | 0 | 0.000 |
| 38 | `$P/p448/_f0290_frozen_20260828T080244Z/raw_fbs_downsampled` | 7.605 | 12 | 0 | 0.000 |
| 39 | `$P/p448/f0300/_revert_bak_20260828T112022Z/merged_SLC_20070921` | 3.850 | 3 | 0 | 0.000 |
| 40 | `/home/arieln/448` | 31.060 | 24 | 0 | 0.000 |
| | all 40 folders | 288.448 | 399 | 34 | 6.771 |

By kind (GiB, files): CEOS files named after a granule 116.417 (228); derived 140.971 (147); zips 31.060 (24).

## How it was done

1. **R2a, dry run** (25 Sept, 16:59:40Z to 17:03:37Z): walked the 40 folders and the raw archive as `arieln`; listed 433 files, 295.219 GiB; read the 24 zips in `/home/arieln/448` and their archive copies in full: all 24 identical. Nothing deleted.
2. **Ariel's decisions** (26 Sept): the DEM files stay (34 files, 6.771 GiB, taken off the list); `/home/arieln/448` goes; the raw archive is never touched.
3. **R2b1 and R2b2** (26 Sept, 00:31:34Z to 00:33:37Z): wrote the executor `hk_delete2.sh`; built the round-2 list (399 files, 288.448 GiB); ran 32 tests of the executor on a throwaway tree (32 passed); checked the real list with `CONFIRM=NO`. **R2b3** (00:56:45Z): the one link into a listed folder is a failed run's own alias (`data -> raw`). Nothing deleted.
4. **R2c** (01:07:25Z to 01:08:32Z): the executor with `CONFIRM=YES`. It repeated every check, deleted one file at a time, each re-checked just before (type, size, inode, links, mtime, owner, folder, and its archive copy or granule zip), then checked everything again.

## Result

| check | value |
|:--|:--|
| files deleted | 399 of 399, in 17 s |
| bytes freed (allocated) | 309,718,441,984 B (288.448 GiB) |
| `df` used | `/eggraid` fell by 276,367,994,880 B (257.388 GiB); `/home` by 33,350,238,208 B (31.060 GiB) |
| kept entries after | 3,939 of 4,159 unchanged; the other 220 are the folders that held deleted files (modification time only) |
| DEM files | 34 of 34 kept, unchanged |
| raw archive `/eggraid/data` | 856 entries; listing the same before and after |
| delivery package v1.2 | 241 files; md5 list the same before and after |
| `/eggraid` free | 1,942.6 GiB before, 2,200.0 GiB after (71.2 % to 67.4 % used) |
| `/home` free | 122.7 GiB before, 153.8 GiB after |

Rounds 1 and 2 together: 1,859 files and 1,766.423 GiB; `/eggraid` from 93.1 % to 67.4 % used.

## Files in this folder

- `dry_run/`: R2a's console output (`R2a_summary.txt`) and its `md5sums.txt`.
- `list/`: the list the executor ran on. `roots.txt` (the 40 folders), `delete.tsv` (399 rows), `protected.tsv` (the 34 DEM files kept), `excluded.tsv` (empty), `keep_stat.tsv.gz` (gzip of `keep_stat.tsv`: every kept entry with type, size, inode, mtime, path and link target), `archive_zips.tsv` (the raw archive's zips), `zip_md5.tsv` (each listed zip's md5 and its archive copy's), `md5sums.txt` (md5 of the uncompressed files).
- `checks/R2b2_summary.txt`: R2b2's console output (the 32 tests and the check of the real list).
- `deletion/`: R2c's records. `STATUS`, `done.tsv` (one row per deleted file, with its time), `check_rows.txt`, `check_pre.txt`, `check_links.txt`, `check_post.txt`, `archive_refs.tsv` (each listed zip's archive copy and each listed CEOS file's granule zip), `archive_listing.tsv.gz` (the raw archive's listing, the same before and after), `watch_before.md5` and `watch_after.md5` (the delivery package), `R2c_20260926T010725Z.log` (the executor's log).
- `hk_delete2.sh`: the executor, md5 `340cfdd07ae0122abae470fd2000afd5`.
- `MANIFEST.md5`: md5 of every file in this folder.

Row format of `delete.tsv` and `protected.tsv` (`done.tsv` adds the time in front): group (`r2`), folder number (line of `roots.txt`), size (B), allocated (B), device:inode, links, mtime (s since 1970), owner, path.

The link search's own records name other accounts' folders on felix, so they stay out of this repository, as does the full record (LInOG Project document `LINOG_FELIX_HK_RECORD_v1.0_20260925_draft`).
