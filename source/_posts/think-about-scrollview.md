---
title: quick的ScrollView随想
date: 2016-07-07 15:27:13
tags: [iOS,OpenGL,Cocos2dx]
---

一直使用`quick`。之前一直忙着做项目,都没有空停下来好好想想OpenGL的一些知识.今天和同事分析了下`ClippingNode`的实现,记录在这里。

### quick的尴尬

quick用裁剪测试,实现了一个lua版的`UIScrollView.lua`,可以满足简单的裁剪和滑动需求.

~~~
local UIScrollView = class("UIScrollView", function()
	return display.newClippingRegionNode()
end)
~~~

如果我们需要滑动列表能嵌套(横(竖)向中嵌入竖(横)向的列表),这个列表就不能满足我们的需求了.

`ClippingRectangleNode`的核心实现是根据OpenGL的裁剪测试

~~~
glEnable(GL_SCISSOR_TEST);
glScissor(x,y,width,height);
glDisable(GL_SCISSOR_TEST);
~~~

### ClippingNode原理

`ClippingNode`采用模板测试实现裁剪,可实现裁剪的嵌套.这里分析它的实现步骤。
<!-- more -->
#### 模板测试

模板缓冲中的模板值(Stencil Value)通常是8位的，因此每个片段/像素共有256种不同的模板值，2dx在启动时便设置了这个值

~~~
bool GLViewImpl::initWithRect(const std::string& viewName, Rect rect, float frameZoomFactor)
{
    CGRect r = CGRectMake(rect.origin.x, rect.origin.y, rect.size.width, rect.size.height);
    convertAttrs();
    CCEAGLView *eaglview = [CCEAGLView viewWithFrame: r
                                       pixelFormat: (NSString*)_pixelFormat
                                       depthFormat: _depthFormat //iOS上设置深度测试和模板测试的参数为GL_DEPTH24_STENCIL8_OES
                                preserveBackbuffer: NO
                                        sharegroup: nil
                                     multiSampling: NO
                                   numberOfSamples: 0];

    [eaglview setMultipleTouchEnabled:YES];

    _screenSize.width = _designResolutionSize.width = [eaglview getWidth];
    _screenSize.height = _designResolutionSize.height = [eaglview getHeight];
//    _scaleX = _scaleY = [eaglview contentScaleFactor];

    _eaglview = eaglview;

    return true;
}
~~~

更多信息可以参考[这篇文章](http://learnOpenGL-cn.readthedocs.io/zh/latest/04%20Advanced%20OpenGL/02%20Stencil%20testing/)

#### 一般情况(不嵌套)

我们这里分析`_inverted`为`false`的情况,也就是保留裁剪区域内的内容的情况.

##### onBeforeVisit

开始绘制时,首先计算出这个`ClippingNode`的位遮罩(Bitmask)-`mask_layer`

~~~
// increment the current layer
s_layer++;

// mask of the current layer (ie: for layer 3: 00000100)
GLint mask_layer = 0x1 << s_layer;
// mask of all layers less than the current (ie: for layer 3: 00000011)
GLint mask_layer_l = mask_layer - 1;
// mask of all layers less than or equal to the current (ie: for layer 3: 00000111)
_mask_layer_le = mask_layer | mask_layer_l;
~~~

s_layer = 0

mask_layer = 1

mask_layer_l = 0

_mask_layer_le = 1

然后保存下模板测试的当前的状态,接着开启模板测试，设置位遮罩

~~~
// enable stencil use
glEnable(GL_STENCIL_TEST);
// check for OpenGL error while enabling stencil test
CHECK_GL_ERROR_DEBUG();

// all bits on the stencil buffer are readonly, except the current layer bit,
// this means that operation like glClear or glStencilOp will be masked with this value
glStencilMask(mask_layer);
~~~

`glStencilMask`设置的值为`0x1`,就是告诉缓冲对模板值的最后一位是可写的。

接着清空模板缓冲中的值，设置结果为`GL_NEVER`,永远不通过,不通过时执行`GL_ZERO`操作(`_inverted`为`false`),绘制一个全屏的矩形

~~~
glStencilFunc(GL_NEVER, mask_layer, mask_layer);
glStencilOp(!_inverted ? GL_ZERO : GL_REPLACE, GL_KEEP, GL_KEEP);

drawFullScreenQuadClearStencil();
~~~

此时模板缓冲中的值为,假设下面的矩阵表示了一个屏幕中的所有模板缓冲值.**也就是一个0表示的是8位二进制结果`0x00000000`**

$$\begin{matrix} 0&0&0&0&0 \\\ 0&0&0&0&0 \\\ 0&0&0&0&0 \\\ 0&0&0&0&0 \\\ 0&0&0&0&0  \end{matrix}$$

然后开始准备画我们的`蒙版`,仍然是测试永远不通过,如果不通过执行`mask_layer`(0x1)的最后一位`替换`到模板值的最后一位

~~~
glStencilFunc(GL_NEVER, mask_layer, mask_layer);
glStencilOp(!_inverted ? GL_REPLACE : GL_ZERO, GL_KEEP, GL_KEEP);
~~~

然后模板缓冲中的值为

$$\begin{matrix} 0&0&0&0&0 \\\ 0&1&1&1&0 \\\ 0&1&1&1&0 \\\ 0&1&1&1&0 \\\ 0&0&0&0&0  \end{matrix}$$


##### onAfterDrawStencil

在`蒙版`绘制完后,开始绘制子节点前设置测试操作

~~~
glStencilFunc(GL_EQUAL, _mask_layer_le, _mask_layer_le);
glStencilOp(GL_KEEP, GL_KEEP, GL_KEEP);
~~~

保留满足公式`(模板值 & _mask_layer_le) == (_mask_layer_le & _mask_layer_le)`的模板值片段,也就是上面图中得所有1位置的片段,也就是我们`蒙版`中的图像.`模板值 & 1 == 1`

##### onAfterVisit

最后还原一开始保留的模板测试的状态,关闭模板测试
~~~
void ClippingNode::onAfterVisit()
{
#if DIRECTX_ENABLED == 0
    ///////////////////////////////////
    // CLEANUP

    // manually restore the stencil state
    glStencilFunc(_currentStencilFunc, _currentStencilRef, _currentStencilValueMask);
    glStencilOp(_currentStencilFail, _currentStencilPassDepthFail, _currentStencilPassDepthPass);
    glStencilMask(_currentStencilWriteMask);
    if (!_currentStencilEnabled)
    {
        glDisable(GL_STENCIL_TEST);
    }

    // we are done using this layer, decrement
    s_layer--;
#endif
}
~~~

#### 嵌套的情况
我们假设上面的`ClippingNode`有一个`ClippingNode`类型的`child`
先绘制父节点,然后才绘制子节点`ClippingNode`
也就是在父节点执行绘制子节点的时候,子节点`ClippingNode`会有下面的步骤

##### onBeforeVisit

s_layer = 1

mask_layer = 2

mask_layer_l = 1

_mask_layer_le = 3


$$\begin{matrix} 0&0&0&0&0 \\\ 0&1&1&1&0 \\\ 2&3&3&3&2 \\\ 0&1&1&1&0 \\\ 0&0&0&0&0  \end{matrix}$$

##### onAfterDrawStencil

`(模板值 & _mask_layer_le) == (_mask_layer_le & _mask_layer_le)` $\to$ `(模板值 & 3) == (3 & 3)`
也就是只有模板值为`3`的片段会被保留

### 最后

~~猜测下iOS中的`UIScrollView`也是基于模板测试,当然有可能不嵌套的时候也是使用的`glScissor`,毕竟模板测试会多两次drawcall。~~
最后如何改造`qucik`的`UIScrollView.lua`

1. 继承`cc.ClippingNode`

2. `setViewRect`的实现修改为设置`setStencil`

3. 将`addTouchNode`中`node`设置为传递事件`setTouchSwallowEnabled(false)`
