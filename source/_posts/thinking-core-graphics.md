---
title: 说说Core Graphics
date: 2016-08-03 11:18:01
tags: [iOS]
---

记得11年左右做iOS开发的人真不多,大环境下大家学习iOS开发基本都靠WWDC和国外的文献,近几年随着iOS开发的火爆,好多技术都被挖掘出来(其实是自己以前英文不好,好多东西都是点到为止),最近比较闲重新看了下iOS相关的一些东西.感觉有些东西虽然不是常用的,但明白后可以更灵活的运用到日常的开发中.这里记录下我对iOS里一些特性理解.

## 为什么说Core Graphics是广义的离屏渲染?

首先看GPU屏幕渲染两种方式:

* On-Screen Rendering:意为当前屏幕渲染，指的是GPU的渲染操作是在当前用于显示的屏幕缓冲区中进行。
* Off-Screen Rendering:意为离屏渲染，指的是GPU在当前屏幕缓冲区以外新开辟一个缓冲区进行渲染操作。

上面的两种方式都是在GPU中执行的,离屏渲染会开辟一个缓冲区上下文进行渲染(这里不会在屏幕上显示),然后进行上下的切换.比如将之前开辟的缓冲区设置为当前屏幕的缓冲区(显示到屏幕),但这里开销比较大。
而`Core Graphics`是`Software rendering`,也就是`CPU`执行`GPU`上一样的算法(`GPU`能更好的执行并发执行).
参考:https://en.wikipedia.org/wiki/Software_rendering

## 为什么说离屏渲染并不意味着软件绘制?

`QuartzCore Framework`通过`Core Anmation`来把我们构建的界面绘制到屏幕上(通过操作openGL ES).
这里面会使用`openGL ES`的缓冲区,它是在`GPU`里执行的。比如`CALayer`的`masking`就使用了片段着色器.
![CoreAnmation](http://cc.cocimg.com/api/uploads/20150428/1430209790572112.png)

> 这里说明下CALayer的mask,它是根据设置的layer的aplha值进行过滤像素实现模板的(片段着色器),不是openGL ES中的模板测试实现的

参考WWDC:https://developer.apple.com/videos/play/wwdc2014/419/


## Quartz 2D 和Quartz Core的区别是什么?

`QuartzCore Framework`通过`Core Anmation`来把我们构建的界面绘制到屏幕上.
`Quartz 2D`是`CoreGraphics Framework`下一套API

## Core Graphics有颜色的混合设置吗?

`CGBlendMode`定义了很多预设模式,可以通过`drawInRect:blendMode:alpha:`或者`UIRectFillUsingBlendMode(...)`等函数进行混合模式的设置。

## openGL ES的数据可以用Core Graphics绘制吗?

可以.`QuartzCore`在实现中也用到两者的转换:
`CALayer`会缓存一个`CABackingStore`,它里面有个`CGContextRef`的属性和要提供给openGL ES的纹理信息.
这里的`CGContextRef`也就是函数`UIGraphicsGetCurrentContext()`的返回值。

具体的转换方法参考这里:http://gamesfromwithin.com/remixing-opengl-and-uikit

## 如何理解贝塞尔曲线

通过维基百科的图理解:)
* 二次贝塞尔曲线只有一个控制点p1
![二次贝塞尔曲线](http://upload.wikimedia.org/wikipedia/commons/thumb/2/2d/Bezier_2_big.gif/240px-Bezier_2_big.gif)
* 三次贝塞尔曲线有两个控制点p1和p2
![三次贝塞尔曲线](http://upload.wikimedia.org/wikipedia/commons/thumb/f/ff/Bezier_3_big.gif/240px-Bezier_3_big.gif)


## 参考

* https://github.com/gnustep/quartzcore
* http://www.jianshu.com/p/6d24a4c29e18
* http://www.jianshu.com/p/0e785269dccc
