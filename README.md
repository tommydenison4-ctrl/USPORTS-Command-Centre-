# U SPORTS Football Game Centre V32

Root-cause repair:
- fixed the JavaScript syntax error that was preventing the original live module from loading
- the visible Live navigation button now calls one final explicit `openLiveV32()` entrypoint
- #live routing points at the same repaired function
- no simulated live values are used when no verified realtime feed exists
- removed remaining hard-coded YPP / explosive / turnover / drive values
- removed hard-coded fake current-drive content

Logo corrections:
- Western uses the Western Mustangs athletics mark instead of a favicon
- Laurier uses a Golden Hawks athletics mark instead of a favicon
- McGill uses a Redbird mark instead of a favicon
- StFX uses the X-Men primary mark
- Manitoba uses its 2025 forward-facing Bisons identity
- Regina uses the 2025 unified Rams identity
- Saskatchewan and UBC use full athletics marks instead of favicons
- all logo boxes use consistent contain sizing / padding

All inline JavaScript blocks were syntax-checked with Node before packaging.
