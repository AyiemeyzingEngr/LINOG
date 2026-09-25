# hk_delete.sh v1: LInOG felix housekeeping executor, 25 September 2026 (record section 11.16).
# Deletes the files that a dry run listed in LISTDIR/delete.tsv, one at a time, each re-checked just before.
# Usage:  CONFIRM=YES bash hk_delete.sh LISTDIR MD5 OUTDIR WATCHDIR
#   LISTDIR   the dry-run folder inside /home/arieln/linog_hk (roots.txt, delete.tsv, keep_stat.tsv, md5sums.txt ...)
#   MD5       md5 of LISTDIR/md5sums.txt as reviewed; it binds this run to the six list files
#   OUTDIR    a new folder inside /home/arieln/linog_hk for this run's records; it must not exist
#   WATCHDIR  a folder that must read the same before and after (md5 of every file): the delivery package
# Without CONFIRM=YES every check runs and nothing is deleted (exit 3). A refusal exits 2 before any
# deletion; a stop, or a failed check after deletion, exits 1; a clean run exits 0.
export LC_ALL=C; set -u; umask 077
U=arieln; K=/home/arieln/linog_hk; P=/eggraid/home/arieln/projects/linog/insar; BIG=8388608
MADE=; OUT=
now(){ date -u +%FT%TZ; }
st(){ if [ -n "$MADE" ]; then printf '%s %s\n' "$(now)" "$*" >> "$OUT/STATUS"; fi; }
refuse(){ echo "REFUSED: $*. Nothing was deleted."; st "REFUSED $*"; exit 2; }
gib(){ gawk -v x="$1" 'BEGIN{ printf "%.3f", x/1073741824 }'; }
echo "== hk_delete.sh $(now) $(hostname) as $(id -un), pid $$, CONFIRM=${CONFIRM:-(not set)}"
[ "$(hostname)" = felix ] || refuse "host is $(hostname), not felix"
[ "$(id -un)" = "$U" ] || refuse "user is $(id -un), not $U"
[ "$(id -u)" != 0 ] || refuse "running as root"
[ $# = 4 ] || refuse "wrong arguments; usage: CONFIRM=YES bash hk_delete.sh LISTDIR MD5 OUTDIR WATCHDIR"
L=$1; MD=$2; W=$4; C=${CONFIRM:-}
for c in gawk find md5sum flock readlink unlink comm sort df xargs; do command -v "$c" >/dev/null || refuse "$c not found"; done
bad='(^|/)\.\.?(/|$)|//|/$'
for a in "$L" "$3" "$W"; do
  case "$a" in /*) ;; *) refuse "$a is not an absolute path" ;; esac
  if [[ $a =~ $bad ]]; then refuse "$a has a . or .. part, a // or a trailing /"; fi
done
case "$L" in "$K"/*) ;; *) refuse "LISTDIR must be inside $K" ;; esac
case "$3" in "$K"/*) ;; *) refuse "OUTDIR must be inside $K" ;; esac
if [ -L "$L" ]; then refuse "LISTDIR is a link"; fi
[ -d "$L" ] || refuse "LISTDIR $L is not a folder"
if [ -L "$W" ]; then refuse "WATCHDIR is a link"; fi
[ -d "$W" ] || refuse "WATCHDIR $W is not a folder"
[[ $MD =~ ^[0-9a-f]{32}$ ]] || refuse "the md5 argument is not 32 hex characters"
if [ -e "$3" ] || [ -L "$3" ]; then refuse "OUTDIR $3 already exists"; fi
[ -d "$K" ] && [ -w "$K" ] || refuse "$K is not a writable folder"
exec 9>>"$K/.hk_delete.lock"
flock -n 9 || refuse "another hk_delete.sh is running (lock $K/.hk_delete.lock)"
mkdir "$3" || refuse "cannot create OUTDIR $3"
OUT=$3; MADE=1; st "START pid $$ list $L confirm ${C:-none}"
X=${BASH_SOURCE[0]}
echo "   executor $X, md5 $(md5sum < "$X" | cut -c1-32); records in $OUT"

# 1. the lists are the reviewed ones
m=$(md5sum < "$L/md5sums.txt" 2>/dev/null | cut -c1-32)
[ "$m" = "$MD" ] || refuse "md5sums.txt has md5 ${m:-none}, expected $MD"
[ "$(cut -c35- "$L/md5sums.txt" | tr '\n' ' ')" = "roots.txt starts.txt delete.tsv excluded.tsv keep_stat.tsv round2.tsv " ] || refuse "md5sums.txt does not name the six files of a dry run"
( cd "$L" && md5sum --quiet -c md5sums.txt ) || refuse "a list file differs from md5sums.txt"
echo "   list $L: md5sums.txt md5 $m as given; the six files match it"

# 2. the run folders: only old-run folders of the approved shapes, real folders, no links
re1='^/eggraid/home/arieln/projects/linog/insar/old_runs/[^/]+/[^/]+(/[^/]+)*$'
re2='^/eggraid/home/arieln/projects/linog/insar/p44[0-9]/_f[0-9]{4}_frozen_[0-9]{8}T[0-9]{6}Z$'
re3='^/eggraid/home/arieln/projects/linog/insar/p44[0-9]/f[0-9]{4}/_n53_contaminated_[0-9]{8}T[0-9]{4,6}Z$'
re4='^/home/arieln/linog_hk/HK3_[0-9]{8}T[0-9]{6}Z/t[0-9]{2}/tree/run[A-Z]$'
RR=(); nr=0
while IFS= read -r r; do
  nr=$((nr+1)); RR+=("$r")
  case "$r" in "$P/old_runs/LInOG_InSAR_Processing"|"$P/old_runs/LInOG_InSAR_Processing/"*) refuse "run folder $nr is the git clone" ;; esac
  if [[ $r =~ $bad ]]; then refuse "run folder $nr has a . or .. part or a //: $r"; fi
  if [[ $r =~ $re1 || $r =~ $re2 || $r =~ $re3 || $r =~ $re4 ]]; then :; else refuse "run folder $nr is not an allowed old-run folder: $r"; fi
  if [ -L "$r" ]; then refuse "run folder $nr is a link: $r"; fi
  [ -d "$r" ] || refuse "run folder $nr is not a folder: $r"
  rr=$(readlink -e -- "$r")
  [ "$rr" = "$r" ] || refuse "run folder $nr resolves to ${rr:-nothing}: $r"
done < "$L/roots.txt"
[ "$nr" -ge 1 ] || refuse "roots.txt is empty"
[ -z "$(sort "$L/roots.txt" | uniq -d)" ] || refuse "roots.txt names a folder twice"
echo "   run folders: $nr, each an allowed old-run folder, a real folder, not a link"

# 3. every row of delete.tsv obeys the round-1 rule on its own
V='function isrec(f){ return (f ~ /\.log(\.v?[0-9]+)?$|\.(out|err)$|^status|\.(cfg|template|sh|py|xml|vrt|hdr|rsc|json|txt|csv|md|yaml|yml|ini|png|jpg|jpeg|pdf|kmz|kml|gif|html)$|^data\.(dat|dir|bak)$/) }
function prot(c,  lc){ lc=tolower(c); return (lc ~ /^mintpy/ || lc ~ /^igrams/ || lc ~ /^interferogram/ || c ~ /^LInOG_Upload_/ || lc ~ /deliver/ || c=="_xfer" || lc ~ /^geom_(reference|master)/ || c=="logs" || c=="run_files" || c=="configs") }
BEGIN{ FS="\t"; split("SLC raw_fbs_unpacked unzipped coregSLC offsets merged _prepad",t," "); for(i in t) D7[t[i]]=1 }
ARGIND==1 { NRT++; R[NRT]=$0; next }
{ n++; b=""; ri=$2+0; k=$5
  if(NF!=9) b="not 9 fields"
  else if($1!="seven" && $1!="geometry") b="group is not seven or geometry"
  else if(($2 ~ /^[0-9]+$/)==0 || ri<1 || ri>NRT) b="run number"
  else if(($3 ~ /^[0-9]+$/)==0 || $3+0<BIG) b="size under 8 MiB"
  else if(($4 ~ /^[0-9]+$/)==0) b="allocated bytes"
  else if(($5 ~ /^[0-9]+:[0-9]+$/)==0) b="device:inode"
  else if(($6 ~ /^[1-9][0-9]*$/)==0) b="links"
  else if(($7 ~ /^[0-9]+(\.[0-9]+)?$/)==0) b="mtime"
  else if($8!=U) b="owner is not " U
  else if($9 ~ /[[:cntrl:]]/ || $9 ~ /(^|\/)\.\.?(\/|$)/ || index($9,"//")>0 || $9 ~ /\/$/ || substr($9,1,1)!="/") b="path form"
  else if(index($9, R[ri] "/")!=1) b="path not inside run folder " ri
  else { rel=substr($9, length(R[ri])+2); m=split(rel,C,"/"); ln=tolower(C[m])
    if(m<2 || (C[1] in D7)==0) b="not inside one of the seven folders"
    else if($1=="geometry" && (m<3 || C[1]!="merged" || (tolower(C[2]) ~ /^geom_reference/)==0)) b="geometry row outside merged/geom_reference"
    else if($1=="seven" && m>=3 && C[1]=="merged" && tolower(C[2]) ~ /^geom_reference/) b="merged/geom_reference row not in group geometry"
    else { for(j=2;j<m;j++){ if(j==2 && $1=="geometry") continue; if(prot(C[j])){ b="protected folder " C[j]; break } }
      if(b=="" && ln ~ /\.(h5|he5|hdf5)$/) b="HDF5 file"
      if(b=="" && isrec(ln)) b="record file" } }
  if(b=="" && ($9 in SEEN)) b="path listed twice"
  if(b=="" && (k in SZ) && (SZ[k]!=$3 || MT[k]!=$7 || NL[k]!=$6)) b="rows of one inode disagree"
  if(b!=""){ nb++; if(nb<=5) printf "   row %d outside the rule (%s): %s\n", FNR, b, $0; next }
  SEEN[$9]=1; CN[k]++; NL[k]=$6; SZ[k]=$3; MT[k]=$7; AB[k]=$4; if($1=="geometry") ng++ }
END{ for(k in CN){ u++; tot+=AB[k]; if(CN[k]!=NL[k]+0){ nb++; if(nb<=5) print "   inode " k ": " CN[k] " rows but " NL[k] " links (a link outside the list)" } }
  printf "   delete.tsv: %d rows (%d in merged/geom_reference), %d files by inode, %.3f GiB allocated; rows outside the rule %d\n", n, ng, u, tot/1073741824, nb
  exit (nb>0) ? 1 : 0 }'
gawk -v U="$U" -v BIG="$BIG" "$V" "$L/roots.txt" "$L/delete.tsv" > "$OUT/check_rows.txt"; rv=$?
cat "$OUT/check_rows.txt"
[ "$rv" = 0 ] || refuse "delete.tsv has rows outside the round-1 rule"
NL=$(wc -l < "$L/delete.tsv")

# 4. the run folders are as the dry run left them: every listed file and every kept entry
WK='BEGIN{ FS="\t" }
ARGIND==1 { next }
ARGIND==2 { DS[$9]=$3; DK[$9]=$5; DN[$9]=$6; DM[$9]=$7; DO[$9]=$8; q=$9; sub(/\/[^\/]*$/,"",q); PAR[q]=1; nd++; next }
ARGIND==3 { if(NF>=3) EX[$3]=1; next }
ARGIND==4 { split($0,f,"\t"); KR[f[5]]=$0; KT[f[5]]=f[1]; KI[f[5]]=f[3]; nk++; next }
ARGIND==5 { DD[$10]=1; next }
$1=="z" { nz++; next }
$1=="g" { ng++; next }
$1=="e" && NF>=9 { nl=$2; ow=$3; y=$4; row=$4; for(i=5;i<=NF;i++) row=row "\t" $i; p=$8
  if(p in DS){ SD[p]=1
    if(MODE=="pre"){ if(y!="f" || $5!=DS[p] || $6!=DK[p] || nl!=DN[p] || $7!=DM[p] || ow!=DO[p]){ dc++; if(dc<=5) print "   listed file differs from the dry run: " p " (now " y ", " $5 " B, " $6 ", " nl " links, " $7 ", " ow ")" } else dok++ }
    else { sp++; if(sp<=5) print "   listed file still present: " p }
    next }
  if(p in EX){ xs++; next }
  if(p in KR){ SK[p]=1
    if(row==KR[p]) ks++
    else if(MODE=="post" && y=="d" && KT[p]=="d" && $6==KI[p] && (p in PAR)) dm++
    else { kc++; if(kc<=5) print "   kept entry differs from the dry run: " p }
    next }
  nw++; if(nw<=5) print "   entry not in the dry run: " p; next }
{ er++; if(er<=5) print "   error or unparsed line: " $0 }
END{ for(p in KR) if((p in SK)==0){ mk++; if(mk<=5) print "   kept entry missing: " p }
  for(p in DS) if((p in SD)==0){ if(MODE=="pre"){ md++; if(md<=5) print "   listed file missing: " p } else { gn++; if((p in DD)==0){ vn++; if(vn<=5) print "   listed file gone without a done row: " p } } }
  if(MODE=="post") for(p in DD) if((p in DS)==0){ vn++; if(vn<=5) print "   done row not in the list: " p }
  if(MODE=="pre"){
    printf "   walk: listed files present and as in the dry run %d of %d; kept entries as in the dry run %d of %d\n", dok, nd, ks, nk
    printf "   differences: listed files changed %d, listed files missing %d, kept entries changed %d, kept entries missing %d, entries not in the dry run %d, error lines %d\n", dc, md, kc, mk, nw, er
    bad=dc+md+kc+mk+nw+er }
  else {
    printf "   walk: listed files gone %d of %d, still present %d; kept entries as in the dry run %d of %d, plus %d folders whose time changed because a file in them was deleted\n", gn, nd, sp, ks, nk, dm
    printf "   differences: kept entries changed %d, kept entries missing %d, entries not in the dry run %d, gone without a done row %d, error lines %d\n", kc, mk, nw, vn, er
    bad=sp+kc+mk+nw+vn+er }
  printf "   also seen: excluded files %d; names with a control character (not entered) %d; git folders (not entered) %d\n", xs, nz, ng
  exit (bad>0) ? 1 : 0 }'
nio="nice -n 19"; command -v ionice >/dev/null && nio="$nio ionice -c2 -n7"
walk(){ $nio find "${RR[@]}" -xdev \( -name '*[[:cntrl:]]*' -printf 'z\t%h\n' -prune \) -o \( -type d -name .git -printf 'g\t%p\n' -prune \) \
  -o \( -type d -printf 'e\t%n\t%u\td\t0\t%D:%i\t%T@\t%p\t\n' \) -o \( -printf 'e\t%n\t%u\t%y\t%s\t%D:%i\t%T@\t%p\t%l\n' \) 2>&1; }
walk | gawk -v MODE=pre "$WK" "$L/roots.txt" "$L/delete.tsv" "$L/excluded.tsv" "$L/keep_stat.tsv" /dev/null - > "$OUT/check_pre.txt"; rw=${PIPESTATUS[1]}
cat "$OUT/check_pre.txt"
[ "$rw" = 0 ] || refuse "the run folders differ from the dry run"

# 5. no listed file is open in a process of this user
nopen=$(find /proc/[0-9]*/fd -type l -printf '%l\n' 2>/dev/null | sort -u | comm -12 - <(cut -f9 "$L/delete.tsv" | sort -u) | wc -l)
echo "   listed files held open by a process of $U: $nopen"
[ "$nopen" = 0 ] || refuse "$nopen listed files are open in a process of $U"

# 6. every folder holding a listed file is writable and resolves to itself
nd=0; nw=0; nx=0
while IFS= read -r d; do
  nd=$((nd+1))
  if [ -w "$d" ]; then :; else nw=$((nw+1)); [ "$nw" -le 5 ] && echo "   folder not writable by $U: $d"; fi
  if [ "$(readlink -e -- "$d")" = "$d" ]; then :; else nx=$((nx+1)); [ "$nx" -le 5 ] && echo "   folder resolves elsewhere: $d"; fi
done < <(cut -f9 "$L/delete.tsv" | sed 's#/[^/]*$##' | sort -u)
echo "   folders holding listed files: $nd; not writable $nw; resolving elsewhere $nx"
[ "$nw" = 0 ] && [ "$nx" = 0 ] || refuse "a folder holding a listed file is not writable or resolves elsewhere"

# 7. the watch folder and the disk, before
wsum(){ ( cd "$W" && find . -xdev -type f -print0 | sort -z | xargs -0 -r md5sum ); }
wsum > "$OUT/watch_before.md5"
echo "   watch folder $W: $(wc -l < "$OUT/watch_before.md5") files, md5 of their md5 list $(md5sum < "$OUT/watch_before.md5" | cut -c1-32)"
dfu(){ df -B1 --output=used,avail "${RR[0]}" | tail -n 1 | tr -s ' ' | sed 's/^ //'; }
d0=$(dfu); echo "   df on the run folders' filesystem, used and free (B): $d0"

if [ "$C" != YES ]; then
  st "CHECKED nothing deleted"
  echo "CHECKED: every check passed; CONFIRM is not YES, so nothing was deleted."; exit 3
fi

# 8. delete, one file at a time; each re-checked just before
st "DELETE START $NL rows"
echo "-- deleting $NL files one at a time; each is re-checked just before (type, size, inode, links, mtime, owner, folder)"
: > "$OUT/done.tsv"
t0=$(date +%s)
MAIN=$$
hb(){ while sleep 120; do kill -0 "$MAIN" 2>/dev/null || exit 0; echo "   [$(( $(date +%s) - t0 )) s] still deleting: $(wc -l < "$OUT/done.tsv") done"; done; }
hb 9>&- 2>/dev/null & HB=$!; disown $HB 2>/dev/null
trap 'pkill -P $HB 2>/dev/null; kill $HB 2>/dev/null' EXIT
STOP=; trap 'STOP=signal' TERM INT
declare -A GONE
nd=0; fb=0; why=
while IFS=$'\t' read -r g r s b k n m o p <&3; do
  if [ -n "$STOP" ]; then why="stopped by a signal"; break; fi
  e=$(( n - ${GONE[$k]:-0} ))
  cur=$(find "$p" -maxdepth 0 -printf '%y\t%s\t%D:%i\t%n\t%T@\t%u' 2>/dev/null)
  want=$(printf 'f\t%s\t%s\t%s\t%s\t%s' "$s" "$k" "$e" "$m" "$o")
  if [ "$cur" != "$want" ]; then why="changed since the check: $p (now: ${cur:-missing})"; break; fi
  dd=${p%/*}
  if [ "$(readlink -e -- "$dd")" != "$dd" ]; then why="folder resolves elsewhere: $dd"; break; fi
  if unlink -- "$p"; then :; else why="unlink failed: $p"; break; fi
  if [ -e "$p" ] || [ -L "$p" ]; then why="still present after unlink: $p"; break; fi
  GONE[$k]=$(( ${GONE[$k]:-0} + 1 )); if [ "${GONE[$k]}" = "$n" ]; then fb=$((fb + b)); fi
  printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' "$(now)" "$g" "$r" "$s" "$b" "$k" "$n" "$m" "$o" "$p" >> "$OUT/done.tsv"
  nd=$((nd+1)); if [ $((nd % 100)) = 0 ]; then echo "   [$(( $(date +%s) - t0 )) s] deleted $nd of $NL, $(gib "$fb") GiB"; fi
done 3< "$L/delete.tsv"
trap - TERM INT
pkill -P $HB 2>/dev/null; kill $HB 2>/dev/null
if [ -n "$why" ]; then printf '%s\t%s\n' "$(now)" "$why" >> "$OUT/failed.tsv"; st "STOP after $nd: $why"; echo "   STOP: $why"; fi
echo "   [$(( $(date +%s) - t0 )) s] deleted $nd of $NL files; allocated bytes of files with every link gone: $fb ($(gib "$fb") GiB)"
st "DELETE END deleted $nd of $NL"

# 9. after: the walk again, the watch folder, the disk
echo "-- after"
walk | gawk -v MODE=post "$WK" "$L/roots.txt" "$L/delete.tsv" "$L/excluded.tsv" "$L/keep_stat.tsv" "$OUT/done.tsv" - > "$OUT/check_post.txt"; rp=${PIPESTATUS[1]}
cat "$OUT/check_post.txt"
wsum > "$OUT/watch_after.md5"
if cmp -s "$OUT/watch_before.md5" "$OUT/watch_after.md5"; then wok=same; else wok=DIFFERENT; fi
echo "   watch folder: $(wc -l < "$OUT/watch_after.md5") files; their md5 list is $wok as before"
d1=$(dfu); u0=${d0%% *}; u1=${d1%% *}
echo "   df used and free (B): before $d0, after $d1; used fell by $(gib $((u0 - u1))) GiB"
echo "   done.tsv: $(wc -l < "$OUT/done.tsv") rows, md5 $(md5sum < "$OUT/done.tsv" | cut -c1-32)"
if [ -z "$why" ] && [ "$rp" = 0 ] && [ "$wok" = same ] && [ "$nd" = "$NL" ]; then
  st "DONE deleted $nd of $NL"
  echo "DONE: deleted $nd of $NL files, $(gib "$fb") GiB; checks after: pass."; exit 0
fi
st "STOPPED deleted $nd of $NL"
echo "STOPPED: deleted $nd of $NL files; checks after: see above; $OUT/failed.tsv holds the reason if one was recorded."; exit 1
