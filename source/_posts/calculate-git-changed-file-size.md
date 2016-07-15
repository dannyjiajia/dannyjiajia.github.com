---
title: 如何计算git变动的文件大小
date: 2016-05-12 16:35:26
tags: [git,shell]
---

~~~
#!/bin/bash
# The tool to get the total size of autoupdate 
# by Dannyhe

function NotSupport()
{
	echo "Not support $OSTYPE"
	exit -1
}

function main()
{
	echo "os: $OSTYPE"
	echo "size:"
	if [[ "$OSTYPE" == "linux-gnu" ]]; then
	     NotSupport
	elif [[ "$OSTYPE" == "darwin"* ]]; then
         # Mac OSX
	     git log --name-status -1 | grep -E '^[A-Z]\b' | sort -k 2,2 -u | grep -E "M|A" | awk '{print $2}' | xargs stat -f "%z" | awk '{t+=$0}END{print t/(1024*1024)" Mb"}'
	elif [[ "$OSTYPE" == "cygwin" ]]; then
        # POSIX compatibility layer and Linux environment emulation for WindowsNotSupport
        NotSupport
	elif [[ "$OSTYPE" == "msys" ]]; then
        # Lightweight shell and GNU utilities compiled for Windows (part of MinGW)
        git log --name-status -1 | grep -E '^[A-Z]\b' | sort -k 2,2 -u | grep -E "M|A" | awk '{print $2}' | xargs du -b | awk '{t+=$0}END{print t/(1024*1024)" Mb"}'
	elif [[ "$OSTYPE" == "freebsd"* ]]; then
		NotSupport
	else
		NotSupport
	fi
}

main
~~~