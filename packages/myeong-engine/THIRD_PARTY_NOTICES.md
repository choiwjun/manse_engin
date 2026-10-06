# Data-generation dependencies

The Korean lunar/solar lookup through 2050 is generated from
[korean-lunar-calendar 0.4.0](https://github.com/usingsky/korean_lunar_calendar_js),
which distributes the Korean lunar calendar reference table.

Copyright (c) 2022 Jinil Lee

The projected Korean lunar calendar after 2050 and the 2102 solar-term buffer are
generated using [Astronomy Engine 2.1.19](https://github.com/cosinekitty/astronomy).
Neither library is required by consumers at runtime.

Copyright (c) 2019-2023 Don Cross <cosinekitty@gmail.com>

Both libraries use the following MIT License:

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

Independent lunar-phase verification uses factual UT timestamps published by
Fred Espenak, NASA/GSFC, in [2001–2100](https://eclipse.gsfc.nasa.gov/phase/phases2001.html)
and [2101–2200](https://eclipse.gsfc.nasa.gov/phase/phases2101.html).
These tables and the generated future calendar use predicted delta-T values.


# Naming stroke data

Unicode Unihan 13.0.0 `kRSKangXi` (radical + residual strokes) and Unicode 17.0.0
`kTotalStrokes` (first/G value), `kHangul`, and `CJKRadicals.txt`.
Source URLs and SHA-256 hashes: `src/engine/naming/stroke-source.json` in the source repository.
Generation: `python3 scripts/refresh-hanja-strokes.py`. The extracted 2,137 characters retain
their exact codepoints; no simplified/traditional folding. Radical original strokes are
added to kRSKangXi residual strokes. Modern G counts are not a Korean glyph standard.
These are sourced reference data, not a certification of naming-school or legal suitability.

UNICODE LICENSE V3

COPYRIGHT AND PERMISSION NOTICE

Copyright © 1991-2026 Unicode, Inc.

NOTICE TO USER: Carefully read the following legal agreement. BY
DOWNLOADING, INSTALLING, COPYING OR OTHERWISE USING DATA FILES, AND/OR
SOFTWARE, YOU UNEQUIVOCALLY ACCEPT, AND AGREE TO BE BOUND BY, ALL OF THE
TERMS AND CONDITIONS OF THIS AGREEMENT. IF YOU DO NOT AGREE, DO NOT
DOWNLOAD, INSTALL, COPY, DISTRIBUTE OR USE THE DATA FILES OR SOFTWARE.

Permission is hereby granted, free of charge, to any person obtaining a
copy of data files and any associated documentation (the "Data Files") or
software and any associated documentation (the "Software") to deal in the
Data Files or Software without restriction, including without limitation
the rights to use, copy, modify, merge, publish, distribute, and/or sell
copies of the Data Files or Software, and to permit persons to whom the
Data Files or Software are furnished to do so, provided that either (a)
this copyright and permission notice appear with all copies of the Data
Files or Software, or (b) this copyright and permission notice appear in
associated Documentation.

THE DATA FILES AND SOFTWARE ARE PROVIDED "AS IS", WITHOUT WARRANTY OF ANY
KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT OF
THIRD PARTY RIGHTS.

IN NO EVENT SHALL THE COPYRIGHT HOLDER OR HOLDERS INCLUDED IN THIS NOTICE
BE LIABLE FOR ANY CLAIM, OR ANY SPECIAL INDIRECT OR CONSEQUENTIAL DAMAGES,
OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS,
WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION,
ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THE DATA
FILES OR SOFTWARE.

Except as contained in this notice, the name of a copyright holder shall
not be used in advertising or otherwise to promote the sale, use or other
dealings in these Data Files or Software without prior written
authorization of the copyright holder.
