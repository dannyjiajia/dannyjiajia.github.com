title: 最简单的方法将iOS中的NSLog写入文件
date: 2016-01-31 17:05:29
tags: [iOS]
categories: 技术博客
---

{% codeblock lang:objc %}
#ifdef DEBUG
- (void) redirectConsoleLogToDocumentFolder {
    
    NSArray *paths = NSSearchPathForDirectoriesInDomains(NSDocumentDirectory, NSUserDomainMask, YES);
    NSString *documentsDirectory = [paths objectAtIndex:0];
    NSString *logPath = [documentsDirectory stringByAppendingPathComponent:@"iOS.log"];
    freopen([logPath cStringUsingEncoding:NSUTF8StringEncoding],"a+",stderr);
    NSDateFormatter *formatter = [[NSDateFormatter alloc]init];
    [formatter setDateFormat:@"yyyy-MM-dd HH:mm:ss"];
    NSString *time = [formatter stringFromDate:[NSDate date]];
    NSLog(@"-------------- Start Log [%@] --------------",time);
    [formatter release];
}
#endif
{% endcodeblock %}

在程序启动的时候调用即可,所有的NSLog日志都会记录到documents下的iOS.log内

{% codeblock lang:objc %}
#ifdef DEBUG
[self redirectConsoleLogToDocumentFolder]; 
#endif
{% endcodeblock %}