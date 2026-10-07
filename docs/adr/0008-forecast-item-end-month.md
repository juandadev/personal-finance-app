---
status: accepted
---

# A repeating forecast item stores an end month

A repeating Forecast Item can stop after a chosen month. The editor also accepts a remaining-months count, but that count is only a way to choose the month: the saved value is the end month, and it may fall after the 13 months the Cash Forecast currently shows. Storing the count instead would make the series grow or shrink as the horizon rolled. Capping the end at the visible horizon would drop a longer series at the edge of the window unless the user edited it again.
