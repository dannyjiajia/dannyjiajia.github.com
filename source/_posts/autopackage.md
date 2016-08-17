---
title: 不同平台下的项目自动打包方式
date: 2016-08-16 11:21:49
tags: [iOS,Android,Windows Phone]
---

# iOS

iOS下的打包主要由`xcodebuild`来完成.在xcode 7以前我通过`xcodebuild`构建项目然后通过`xcrun`来生成ipa文件.
类似以下命令

~~~
xcodebuild -configuration ${BuildConfig} -target "${TargetName}" GCC_PREPROCESSOR_DEFINITIONS="\${GCC_PREPROCESSOR_DEFINITIONS} FREEVERSION=0" WARNING_LDFLAGS="\${WARNING_LDFLAGS} -w" CODE_SIGN_IDENTITY="${DistributionCodeIdentity}" PROVISIONING_PROFILE="${DistributionProvision}"
xcrun -sdk iphoneos PackageApplication -v "${ProductDir}/${TargetName}.app" -o "${PrjDir}/${IpaName}"
~~~

这种方式打包有很多局限:

1. 需要自己备份生成的符号文件等.
2. 在xcode 7以后这种打包方式不能通过苹果的审核.
3. 如果需要其他证书的ipa的文件,又需要重新构建.
<!-- more -->

**所以最好的方式是完全模拟xcode的发布包流程:先archive备份,然后通过压缩包导出不同证书的ipa**

如何实现呢? 只需要使用一个命令工具:`xcodebuild`.
这里就只说明xcode 7以后的命令使用方式.
首先我们`archive`项目:

~~~
xcodebuild -sdk iphoneos -configuration Release -scheme ${SchemeName} -target "${TargetName}" -archivePath ${ArchiveFileFullPath} GCC_PREPROCESSOR_DEFINITIONS="\${GCC_PREPROCESSOR_DEFINITIONS} FREEVERSION=0" WARNING_LDFLAGS="\${WARNING_LDFLAGS} -w" CODE_SIGN_IDENTITY="${DistributionCodeIdentity}" PROVISIONING_PROFILE="${DistributionProvision}" archive
~~~

* `SchemeName`为xcode中项目的`Scheme`
* `TargetName`为项目的某个target名称
* `ArchiveFileFullPath`指定`xcarchive`文件的路径,如`HelloWorld.xcarchive`
* `DistributionCodeIdentity`为证书的标示,值形如`iPhone Distribution: xxxx (xxx)`
* `DistributionProvision`为profile的identifier,值形如`xxxx-xxxx-xxx-xxx-xx`(其实就是导入xcode后此profile的文件名)
* `GCC_PREPROCESSOR_DEFINITIONS`和`WARNING_LDFLAGS`都是xcode的环境变量

生成成功`xcarchive`文件后我们就可以导出ipa文件了

~~~
xcodebuild -exportArchive -exportOptionsPlist ${ExportOptionsPlistPath} -archivePath ${ArchiveFileFullPath} -exportPath ${IpaFileDirectory}
~~~

* `ExportOptionsPlistPath` 指向一个plist文件的路径,这个plist为这次导出提供参数，这里提供的信息其实就是你在xcode中导出ipa的时候选择的那些选项.
* `ArchiveFileFullPath` 是前面我们生成的`xcarchive` 文件路径
* `IpaFileDirectory` 是最终导出的ipa的目录(*注意这里是目录而不是具体的ipa文件路径*)


`ExportOptionsPlistPath`plist文件的格式类似如下:

~~~
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>method</key>
	<string>app-store</string>
	<key>teamID</key>
	<string>开发证书的团队ID</string>
</dict>
</plist>
~~~

当然还有其他参数的控制比如bitcode 符号文件是否打包一起等等.具体里面可以有的参数及取值可以通过`xcodebuild -h`命令查看.
`method`我一般就用到`app-store`、`ad-hoc`、`development`这三个值,通过设置`teamID`后`xcodebuild`会自动查找对应的证书(前提是你必选在keychain中安装好这些证书)
我们可以在脚本中通过`PlistBuddy`动态修改这个plist文件的值来实现不同的打包的需求(当然也可以使用几个不同的plist)

最后我们就得到了xcarchive文件,然后根据不同的需求导出不同证书的ipa文件

# Android

android上的打包就更复杂些.首先,如果有jni则需要先编译so文件并备份符号文件.然后是java的混淆日志文件等等.
不过android上则按着平时打包的步骤写成脚本就好`ant`或者`gradle`任务.
我推荐使用`gradle`插件进行开发,一是和`Android Studio`结合很强大,二是`gradle`可以直接调用`ant`任务:)

# Windows Phone

在`VS`里构建用的命令是`msbuild`(Microsoft Build Engine),它和`ant`的形式有些类似.是基于`xml`的配置，
其实`VS`中我们的设置最终落实到的依然是`Microsoft Build Engine`.这个xml文件就是`*.*proj`文件.
只是这里需要注意`Windows`下标准命令行的上下文是没有`msbuild`命令的.
我们需要运行类似名为`Visual Studio 2012 xxxx命令提示`的工具,但是我们可以手动将这个环境变量加入我们的`DOS`里.
比如下面的脚本先设置上下文,然后执行`msbuild`命令

~~~
@echo off
echo./*
echo. * Check VC++ environment...
echo. */
echo.

set FOUND_VC=0
set FOUND_OUTDIR=0

if not "%~1"=="" set FOUND_OUTDIR=1

if defined VS120COMNTOOLS (
    set VSTOOLS="%VS120COMNTOOLS%"
    set VC_VER=120
    set FOUND_VC=1
) 

set VSTOOLS=%VSTOOLS:"=%
set "VSTOOLS=%VSTOOLS:\=/%"
set VSVARS="%VSTOOLS%vsvars32.bat"
if not defined VSVARS (
    echo Can't find VC2013 installed!
    goto ERROR
)
echo./*
echo. * Building Windows Phone Project...
echo. */
echo.
call %VSVARS%
if %FOUND_VC%==1 (
	msbuild  HelloWorld.WindowsPhone.vcxproj /p:Configuration="Release"  /p:Platform="ARM" /t:Clean;Rebuild
)
~~~

`msbuild  HelloWorld.WindowsPhone.vcxproj /p:Configuration="Release"  /p:Platform="ARM" /t:Clean;Rebuild`表示在`Release`模式下清理然后重新构建`HelloWorld.WindowsPhone.vcxproj`项目,目标平台为`ARM`. 
命令会按以前构建的目标目录导出最终的包文件,如果之前没设置,则在当前目录.如果需要指定通过参数`/p:OutDir=路径`设置

## 验证安装包

微软提供了一个命令行工具`appcert.exe`来验证,这个文件的一般路径为:`C:\Program Files (x86)\Windows Kits\10\App Certification Kit\appcert.exe`

> appcert.exe test -appxpackagepath 包路径 -reportoutputpath 生成xml格式的报告文件路径

**注意:这里说明的是基于`VS2013`的开发环境.`VS2015`可能有些出入.**

## 部署安装包到设备

`AppDeployCmd.exe`
一般路径为:`C:\Program Files (x86)\Microsoft SDKs\Windows Phone\v8.1\Tools\AppDeploy\AppDeployCmd.exe`

> AppDeployCmd.exe /install 包路径 /targetdevice:de

End:)