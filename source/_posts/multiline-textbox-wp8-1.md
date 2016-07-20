---
title: WindowsPhone的TextBox多行支持及疑问
date: 2016-07-20 14:57:34
tags: [Cocos2dx,Windows Phone]
---

最近在使用2dx的时候改造了一个[UIEditBox](https://github.com/cocos2d/cocos2d-x/blob/v3/cocos/ui/UIEditBox/UIEditBoxImpl-winrt.cpp),使其支持多行输入,因为在Windows Phone上单行和多行输入都是使用同一个系统控件`TextBox`,关于如何使用多行输入,可以参考微软的[文档](https://msdn.microsoft.com/en-us/library/ms742157.aspx)

当然Cocos2dx在3.5以上的版本中已经是使用cpp(cx)的开发模板,大意的代码如下:

~~~
m_textBox->TextWrapping = Windows::UI::Xaml::TextWrapping::Wrap;
m_textBox->AcceptsReturn = true;
~~~

我们新加了一个类`UITextViewWinRT`提供系统的多行输入。

~~~
void UITextViewWinRT::SetupTextBox()
{
	RemoveTextBox();
	m_textBox = ref new TextBox;
	
	m_textBox->Name = "cocos2d_editbox_textbox";
	m_textBox->MinWidth = 200;
	m_textBox->PlaceholderText = m_strPlaceholder;
	m_textBox->Select(m_textBox->Text->Length(), 0);
	m_textBox->MaxLength = m_maxLength < 0 ? 0 : m_maxLength;
	m_textBox->MinHeight = 100;
	m_textBox->MaxHeight = 200;
	m_textBox->TextWrapping = Windows::UI::Xaml::TextWrapping::Wrap;
	m_textBox->AcceptsReturn = true;

	SetInputScope(m_textBox, m_inputMode);
	m_textBox->Text = m_strText; //注意这行
	auto g = findXamlElement(m_flyout->Content, "cocos2d_editbox_grid");
	auto grid = dynamic_cast<Grid^>(g);
	grid->Children->InsertAt(0, m_textBox);
}
~~~

如果阅读过官方的`UIEditBoxImpl-winrt.cpp`加上细心的同学会注意`m_textBox->Text = m_strText; //注意这行`这行代码,因为我将这段代码放到设置`TextBox`支持多行输出的代码后面了。

**如果不这样的的话,如果你给`TextBox`设置多行文本的时候是无效的**,猜想可能是系统在设置其文本属性的时候计算了文本的摆放的结构,当渲染的时候进行渲染.
Windows Phone的换行符为`\r\n`不是一般的`\n`,这会引起新的问题,2dx里将`unicode`码转化成`UTF8`在`Label`里显示`\r`会被显示为乱码！
<!-- more -->
我的修改方案是

* Platform::String(unicode)转为std::string(UTF8)的时候移除`\r`,因为在2dx的`Label`里`\n`就是表示换行

* std::string转为Platform::String的时候将`\n`替换为`\r\n`,让系统控件识别换行

~~~
static std::string&   replace_all_distinct(std::string&   str, const   std::string&   old_value, const  std::string&   new_value)
{
	for (std::string::size_type pos(0); pos != std::string::npos; pos += new_value.length())   {
		if ((pos = str.find(old_value, pos)) != std::string::npos)
			str.replace(pos, old_value.length(), new_value);
		else   break;
	}
	return   str;
}

Platform::String^ UITextViewImplWinrt::stringToPlatformString(std::string strSrc)
{
	std::string newSrc = replace_all_distinct(strSrc, "\n", "\r\n");
	// to wide char
	int nStrLen = MultiByteToWideChar(CP_UTF8, 0, newSrc.c_str(), -1, NULL, 0);
	wchar_t* pWStr = new wchar_t[nStrLen + 1];
	memset(pWStr, 0, nStrLen + 1);
	MultiByteToWideChar(CP_UTF8, 0, newSrc.c_str(), -1, pWStr, nStrLen);
	Platform::String^ strDst = ref new Platform::String(pWStr);
	delete[] pWStr;
	return strDst;
}

std::string UITextViewImplWinrt::PlatformStringTostring(Platform::String^ strSrc)
{
	const wchar_t* pWStr = strSrc->Data();
	int nStrLen = WideCharToMultiByte(CP_UTF8, 0, pWStr, -1, NULL, 0, NULL, NULL);
	char* pStr = new char[nStrLen + 1];
	memset(pStr, 0, nStrLen + 1);
	WideCharToMultiByte(CP_UTF8, 0, pWStr, -1, pStr, nStrLen, NULL, NULL);;

	std::string strDst = std::string(pStr);

	delete[] pStr;
	std::string ret = replace_all_distinct(strDst, "\r\n", "\n");
	return ret;
}
~~~
