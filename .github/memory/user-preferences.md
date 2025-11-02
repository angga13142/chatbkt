# User Communication Preferences

**Last Updated:** November 3, 2025

## Response Guidelines

### ❌ AVOID in Chat Responses:

1. Panjang lebar ringkasan
2. Dokumentasi yang tidak diminta
3. Penjelasan berlebihan
4. Summary blocks
5. Repeating what was done

### ✅ PREFERRED in Chat:

1. Respon singkat & to the point
2. Hanya informasi penting
3. Status update minimal
4. Konfirmasi selesai

### 💾 Save to Memory Instead:

- Semua detail implementasi
- Technical decisions
- Bug fixes & solutions
- Architecture changes
- Test results
- Commit history

## Example Good Response:

```
✅ Fitur inventory management selesai.
- 4 admin commands baru
- 8 tests passing (100%)
- Commits: 002a000, 9b823cf, 6b3785d

Memory updated: current-state.md
```

## Example Bad Response:

```
# Lengkap! Mari saya buat ringkasan...

## Yang Sudah Dibuat
[20 paragraf penjelasan panjang]

## Hasil Test
[Test output lengkap]

## Dokumentasi
[List semua file]
...
```

## Memory Auto-Save Strategy (CRITICAL)

**Problem:** VS Code crash / killed → memory lost

**Solution:** Save memory IMMEDIATELY after important action

### When to Save:
1. ✅ After feature completion
2. ✅ After bug fix
3. ✅ After commit
4. ✅ After test run
5. ✅ **BEFORE replying to user**

### Pattern:
```
Work → Save Memory → Commit Memory → Reply
```

**NOT:** `Work → Reply → Crash → Lost!`

### Files Priority:
1. `current-state.md` - CRITICAL (commits, status)
2. `critical-bugs-pitfalls.md` - HIGH (bugs)
3. `code-patterns.md` - MEDIUM (patterns)

### Commit Memory Separately:
```bash
git commit -m "memory: <what changed>"
```

## Action Items:

- ✅ Update memory files ALWAYS
- ✅ **Save memory BEFORE replying**
- ✅ **Commit memory separately**
- ✅ Keep chat responses SHORT
- ❌ NO documentation unless requested
- ❌ NO long summaries in chat
