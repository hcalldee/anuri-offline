# Iruna Turn-Based CLI

Prototype awal game turn-based berbasis CLI. Data save dan konten map disimpan sebagai JSON agar mudah ditambah bertahap.

## Menjalankan

```powershell
npm run check
npm start
```

Command di dalam game:

- `new <nama>` membuat player baru
- `status` melihat status player
- `stat <nama> <jumlah>` mengalokasikan point ke `str`, `agi`, `vit`, `int`, `dex`, atau `crt`
- `clear` membersihkan layar dan menampilkan menu ulang
- `map` melihat semua map episode 1 sampai Rokoko City
- `move <map-id>` berpindah ke map yang terhubung
- `explore` masuk ke encounter map aktif
- `battle` memulai pertarungan dengan monster lokal
- `scrape-quests` mengambil quest dari map prototype ke `data/quests.json`; gunakan `scrape-quests all` untuk seluruh map
- `quests` melihat status data quest lokal
- `wiki <path>` mengambil halaman Iruna Wiki, contoh `wiki monster/goblin`
- `help` dan `quit`

Map prototype mengikuti tree map episode 1 dari Fort Bailune sampai Rokoko City. Data quest legacy memakai endpoint JSON `/api/mapsearch/all` dan `/api/quest?map=<map-id>`, lalu disimpan sebagai cache JSON. Endpoint dapat diganti melalui `IRUNA_WIKI_BASE_URL` dan `IRUNA_WIKI_LEGACY_BASE_URL`.

Setiap level baru memberi 5 point stat. Encounter memilih monster secara acak dari encounter table map aktif dan otomatis mengabaikan ID monster yang tidak ada di database.

Modifier prototype: `STR` memberi ATK, `INT` memberi MATK/MDEF, `VIT` memberi Max HP/DEF, `AGI` memberi miss chance, `DEX` dan `CRT` memberi critical chance.
