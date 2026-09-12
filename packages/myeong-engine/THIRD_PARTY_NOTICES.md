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
