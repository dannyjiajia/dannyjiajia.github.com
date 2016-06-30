title: Python打印的一个例子
date: 2015-12-11 11:46:23
tags: [Python,Platform,Cocos2dx]
categories: 
---

用python肯定是为了跨平台的便利,用python时在不同平台打印需要注意的地方。


> Windows和mac的终端编码不一样,尤其是在打印中文的时候

我采用的方法是在windows下将编码转换为gbk

> 打印时候最好能加上颜色

使用`colorama`这个库来实现
<!-- more -->
### 对Logging的封装
{% codeblock Logging.py lang:python %}
# coding=utf-8
# DannyHe
import os
import sys
import platform
import time
from colorama import *
init(autoreset=True)
class Logging:

    DEBUG_MODE = False

    @staticmethod
    def _print(s, color=None):
        if sys.platform != 'win32':
            print color + s
        else:
            print color + s.decode('utf-8').encode("GBK")

    @staticmethod
    def debug(s):
        if Logging.DEBUG_MODE:
            localtime = time.strftime(
                "%a %H:%M:%S", time.localtime(time.time()))
            Logging._print("[DEBUG]%s %s " % (localtime, s), Fore.RESET)

    @staticmethod
    def info(s):
        localtime = time.strftime("%a %H:%M:%S", time.localtime(time.time()))
        Logging._print("[INFO]%s %s " % (localtime, s), Fore.CYAN)

    @staticmethod
    def warning(s):
        localtime = time.strftime("%a %H:%M:%S", time.localtime(time.time()))
        Logging._print("[WARNING]%s %s " % (localtime, s), Fore.YELLOW)

    @staticmethod
    def error(s):
        localtime = time.strftime("%a %H:%M:%S", time.localtime(time.time()))
        Logging._print("[ERROR]%s %s " % (localtime, s), Fore.RED)
{% endcodeblock %}

### 使用

{% codeblock test.py lang:python %}
# coding=utf-8
# DannyHe
from Logging import *

Logging.DEBUG_MODE = True

Logging.debug("hello world")
Logging.info("你好")
{% endcodeblock %}