# hk_delete2.sh v2: LInOG felix housekeeping executor for round 2, 26 September 2026 (record section 11.24).
# Deletes the files a round-2 list names in LISTDIR/delete.tsv, one at a time, each re-checked just before.
# Usage:  CONFIRM=YES bash hk_delete2.sh LISTDIR MD5 OUTDIR WATCHDIR
#   LISTDIR   the round-2 list inside /home/arieln/linog_hk: roots.txt, delete.tsv, excluded.tsv, keep_stat.tsv,
#             archive_zips.tsv, zip_md5.tsv, protected.tsv, md5sums.txt
#   MD5       md5 of LISTDIR/md5sums.txt as reviewed; it binds this run to the seven list files
#   OUTDIR    a new folder inside /home/arieln/linog_hk for this run's records; it must not exist
#   WATCHDIR  a folder that must read the same before and after (md5 of every file): the delivery package
# The raw archive (/eggraid/data) is never touched: every zip on the list must have a byte-identical copy there, read
# again before any deletion; every CEOS file on the list must have its granule's zip there; the archive's listing
# (type, size, inode, mtime, path) must be the same after. DEM files and DEM folders are never deleted: a row naming
# one is refused, and every file in protected.tsv must be a kept entry, present and unchanged before and after.
# Symbolic links anywhere in /eggraid and /home that arieln can read are checked for pointing at a listed file.
# Exit: 2 refused before any deletion; 3 checked, nothing deleted (CONFIRM is not YES); 1 stopped or a check after failed; 0 done.
export LC_ALL=C; set -u; umask 077
U=arieln; K=/home/arieln/linog_hk; P=/eggraid/home/arieln/projects/linog/insar; BIG=8388608
MADE=; OUT=
now(){ date -u +%FT%TZ; }
st(){ if [ -n "$MADE" ]; then printf '%s %s\n' "$(now)" "$*" >> "$OUT/STATUS"; fi; }
refuse(){ echo "REFUSED: $*. Nothing was deleted."; st "REFUSED $*"; exit 2; }
gib(){ gawk -v x="$1" 'BEGIN{ printf "%.3f", x/1073741824 }'; }
echo "== hk_delete2.sh $(now) $(hostname) as $(id -un), pid $$, CONFIRM=${CONFIRM:-(not set)}"
[ "$(hostname)" = felix ] || refuse "host is $(hostname), not felix"
[ "$(id -un)" = "$U" ] || refuse "user is $(id -un), not $U"
[ "$(id -u)" != 0 ] || refuse "running as root"
[ $# = 4 ] || refuse "wrong arguments; usage: CONFIRM=YES bash hk_delete2.sh LISTDIR MD5 OUTDIR WATCHDIR"
L=$1; MD=$2; W=$4; C=${CONFIRM:-}
for c in gawk find md5sum flock readlink realpath unlink comm sort df xargs cmp; do command -v "$c" >/dev/null || refuse "$c not found"; done
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
flock -n 9 || refuse "another executor is running (lock $K/.hk_delete.lock)"
mkdir "$3" || refuse "cannot create OUTDIR $3"
OUT=$3; MADE=1; st "START pid $$ list $L confirm ${C:-none}"
X=${BASH_SOURCE[0]}
echo "   executor $X, md5 $(md5sum < "$X" | cut -c1-32); records in $OUT"
nio="nice -n 19"; command -v ionice >/dev/null && nio="$nio ionice -c2 -n7"

# 1. the list is the reviewed one
m=$(md5sum < "$L/md5sums.txt" 2>/dev/null | cut -c1-32)
[ "$m" = "$MD" ] || refuse "md5sums.txt has md5 ${m:-none}, expected $MD"
[ "$(cut -c35- "$L/md5sums.txt" | tr '\n' ' ')" = "roots.txt delete.tsv excluded.tsv keep_stat.tsv archive_zips.tsv zip_md5.tsv protected.tsv " ] || refuse "md5sums.txt does not name the seven files of a round-2 list"
( cd "$L" && md5sum --quiet -c md5sums.txt ) || refuse "a list file differs from md5sums.txt"
echo "   list $L: md5sums.txt md5 $m as given; the seven files match it"

# 2. the folders: round-2 shapes (or all test trees), real folders, not links, none inside another; the archive
TT='^/home/arieln/linog_hk/R2b_[0-9]{8}T[0-9]{6}Z/t[0-9]{2}/'
s1='^/home/arieln/448$'
s2='^/eggraid/home/arieln/projects/linog/insar/old_runs/[^/]+/[^/]+(/[^/]+)*$'
s3='^/eggraid/home/arieln/projects/linog/insar/p44[0-9]/_f[0-9]{4}_frozen_[0-9]{8}T[0-9]{6}Z/[^/]+$'
s4='^/eggraid/home/arieln/projects/linog/insar/p44[0-9]/f[0-9]{4}/_revert_bak_[0-9]{8}T[0-9]{6}Z/[^/]+$'
s5="${TT}tree/[^/]+(/[^/]+)?\$"
RR=(); nr=0; nt=0
while IFS= read -r r; do
  nr=$((nr+1)); RR+=("$r")
  case "$r" in "$P/old_runs/LInOG_InSAR_Processing"|"$P/old_runs/LInOG_InSAR_Processing/"*|*/.git|*/.git/*) refuse "folder $nr is the git clone or a .git folder: $r" ;; esac
  if [[ $r =~ $bad ]]; then refuse "folder $nr has a . or .. part or a //: $r"; fi
  if [[ $r =~ $s5 ]]; then nt=$((nt+1)); elif [[ $r =~ $s1 || $r =~ $s2 || $r =~ $s3 || $r =~ $s4 ]]; then :; else refuse "folder $nr is not an allowed round-2 folder: $r"; fi
  if [ -L "$r" ]; then refuse "folder $nr is a link: $r"; fi
  [ -d "$r" ] || refuse "folder $nr is not a folder: $r"
  rr=$(readlink -e -- "$r")
  [ "$rr" = "$r" ] || refuse "folder $nr resolves to ${rr:-nothing}: $r"
done < "$L/roots.txt"
[ "$nr" -ge 1 ] || refuse "roots.txt is empty"
[ "$nt" = 0 ] || [ "$nt" = "$nr" ] || refuse "roots.txt mixes test folders and real folders"
nest=$(gawk '{ R[NR]=$0 } END { for(i=1;i<=NR;i++) for(j=1;j<=NR;j++) if(i<j && (R[i]==R[j] || index(R[j], R[i] "/")==1 || index(R[i], R[j] "/")==1)) { print R[i] " and " R[j]; exit } }' "$L/roots.txt")
[ -z "$nest" ] || refuse "folders equal or one inside another: $nest"
if [ "$nt" = 0 ]; then AR=/eggraid/data; SCAN=(/eggraid /home)
else TB=${RR[0]%%/tree/*}; AR=$TB/archive; SCAN=("$TB")
  for r in "${RR[@]}"; do case "$r" in "$TB/tree/"*) ;; *) refuse "test folders of two test trees" ;; esac; done; fi
if [ -L "$AR" ]; then refuse "the archive $AR is a link"; fi
[ -d "$AR" ] && [ "$(readlink -e -- "$AR")" = "$AR" ] || refuse "the archive $AR is not a real folder"
for r in "${RR[@]}"; do case "$AR/" in "$r"/*) refuse "the archive is inside folder $r" ;; esac; case "$r/" in "$AR"/*) refuse "folder $r is inside the archive" ;; esac; done
echo "   folders: $nr, each an allowed round-2 folder$([ "$nt" = 0 ] || echo ' (test trees)'), a real folder, not a link, none inside another; archive $AR"

# 3. every row of delete.tsv obeys the round-2 rule on its own
V='function isrec(f){ return (f ~ /\.log(\.v?[0-9]+)?$|\.(out|err)$|^status|\.(cfg|template|sh|py|xml|vrt|hdr|rsc|json|txt|csv|md|yaml|yml|ini|png|jpg|jpeg|pdf|kmz|kml|gif|html)$|^data\.(dat|dir|bak)$/) }
function key(s){ return match(s,/ALPSRP[0-9]{9}(-H1\.[015])?/) ? substr(s,RSTART,RLENGTH) : "" }
function protc(c,  lc){ lc=tolower(c); return (lc ~ /^mintpy/ || lc ~ /^igrams/ || lc ~ /^interferogram/ || c ~ /^LInOG_Upload_/ || lc ~ /deliver/ || c=="_xfer" || lc ~ /^geom_(reference|master)/ || c=="logs" || c=="run_files" || c=="configs" || lc ~ /(^|[_.-])dem($|[_.-])/) }
function demf(n,  ln){ ln=tolower(n); return (ln ~ /(^|[_.-])dem($|[_.-])/ || ln ~ /^demlat/ || ln ~ /\.hgt($|\.)/) }
BEGIN{ FS="\t" }
ARGIND==1 { NRT++; R[NRT]=$0; next }
ARGIND==2 { if(NF!=3 || index($3, AR "/")!=1){ za++; next } ZP[$3]=$2; k=key($1); if(k!=""){ ZK[k]=$3; if((substr(k,1,15) in ZK)==0) ZK[substr(k,1,15)]=$3 }; next }
ARGIND==3 { if(NF!=4){ zb++; next } ZA[$2]=$1; ZC[$2]=$3; ZT[$2]=$4; next }
{ n++; b=""; ri=$2+0; k=$5
  if(NF!=9) b="not 9 fields"
  else if($1!="r2") b="group is not r2"
  else if(($2 ~ /^[0-9]+$/)==0 || ri<1 || ri>NRT) b="folder number"
  else if(($3 ~ /^[0-9]+$/)==0 || $3+0<BIG) b="size under 8 MiB"
  else if(($4 ~ /^[0-9]+$/)==0) b="allocated bytes"
  else if(($5 ~ /^[0-9]+:[0-9]+$/)==0) b="device:inode"
  else if(($6 ~ /^[1-9][0-9]*$/)==0) b="links"
  else if(($7 ~ /^[0-9]+(\.[0-9]+)?$/)==0) b="mtime"
  else if($8!=U) b="owner is not " U
  else if($9 ~ /[[:cntrl:]]/ || $9 ~ /(^|\/)\.\.?(\/|$)/ || index($9,"//")>0 || $9 ~ /\/$/ || substr($9,1,1)!="/") b="path form"
  else if(index($9, R[ri] "/")!=1) b="path not inside folder " ri
  else if(index($9, AR "/")==1) b="path inside the archive"
  else { m=split($9,C,"/"); nm=C[m]; ln=tolower(nm); rel=substr($9,length(R[ri])+2)
    for(j=1;j<m;j++) if(protc(C[j])){ b="protected folder " C[j]; break }
    if(b=="" && demf(nm)) b="DEM file"
    if(b=="" && ln ~ /\.(h5|he5|hdf5)$/) b="HDF5 file"
    if(b=="" && isrec(ln)) b="record file"
    if(b=="" && ln ~ /\.zip$/){
      if(($9 in ZA)==0) b="zip without a zip_md5 row"
      else if((ZA[$9] ~ /^[0-9a-f]{32}$/)==0 || ZA[$9]!=ZC[$9]) b="zip not md5-identical to its archive copy"
      else if(index(ZT[$9], AR "/")!=1) b="zip copy not in the archive"
      else if((ZT[$9] in ZP)==0 || ZP[ZT[$9]]!=$3) b="zip copy not in archive_zips.tsv with the same size"
      else { for(i=1;i<=NRT;i++) if(index(ZT[$9], R[i] "/")==1) b="zip copy inside a listed folder"
        if(b==""){ nz++; REF[n]=$9 "\tzip\t" ZT[$9] "\t" ZA[$9] } } }
    else if(b==""){ kk=key(nm); if(kk=="") kk=key(rel)
      if(kk!=""){ if((kk in ZK)==0) b="granule without a zip in archive_zips.tsv"; else { nce++; REF[n]=$9 "\tceos\t" ZK[kk] "\t-" } }
      else nde++ } }
  if(b=="" && ($9 in SEEN)) b="path listed twice"
  if(b=="" && (k in SZ) && (SZ[k]!=$3 || MT[k]!=$7 || NL[k]!=$6)) b="rows of one inode disagree"
  if(b!=""){ nb++; if(nb<=5) printf "   row %d outside the rule (%s): %s\n", FNR, b, $0; next }
  SEEN[$9]=1; CN[k]++; NL[k]=$6; SZ[k]=$3; MT[k]=$7; AB[k]=$4; if(n in REF) print REF[n] > (OUT "/archive_refs.tsv") }
END{ for(k in CN){ u++; tot+=AB[k]; if(CN[k]!=NL[k]+0){ nb++; if(nb<=5) print "   inode " k ": " CN[k] " rows but " NL[k] " links (a link outside the list)" } }
  if(za+zb>0){ nb++; print "   archive_zips.tsv or zip_md5.tsv has " za+zb " rows of the wrong form or outside the archive" }
  printf "   delete.tsv: %d rows (%d zips, %d CEOS files named after a granule, %d derived), %d files by inode, %.3f GiB allocated; rows outside the rule %d\n", n, nz, nce, nde, u, tot/1073741824, nb
  exit (nb>0) ? 1 : 0 }'
: > "$OUT/archive_refs.tsv"
gawk -v U="$U" -v BIG="$BIG" -v AR="$AR" -v OUT="$OUT" "$V" "$L/roots.txt" "$L/archive_zips.tsv" "$L/zip_md5.tsv" "$L/delete.tsv" > "$OUT/check_rows.txt"; rv=$?
cat "$OUT/check_rows.txt"
[ "$rv" = 0 ] || refuse "delete.tsv has rows outside the round-2 rule"
NL=$(wc -l < "$L/delete.tsv")
[ "$NL" -ge 1 ] || refuse "delete.tsv is empty"

# 4. the folders are as the dry run left them: every listed file and every kept entry
WK='BEGIN{ FS="\t" }
ARGIND==1 { next }
ARGIND==2 { DS[$9]=$3; DK[$9]=$5; DN[$9]=$6; DM[$9]=$7; DO[$9]=$8; q=$9; sub(/\/[^\/]*$/,"",q); PAR[q]=1; nd++; next }
ARGIND==3 { if(NF>=4) EX[$4]=1; next }
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
walk(){ $nio find "${RR[@]}" -xdev \( -name '*[[:cntrl:]]*' -printf 'z\t%h\n' -prune \) -o \( -type d -name .git -printf 'g\t%p\n' -prune \) \
  -o \( -type d -printf 'e\t%n\t%u\td\t0\t%D:%i\t%T@\t%p\t\n' \) -o \( -printf 'e\t%n\t%u\t%y\t%s\t%D:%i\t%T@\t%p\t%l\n' \) 2>&1; }
walk | gawk -v MODE=pre "$WK" "$L/roots.txt" "$L/delete.tsv" "$L/excluded.tsv" "$L/keep_stat.tsv" /dev/null - > "$OUT/check_pre.txt"; rw=${PIPESTATUS[1]}
cat "$OUT/check_pre.txt"
[ "$rw" = 0 ] || refuse "the folders differ from the dry run"
pk=$(gawk -F'\t' 'ARGIND==1 { K[$5]=$1 "\t" $2 "\t" $3 "\t" $4; next } ARGIND==2 { D[$9]=1; next } { n++; if(($9 in K) && K[$9]==("f\t" $3 "\t" $5 "\t" $7) && ($9 in D)==0) ok++ } END{ printf "%d %d", n, ok }' "$L/keep_stat.tsv" "$L/delete.tsv" "$L/protected.tsv")
echo "   DEM files kept by the list (protected.tsv): ${pk% *}; each a kept entry with the same size, inode and mtime, present and unchanged in the walk above, and not on delete.tsv: ${pk#* }"
[ "${pk% *}" = "${pk#* }" ] || refuse "protected.tsv names a file that is not a kept entry of the dry run"

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

# 7. symbolic links that point at a listed file: none may sit outside the listed folders
echo "   links: looking in ${SCAN[*]} for symbolic links that point at a listed file"
$nio find "${SCAN[@]}" -xdev -type l -print0 2> "$OUT/links_find_errors.txt" > "$OUT/links.bin"
xargs -0 -r realpath -mz -- < "$OUT/links.bin" > "$OUT/links_targets.bin" 2>> "$OUT/links_find_errors.txt"
LK='BEGINFILE{ RS=(FILENAME ~ /\.bin$/) ? "\0" : "\n"; FS="\t" }
ARGIND==1 { NRT++; R[NRT]=$0; next }
ARGIND==2 { D[$9]=1; q=$9; r=R[$2+0]; while(sub(/\/[^\/]*$/,"",q) && length(q)>=length(r)) PD[q]=1; next }
ARGIND==3 { LN[++nl]=$0; next }
ARGIND==4 { TG[++nt]=$0; next }
END{ if(nl!=nt){ print "   links: " nl " links but " nt " resolved targets"; exit 1 }
  for(i=1;i<=nl;i++){ t=TG[i]; ins=0; for(j=1;j<=NRT;j++) if(index(LN[i], R[j] "/")==1) ins=1
    if(t in D){ if(ins){ ni++; print LN[i] "\t" t > (OUT "/links_inside.tsv") } else { no++; if(no<=10) print "   link outside the listed folders to a listed file: " LN[i] " -> " t; print LN[i] "\t" t > (OUT "/links_outside.tsv") } }
    else if(t in PD) nf++ }
  printf "   links: %d found; to a listed file from outside the listed folders %d; from inside them %d (these dangle after deletion); to a folder that holds listed files %d (they stay valid)\n", nl, no+0, ni+0, nf+0
  exit (no>0) ? 1 : 0 }'
gawk -v OUT="$OUT" "$LK" "$L/roots.txt" "$L/delete.tsv" "$OUT/links.bin" "$OUT/links_targets.bin" > "$OUT/check_links.txt"; rl=$?
cat "$OUT/check_links.txt"
echo "   folders the link search could not read: $(grep -c . "$OUT/links_find_errors.txt")"
[ "$rl" = 0 ] || refuse "a symbolic link outside the listed folders points at a listed file (links_outside.tsv)"

# 8. the archive copies: each zip's copy read again (md5), each CEOS file's granule zip present
declare -A TWM; nzr=0; nzb=0; ncz=0
: > "$OUT/archive_stat.tsv"
while IFS=$'\t' read -r p kind z want <&4; do
  s=$(find "$z" -maxdepth 0 -type f -printf '%s\t%D:%i\t%T@' 2>/dev/null)
  [ -n "$s" ] || refuse "the archive file $z is missing or not a regular file"
  if [ "$kind" = zip ]; then
    if [ -z "${TWM[$z]+x}" ]; then TWM[$z]=$($nio md5sum < "$z" | cut -c1-32); nzr=$((nzr+1)); nzb=$((nzb + ${s%%$'\t'*})); fi
    [ "${TWM[$z]}" = "$want" ] || refuse "the archive copy $z has md5 ${TWM[$z]:-none}; the list says $want"
  else ncz=$((ncz+1)); fi
  printf '%s\t%s\t%s\n' "$p" "$z" "$s" >> "$OUT/archive_stat.tsv"
done 4< "$OUT/archive_refs.tsv"
echo "   archive copies of the listed zips read again: $nzr files, $(gib "$nzb") GiB, each md5 as the list says; listed CEOS files whose granule zip is in the archive: $ncz"

# 9. the archive listing, the watch folder and the disk, before
alist(){ $nio find "$AR" -xdev -printf '%y\t%s\t%D:%i\t%T@\t%p\t%l\n' 2>&1 | sort; }
alist > "$OUT/archive_before.tsv"
echo "   archive $AR: $(wc -l < "$OUT/archive_before.tsv") entries, md5 of the listing $(md5sum < "$OUT/archive_before.tsv" | cut -c1-32)"
wsum(){ ( cd "$W" && find . -xdev -type f -print0 | sort -z | xargs -0 -r md5sum ); }
wsum > "$OUT/watch_before.md5"
echo "   watch folder $W: $(wc -l < "$OUT/watch_before.md5") files, md5 of their md5 list $(md5sum < "$OUT/watch_before.md5" | cut -c1-32)"
FSL=$(for r in "${RR[@]}"; do df -P "$r" | tail -n 1 | awk '{ print $NF }'; done | sort -u | tr '\n' ' ')
dfu(){ for f in $FSL; do printf '%s %s; ' "$f" "$(df -B1 --output=used,avail "$f" | tail -n 1 | tr -s ' ' | sed 's/^ //')"; done; }
d0=$(dfu); echo "   df used and free (B) on the folders' filesystems: $d0"

if [ "$C" != YES ]; then
  st "CHECKED nothing deleted"
  echo "CHECKED: every check passed; CONFIRM is not YES, so nothing was deleted."; exit 3
fi

# 10. delete, one file at a time; each re-checked just before, and its archive copy or granule zip with it
declare -A AZ AS
while IFS=$'\t' read -r p z s1 s2 s3; do AZ[$p]=$z; AS[$p]="$s1"$'\t'"$s2"$'\t'"$s3"; done < "$OUT/archive_stat.tsv"
st "DELETE START $NL rows"
echo "-- deleting $NL files one at a time; each is re-checked just before (type, size, inode, links, mtime, owner, folder; the archive copy or granule zip unchanged)"
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
  if [ -n "${AZ[$p]+x}" ]; then z=${AZ[$p]}; zs=$(find "$z" -maxdepth 0 -type f -printf '%s\t%D:%i\t%T@' 2>/dev/null)
    if [ "$zs" != "${AS[$p]}" ]; then why="archive file changed or missing: $z (for $p)"; break; fi; fi
  if unlink -- "$p"; then :; else why="unlink failed: $p"; break; fi
  if [ -e "$p" ] || [ -L "$p" ]; then why="still present after unlink: $p"; break; fi
  GONE[$k]=$(( ${GONE[$k]:-0} + 1 )); if [ "${GONE[$k]}" = "$n" ]; then fb=$((fb + b)); fi
  printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' "$(now)" "$g" "$r" "$s" "$b" "$k" "$n" "$m" "$o" "$p" >> "$OUT/done.tsv"
  nd=$((nd+1)); if [ $((nd % 50)) = 0 ]; then echo "   [$(( $(date +%s) - t0 )) s] deleted $nd of $NL, $(gib "$fb") GiB"; fi
done 3< "$L/delete.tsv"
trap - TERM INT
pkill -P $HB 2>/dev/null; kill $HB 2>/dev/null
if [ -n "$why" ]; then printf '%s\t%s\n' "$(now)" "$why" >> "$OUT/failed.tsv"; st "STOP after $nd: $why"; echo "   STOP: $why"; fi
echo "   [$(( $(date +%s) - t0 )) s] deleted $nd of $NL files; allocated bytes of files with every link gone: $fb ($(gib "$fb") GiB)"
st "DELETE END deleted $nd of $NL"

# 11. after: the walk again, the archive listing, the watch folder, the disk
echo "-- after"
walk | gawk -v MODE=post "$WK" "$L/roots.txt" "$L/delete.tsv" "$L/excluded.tsv" "$L/keep_stat.tsv" "$OUT/done.tsv" - > "$OUT/check_post.txt"; rp=${PIPESTATUS[1]}
cat "$OUT/check_post.txt"
alist > "$OUT/archive_after.tsv"
if cmp -s "$OUT/archive_before.tsv" "$OUT/archive_after.tsv"; then aok=same; else aok=DIFFERENT; fi
echo "   archive $AR: $(wc -l < "$OUT/archive_after.tsv") entries; the listing (type, size, inode, mtime, path) is $aok as before"
wsum > "$OUT/watch_after.md5"
if cmp -s "$OUT/watch_before.md5" "$OUT/watch_after.md5"; then wok=same; else wok=DIFFERENT; fi
echo "   watch folder: $(wc -l < "$OUT/watch_after.md5") files; their md5 list is $wok as before"
d1=$(dfu); echo "   df used and free (B): before $d0 after $d1"
echo "   done.tsv: $(wc -l < "$OUT/done.tsv") rows, md5 $(md5sum < "$OUT/done.tsv" | cut -c1-32)"
if [ -z "$why" ] && [ "$rp" = 0 ] && [ "$aok" = same ] && [ "$wok" = same ] && [ "$nd" = "$NL" ]; then
  st "DONE deleted $nd of $NL"
  echo "DONE: deleted $nd of $NL files, $(gib "$fb") GiB; checks after: pass."; exit 0
fi
st "STOPPED deleted $nd of $NL"
echo "STOPPED: deleted $nd of $NL files; checks after: see above; $OUT/failed.tsv holds the reason if one was recorded."; exit 1
