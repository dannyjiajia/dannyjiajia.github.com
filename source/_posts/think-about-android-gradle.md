---
title: 对Android的Gradle插件的理解
date: 2016-03-28 19:26:48
tags: [Android,Android Studio,Gradle,Ant,Antenna]
categories: 
---

本来打算写一篇关于Android的gradle插件的使用详解之类的文章,结果在知乎看到了一篇不错的。我在这里总结下吧。

http://ghui.me/post/2015/03/create-several-variants

### 开始

1. 合并的思想
   
   新的构建系统最主要的想法就是合并,将各自`Productflavor`定义的不同项目配置(applicationId,versionCode,signingConfig,sourceSets...)以及资源(java代码,AndroidManifest.xml,res,jni...)和公用的`defaultConfig`定义的配置、`sourceSets.main`定义的资源进行合并

2. applicationId和AndroidManifest.xml中的package
	
   applicationId用来在Android设备和Google Play来区分apk,也就是以前的package.而现在AndroidManifest.xml中的package仅用来生成R.java

3. 各自的Productflavor可以显式的设置sourceSets

	不要误以为每个Productflavor对应的java代码目录和资源目录是定死的,可以通过sourceSets.flavor来自定义,如果没有显式定义才是如上文中所说的路径.如:
	~~~
	sourceSets.flavor {
        java.srcDir "src-flavor"
        res.srcDir "res-flavor"
        jniLibs.srcDir "libs-flavor"
        manifest.srcFile "AndroidManifestflavor.xml"
        assets.srcDir "assets-flavor"
    }
    ~~~

4. 各自的Productflavor下不要定义和`main`中同名的java类

5. packagingOptions的不足
	
	packagingOptions虽然可以取消掉一些so文件的引用,但是暂时还不能做到对不同的`Productflavor`进行设置,可以通过第三方插件https://github.com/Jween/android-soexcluder

### 自己的方案

  我采用的是同一份java代码,同一个静态库,不同的资源目录,不同的`AndroidManifest.xml`文件.java代码通过`ant`插件的宏定义分别生成不同的java代码(只是在编译时).这样就达到了灵活打包的特点,根据不同的宏定义定制出不同的apk,代码始终维护一份
<!-- more -->
#### 配置

  使用ant的插件[antenna](http://antenna.sourceforge.net/wtkpreprocess.php),下载后将jar包放在项目目录下的`tools`目录中,然后在`build.gradle`中配置

  ~~~
  def FreeMarcos = "FREE_VERSION"
  ant.properties['wtk.home'] = "tools"
  ant.taskdef( name: "wtkpreprocess", classname: "de.pleumann.antenna.WtkPreprocess", classpath:"../tools/antenna-bin-1.0.2.jar")
  task PreprocessFree {
    inputs.dir "src"
    outputs.dir "src"
    doLast {
        ant.wtkpreprocess(
            srcdir: "src",
            destdir: "src", 
            verbose:true,
            printsymbols:true,
            debuglevel:"debug",
            encoding:"UTF-8",
            symbols:FreeMarcos
        )
    }
  }
  ~~~

  也可以用ant的方式来配置,可以看[这篇文章](http://dannyhe.wang/2016/01/31/use-ant-in-gradle)

#### 使用
  
  比如在java代码里这样使用:

  ~~~
  public void buy(){
//#ifdef FREE_VERSION
        pay(0);
//#else 
        pay(100.0);
//#endif
  }
  ~~~

  执行gradle task:`gradle PreprocessFree`,然后重新打开上面的代码文件,就能看见源码的变化了:)

#### 最后
  将上面的`PreprocessFree`任务加到对应的`Productflavor`编译中,这样在我们每次执行`assemble`任务的时候,便会自动执行代码的生成任务。

  比如我定义的flavor为`free`

  ~~~
  android.applicationVariants.all { variant ->
    variant.productFlavors.each { flavor ->
        if (flavor.name.equals('free')) {
            variant.javaCompile.dependsOn(PreprocessFree)
        }
    }
  }
  ~~~

  我们可以定义多个`flavor`和多个Preprocess任务,不同的`flavor`使用不同的java源码,这就实现了多个版本的需求，而且也不需要将源码分目录放了。
  happy coding :)