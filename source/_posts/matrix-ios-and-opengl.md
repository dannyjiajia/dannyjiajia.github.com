---
title: iOS(Core Graphics)和OpenGL里的矩阵运算
date: 2016-07-04 16:19:19
tags: [iOS,OpenGL]
---

总结下iOS和OpenGL里的矩阵计算

#### iOS (Core Graphics)

iOS里面的矩阵用行向量表示,所以是矩阵右乘向量.

以`Quartz 2D`举例平移,因为是2d所以是一个3x3的矩阵,3d就是4x4

$$\begin{bmatrix} x&y&1 \end{bmatrix} \cdot  \begin{bmatrix} a&b&0 \\\ c&d&0 \\\ t_x&t_y&1 \end{bmatrix} = \begin{bmatrix} ax+cy+t_x&bx+dy+t_y&1 \end{bmatrix}$$

所以`CGAffineTransform CGAffineTransformMakeTranslation ( CGFloat tx, CGFloat ty );`是上面的公式中的
`a=d=1`和`b=c=0`

也就是矩阵$\begin{bmatrix} 1&0&0 \\\ 0&1&0 \\\ t_x&t_y&1 \end{bmatrix}$

**如果我们把这个公式用于3d** 则是`CATransform3D`

$$\begin{bmatrix} x&y&z&1 \end{bmatrix} \cdot \begin{bmatrix} m11&m12&m13&m14 \\\ m21&m22&m23&m24 \\\ m31&m32&m33&m34 \\\ m41&m42&m43&m44 \end{bmatrix} = \begin{bmatrix} x'&y'&z'&1 \end{bmatrix}$$

`m34`可以影响投影矩阵设置为$-1 \over d$表示向`z=d`的平面进行透视投影
#### OpenGL

OpenGL使用列向量表示,所以是矩阵左乘向量.

$$
\begin{bmatrix} a&b&c&d \\\ e&f&g&h \\\ i&j&k&l \\\ m&n&o&p \end{bmatrix} \cdot \begin{bmatrix} x\\\ y \\\ z \\\ w \end{bmatrix} = \begin{bmatrix} ax+by+cz+dw \\\ ex+fy+gz+hw \\\ ix+jy+kz+lw \\\ mx+ny+oz+pw\end{bmatrix}
$$

OpenGL的透视投影计算可以参考[这篇文章](http://www.360doc.com/content/14/1028/10/19175681_420522154.shtml)
