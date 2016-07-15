---
title: Cocos2dx在Android上使用ETC1+Alpha压缩纹理
date: 2016-07-15 13:41:42
tags: [zlib,Cocos2dx,Android,ETC,Optimize]
---

我们为了优化游戏的内存占用,会给图片资源进行`有损压缩`,在Android上则是使用`ETC1`(Ericsson texture compression)进行纹理压缩,压缩纹理无论从加载速度(GPU识别)和内存占用都有很大的优势,唯一的缺点就是有损。
也就是它不是`万金油`,并不是所有的图片都能使用`ETC1`压缩。我在记录下我是如何在`Cocos2dx`中使用`ETC1`进行纹理压缩.当然这里是在`android`平台下使用。

# 为什么是ETC1

ETC1格式是OpenGL ES图形标准的一部分，并且被所有的Android设备所支持,不支持透明通道。需要是POT纹理。虽然后面的`ETC2`支持透明通道,但是它是`OpenGL 3.0`的标准，并不能被所有Android设备所支持，而`ETC1`我们能通过技术手段加入透明通道。参考这篇[文章](http://malideveloper.arm.com/resources/sample-code/etcv1-texture-compression-and-alpha-channels/)

# 之前的准备

![ETC1](http://malideveloper.arm.com/wp-content/uploads/2010/09/sample_code_alpha_seperate.jpg)

我采用将一张纹理分割成两张图的方案,也就是`图片 = RGB部分纹理+Alpha部分纹理`。因为纹理大小由于硬件和操作系统原因是有限制的,`2048x2048`基本能被主流设备所认同，如果采用Alpha拼接的方式,原本2048的纹理最终大小会超过2048,如果所有纹理加上最大尺寸1024的限制又会使纹理数量增多.所以最终我选择了分割图片的方案。
<!-- more -->
## ImageMagick

使用[ImageMagick](http://www.imagemagick.org/script/index.php)来分割纹理的RGB和Alpha部分,为什么没有用`Mali GPU Texture Compression`直接生成呢?因为它生成的最终的`pkm`文件是经过压缩的,压缩率并不理想。所以后面我会介绍我使用`zlib`来压缩生成的`ETC1`格式的纹理。

分离RGB部分

~~~
convert logo.png -alpha Off logo_rgb.png 
~~~

分离Alpha部分

~~~
convert logo.png -channel A -alpha extract logo_a.png 
~~~

## PVRTexTool

使用[PVRTexTool](https://community.imgtec.com/developers/powervr/tools/pvrtextool/)压缩ETC1纹理,注意这里生成的文件的后缀是`pvr`，其实它的格式是`ETC1`

~~~
PVRTexTool -f ETC1 -i logo_rgb.png -o logo_rgb.pvr -q etcfast
PVRTexTool -f ETC1 -i logo_a.png -o logo_a.pvr -q etcfast
~~~

现在`logo_rgb.pvr`和`logo_a.pvr`已经是我们需要的`ETC1`格式的纹理了,但是你会发现它们比转换之前的文件大小大了很多:( 
不能增加我们的包大小是不?所以我们先使用`zlib`来压缩下他们,为什么使用`zlib`? 因为2dx里已经有`zlib`库(记得iOS里的`xx.pvr`和`xx.pvr.ccz`吧,ccz其实就被zlib压缩过后的`PVRTC4`纹理),我们不用引入其他库,偷个懒:),当然我们也可以使用其他压缩算法，比如`梦幻西游`。听他们的开发说,使用的是`lzma`解压资源,但是它的解压速度会稍慢,但是压缩率比较高,这就需要你自己取舍了。

## 压缩纹理

> 我们需要一个工具,他能将纹理使用zlib压缩成一个2dx能识别的压缩格式,或者我们能在代码里能识别的文件.

我们可以仿照pvr.ccz的策略,修改我们最终生成压缩文件的文件头信息,告诉2dx使用zlib来解压它。定义一个8个字节的结构体，表示我们的头信息.cpp中的结构体是连续的内存分配:)

~~~
struct ZipHeaderInfo
{
    char sig[4];
    int fileSize;
};
~~~

前四个char分别为`!`,`E`,`T`,`C`,后面的`int`用来存储文件的原始大小。

最终的源码如下:

~~~
//
//  CompressETCTexture
//
//  Created by DannyHe on 9/16/15.
//  Copyright (c) 2015 DannyHe. All rights reserved.
//

#include "ETCCompress.h"

#include <iostream>
#include <stdlib.h>
using namespace std;

struct ZipHeaderInfo
{
    char sig[4];
    int fileSize;
};

int ETCCompress::compressETC(const char * destpath,const char *srcpath)
{
    ZipHeaderInfo zipHeader;
    
    
    FILE* inFile = fopen(srcpath, "rb");
    
    if(!inFile)
    {
        return -1;
    }
    
    fseek(inFile, 0, SEEK_END);
    int fileSize = ftell(inFile);
    char * fileData = new char[fileSize];
    fseek(inFile, 0, SEEK_SET);
    fread(fileData, 1, fileSize, inFile);
    fclose(inFile);
    zipHeader.fileSize = fileSize;
    zipHeader.sig[0] = '!';
    zipHeader.sig[1] = 'E';
    zipHeader.sig[2] = 'T';
    zipHeader.sig[3] = 'C';
    
    uLongf destLength = compressBound(fileSize);

    Bytef* pDestBuf = new Bytef[destLength];
    int result = compress2(pDestBuf , &destLength, (const Bytef*)fileData, fileSize,9);
    if (result != Z_OK)
    {
        switch(result)
        {
            case Z_MEM_ERROR:
                printf("ETCCompress:: note enough memory for compression");
                break;
                
            case Z_BUF_ERROR:
                printf("ETCCompress:: note enough room in buffer to compress the data");
                break;
        }
        return -1;
    }
    
    cout << "ETCCompress:: orignal size: " << fileSize << " bytes"
    << " , compressed size : " << destLength << " bytes"
    << " , header size: " << sizeof(zipHeader) << " bytes"
    << " , final size : " << sizeof(zipHeader) + destLength << " bytes"
    << " , compress ratio:" << (1 - (double)(sizeof(zipHeader) + destLength)/fileSize)*100 << "%"
    << '\n';
    
    
    FILE* fo = fopen(destpath, "wb+");
    if(fo)
    {
        fwrite(&zipHeader, sizeof(zipHeader), 1, fo);
        fwrite(pDestBuf,destLength, 1, fo);
        fclose(fo);
        delete [] pDestBuf;
        
        return 0;
    }
    return 0;
}

uLongf ETCCompress::unCompressETC(const char * packData,int packSize,Bytef* &buff)
{
    struct ZipHeaderInfo *header = (struct ZipHeaderInfo*) packData;
    if (!(header->sig[0] == '!' && header->sig[1] == 'E' && header->sig[2] == 'T' && header->sig[3] == 'C')) {
        printf("\nETCCompress:: header error");
        return -1;
    }
    int orginSize = header->fileSize;
    int headerSize = sizeof(*header);
    uLongf newSize = orginSize;
    Bytef* pUnBuf = new Bytef[newSize];
    int result2 = uncompress(pUnBuf, &newSize,(const Bytef*)packData + headerSize,packSize - headerSize);
    if (result2 != Z_OK)
    {
        switch(result2)
        {
            case Z_MEM_ERROR:
                printf("ETCCompress:: note enough memory for uncompression");
                break;
                
            case Z_BUF_ERROR:
                printf("ETCCompress:: note enough room in buffer to uncompress the data");
                break;
        }
        return -1;
    }
    buff = pUnBuf;
    cout << "orignal size: " << packSize << " bytes" 
    << " , ucompressed size : " << orginSize << " bytes" << '\n';
    return newSize;
}

int ETCCompress::unCompressETC(const char *destpath, const char *srcpath)
{
    FILE* packFile = fopen(srcpath, "rb");
    
    fseek(packFile, 0, SEEK_END);
    int packSize = ftell(packFile);
    char * packData = new char[packSize];
    fseek(packFile, 0, SEEK_SET);
    fread(packData, 1, packSize, packFile);
    fclose(packFile);
    Bytef* pUnBuf;
    uLongf newSize = unCompressETC(packData,packSize,pUnBuf);
    if (newSize == -1)
    {
        printf("\nETCCompress:: uncompress error!");
        return -1;
    }
    
    FILE* ft = fopen(destpath, "wb+");
    if(ft)
    {
        fwrite(pUnBuf,newSize, 1, ft);
        fclose(ft);
        delete [] pUnBuf;
        return 0;
    }

    return -1;
}
~~~

更多详细的代码及编译可以看我之前的[这篇文章](http://dannyhe.wang/2015/12/15/how-to-copy-file-in-cmake/)和[仓库](https://github.com/dannyjiajia/ETCCompress)
然后我们使用我们写的工具压缩我们的纹理

~~~
CompressETCTexture pack logo_rgb.pvr logo_rgb.png
CompressETCTexture pack logo_a.pvr logo_a.png
~~~

最后我们得到两个文件`logo_rgb.png`和`logo_a.png`,这两个文件经过了`ETC1`压缩并且文件大小也是我们能接受的范围,然后我们需要在`Cocos2dx`中使用他们。

## 2dx(3.x)中解压

我们在`ZipUtils`类中加入我们的解压逻辑
头文件`ZipUtils.h`中声明我们的头信息结构体和解压函数
~~~
#if CC_USE_ETC1_ZLIB
    struct ETCCompressedHeader{
        char sig[4];
        int fileSize;
    };
#endif

#if CC_USE_ETC1_ZLIB
    static bool isETCCompressedBuffer(const unsigned char *buffer, ssize_t len);
    static int inflateETCCompressedBuffer(const unsigned char *buffer, ssize_t len, unsigned char **out);
#endif
~~~

实现解压

~~~
#if CC_USE_ETC1_ZLIB
bool ZipUtils::isETCCompressedBuffer(const unsigned char *buffer, ssize_t len)
{
    if (static_cast<size_t>(len) < sizeof(struct ETCCompressedHeader))
    {
        return false;
    }
    struct ETCCompressedHeader *header = (struct ETCCompressedHeader*) buffer;
    return header->sig[0] == '!' && header->sig[1] == 'E' && header->sig[2] == 'T' && header->sig[3] == 'C';
}

int ZipUtils::inflateETCCompressedBuffer(const unsigned char *buffer, ssize_t bufferLen, unsigned char **out)
{
    struct ETCCompressedHeader *header = (struct ETCCompressedHeader*) buffer;
    int len = header->fileSize;
    
    *out = (unsigned char*)malloc( len );
    if(! *out )
    {
        CCLOG("cocos2d: ETCCompressed: Failed to allocate memory for texture");
        return -1;
    }
    uLongf destlen = len;
    int ret = uncompress(*out, &destlen, (Bytef*)buffer + sizeof(*header), bufferLen - sizeof(*header) );
    
    if( ret != Z_OK )
    {
        CCLOG("cocos2d: ETCCompressed: Failed to uncompress data");
        free( *out );
        *out = nullptr;
        return -1;
    }
    
    return len;
}
#endif
~~~

最后我们在2dx读取纹理文件的地方(`Image::initWithImageData`)调用我们的解压函数

~~~
#if CC_USE_ETC1_ZLIB
    if(ZipUtils::isETCCompressedBuffer(data,dataLen))
    {
        CCLOG("Image: Use our etc format compressed!");
        unsigned char* etcUnpackedData = nullptr;
        ssize_t etcUnpackedLen = 0;
        etcUnpackedLen = ZipUtils::inflateETCCompressedBuffer(data,dataLen,&etcUnpackedData);
        //detecgt and unzip the compress file
        if (ZipUtils::isCCZBuffer(etcUnpackedData, etcUnpackedLen))
        {
            unpackedLen = ZipUtils::inflateCCZBuffer(etcUnpackedData, etcUnpackedLen, &unpackedData);
        }
        else if (ZipUtils::isGZipBuffer(etcUnpackedData, etcUnpackedLen))
        {
            unpackedLen = ZipUtils::inflateMemory(const_cast<unsigned char*>(etcUnpackedData), etcUnpackedLen, &unpackedData);
        }
        else
        {
            unpackedData = const_cast<unsigned char*>(etcUnpackedData);
            unpackedLen = etcUnpackedLen;
        }
        if(etcUnpackedData != unpackedData)
        {
            free(etcUnpackedData);
        }
    }
    else
    {
        //detecgt and unzip the compress file
        if (ZipUtils::isCCZBuffer(data, dataLen))
        {
            unpackedLen = ZipUtils::inflateCCZBuffer(data, dataLen, &unpackedData);
        }
        else if (ZipUtils::isGZipBuffer(data, dataLen))
        {
            unpackedLen = ZipUtils::inflateMemory(const_cast<unsigned char*>(data), dataLen, &unpackedData);
        }
        else
        {
            unpackedData = const_cast<unsigned char*>(data);
            unpackedLen = dataLen;
        }

    }
#else
    //detecgt and unzip the compress file
    if (ZipUtils::isCCZBuffer(data, dataLen))
    {
        unpackedLen = ZipUtils::inflateCCZBuffer(data, dataLen, &unpackedData);
    }
    else if (ZipUtils::isGZipBuffer(data, dataLen))
    {
        unpackedLen = ZipUtils::inflateMemory(const_cast<unsigned char*>(data), dataLen, &unpackedData);
    }
    else
    {
        unpackedData = const_cast<unsigned char*>(data);
        unpackedLen = dataLen;
    }        
#endif
~~~

# 2dx中使用ETC1

我使用Shader来操作最中的Alpha,比如在`CCSprite`中，发现自己使用的纹理是`ETC1`格式便去查找Alpha纹理，如果发现便使用自己的Shader替换默认的Shader.
这样就做到对游戏以前的开发逻辑毫无修改。因为运用Shader的方式比较多，我这里就只列出我的Shader代码(CCSprite)

顶点不需要修改默认的

~~~
const char* ccShader_etc1_PositionTextureColor_noMVP_vert = STRINGIFY(
attribute vec4 a_position;
attribute vec2 a_texCoord;
attribute vec4 a_color;

varying vec4 v_fragmentColor;
varying vec2 v_texCoord;


void main()
{
    gl_Position = CC_PMatrix * a_position;
    v_fragmentColor = a_color;
    v_texCoord = a_texCoord;
}
);
~~~

片段着色

~~~
// u_texture1是etc的alpha数据也可以用ETC1压缩
const char* ccShader_etc1_PositionTextureColor_noMVP_frag = STRINGIFY(
\n
varying vec4 v_fragmentColor;
varying vec2 v_texCoord;

uniform sampler2D u_texture1;

void main()
{
    vec4 color = texture2D(CC_Texture0, v_texCoord);
    color.a = texture2D(u_texture1, v_texCoord).r;
    gl_FragColor = color * v_fragmentColor; //支持Cocos opacity
}
);
~~~

使用的话大概只需这样

~~~
auto program = GLProgramCache::getInstance()->getGLProgram(GLProgram::SHADER_NAME_ETC_ALPHA_POSITION_TEXTURE_COLOR_NO_MVP); //新加的etc shader
auto etc_program_state = GLProgramState::create(program);
etc_program_state->setUniformTexture("u_texture1", texture_alpha);
setGLProgramState(etc_program_state);
~~~

# 最后

如果还需要优化包大小,可以采用将PNG转换成两张JPG,也是RGB+ALPHA.`刀塔传奇`就有使用这种策略。我们还可以直接压缩`png`,使它的画质降低,比如[pngquant](https://pngquant.org/)

另外上文中我们zlib压缩文件的小工具也可以来压缩其他文件,比如我们在`Windows Phone`平台使用的压缩纹理`DXT3`...
在发布`Android`的时候我们同样需要声明我们的游戏使用ETC压缩

~~~
<!-- we want the device support etc1 texture format -->
<supports-gl-texture android:name="GL_OES_compressed_ETC1_RGB8_texture" />
~~~
