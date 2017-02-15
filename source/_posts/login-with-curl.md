---
title: 2017开篇:curl使用备忘
date: 2017-02-13 12:33:55
tags: [curl]
---

真的好久没写东西了,主要原因是去年下半年太忙了,忙着找工作忙着边学边做`Android`...
这里备注一下curl的使用,因为项目原因发布新版本的时候需要将编译后的`APK`文件上传到统一的版本管理后台.


### 解析远端Json文件并下载资源

比如我这里需要解析[干货集中营](http://gank.io/)的接口并下载图片

API:[http://gank.io/api/data/福利/10/1](http://gank.io/api/data/%E7%A6%8F%E5%88%A9/10/1)

解析Json我们使用[jq](https://stedolan.github.io/jq/),可以用`Homebrew`安装

~~~shell
brew install jq
~~~

~~~shell
curl -s http://gank.io/api/data/%E7%A6%8F%E5%88%A9/10/1 | jq '.results[] | .url ' | xargs -n 1 curl -O -#
~~~

### 上传文件时显示进度

上传文件时如果需要显示进度必须显示指明`-o参数`比如`-o /dev/null`

### 获取网络状态码

使用`-w`参数

~~~shell
curl -s -o /dev/null -w %{http_code} www.baidu.com
~~~