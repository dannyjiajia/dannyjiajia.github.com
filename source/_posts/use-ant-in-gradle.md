title: 在gradle脚本使用ant插件Antenna实现java的源代码宏编译
date: 2016-01-31 16:28:28
tags: [Android,Android Studio,Gradle,Ant,Antenna]
categories: 
---

还没怎么研究过android studio,以前一直习惯用eclipse+ant+adt开发android.但是看到很多第三方sdk都是发布aar这种包,如FB。真心不想费神去自己把它构建成eclipse项目。于是开始学习android studio...
<!-- more -->
直接上配置

app下的`build.gradle`:

~~~
ant.importBuild '../Antenna.xml' //导入ant配置
preBuild.dependsOn(preprocess) //构建依赖于preprocess任务
~~~


然后新建`Antenna.xml`与`app`目录同级

~~~

<?xml version="1.0" encoding="UTF-8"?>
<project name="Antenna" default="preprocess">
<property name="wtk.home" value="tools"/>
<taskdef resource="antenna.properties" classpath="tools/antenna-bin-1.0.2.jar"/>
	<target name="preprocess" description="preprocess java source code with marco in antenna_predefines.txt">
		<wtkpreprocess
			verbose="true"
			srcdir="app/src/main/java"
			destdir="app/src/main/java"
			printsymbols="true"
			debuglevel="debug"
			encoding="UTF-8">
			<symbols_file name="antenna_predefines.txt"/>
		</wtkpreprocess>
	</target>
</project>

~~~


当然你需要在app同级目录建立文件夹`tools`,放入插件`Antenna`的jar包,其次你的环境变量中需要已经安装的`ant`环境
你还需要新建一个`antenna_predefines.txt`文件位于`app`文件夹的同级文件夹下,用来存放`Antenna`的宏定义