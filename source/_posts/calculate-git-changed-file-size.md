---
title: how to calculate total size of changed filess
date: 2016-05-12 16:35:26
tags:
---

~~~
git log --name-status -1 | grep -E '^[A-Z]\b' | sort -k 2,2 -u | grep -E "M|A" | awk '{print $2}' | xargs du -k | awk '{s+=$1}END{print s}'
~~~