---
title: 谈谈next主题如何添加"Fork me on Github"
date: 2016-03-12 22:59:19
tags: Next
categories: 技术博客
---

说说这个站点是如何添加"Fork me on Github",如果只是简单的添加只需要参考[github的文档](https://github.com/blog/273-github-ribbons),
将类似下面的代码添加到主题文件夹下`layout`文件夹下的`_layout.swig`文件中

{% codeblock lang:html %}
<a href="https://github.com/you"><img style="position: absolute; top: 0; left: 0; border: 0;" src="https://camo.githubusercontent.com/82b228a3648bf44fc1163ef44c62fcc60081495e/68747470733a2f2f73332e616d617a6f6e6177732e636f6d2f6769746875622f726962626f6e732f666f726b6d655f6c6566745f7265645f6161303030302e706e67" alt="Fork me on GitHub" data-canonical-src="https://s3.amazonaws.com/github/ribbons/forkme_left_red_aa0000.png"></a>
{% endcodeblock %}

比如我的`github`地址为:`https://github.com/dannyjiajia`
所以上面的代码改为:

{% codeblock lang:html %}
<a href="https://github.com/dannyjiajia"><img style="position: absolute; top: 0; left: 0; border: 0;" src="https://camo.githubusercontent.com/82b228a3648bf44fc1163ef44c62fcc60081495e/68747470733a2f2f73332e616d617a6f6e6177732e636f6d2f6769746875622f726962626f6e732f666f726b6d655f6c6566745f7265645f6161303030302e706e67" alt="Fork me on GitHub" data-canonical-src="https://s3.amazonaws.com/github/ribbons/forkme_left_red_aa0000.png"></a>
{% endcodeblock %}

**但是这样会有个问题：手机上的页面也会是这个效果,其他主题不知道，`next`主题会把页面的导航菜单给挡住。我这里采取的方式是只在`桌面版`的页面上添加。**

~~修改`/themes/next/source/js/src/schemes/pisces.js`~~
其实可以统一修改这个文件:`/themes/next/source/js/src/motion.js`

在`$(document).ready`函数内添加如下代码

{% codeblock lang:js %}
NexT.utils.isDesktop() && $(document.body).append('这里粘贴你修改后的html代码');
{% endcodeblock %}

over~ 这样就只会在桌面版的网页内显示"Fork me on Github"