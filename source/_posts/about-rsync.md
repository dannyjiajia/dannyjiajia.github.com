---
title: rsync在Windows上同步本地文件夹的权限问题
date: 2016-04-13 09:46:24
tags: [shell]
categories: 
---

~~~
rsync -ravc --exclude=.DS_Store* --exclude=.git/ --exclude=.gitignore 源路径 目标路径 --delete-after --perms --chmod=a=rw,Da+x
~~~